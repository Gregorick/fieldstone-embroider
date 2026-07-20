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
          
          await supabaseAdmin.from('webhook_logs').insert([{ 
            source: 'debug_payment_state', 
            payload: { orderId: orderId, state: paymentState, isPaid: isPaid } 
          }]);

          if (!isPaid) continue; 

          if (!recentlyProcessedOrders.has(orderId)) {
            recentlyProcessedOrders.add(orderId);
            setTimeout(() => recentlyProcessedOrders.delete(orderId), 5 * 60 * 1000); 

            // 1. OBTENER EL ID DE SUPABASE DESDE CLOVER
            const supabaseOrderId = orderData.note || orderData.externalReferenceId || orderData.title; 
            
            // 2. BUSCAR DATOS EN SUPABASE (orders y order_items)
            let clientEmailAddress = 'gregorick.liriano@gmail.com'; 
            let clientName = 'Cliente';
            let dbItems: any[] = [];

            try {
              if (supabaseOrderId) {
                const { data: dbOrder } = await supabaseAdmin.from('orders').select('*').eq('id', supabaseOrderId).single();
                
                if (dbOrder) {
                  clientEmailAddress = dbOrder.customer_email || clientEmailAddress;
                  clientName = dbOrder.customer_name || 'Cliente';
                  
                  // Traemos los items usando el nombre exacto de tu tabla
                  const { data: itemsData } = await supabaseAdmin.from('order_items').select('*').eq('order_id', supabaseOrderId);
                  if (itemsData && itemsData.length > 0) {
                    dbItems = itemsData;
                  }
                }

                // Actualizar estado de la orden
                const { error: dbError } = await supabaseAdmin
                  .from('orders')
                  .update({ 
                    payment_status: 'paid', 
                    order_status: 'processing', 
                    payment_id: orderId 
                  })
                  .eq('id', supabaseOrderId);
                  
                if (dbError) await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_update', payload: dbError }]);
              } else {
                await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_missing_id', payload: { message: "No se encontró el ID de Supabase en Clover" } }]);
              }
            } catch (dbErr) {
               await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_catch', payload: { error: String(dbErr) } }]);
            }

            // 3. AGRUPAR PRODUCTOS DE CLOVER
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

            // 4. GENERAR HTML PARA LOS CORREOS FUSIONANDO DATOS EXACTOS DE LA BD
            const clientItemsHtml = Array.from(itemMap.values()).map((item: any, index: number) => {
              // Buscar coincidencia en la BD
              const dbItem = dbItems.find(dbI => dbI.product_name === item.name) || dbItems[index] || {};
              
              const unitPrice = item.price ? (item.price / 100).toFixed(2) : "0.00"; 
              const lineTotal = ((item.price * item.quantity) / 100).toFixed(2);
              
              // --- VARIABLES EXACTAS SEGÚN TUS CAPTURAS DE PANTALLA ---
              const productUrl = dbItem.product_id ? `/products/${dbItem.product_id}` : "#"; // Genera el link usando el ID
              const logoUrl = dbItem.custom_logo_url || "";
              const method = dbItem.decoration_method || "";
              const location = dbItem.location || "";
              const color = dbItem.color || "";
              const size = dbItem.size || "";
              const extraComments = dbItem.extra_comments || "";

              let extraDetails = '';
              if (size || color) extraDetails += `<strong>Talla/Color:</strong> ${size} ${color}<br/>`;
              if (method) extraDetails += `<strong>Método:</strong> ${method}<br/>`;
              if (location) extraDetails += `<strong>Ubicación:</strong> ${location}<br/>`;
              if (extraComments) extraDetails += `<strong>Notas Adicionales:</strong> ${extraComments}<br/>`;
              if (logoUrl) extraDetails += `<strong>Logo:</strong> <a href="${logoUrl}" target="_blank" style="color: #0056b3; text-decoration: underline;">Descargar Archivo</a>`;

              const noteHtml = extraDetails ? `<div style="font-size: 12px; color: #555; background-color: #f1f1f1; padding: 6px 8px; border-radius: 4px; display: block; margin-top: 6px; line-height: 1.5;">${extraDetails}</div>` : '';
              
              return `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: left;">
                    <a href="${productUrl}" target="_blank" style="color: #333; font-size: 15px; font-weight: bold; text-decoration: underline;">${item.name}</a>
                    ${noteHtml}
                  </td>
                  <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: center; color: #555;">${item.quantity}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right; color: #555;">$${unitPrice}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: bold; color: #000;">$${lineTotal}</td>
                </tr>
              `;
            }).join('');

            const adminItemsHtml = Array.from(itemMap.values()).map((item: any, index: number) => {
              const dbItem = dbItems.find(dbI => dbI.product_name === item.name) || dbItems[index] || {};
              
              const logoUrl = dbItem.custom_logo_url || "";
              const method = dbItem.decoration_method || "";
              const location = dbItem.location || "";
              const color = dbItem.color || "";
              const size = dbItem.size || "";
              const extraComments = dbItem.extra_comments || "";

              let extraDetails = '';
              if (size || color) extraDetails += `Talla/Color: ${size} ${color} | `;
              if (method) extraDetails += `Método: ${method} | `;
              if (location) extraDetails += `Ubicación: ${location}`;

              return `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <strong style="font-size: 15px;">${item.name}</strong>
                    ${extraDetails ? `<br/><span style="font-size: 13px; color: #b30000; font-weight: bold;">⚠️ DETALLES: ${extraDetails}</span>` : ''}
                    ${extraComments ? `<br/><span style="font-size: 13px; color: #b30000;">📝 <strong>Notas Cliente:</strong> ${extraComments}</span>` : ''}
                    ${logoUrl ? `<br/><span style="font-size: 13px;">📎 <a href="${logoUrl}" target="_blank" style="color: #0056b3; font-weight: bold;">Ver/Descargar Logo Original</a></span>` : ''}
                  </td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-size: 16px; font-weight: bold;">
                    ${item.quantity}
                  </td>
                </tr>
              `;
            }).join('');

            const total = orderData.total ? (Number(orderData.total) / 100).toFixed(2) : "0.00";

            try {
              // ==========================================
              // CORREO 1: PARA EL CLIENTE
              // ==========================================
              const clientEmail = await resend.emails.send({
                from: 'Fieldstone Embroidery <onboarding@resend.dev>',
                to: clientEmailAddress, 
                subject: `¡Gracias por tu compra, ${clientName}! Pedido #${supabaseOrderId ? supabaseOrderId.split('-')[0] : orderId.slice(-6)}`,
                html: `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #000; padding: 20px; text-align: center;">
                      <h1 style="color: #fff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Fieldstone Embroidery</h1>
                    </div>
                    <div style="padding: 30px;">
                      <h2 style="color: #333; margin-top: 0;">¡Hola ${clientName}! Hemos recibido tu pedido.</h2>
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
                          ${clientItemsHtml}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colspan="3" style="padding: 15px 12px; text-align: right; font-size: 16px; color: #333;"><strong>Total Pagado:</strong></td>
                            <td style="padding: 15px 12px; text-align: right; font-size: 18px; color: #28a745; font-weight: bold;">$${total}</td>
                          </tr>
                        </tfoot>
                      </table>

                      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #000;">
                        <p style="margin: 0; color: #555; font-size: 14px;"><strong>ID de Transacción:</strong> <span style="font-family: monospace;">${orderId}</span></p>
                        <p style="margin: 5px 0 0 0; color: #555; font-size: 14px;"><strong>ID de Pedido Interno:</strong> <span style="font-family: monospace;">${supabaseOrderId || 'N/A'}</span></p>
                      </div>
                    </div>
                  </div>
                `
              });

              if (clientEmail.error) await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_resend_client', payload: clientEmail.error }]);

              // ==========================================
              // CORREO 2: PARA EL ADMINISTRADOR
              // ==========================================
              const adminEmail = await resend.emails.send({
                from: 'Notificaciones <onboarding@resend.dev>',
                to: 'gregorick.liriano@gmail.com', 
                subject: `🚨 NUEVO PEDIDO PAGADO - $${total} (ID: #${supabaseOrderId || orderId.slice(-6)})`,
                html: `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 2px solid #28a745; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #28a745; padding: 15px; text-align: center;">
                      <h2 style="color: #fff; margin: 0; font-size: 20px; text-transform: uppercase;">¡Nuevo Pedido Pagado!</h2>
                    </div>
                    <div style="padding: 20px;">
                      <div style="background-color: #f4fff6; padding: 15px; border-radius: 6px; border: 1px solid #c3e6cb; margin-bottom: 20px;">
                        <p style="margin: 0 0 8px 0; color: #155724;"><strong>Monto Cobrado:</strong> <span style="font-size: 18px; font-weight: bold;">$${total}</span></p>
                        <p style="margin: 0 0 8px 0; color: #155724;"><strong>Cliente:</strong> ${clientName} (<a href="mailto:${clientEmailAddress}">${clientEmailAddress}</a>)</p>
                        <p style="margin: 0 0 8px 0; color: #155724;"><strong>Transacción ID:</strong> <span style="font-family: monospace;">${orderId}</span></p>
                        <p style="margin: 0; color: #155724;"><strong>ID de Pedido (Supabase):</strong> <span style="font-family: monospace; font-weight: bold;">${supabaseOrderId || 'NO ENCONTRADO'}</span></p>
                      </div>
                      
                      <h3 style="color: #333; border-bottom: 1px solid #ccc; padding-bottom: 8px;">Lista de Trabajo a Preparar:</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                          <tr style="background-color: #f8f9fa;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Producto y Detalles Completos</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Cant.</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${adminItemsHtml}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `
              });

              if (adminEmail.error) await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_resend_admin', payload: adminEmail.error }]);

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
    status: "Activo"
  });
}