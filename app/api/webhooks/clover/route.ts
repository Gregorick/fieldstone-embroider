import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js'; 

const recentlyProcessedOrders = new Set<string>();

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fieldstone.com"; // Ajusta a tu dominio
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Faltan credenciales de Supabase en el servidor.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const payload = await req.json();

    // Log del payload
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

          if (!isPaid) continue; 

          if (!recentlyProcessedOrders.has(orderId)) {
            recentlyProcessedOrders.add(orderId);
            setTimeout(() => recentlyProcessedOrders.delete(orderId), 5 * 60 * 1000); 

            // 1. OBTENER EL ID DE SUPABASE 
            let supabaseOrderId = orderData.note || orderData.externalReferenceId || orderData.title || orderData.referenceId; 
            
            let clientEmailAddress = 'gregorick.liriano@gmail.com'; 
            let clientName = 'Cliente';
            let dbItems: any[] = [];
            let totalToDisplay = orderData.total ? (Number(orderData.total) / 100).toFixed(2) : "0.00";

            try {
              // Si Clover no nos manda el ID por nota, hacemos un fallback buscando por el ID de pago que la página web haya guardado
              if (!supabaseOrderId) {
                 const { data: existingOrder } = await supabaseAdmin.from('orders').select('id').eq('payment_id', orderId).single();
                 if (existingOrder) supabaseOrderId = existingOrder.id;
              }

              if (supabaseOrderId) {
                const { data: dbOrder } = await supabaseAdmin.from('orders').select('*').eq('id', supabaseOrderId).single();
                
                if (dbOrder) {
                  clientEmailAddress = dbOrder.customer_email || clientEmailAddress;
                  clientName = dbOrder.customer_name || 'Cliente';
                  totalToDisplay = dbOrder.total_amount ? Number(dbOrder.total_amount).toFixed(2) : totalToDisplay;
                  
                  // Traemos los items usando Supabase (Fuente de la verdad absoluta, ignora la de Clover)
                  const { data: itemsData } = await supabaseAdmin.from('order_items').select('*').eq('order_id', supabaseOrderId);
                  if (itemsData && itemsData.length > 0) {
                    dbItems = itemsData;
                  }
                }

                // Actualizar estado de la orden
                const { error: dbError } = await supabaseAdmin
                  .from('orders')
                  .update({ payment_status: 'paid', order_status: 'processing', payment_id: orderId })
                  .eq('id', supabaseOrderId);
                  
                if (dbError) await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_update', payload: dbError }]);
              }
            } catch (dbErr) {
               await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_supabase_catch', payload: { error: String(dbErr) } }]);
            }

            // 2. GENERAR HTML DESDE SUPABASE DIRECTAMENTE (Garantiza todos los detalles y fotos)
            let clientItemsHtml = '';
            let adminItemsHtml = '';

            if (dbItems.length > 0) {
              
              // ==========================================
              // HTML: PRODUCTOS PARA EL CLIENTE (LIMPIO)
              // ==========================================
              clientItemsHtml = dbItems.map((item: any) => {
                const unitPrice = Number(item.unit_price).toFixed(2); 
                const lineTotal = (item.quantity * Number(item.unit_price)).toFixed(2);
                const productUrl = item.product_id ? `${siteUrl}/products/${item.product_id}` : "#"; 

                let extraDetails = '';
                if (item.size || item.color) extraDetails += `<strong>Talla/Color:</strong> ${item.size || ''} ${item.color || ''}<br/>`;
                if (item.decoration_method) extraDetails += `<strong>Método:</strong> ${item.decoration_method}<br/>`;
                if (item.location) extraDetails += `<strong>Ubicación:</strong> ${item.location}<br/>`;
                if (item.extra_comments) extraDetails += `<strong>Notas Adicionales:</strong> ${item.extra_comments}<br/>`;
                if (item.custom_logo_url) extraDetails += `<strong>Logo:</strong> <a href="${item.custom_logo_url}" target="_blank" style="color: #0056b3; text-decoration: underline;">Descargar Archivo</a>`;

                const noteHtml = extraDetails ? `<div style="font-size: 12px; color: #555; background-color: #f1f1f1; padding: 10px; border-radius: 6px; display: block; margin-top: 6px; line-height: 1.6;">${extraDetails}</div>` : '';
                
                return `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: left;">
                      <a href="${productUrl}" target="_blank" style="color: #111; font-size: 14px; font-weight: 900; text-decoration: underline; text-transform: uppercase;">${item.product_name}</a>
                      ${noteHtml}
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: center; color: #555; font-weight: bold;">${item.quantity}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right; color: #555;">$${unitPrice}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 900; color: #000;">$${lineTotal}</td>
                  </tr>
                `;
              }).join('');

              // ==========================================
              // HTML: PRODUCTOS PARA EL ADMIN (DISEÑO EXACTO AL DASHBOARD)
              // ==========================================
              adminItemsHtml = dbItems.map((item: any) => {
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
                         <a href="${siteUrl}/products/${item.product_id}" target="_blank" style="margin: 0 0 12px 0; font-size: 15px; font-weight: 900; color: #111827; text-transform: uppercase; text-decoration: none; display: block;">${item.product_name}</a>
                         
                         <table style="width: 100%; border: none; font-size: 12px; margin-bottom: 12px; border-collapse: collapse;">
                           <tr>
                             <td style="width: 50%; padding-bottom: 10px;">
                               <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Size / Color:</span><br/>
                               <span style="font-size: 13px; font-weight: 900; color: #1f2937;">${item.size || '-'} / ${item.color || '-'}</span>
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
              // Si por algún motivo extremo la Base de datos fallara en traer los items, pone un mensaje de error visual.
              clientItemsHtml = `<tr><td colspan="4" style="padding:20px; text-align:center;">Detalles del pedido en proceso...</td></tr>`;
              adminItemsHtml = `<div style="padding:20px; text-align:center; color:red; border:1px solid red;">⚠️ Error interno: No se pudieron extraer los detalles de Supabase para la orden: ${supabaseOrderId}</div>`;
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
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #555; font-size: 11px; text-transform: uppercase; font-weight: 900;">Producto / Detalles</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; color: #555; font-size: 11px; text-transform: uppercase; font-weight: 900;">Cant.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; color: #555; font-size: 11px; text-transform: uppercase; font-weight: 900;">Precio Un.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; color: #555; font-size: 11px; text-transform: uppercase; font-weight: 900;">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${clientItemsHtml}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colspan="3" style="padding: 15px 12px; text-align: right; font-size: 16px; color: #333; font-weight: 900;">Total Pagado:</td>
                            <td style="padding: 15px 12px; text-align: right; font-size: 18px; color: #28a745; font-weight: 900;">$${totalToDisplay}</td>
                          </tr>
                        </tfoot>
                      </table>

                      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #000;">
                        <p style="margin: 0; color: #333; font-size: 14px;"><strong>ID de Transacción:</strong> <span style="font-family: monospace; font-size: 15px;">${orderId}</span></p>
                        <p style="margin: 8px 0 0 0; color: #333; font-size: 14px;"><strong>ID de Pedido Interno:</strong> <span style="font-family: monospace; font-size: 15px;">${supabaseOrderId || 'En sistema'}</span></p>
                      </div>
                    </div>
                  </div>
                `
              });

              if (clientEmail.error) await supabaseAdmin.from('webhook_logs').insert([{ source: 'error_resend_client', payload: clientEmail.error }]);

              // ==========================================
              // CORREO 2: PARA EL ADMINISTRADOR (UI CLONADA DEL DASHBOARD)
              // ==========================================
              const adminEmail = await resend.emails.send({
                from: 'Notificaciones <onboarding@resend.dev>',
                to: 'gregorick.liriano@gmail.com', 
                subject: `🚨 NUEVO PEDIDO PAGADO - $${totalToDisplay} (ID: #${supabaseOrderId ? supabaseOrderId.split('-')[0] : orderId.slice(-6)})`,
                html: `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 2px solid #28a745; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                    <div style="background-color: #28a745; padding: 20px; text-align: center;">
                      <h2 style="color: #fff; margin: 0; font-size: 22px; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">¡Nuevo Pedido Pagado!</h2>
                    </div>
                    
                    <div style="padding: 24px;">
                      
                      <!-- TARJETA DE INFO DE PAGO SUPERIOR -->
                      <div style="background-color: #f4fff6; padding: 20px; border-radius: 12px; border: 1px solid #c3e6cb; margin-bottom: 24px;">
                        <table style="width: 100%; border: none;">
                          <tr>
                            <td style="padding-bottom: 12px;">
                              <span style="font-size: 10px; font-weight: 900; color: #155724; text-transform: uppercase; letter-spacing: 1px;">Monto Cobrado</span><br/>
                              <span style="font-size: 20px; font-weight: 900; color: #155724;">$${totalToDisplay}</span>
                            </td>
                            <td style="padding-bottom: 12px;">
                              <span style="font-size: 10px; font-weight: 900; color: #155724; text-transform: uppercase; letter-spacing: 1px;">ID de Pedido (Supabase)</span><br/>
                              <span style="font-size: 15px; font-weight: 900; font-family: monospace; color: #155724;">${supabaseOrderId || 'NO ENCONTRADO'}</span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <span style="font-size: 10px; font-weight: 900; color: #155724; text-transform: uppercase; letter-spacing: 1px;">Cliente</span><br/>
                              <span style="font-size: 14px; font-weight: 700; color: #155724;">${clientName} (<a href="mailto:${clientEmailAddress}" style="color: #0c3d17;">${clientEmailAddress}</a>)</span>
                            </td>
                            <td>
                              <span style="font-size: 10px; font-weight: 900; color: #155724; text-transform: uppercase; letter-spacing: 1px;">Transacción Clover ID</span><br/>
                              <span style="font-size: 14px; font-weight: 700; font-family: monospace; color: #155724;">${orderId}</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <h3 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">
                        Products (${dbItems.length})
                      </h3>
                      
                      <!-- LISTA DE PRODUCTOS CON DISEÑO DE DASHBOARD -->
                      <div style="margin-top: 16px;">
                        ${adminItemsHtml}
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