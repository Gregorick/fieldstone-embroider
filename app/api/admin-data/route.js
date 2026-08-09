import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltan credenciales de Supabase en .env.local");
}

// Usamos el SERVICE_ROLE_KEY (Llave Maestra) para ignorar el RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  try {
    if (type === 'orders') {
      // Trae TODAS las órdenes de TODOS los usuarios
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(`*, order_items (*)`)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return NextResponse.json({ data: data || [] });
    } 
    
    if (type === 'users') {
      // Trae todos los perfiles
      const { data: profiles, error: profError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (profError) throw profError;

      // Trae los correos privados directamente de Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;
      
      // Fusiona la tabla profiles con los correos reales
      const mergedUsers = profiles?.map(profile => {
        const authUser = authData?.users.find(u => u.id === profile.id);
        return {
          ...profile,
          email: authUser?.email || profile.email || "No email recorded"
        };
      }) || [];
      
      return NextResponse.json({ data: mergedUsers });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { action, payload } = await req.json();

    if (action === 'update_order') {
      const { error } = await supabaseAdmin.from("orders").update({ order_status: payload.status }).eq("id", payload.orderId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'update_role') {
      const { error } = await supabaseAdmin.from("profiles").update({ role: payload.role }).eq("id", payload.userId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_user') {
      // Elimina el perfil y también el acceso login (Auth)
      const { error } = await supabaseAdmin.from("profiles").delete().eq("id", payload.userId);
      await supabaseAdmin.auth.admin.deleteUser(payload.userId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'create_user') {
      // 1. Crea el usuario real en Auth para que pueda iniciar sesión
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true
      });
      if (authError) throw authError;

      // 2. Crea su perfil vinculado a su nuevo ID
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: authData.user.id,
        first_name: payload.first_name,
        last_name: payload.last_name,
        role: payload.role,
        email: payload.email
      });
      if (profileError) throw profileError;
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}