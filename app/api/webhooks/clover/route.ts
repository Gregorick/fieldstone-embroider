import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js'; 

const recentlyProcessedOrders = new Set<string>();

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Faltan credenciales de Supabase en el servidor.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const payload = await req.json();

    // 🚨 1. GUARDAMOS EL PAYLOAD CRUDO PARA VER QUÉ MANDA CLOVER EXACTAMENTE
    await supabaseAdmin.from('webhook_logs').insert([{ source: 'clover_raw_payload', payload: payload }]);

    if (payload.verificationCode || payload.challenge) {
      const code = payload.verificationCode || payload.challenge;
      return NextResponse.json({ verificationCode: code }, { status: 200 });
    }

    const merchants = payload.merchants;
    if (!merchants) return NextResponse.json({ status: 'ok' }, { status: 200 });

    for (const merchantId in merchants) {
      const events = merchants[merchantId];
      
      for (const event of events) {
        if (event.type === "UPDATE" && event.objectId?.startsWith("O:")) {
          const orderId = event.objectId.replace("O:", "");
          
          // ✅ AHORA SÍ: Usando TUS variables exactas: CLOVER_MERCHANT_ID y CLOVER_API_TOKEN
          const orderRes = await fetch(`https://apisandbox.dev.clover.com/v3/merchants/${process.env.CLOVER_MERCHANT_ID}/orders/${orderId}?expand=lineItems`, {
            headers: { 
              'Authorization': `Bearer ${process.env.CLOVER_API_TOKEN}`, 
              'Content-Type': 'application/json'
            }
          });
          
          if (!orderRes.ok) {
             await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_clover_fetch', payload: { orderId, status: orderRes.status } }]);
             continue; 
          }
          
          const orderData = await orderRes.json();
          const paymentState = orderData.paymentState ? orderData.paymentState.toUpperCase() : 'NO_STATE';
          const isPaid = paymentState === 'PAID' || orderData.state === 'locked';
          
          // 🚨 2. GUARDAMOS EL ESTADO REAL DEL PAGO
          await supabaseAdmin.from('webhook_logs').insert([{ 
            source: 'debug_payment_state', 
            payload: { orderId: orderId, state: paymentState, isPaid: isPaid, fullData: orderData } 
          }]);

          if (!isPaid) continue; 

          if (!recentlyProcessedOrders.has(orderId)) {
            recentlyProcessedOrders.add(orderId);
            setTimeout(() => recentlyProcessedOrders.delete(orderId), 5 * 60 * 1000); 

            const itemMap = new Map();
            orderData.lineItems?.elements?.forEach((item: any) => {
              const name = item.name || "Producto sin nombre";
              const note = item.note || "";
              const key = `${name}-${note}`; 
              let realQuantity = 1;
              if (item.unitQty !== undefined && item.unitQty !== null) {
                realQuantity = Number(item.unitQty) >= 1000 ? Number(item.unitQty) / 1000 : Number(item.unitQty);
              }
              if (itemMap.has(key)) {
                itemMap.get(key).quantity += realQuantity;
              } else {
                itemMap.set(key, { name, quantity: realQuantity, price: Number(item.price), note });
              }
            });

            const itemsList = Array.from(itemMap.values()).map((item: any) => {
              const price = item.price ? (item.price / 100).toFixed(2) : "0.00";
              const noteHtml = item.note ? `<br/><span style="font-size: 11px; color: #666; font-style: italic;">Detalles: ${item.note}</span>` : '';
              return `<li style="margin-bottom: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;"><strong style="color: #000;">${item.quantity}x ${item.name}</strong><br/><span style="font-size: 13px; font-weight: bold;">Precio unitario: $${price}</span>${noteHtml}</li>`;
            }).join('') || '<li>Producto no encontrado en la orden</li>';

            const total = orderData.total ? (Number(orderData.total) / 100).toFixed(2) : "0.00";
            const supabaseOrderId = orderData.note || orderData.title; 
            let clientEmailAddress = 'gregorick.liriano@gmail.com'; 

            try {
              if (supabaseOrderId) {
                const { error: dbError } = await supabaseAdmin.from('orders').update({ payment_status: 'paid', order_status: 'processing', payment_id: orderId }).eq('id', supabaseOrderId);
                
                // 🚨 3. LOG DE ERROR EN BASE DE DATOS
                if (dbError) {
                  await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_update', payload: dbError }]);
                }
              } else {
                await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_missing_id', payload: { message: "No se encontró el ID de Supabase en los datos de Clover (note o title está vacío)" } }]);
              }
            } catch (dbErr) {
               await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_catch', payload: { error: String(dbErr) } }]);
            }

            try {
              // Correo Cliente
              const clientEmail = await resend.emails.send({
                from: 'Fieldstone Embroidery <onboarding@resend.dev>',
                to: clientEmailAddress, 
                subject: `¡Gracias por tu compra! Pedido #${orderId.slice(-6)}`,
                html: `<div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;"><h2 style="text-align: center; color: #000; text-transform: uppercase;">Fieldstone Embroidery</h2><p>¡Hola! Hemos recibido tu pedido y el pago se ha procesado correctamente. Estamos listos para empezar a preparar tus artículos.</p><h3 style="border-bottom: 1px solid #000; padding-bottom: 5px;">Detalles de tu compra:</h3><ul style="list-style: none; padding: 0;">${itemsList}</ul><div style="background: #000; color: #fff; padding: 15px; text-align: center; margin-top: 20px;"><h3 style="margin: 0;">Total pagado: $${total}</h3></div><div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; text-align: center;"><p style="font-size: 14px; color: #333; margin: 0;"><strong>ID de transacción:</strong> ${orderId}</p></div></div>`
              });

              // 🚨 4. LOG DE ERROR/ÉXITO DE CORREO CLIENTE
              if (clientEmail.error) {
                await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_resend_client', payload: clientEmail.error }]);
              } else {
                await supabaseAdmin.from('webhook_logs').insert([{ source: 'success_resend_client', payload: clientEmail.data }]);
              }

              // Correo Admin
              const adminEmail = await resend.emails.send({
                from: 'Fieldstone Notificaciones <onboarding@resend.dev>',
                to: 'gregorick.liriano@gmail.com', 
                subject: `🚨 NUEVO PEDIDO PAGADO - $${total} (ID: #${orderId.slice(-6)})`,
                html: `<div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 2px solid #28a745; border-radius: 8px;"><h2 style="color: #28a745; text-transform: uppercase; margin-bottom: 0;">¡Nuevo Pedido Pagado!</h2><p style="color: #555;">Un cliente acaba de completar un pago exitoso en la tienda.</p><div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;"><p style="margin: 0 0 10px 0;"><strong>Monto Total:</strong> $${total}</p><p style="margin: 0 0 10px 0;"><strong>ID de Clover:</strong> ${orderId}</p></div><h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Productos a preparar:</h3><ul style="list-style: none; padding: 0;">${itemsList}</ul></div>`
              });

              // 🚨 5. LOG DE ERROR DE CORREO ADMIN
              if (adminEmail.error) {
                await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_resend_admin', payload: adminEmail.error }]);
              }

            } catch (emailErr) {
               await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_resend_critical', payload: { error: String(emailErr) } }]);
            }
          }
        }
      }
    }
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Fallo al procesar webhook' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: "Activo",
    diagnostico_variables: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      resend_api_key: !!process.env.RESEND_API_KEY,
      // ✅ AHORA SÍ: Escaneando tus variables exactas
      clover_merchant_id: !!process.env.CLOVER_MERCHANT_ID,
      clover_token: !!process.env.CLOVER_API_TOKEN
    }
  });
}