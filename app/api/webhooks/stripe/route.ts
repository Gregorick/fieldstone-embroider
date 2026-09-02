import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(req: Request) {
  // 1. INICIALIZACIONES EN TIEMPO REAL (Obliga a leer las variables de cPanel)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2026-07-29.dahlia',
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const resend = new Resend(process.env.RESEND_API_KEY);

  // 2. OBTENER DATOS DE LA SOLICITUD
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://fieldstoneembroidery.com/fieldstone-embroider";
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Si el pago fue completado con éxito
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId; 
    const paymentIntentId = session.payment_intent as string; 

    if (orderId) {
      console.log(`Procesando orden ${orderId} con Stripe ID: ${paymentIntentId}`);
      
      // 1. Actualizamos la orden en Supabase y RECUPERAMOS LOS DATOS
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'paid',
          order_status: 'processing',
          payment_id: paymentIntentId 
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        console.error('Error actualizando Supabase:', updateError);
        return NextResponse.json({ error: "Fallo al actualizar Supabase", details: updateError }, { status: 500 });
      }
      
      if (!updatedOrder) {
        return NextResponse.json({ error: "No se encontro la orden en Supabase" }, { status: 404 });
      }

      // 2. OBTENER DATOS DEL CLIENTE Y ENVÍO PARA EL CORREO
      const clientEmailAddress = updatedOrder.customer_email || 'correo_no_registrado@ejemplo.com';
      const clientName = updatedOrder.customer_name || 'Valued Customer';
      const totalToDisplay = Number(updatedOrder.total_amount).toFixed(2);
      const shortOrderId = orderId.split('-')[0].toUpperCase();

      // 🔥 LÓGICA DE DIRECCIÓN HTML LIMPIA (Sin referencias a llamadas)
      const shippingMethod = updatedOrder.shipping_method || 'shipping';
      
      let deliveryHtml = '';
      if (shippingMethod === 'pickup') {
        deliveryHtml = `
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 8px 0; color: #065f46; font-size: 14px; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">📍 Local Pickup Order</h3>
            <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.5;">
              We will notify you via email as soon as your order is ready for pickup at our facility:<br/>
              <strong>104 Kingston St, Lawrence, MA 01843</strong>
            </p>
          </div>
        `;
      } else {
        const address = updatedOrder.shipping_address || 'Address not provided';
        const city = updatedOrder.shipping_city || '';
        const state = updatedOrder.shipping_state || '';
        const zip = updatedOrder.shipping_zip || '';
        const phone = updatedOrder.shipping_phone || 'No phone provided';

        deliveryHtml = `
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">🚚 Delivery Address</h3>
            <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
              <strong>${clientName}</strong><br/>
              ${address}<br/>
              ${city}, ${state} ${zip}<br/>
              📞 ${phone}
            </p>
          </div>
        `;
      }
      
      let dbItems: any[] = [];
      
      let { data: itemsData } = await supabase.from('order_items').select('*').eq('order_id', orderId);
      if (!itemsData || itemsData.length === 0) {
          const { data: itemsData2 } = await supabase.from('item_orders').select('*').eq('order_id', orderId);
          if (itemsData2) itemsData = itemsData2;
      }

      if (itemsData && itemsData.length > 0) {
        dbItems = itemsData;
      }

      let unifiedItemsHtml = '';
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
                  <td width="80" valign="top" style="padding-right: 16px;">
                    <div style="width: 80px; height: 80px; background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; overflow: hidden; display: table;">
                      <div style="display: table-cell; vertical-align: middle;">
                        ${logoUrl ? `<img src="${logoUrl}" style="max-width: 100%; max-height: 100%; display: block; margin: 0 auto;" />` : `<span style="font-size: 9px; color: #9ca3af; font-weight: 900; letter-spacing: 1px;">NO LOGO</span>`}
                      </div>
                    </div>
                  </td>
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
                        <td valign="top" style="padding-right: 8px;">
                          <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Decoration:</span><br/>
                          <span style="font-size: 12px; font-weight: 800; color: #1f2937;">${pMethod}</span>
                        </td>
                        <td valign="top">
                          <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Locations:</span><br/>
                          <span style="font-size: 11px; font-weight: 800; color: #1f2937; line-height: 1.4;">${pLocation}</span>
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
        // CORREO 1: PARA EL CLIENTE
        await resend.emails.send({
          from: 'Fieldstone Embroidery <info@fieldstoneembroidery.com>',
          replyTo: 'gregorick.liriano@gmail.com',
          to: clientEmailAddress, 
          subject: `¡Gracias por tu compra, ${clientName}! Pedido #${shortOrderId}`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
              <div style="background-color: #000; padding: 24px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Fieldstone Embroidery</h1>
              </div>
              <div style="padding: 30px;">
                <h2 style="color: #111827; margin-top: 0; font-size: 22px;">¡Hola ${clientName}! Hemos recibido tu pedido.</h2>
                <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">Tu pago se ha procesado correctamente y estamos listos para empezar a preparar tus artículos personalizados. Aquí tienes el desglose exacto de tu compra:</p>
                
                ${deliveryHtml}

                <div style="margin-bottom: 25px;">${unifiedItemsHtml}</div>
                
                <div style="text-align: right; padding: 20px 0; border-top: 2px solid #f3f4f6; margin-bottom: 25px;">
                  <span style="font-size: 16px; color: #374151; font-weight: 900; text-transform: uppercase;">Total Pagado:</span>
                  <span style="font-size: 24px; color: #10b981; font-weight: 900; margin-left: 15px;">$${totalToDisplay}</span>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #000;">
                  <p style="margin: 0; color: #374151; font-size: 14px;"><strong>ID de Transacción Stripe:</strong> <span style="font-family: monospace; font-size: 15px;">${paymentIntentId}</span></p>
                  <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px;"><strong>ID de Pedido Interno:</strong> <span style="font-family: monospace; font-size: 15px;">${orderId}</span></p>
                </div>
              </div>
            </div>
          `
        });

        // CORREO 2: PARA EL ADMIN
        await resend.emails.send({
          from: 'Notificaciones <info@fieldstoneembroidery.com>',
          to: 'gregorick.liriano@gmail.com', 
          subject: `🚨 NUEVO PEDIDO PAGADO - $${totalToDisplay} (ID: #${shortOrderId})`,
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
                        <span style="font-size: 15px; font-weight: 900; font-family: monospace; color: #065f46;">${orderId}</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span style="font-size: 10px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">Cliente</span><br/>
                        <span style="font-size: 14px; font-weight: 700; color: #065f46;">${clientName} (<a href="mailto:${clientEmailAddress}" style="color: #047857;">${clientEmailAddress}</a>)</span>
                      </td>
                      <td>
                        <span style="font-size: 10px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">ID de Transacción Stripe</span><br/>
                        <span style="font-size: 14px; font-weight: 700; font-family: monospace; color: #065f46;">${paymentIntentId}</span>
                      </td>
                    </tr>
                  </table>
                </div>

                ${deliveryHtml}

                <h3 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">
                  Products (${dbItems.length})
                </h3>
                <div style="margin-top: 16px;">${unifiedItemsHtml}</div>
              </div>
            </div>
          `
        });

      } catch (emailErr: any) {
         console.error("Error crítico ejecutando correos:", emailErr);
         return NextResponse.json({ error: "Fallo al enviar correos", details: emailErr.message }, { status: 500 });
      }
    }
  }
  
  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ status: "Activo" });
}