import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltan las credenciales de Supabase en el .env.local");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, weightOz, length, width, height } = body;

    if (!orderId) {
      return NextResponse.json({ error: "No se envió ningún orderId a la API." }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: `Orden no encontrada en DB. Revisa que SUPABASE_SERVICE_ROLE_KEY esté en tu .env.local` }, { status: 404 });
    }

    // --- PARACAÍDAS DE DIRECCIÓN ---
    // Si la orden de prueba no tiene datos, forzamos unos válidos para que UPS no la rechace.
    const rawZip = order.shipping_zip || order.zip_code || "";
    let cleanZip = rawZip.replace(/[^0-9]/g, '').substring(0, 5);
    
    // Si el código postal queda vacío o es menor a 5 dígitos, usamos uno real por defecto
    if (!cleanZip || cleanZip.length < 5) {
      cleanZip = "01515"; 
    }

    const shipmentPayload = {
      shipment: {
        to_address: {
          name: (order.customer_name || "Valued Customer").substring(0, 35),
          street1: (order.shipping_address || order.address || "109 DUNNBROOK RD").substring(0, 35),
          city: (order.shipping_city || order.city || "EAST BROOKFIELD").substring(0, 30),
          state: (order.shipping_state || order.state || "MA").substring(0, 2).toUpperCase(),
          zip: cleanZip,
          country: "US", // Asumimos envíos dentro de US por defecto
          phone: "9999999999", 
          email: order.customer_email || "test@test.com"
        },
        from_address: {
          name: "DANIEL MARRA",
          company: "FIELDSTONE EMBROIDERY LLC.",
          street1: "104 KINGSTON ST",
          city: "LAWRENCE",
          state: "MA",
          zip: "01843",
          country: "US",
          phone: "9782199071",
          email: "ORDERS@FIELDSTONEEMBROIDERY.COM"
        },
        parcel: {
          weight: Number(weightOz) || 16,
          length: Number(length) || 10,
          width: Number(width) || 10,
          height: Number(height) || 2
        }
      }
    };

    const EASYPOST_API_KEY = (process.env.EASYPOST_API_KEY || "").trim();
    if (!EASYPOST_API_KEY) throw new Error("EasyPost API Key is missing in .env");

    const authHeader = `Basic ${Buffer.from(`${EASYPOST_API_KEY}:`).toString('base64')}`;

    // 1. Crear Shipment
    const createRes = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(shipmentPayload)
    });

    const shipment = await createRes.json();

    if (shipment.error) {
      const detailMsg = shipment.error.errors ? shipment.error.errors[0]?.message : shipment.error.message;
      return NextResponse.json({ error: `Rechazado por EasyPost: ${detailMsg}` }, { status: 400 });
    }

    // VALIDACIÓN ESTRICTA: ¿Por qué UPS nos rechazó?
    if (!shipment.rates || shipment.rates.length === 0) {
      // Extraemos el mensaje exacto de la empresa de transporte
      const carrierMessages = shipment.messages ? shipment.messages.map((m: any) => m.message).join(" | ") : "Dirección inválida o fuera de zona.";
      return NextResponse.json({ error: `UPS/USPS se negaron a procesar esta dirección. Motivo: ${carrierMessages}` }, { status: 400 });
    }

    // 2. Comprar la Etiqueta (Priorizamos UPS, si no hay, agarramos la que EasyPost nos dé)
    const upsRate = shipment.rates.find((r: any) => r.carrier === "UPS" || r.carrier === "UPSDAP") || shipment.rates[0];
    
    const buyRes = await fetch(`https://api.easypost.com/v2/shipments/${shipment.id}/buy`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate: { id: upsRate.id } })
    });

    const boughtShipment = await buyRes.json();
    if (boughtShipment.error) throw new Error(boughtShipment.error.message);

    // 3. Crear el Link de Tracking de UPS Directo
    let trackingLink = boughtShipment.tracker.public_url;
    if (upsRate.carrier === "UPS" || upsRate.carrier === "UPSDAP") {
      trackingLink = `https://www.ups.com/track?loc=en_US&tracknum=${boughtShipment.tracking_code}`;
    }

    // 4. Actualizar Base de Datos
    await supabaseAdmin.from('orders').update({
      tracking_number: boughtShipment.tracking_code,
      shipping_label_url: boughtShipment.postage_label.label_url,
      tracking_url: trackingLink,
      order_status: 'shipped'
    }).eq('id', orderId);

    return NextResponse.json({ 
      success: true, 
      trackingNumber: boughtShipment.tracking_code,
      labelUrl: boughtShipment.postage_label.label_url,
      trackingUrl: trackingLink
    });

  } catch (error: any) {
    console.error("Shipping API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}