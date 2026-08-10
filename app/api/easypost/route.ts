import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltan las credenciales de Supabase en el .env.local");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Le agregamos ": Request" porque es un archivo .ts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, trackingUrl } = body;

    if (!orderId || !trackingUrl) {
      return NextResponse.json({ error: "No se envió orderId o trackingUrl." }, { status: 400 });
    }

    // 1. Buscamos la orden en Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: `Orden no encontrada en la base de datos.` }, { status: 404 });
    }

    // 2. Actualizamos la Base de Datos (Cambiamos estado a Shipped y guardamos el link)
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        tracking_url: trackingUrl,
        order_status: 'shipped'
      })
      .eq('id', orderId);

    if (updateError) {
      throw new Error(`Error actualizando Supabase: ${updateError.message}`);
    }

    // 3. Enviamos el Correo al Cliente usando RESEND
    if (order.customer_email) {
      const shortOrderId = orderId.split('-')[0].toUpperCase();
      const clientName = order.customer_name || 'Valued Customer';

      const emailResult = await resend.emails.send({
        from: 'Fieldstone Embroidery <info@fieldstoneembroidery.com>', // 👈 DOMINIO ACTUALIZADO
        replyTo: 'gregorick.liriano@gmail.com',                        // 👈 AÑADIDO PARA RECIBIR RESPUESTAS
        to: order.customer_email,
        subject: `Your Order #${shortOrderId} Has Shipped! 📦`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #000; color: #fff; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Order Shipped</h1>
            </div>
            <div style="padding: 32px;">
              <p style="font-size: 16px; margin-bottom: 20px; color: #111827;">Hi <strong>${clientName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Great news! Your custom order <strong>#${shortOrderId}</strong> has been prepared, packaged, and is now on its way to you.
              </p>
              
              <div style="margin: 35px 0; text-align: center;">
                <a href="${trackingUrl}" target="_blank" style="background-color: #3b5bdb; color: #ffffff; text-decoration: none; padding: 16px 32px; font-weight: 900; border-radius: 8px; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  Track Your Package
                </a>
              </div>
              
              <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #f3f4f6;">
                <p style="font-size: 12px; color: #6b7280; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Tracking Link (if button fails):</p>
                <a href="${trackingUrl}" target="_blank" style="font-size: 13px; color: #3b5bdb; word-break: break-all;">${trackingUrl}</a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">Thank you for choosing Fieldstone Embroidery!</p>
            </div>
          </div>
        `,
      });

      if (emailResult.error) {
        console.error("Resend Error al enviar tracking:", emailResult.error);
        await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_resend_tracking', payload: emailResult.error }]);
      } else {
        console.log(`✅ Correo de tracking enviado exitosamente a ${order.customer_email}`);
      }
    } else {
      console.log("⚠️ Correo omitido: La orden no tiene email registrado.");
    }

    return NextResponse.json({ 
      success: true, 
      trackingUrl: trackingUrl
    });

  // ✅ Le agregamos ": any" al error de la excepción
  } catch (error: any) {
    console.error("Shipping Tracking Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}