import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js'; 

const recentlyProcessedOrders = new Set<string>();

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fieldstone.com"; 
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Faltan credenciales de Supabase en el servidor.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const payload = await req.json();
    await supabaseAdmin.from('webhook_logs').insert([{ source: 'clover_raw_payload', payload: payload }]);

    if (payload.verificationCode || payload.challenge) {
      return NextResponse.json({ verificationCode: payload.verificationCode || payload.challenge }, { status: 200 });
    }

    const merchants = payload.merchants;
    if (!merchants) return NextResponse.json({ status: 'ok' }, { status: 200 });

    for (const merchantId in merchants) {
      const events = merchants[merchantId];
      
      for (const event of events) {
        if (event.type === "UPDATE" && event.objectId?.startsWith("O:")) {
          const orderId = event.objectId.replace("O:", "");
          
          // ⚠️ IMPORTANTE: Agregamos "payments" al expand para obtener todos los IDs posibles
          const orderRes = await fetch(`https://apisandbox.dev.clover.com/v3/merchants/${process.env.CLOVER_MERCHANT_ID}/orders/${orderId}?expand=lineItems,payments`, {
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

          if (!isPaid) continue; 

          if (!recentlyProcessedOrders.has(orderId)) {
            recentlyProcessedOrders.add(orderId);
            setTimeout(() => recentlyProcessedOrders.delete(orderId), 5 * 60 * 1000); 

            let supabaseOrderId = orderData.note || orderData.externalReferenceId || orderData.title || orderData.referenceId; 
            let clientEmailAddress = 'gregorick.liriano@gmail.com'; 
            let clientName = 'Cliente';
            let dbItems: any[] = [];
            let totalToDisplay = orderData.total ? (Number(orderData.total) / 100).toFixed(2) : "0.00";
            let dbOrder = null;

            try {
              // 🔄 SISTEMA DE BÚSQUEDA INTELIGENTE (Polling)
              // Clover es muy rápido. Buscamos hasta 5 veces (esperando 3 segs) dándole tiempo a tu web de guardar la orden.
              for (let i = 0; i < 5; i++) {
                
                if (supabaseOrderId) {
                  const { data } = await supabaseAdmin.from('orders').select('*').eq('id', supabaseOrderId).single();
                  if (data) { dbOrder = data; break; }
                }
                
                // Recopilamos el Order ID y todos los Payment IDs de Clover
                const possibleIds = [orderId];
                if (orderData.payments && orderData.payments.elements) {
                    orderData.payments.elements.forEach((p: any) => possibleIds.push(p.id));
                }

                // Buscamos en tu base de datos si alguno de esos IDs ya se guardó
                const { data } = await supabaseAdmin.from('orders').select('*').in('payment_id', possibleIds);
                if (data && data.length > 0) {
                    dbOrder = data[0];
                    supabaseOrderId = dbOrder.id;
                    break; // ¡Encontrado! Rompemos el ciclo.
                }

                // Si no lo encuentra, espera 3 segundos antes del siguiente intento
                if (i < 4) await new Promise(resolve => setTimeout(resolve, 3000));
              }

              // SI ENCONTRAMOS LA ORDEN EN SUPABASE
              if (dbOrder) {
                clientEmailAddress = dbOrder.customer_email || clientEmailAddress;
                clientName = dbOrder.customer_name || 'Cliente';
                totalToDisplay = dbOrder.total_amount ? Number(dbOrder.total_amount).toFixed(2) : totalToDisplay;
                
                const { data: itemsData } = await supabaseAdmin.from('order_items').select('*').eq('order_id', supabaseOrderId);
                if (itemsData && itemsData.length > 0) {
                  dbItems = itemsData;
                }

                await supabaseAdmin
                  .from('orders')
                  .update({ payment_status: 'paid', order_status: 'processing', payment_id: orderId })
                  .eq('id', supabaseOrderId);
              }
            } catch (dbErr) {
               await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_catch', payload: { error: String(dbErr) } }]);
            }

            // 🛡️ SISTEMA DE RESCATE: Si después de 15 segundos la BD sigue sin responder, usamos los datos de Clover.
            if (dbItems.length === 0 && orderData.lineItems?.elements) {
                const itemMap = new Map();
                orderData.lineItems.elements.forEach((item: any) => {
                    let name = item.name || "Producto sin nombre";
                    name = name.replace(/^\[\d+x\]\s*/, ''); // Borra el prefijo feo [4x]
                    const note = item.note || "";
                    const key = `${name}-${note}`;
                    let qty = 1;
                    if (item.unitQty !== undefined && item.unitQty !== null) qty = Number(item.unitQty) >= 1000 ? Number(item.unitQty) / 1000 : Number(item.unitQty);

                    if (itemMap.has(key)) {
                        itemMap.get(key).quantity += qty;
                    } else {
                        itemMap.set(key, {
                            product_name: name,
                            quantity: qty,
                            unit_price: (item.price / 100).toFixed(2),
                            size: note,
                            decoration_method: '',
                            location: '',
                            custom_logo_url: ''
                        });
                    }
                });
                dbItems = Array.from(itemMap.values());
            }

            let unifiedItemsHtml = '';

            if (dbItems.length > 0) {
              // Generamos UN SOLO DISEÑO PREMIUM (Tarjetas Grises) para ambos correos
              unifiedItemsHtml = dbItems.map((item: any) => {
                return `
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; margin-bottom: 16px;">
                    <div style="display: table; width: 100%;">
                      
                      <!-- Columna de Logo -->
                      <div style="display: table-cell; vertical-align: top; width: 90px; padding-right: 20px;">
                         <div style="width: 80px; height: 80px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; text-align: center; overflow: hidden; display: table;">
                           <div style="display: table-cell; vertical-align: middle;">
                              ${item.custom_logo_url ? `<img src="${item.custom_logo_url}" style="max-width: 100%; max-height: 100%; display: block; margin: 0 auto;" />` : `<span style="font-size: 9px; color: #9ca3af; font-weight: 900; text-transform: uppercase;">NO LOGO</span>`}
                           </div>
                         </div>
                      </div>
                      
                      <!-- Columna de Detalles -->
                      <div style="display: table-cell; vertical-align: top;">
                         <a href="${siteUrl}/products/${item.product_id || ''}" target="_blank" style="margin: 0 0 12px 0; font-size: 15px; font-weight: 900; color: #111827; text-transform: uppercase; text-decoration: none; display: block;">${item.product_name}</a>
                         
                         <table style="width: 100%; border: none; font-size: 12px; margin-bottom: 12px; border-collapse: collapse;">
                           <tr>
                             <td style="width: 50%; padding-bottom: 10px;">
                               <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Size / Color:</span><br/>
                               <span style="font-size: 13px; font-weight: 900; color: #1f2937;">${item.size || '-'} ${item.color ? '/ ' + item.color : ''}</span>
                             </td>
                             <td style="width: 50%; padding-bottom: 10px;">
                               <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Qty & Price:</span><br/>
                               <span style="font-size: 13px; font-weight: 900; color: #1f2937;">${item.quantity} x $${Number(item.unit_price).toFixed(2)}</span>
                             </td>
                           </tr>
                           <tr>
                             <td>
                               <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Decoration:</span><br/>
                               <span style="font-size: 13px; font-weight: 900; color: #1f2937;">${item.decoration_method || '-'}</span>
                             </td>
                             <td>
                               <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Location:</span><br/>
                               <span style="font-size: 13px; font-weight: 900; color: #1f2937;">${item.location || '-'}</span>
                             </td>
                           </tr>
                         </table>

                         ${item.extra_comments ? `
                         <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                           <span style="font-size: 9px; font-weight: 900; color: #d97706; text-transform: uppercase; letter-spacing: 1px;">Extra Comments / Instructions:</span><br/>
                           <span style="font-size: 12px; font-weight: 500; color: #92400e; font-style: italic;">"${item.extra_comments}"</span>
                         </div>` : ''}

                         ${item.custom_logo_url ? `
                         <div style="margin-top: 8px;">
                           <a href="${item.custom_logo_url}" target="_blank" style="font-size: 12px; font-weight: 900; color: #2563eb; text-decoration: none;">📎 Download Logo File</a>
                         </div>` : ''}
                      </div>

                    </div>
                  </div>
                `;
              }).join('');

            } else {
              unifiedItemsHtml = `<div style="padding:20px; text-align:center; color:red; border:1px solid red; border-radius: 8px;">⚠️ Error interno: Detalle de productos no disponible temporalmente.</div>`;
            }

            try {
              // ==========================================
              // CORREO 1: PARA EL CLIENTE (Diseño Actualizado)
              // ==========================================
              const clientEmail = await resend.emails.send({
                from: 'Fieldstone Embroidery <onboarding@resend.dev>',
                to: clientEmailAddress, 
                subject: `¡Gracias por tu compra, ${clientName}! Pedido #${supabaseOrderId ? supabaseOrderId.split('-')[0] : orderId.slice(-6)}`,
                html: `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: #000; padding: 24px; text-align: center;">
                      <h1 style="color: #fff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Fieldstone Embroidery</h1>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff;">
                      <h2 style="color: #111827; margin-top: 0; font-size: 22px;">¡Hola ${clientName}! Hemos recibido tu pedido.</h2>
                      <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">Tu pago se ha procesado correctamente y estamos listos para empezar a preparar tus artículos personalizados. Aquí tienes el desglose exacto de tu compra:</p>
                      
                      <!-- TARJETAS DE PRODUCTOS (Mismo UI del Admin) -->
                      <div style="margin-bottom: 25px;">
                        ${unifiedItemsHtml}
                      </div>

                      <div style="text-align: right; padding: 20px 0; border-top: 2px solid #f3f4f6; margin-bottom: 25px;">
                        <span style="font-size: 16px; color: #374151; font-weight: 900; text-transform: uppercase;">Total Pagado:</span>
                        <span style="font-size: 24px; color: #10b981; font-weight: 900; margin-left: 15px;">$${totalToDisplay}</span>
                      </div>

                      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #000;">
                        <p style="margin: 0; color: #374151; font-size: 14px;"><strong>ID de Transacción:</strong> <span style="font-family: monospace; font-size: 15px;">${orderId}</span></p>
                        <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;"><strong>ID de Pedido Interno:</strong> <span style="font-family: monospace; font-size: 15px;">${supabaseOrderId || 'Procesando...'}</span></p>
                      </div>
                    </div>
                  </div>
                `
              });

              if (clientEmail.error) await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_resend_client', payload: clientEmail.error }]);

              // ==========================================
              // CORREO 2: PARA EL ADMIN
              // ==========================================
              const adminEmail = await resend.emails.send({
                from: 'Notificaciones <onboarding@resend.dev>',
                to: 'gregorick.liriano@gmail.com', 
                subject: `🚨 NUEVO PEDIDO PAGADO - $${totalToDisplay} (ID: #${supabaseOrderId ? supabaseOrderId.split('-')[0] : orderId.slice(-6)})`,
                html: `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 2px solid #10b981; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                    <div style="background-color: #10b981; padding: 20px; text-align: center;">
                      <h2 style="color: #fff; margin: 0; font-size: 22px; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">¡Nuevo Pedido Pagado!</h2>
                    </div>
                    
                    <div style="padding: 24px;">
                      
                      <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; border: 1px solid #a7f3d0; margin-bottom: 24px;">
                        <table style="width: 100%; border: none;">
                          <tr>
                            <td style="padding-bottom: 16px;">
                              <span style="font-size: 10px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">Monto Cobrado</span><br/>
                              <span style="font-size: 24px; font-weight: 900; color: #065f46;">$${totalToDisplay}</span>
                            </td>
                            <td style="padding-bottom: 16px;">
                              <span style="font-size: 10px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">ID de Pedido (Supabase)</span><br/>
                              <span style="font-size: 15px; font-weight: 900; font-family: monospace; color: #065f46;">${supabaseOrderId || 'NO ENCONTRADO'}</span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <span style="font-size: 10px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">Cliente</span><br/>
                              <span style="font-size: 14px; font-weight: 700; color: #065f46;">${clientName} (<a href="mailto:${clientEmailAddress}" style="color: #047857;">${clientEmailAddress}</a>)</span>
                            </td>
                            <td>
                              <span style="font-size: 10px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">Transacción Clover ID</span><br/>
                              <span style="font-size: 14px; font-weight: 700; font-family: monospace; color: #065f46;">${orderId}</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <h3 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">
                        Products (${dbItems.length})
                      </h3>
                      
                      <div style="margin-top: 16px;">
                        ${unifiedItemsHtml}
                      </div>

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