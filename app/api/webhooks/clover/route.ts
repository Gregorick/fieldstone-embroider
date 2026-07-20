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
          
          const orderRes = await fetch(`https://apisandbox.dev.clover.com/v3/merchants/${process.env.CLOVER_MERCHANT_ID}/orders/${orderId}?expand=lineItems,payments`, {
            headers: { 
              'Authorization': `Bearer ${process.env.CLOVER_API_TOKEN}`, 
              'Content-Type': 'application/json'
            }
          });
          
          if (!orderRes.ok) continue; 
          
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
              // ⏳ ESPERA ESTRATÉGICA Y BÚSQUEDA EXHAUSTIVA
              await new Promise(resolve => setTimeout(resolve, 3000));
              const exactTotal = (Number(orderData.total) / 100).toFixed(2);
              
              for (let i = 0; i < 4; i++) {
                
                // 1. Buscar por ID Directo
                if (supabaseOrderId) {
                  const { data } = await supabaseAdmin.from('orders').select('*').eq('id', supabaseOrderId).single();
                  if (data) { dbOrder = data; break; }
                }
                
                // 2. Buscar por Payment ID
                const possibleIds = [orderId];
                if (orderData.payments?.elements) {
                    orderData.payments.elements.forEach((p: any) => possibleIds.push(p.id));
                }
                const { data: payData } = await supabaseAdmin.from('orders').select('*').in('payment_id', possibleIds);
                if (payData && payData.length > 0) {
                    dbOrder = payData[0];
                    supabaseOrderId = dbOrder.id;
                    break;
                }

                // 3. Buscar por Monto Exacto (IGNORANDO LAS YA PAGADAS PARA EVITAR CHOQUES)
                if (!dbOrder) {
                  const { data: recentOrders } = await supabaseAdmin.from('orders')
                    .select('*')
                    .is('payment_id', null) // Busca órdenes sin ID de Clover asignado
                    .order('created_at', { ascending: false })
                    .limit(15);
                    
                  if (recentOrders) {
                    const matchedOrder = recentOrders.find((o: any) => Number(o.total_amount).toFixed(2) === exactTotal);
                    if (matchedOrder) {
                      dbOrder = matchedOrder;
                      supabaseOrderId = dbOrder.id;
                      break; 
                    }
                  }
                }

                if (i < 3) await new Promise(resolve => setTimeout(resolve, 3000));
              }

              // ✅ ORDEN ENCONTRADA: EXTRAER DETALLES Y GUARDAR ID DE CLOVER
              if (dbOrder) {
                clientEmailAddress = dbOrder.customer_email || clientEmailAddress;
                clientName = dbOrder.customer_name || 'Cliente';
                totalToDisplay = dbOrder.total_amount ? Number(dbOrder.total_amount).toFixed(2) : totalToDisplay;
                
                // ACTUALIZAMOS LA TABLA ORDERS CON EL ID DE CLOVER
                await supabaseAdmin.from('orders').update({ payment_status: 'paid', order_status: 'processing', payment_id: orderId }).eq('id', supabaseOrderId);
                
                // DOBLE BÚSQUEDA DE TABLA (order_items o item_orders)
                let { data: itemsData, error: err1 } = await supabaseAdmin.from('order_items').select('*').eq('order_id', supabaseOrderId);
                
                if (err1 || !itemsData || itemsData.length === 0) {
                   const { data: itemsData2 } = await supabaseAdmin.from('item_orders').select('*').eq('order_id', supabaseOrderId);
                   if (itemsData2) itemsData = itemsData2;
                }

                if (itemsData && itemsData.length > 0) {
                  dbItems = itemsData;
                }
              }
            } catch (dbErr) { 
              await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_catch', payload: { error: String(dbErr) } }]);
            }

            // FALLBACK EXTREMO (Solo si Supabase falla)
            if (dbItems.length === 0 && orderData.lineItems?.elements) {
                const itemMap = new Map();
                orderData.lineItems.elements.forEach((item: any) => {
                    let name = item.name || "Producto sin nombre";
                    name = name.replace(/^\[\d+x\]\s*/, ''); 
                    const note = item.note || "";
                    const key = `${name}-${note}`;
                    let qty = 1;
                    if (item.unitQty !== undefined && item.unitQty !== null) qty = Number(item.unitQty) >= 1000 ? Number(item.unitQty) / 1000 : Number(item.unitQty);
                    if (itemMap.has(key)) { itemMap.get(key).quantity += qty; } else {
                        itemMap.set(key, { product_name: name, quantity: qty, unit_price: (item.price / 100).toFixed(2), size: note, decoration_method: '', location: '', custom_logo_url: '' });
                    }
                });
                dbItems = Array.from(itemMap.values());
            }

            let unifiedItemsHtml = '';

            // GENERADOR DE TARJETAS HTML PREMIUM (Para Cliente y Admin)
            if (dbItems.length > 0) {
              unifiedItemsHtml = dbItems.map((item: any) => {
                const logoUrl = item.custom_logo_url || '';
                const pName = item.product_name || 'Producto';
                const pSize = item.size || '-';
                const pColor = item.color || '';
                const pMethod = item.decoration_method || '-';
                const pLocation = item.location || '-';
                const pPrice = Number(item.unit_price).toFixed(2);
                const comments = item.extra_comments || '';

                return `
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- Columna Logo -->
                        <td width="80" valign="top" style="padding-right: 16px;">
                          <div style="width: 80px; height: 80px; background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; overflow: hidden; display: table;">
                            <div style="display: table-cell; vertical-align: middle;">
                              ${logoUrl ? `<img src="${logoUrl}" style="max-width: 100%; max-height: 100%; display: block; margin: 0 auto;" />` : `<span style="font-size: 9px; color: #9ca3af; font-weight: 900; letter-spacing: 1px;">NO LOGO</span>`}
                            </div>
                          </div>
                        </td>
                        <!-- Columna Detalles -->
                        <td valign="top">
                          <a href="${siteUrl}/products/${item.product_id || ''}" style="font-size: 14px; font-weight: 900; color: #111827; text-transform: uppercase; text-decoration: none; display: block; margin-bottom: 10px;">${pName}</a>
                          
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px;">
                            <tr>
                              <td width="50%" valign="top" style="padding-bottom: 8px;">
                                <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Size / Color:</span><br/>
                                <span style="font-size: 12px; font-weight: 800; color: #1f2937;">${pSize} ${pColor ? '/ ' + pColor : ''}</span>
                              </td>
                              <td width="50%" valign="top" style="padding-bottom: 8px;">
                                <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Qty & Price:</span><br/>
                                <span style="font-size: 12px; font-weight: 800; color: #1f2937;">${item.quantity} x $${pPrice}</span>
                              </td>
                            </tr>
                            <tr>
                              <td valign="top">
                                <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Decoration:</span><br/>
                                <span style="font-size: 12px; font-weight: 800; color: #1f2937;">${pMethod}</span>
                              </td>
                              <td valign="top">
                                <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Location:</span><br/>
                                <span style="font-size: 12px; font-weight: 800; color: #1f2937;">${pLocation}</span>
                              </td>
                            </tr>
                          </table>
                          
                          ${comments ? `
                          <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
                            <span style="font-size: 9px; font-weight: 900; color: #d97706; text-transform: uppercase; letter-spacing: 1px;">Extra Comments:</span><br/>
                            <span style="font-size: 11px; font-weight: 600; color: #92400e; font-style: italic;">"${comments}"</span>
                          </div>` : ''}

                          ${logoUrl ? `
                          <div style="margin-top: 6px;">
                            <a href="${logoUrl}" target="_blank" style="font-size: 11px; font-weight: 900; color: #2563eb; text-decoration: none;">📎 Download Logo File</a>
                          </div>` : ''}
                        </td>
                      </tr>
                    </table>
                  </div>
                `;
              }).join('');
            } else {
              unifiedItemsHtml = `<div style="padding:20px; text-align:center; color:red; border:1px solid red; border-radius: 8px;">⚠️ Error: Detalles visuales en proceso de sincronización.</div>`;
            }

            try {
              // ==========================================
              // CORREO 1: PARA EL CLIENTE
              // ==========================================
              const clientEmail = await resend.emails.send({
                from: 'Fieldstone Embroidery <onboarding@resend.dev>',
                to: clientEmailAddress, 
                subject: `¡Gracias por tu compra, ${clientName}! Pedido #${supabaseOrderId ? supabaseOrderId.split('-')[0] : orderId.slice(-6)}`,
                html: `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                    <div style="background-color: #000; padding: 24px; text-align: center;">
                      <h1 style="color: #fff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Fieldstone Embroidery</h1>
                    </div>
                    <div style="padding: 30px;">
                      <h2 style="color: #111827; margin-top: 0; font-size: 22px;">¡Hola ${clientName}! Hemos recibido tu pedido.</h2>
                      <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">Tu pago se ha procesado correctamente y estamos listos para empezar a preparar tus artículos personalizados. Aquí tienes el desglose exacto de tu compra:</p>
                      
                      <div style="margin-bottom: 25px;">
                        ${unifiedItemsHtml}
                      </div>

                      <div style="text-align: right; padding: 20px 0; border-top: 2px solid #f3f4f6; margin-bottom: 25px;">
                        <span style="font-size: 16px; color: #374151; font-weight: 900; text-transform: uppercase;">Total Pagado:</span>
                        <span style="font-size: 24px; color: #10b981; font-weight: 900; margin-left: 15px;">$${totalToDisplay}</span>
                      </div>

                      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #000;">
                        <p style="margin: 0; color: #374151; font-size: 14px;"><strong>ID de Transacción:</strong> <span style="font-family: monospace; font-size: 15px;">${orderId}</span></p>
                        <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;"><strong>ID de Pedido Interno:</strong> <span style="font-family: monospace; font-size: 15px;">${dbOrder ? dbOrder.id : (supabaseOrderId || 'En proceso')}</span></p>
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
                              <span style="font-size: 10px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">ID de Pedido Interno</span><br/>
                              <span style="font-size: 15px; font-weight: 900; font-family: monospace; color: #065f46;">${dbOrder ? dbOrder.id : 'NO ENCONTRADO'}</span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <span style="font-size: 10px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">Cliente</span><br/>
                              <span style="font-size: 14px; font-weight: 700; color: #065f46;">${clientName} (<a href="mailto:${clientEmailAddress}" style="color: #047857;">${clientEmailAddress}</a>)</span>
                            </td>
                            <td>
                              <span style="font-size: 10px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">ID de Transacción Clover</span><br/>
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