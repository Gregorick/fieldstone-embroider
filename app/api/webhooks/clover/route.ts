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

    // Log del payload completo de Clover
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
          
          // Log para ver el estado real de la orden
          await supabaseAdmin.from('webhook_logs').insert([{ 
            source: 'debug_payment_state', 
            payload: { orderId: orderId, state: paymentState, isPaid: isPaid } 
          }]);

          if (!isPaid) continue; 

          if (!recentlyProcessedOrders.has(orderId)) {
            recentlyProcessedOrders.add(orderId);
            setTimeout(() => recentlyProcessedOrders.delete(orderId), 5 * 60 * 1000); 

            const itemMap = new Map();
            orderData.lineItems?.elements?.forEach((item: any) => {
              const name = item.name || "Producto sin nombre";
              const note = item.note || ""; // Aquí suele venir el método de impresión
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

            // DISEÑO DETALLADO DE LA TABLA DE PRODUCTOS
            const itemsList = Array.from(itemMap.values()).map((item: any) => {
              const unitPrice = item.price ? (item.price / 100).toFixed(2) : "0.00";
              const lineTotal = ((item.price * item.quantity) / 100).toFixed(2);
              
              // Se resalta la nota (método de impresión, talla, etc.)
              const noteHtml = item.note ? `<br/><span style="font-size: 12px; color: #555; background-color: #f1f1f1; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">📝 <strong>Detalles/Método:</strong> ${item.note}</span>` : '';
              
              return `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: left;">
                    <strong style="color: #333; font-size: 15px;">${item.name}</strong>
                    ${noteHtml}
                  </td>
                  <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: center; color: #555;">${item.quantity}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right; color: #555;">$${unitPrice}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: bold; color: #000;">$${lineTotal}</td>
                </tr>
              `;
            }).join('');

            const total = orderData.total ? (Number(orderData.total) / 100).toFixed(2) : "0.00";
            const supabaseOrderId = orderData.note || orderData.title; 
            let clientEmailAddress = 'gregorick.liriano@gmail.com'; 

            try {
              if (supabaseOrderId) {
                const { error: dbError } = await supabaseAdmin.from('orders').update({ payment_status: 'paid', order_status: 'processing', payment_id: orderId }).eq('id', supabaseOrderId);
                if (dbError) await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_update', payload: dbError }]);
              } else {
                await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_missing_id', payload: { message: "No se encontró el ID de Supabase en los datos de Clover (note o title está vacío)" } }]);
              }
            } catch (dbErr) {
               await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_catch', payload: { error: String(dbErr) } }]);
            }

            try {
              // CORREO CLIENTE DETALLADO
              const clientEmail = await resend.emails.send({
                from: 'Fieldstone Embroidery <onboarding@resend.dev>',
                to: clientEmailAddress, 
                subject: `¡Gracias por tu compra! Pedido #${orderId.slice(-6)}`,
                html: `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #000; padding: 20px; text-align: center;">
                      <h1 style="color: #fff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Fieldstone Embroidery</h1>
                    </div>
                    <div style="padding: 30px;">
                      <h2 style="color: #333; margin-top: 0;">¡Hola! Hemos recibido tu pedido.</h2>
                      <p style="color: #555; line-height: 1.6;">Tu pago se ha procesado correctamente y estamos listos para empezar a preparar tus artículos personalizados. Aquí tienes el desglose exacto de tu compra:</p>
                      
                      <table style="width: 100%; border-collapse: collapse; margin-top: 25px; margin-bottom: 25px;">
                        <thead>
                          <tr style="background-color: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #555; font-size: 13px; text-transform: uppercase;">Producto / Detalles</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; color: #555; font-size: 13px; text-transform: uppercase;">Cant.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; color: #555; font-size: 13px; text-transform: uppercase;">Precio Un.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; color: #555; font-size: 13px; text-transform: uppercase;">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsList}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colspan="3" style="padding: 15px 12px; text-align: right; font-size: 16px; color: #333;"><strong>Total Pagado:</strong></td>
                            <td style="padding: 15px 12px; text-align: right; font-size: 18px; color: #28a745; font-weight: bold;">$${total}</td>
                          </tr>
                        </tfoot>
                      </table>

                      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #000;">
                        <p style="margin: 0; color: #555; font-size: 14px;"><strong>ID de Transacción (Clover):</strong> <span style="font-family: monospace;">${orderId}</span></p>
                        <p style="margin: 5px 0 0 0; color: #555; font-size: 14px;"><strong>ID de Pedido Interno:</strong> <span style="font-family: monospace;">${supabaseOrderId || 'N/A'}</span></p>
                      </div>
                    </div>
                  </div>
                `
              });

              if (clientEmail.error) await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_resend_client', payload: clientEmail.error }]);
              else await supabaseAdmin.from('webhook_logs').insert([{ source: 'success_resend_client', payload: clientEmail.data }]);

              // CORREO ADMIN DETALLADO
              const adminEmail = await resend.emails.send({
                from: 'Notificaciones <onboarding@resend.dev>',
                to: 'gregorick.liriano@gmail.com', 
                subject: `🚨 NUEVO PEDIDO PAGADO - $${total} (ID: #${orderId.slice(-6)})`,
                html: `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 2px solid #28a745; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #28a745; padding: 15px; text-align: center;">
                      <h2 style="color: #fff; margin: 0; font-size: 20px; text-transform: uppercase;">¡Nuevo Pedido Pagado!</h2>
                    </div>
                    <div style="padding: 20px;">
                      <div style="background-color: #f4fff6; padding: 15px; border-radius: 6px; border: 1px solid #c3e6cb; margin-bottom: 20px;">
                        <p style="margin: 0 0 8px 0; color: #155724;"><strong>Monto Cobrado:</strong> <span style="font-size: 18px;">$${total}</span></p>
                        <p style="margin: 0 0 8px 0; color: #155724;"><strong>Transacción Clover ID:</strong> <span style="font-family: monospace;">${orderId}</span></p>
                        <p style="margin: 0; color: #155724;"><strong>ID de Supabase:</strong> <span style="font-family: monospace;">${supabaseOrderId || 'NO ENCONTRADO'}</span></p>
                      </div>
                      
                      <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 8px;">Lista de Trabajo a Preparar:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                          <tr style="background-color: #f8f9fa;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Producto y Detalles</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Cant.</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${Array.from(itemMap.values()).map((item: any) => `
                            <tr>
                              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                <strong>${item.name}</strong>
                                ${item.note ? `<br/><span style="font-size: 12px; color: #b30000; font-weight: bold;">⚠️ MÉTODO/NOTA: ${item.note}</span>` : ''}
                              </td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 16px; font-weight: bold;">
                                ${item.quantity}
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `
              });

              if (adminEmail.error) await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_resend_admin', payload: adminEmail.error }]);
              else await supabaseAdmin.from('webhook_logs').insert([{ source: 'success_resend_admin', payload: adminEmail.data }]);

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
      clover_merchant_id: !!process.env.CLOVER_MERCHANT_ID,
      clover_token: !!process.env.CLOVER_API_TOKEN
    }
  });
}