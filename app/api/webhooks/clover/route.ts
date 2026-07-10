import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from "@/lib/supabase"; // ✅ 1. IMPORTAMOS SUPABASE

const resend = new Resend(process.env.RESEND_API_KEY);
const recentlyProcessedOrders = new Set<string>();

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    console.log("\n--- 📥 PETICIÓN RECIBIDA (BYPASS DE PAGO ACTIVADO) ---");

    if (payload.verificationCode || payload.challenge) {
      const code = payload.verificationCode || payload.challenge;
      console.log("✅ CÓDIGO DE VERIFICACIÓN ENCONTRADO:", code);
      return NextResponse.json({ verificationCode: code }, { status: 200 });
    }

    const merchants = payload.merchants;
    if (!merchants) return NextResponse.json({ status: 'ok' }, { status: 200 });

    for (const merchantId in merchants) {
      const events = merchants[merchantId];
      
      for (const event of events) {
        if (event.type === "UPDATE" && event.objectId?.startsWith("O:")) {
          const orderId = event.objectId.replace("O:", "");
          
          const orderRes = await fetch(`https://apisandbox.dev.clover.com/v3/merchants/${process.env.CLOVER_MERCHANT_ID}/orders/${orderId}?expand=lineItems`, {
            headers: { 
              'Authorization': `Bearer ${process.env.CLOVER_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!orderRes.ok) {
             console.error(`❌ Error consultando la orden ${orderId}`);
             continue; 
          }
          
          const orderData = await orderRes.json();

          // ⚠️ ELIMINAMOS LA VALIDACIÓN DE PAGO AQUÍ PARA FORZAR EL ENVÍO

          if (!recentlyProcessedOrders.has(orderId)) {
            recentlyProcessedOrders.add(orderId);
            setTimeout(() => recentlyProcessedOrders.delete(orderId), 5 * 60 * 1000);

            console.log(`🚀 FORZANDO ENVÍO DE CORREOS PARA LA ORDEN: ${orderId}`);

            // B. Agrupar productos
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
                itemMap.set(key, {
                  name,
                  quantity: realQuantity,
                  price: Number(item.price),
                  note
                });
              }
            });

            // C. Crear el HTML a partir de los datos agrupados
            const itemsList = Array.from(itemMap.values()).map((item: any) => {
              const price = item.price ? (item.price / 100).toFixed(2) : "0.00";
              const noteHtml = item.note ? `<br/><span style="font-size: 11px; color: #666; font-style: italic;">Detalles: ${item.note}</span>` : '';
              
              return `
                <li style="margin-bottom: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">
                  <strong style="color: #000;">${item.name}</strong> 
                  <br/>
                  <span style="font-size: 13px; font-weight: bold;">Precio: $${price}</span>
                  ${noteHtml}
                </li>
              `;
            }).join('') || '<li>Producto no encontrado en la orden</li>';

            const total = orderData.total ? (Number(orderData.total) / 100).toFixed(2) : "0.00";

            // ✅ 2. ACTUALIZACIÓN AUTOMÁTICA EN SUPABASE
            try {
              // Recuperamos el ID de Supabase. (Ajusta 'orderData.note' al campo exacto donde Clover guarda tu ID de referencia).
              const supabaseOrderId = orderData.note || orderData.title; 

              if (supabaseOrderId) {
                const { error: dbError } = await supabase
                  .from('orders')
                  .update({
                    payment_status: 'paid',         // Pasa a pagado
                    order_status: 'processing',     // Lo movemos a procesando para el dashboard
                    payment_id: orderId             // Guardamos el ID de transacción de Clover
                  })
                  .eq('id', supabaseOrderId);

                if (dbError) {
                  console.error("❌ Error actualizando estado en Supabase:", dbError.message);
                } else {
                  console.log(`✅ Orden en Supabase actualizada a 'paid' exitosamente.`);
                }
              } else {
                console.warn("⚠️ No se encontró un ID de Supabase válido en los datos de Clover para actualizar la BD.");
              }
            } catch (dbErr) {
              console.error("❌ Excepción crítica al conectar con Supabase:", dbErr);
            }

            // D. ENVÍO DE CORREOS CON SEGUIMIENTO DE ERRORES
            try {
              // 1. Correo para el CLIENTE
              const clientEmail = await resend.emails.send({
                from: 'Fieldstone Embroidery <onboarding@resend.dev>',
                to: 'gregorick.liriano@gmail.com', 
                subject: `¡Gracias por tu compra! Pedido #${orderId.slice(-6)}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
                    <h2 style="text-align: center; color: #000; text-transform: uppercase;">Fieldstone Embroidery</h2>
                    <p>¡Hola! Hemos recibido tu pedido correctamente. Estamos listos para empezar a bordar.</p>
                    
                    <h3 style="border-bottom: 1px solid #000; padding-bottom: 5px;">Detalles de tu compra:</h3>
                    <ul style="list-style: none; padding: 0;">
                      ${itemsList}
                    </ul>
                    
                    <div style="background: #000; color: #fff; padding: 15px; text-align: center; margin-top: 20px;">
                      <h3 style="margin: 0;">Total pagado: $${total}</h3>
                    </div>
                    
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
                      <p style="font-size: 14px; color: #333; margin: 0;">
                        <strong>ID de transacción:</strong> ${orderId}
                      </p>
                      <p style="font-size: 12px; color: #888; margin-top: 5px;">
                        Usa este código para cualquier consulta sobre tu pedido.
                      </p>
                    </div>
                  </div>
                `
              });

              if (clientEmail.error) console.error("❌ ERROR EN CORREO CLIENTE:", clientEmail.error);

              // 2. Correo para el ADMINISTRADOR
              const adminEmail = await resend.emails.send({
                from: 'Fieldstone Notificaciones <onboarding@resend.dev>',
                to: 'gregorick.liriano@gmail.com', 
                subject: `🚨 NUEVO PEDIDO COBRADO - $${total} (ID: #${orderId.slice(-6)})`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 2px solid #28a745; border-radius: 8px;">
                    <h2 style="color: #28a745; text-transform: uppercase; margin-bottom: 0;">¡Nuevo Pedido Recibido!</h2>
                    <p style="color: #555;">Un cliente acaba de completar un pago en la tienda.</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <p style="margin: 0 0 10px 0;"><strong>Monto Total:</strong> $${total}</p>
                      <p style="margin: 0 0 10px 0;"><strong>ID de Clover:</strong> ${orderId}</p>
                    </div>

                    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Productos a preparar:</h3>
                    <ul style="list-style: none; padding: 0;">
                      ${itemsList}
                    </ul>
                    
                    <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
                      Este es un mensaje automático del sistema de Fieldstone Embroidery.
                    </p>
                  </div>
                `
              });

              if (adminEmail.error) console.error("❌ ERROR EN CORREO ADMIN:", adminEmail.error);

              if (!clientEmail.error && !adminEmail.error) {
                console.log(`✅ ¡Correos enviados exitosamente! (Orden ${orderId})`);
              }

            } catch (emailErr) {
              console.error("❌ ERROR CRÍTICO LLAMANDO A RESEND:", emailErr);
            }
          }
        }
      }
    }
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    return NextResponse.json({ error: 'Fallo al procesar webhook' }, { status: 500 });
  }
}