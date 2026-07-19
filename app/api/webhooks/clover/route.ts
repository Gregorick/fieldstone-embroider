import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js'; 

const recentlyProcessedOrders = new Set<string>();

export async function POST(req: Request) {
  try {
    // ✅ 1. INICIALIZAMOS ADENTRO PARA EVITAR CRASHES 500 EN CPANEL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Faltan credenciales de Supabase en el servidor.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const payload = await req.json();
    console.log("\n--- 📥 NUEVO WEBHOOK DE CLOVER RECIBIDO ---");

    // 2. GUARDAMOS EL LOG EN LA BASE DE DATOS
    await supabaseAdmin.from('webhook_logs').insert([{ source: 'clover_order_update', payload: payload }]);

    // 3. CÓDIGO DE VERIFICACIÓN
    if (payload.verificationCode || payload.challenge) {
      const code = payload.verificationCode || payload.challenge;
      console.log("✅ CÓDIGO DE VERIFICACIÓN RESPONDIDO:", code);
      return NextResponse.json({ verificationCode: code }, { status: 200 });
    }

    const merchants = payload.merchants;
    if (!merchants) return NextResponse.json({ status: 'ok' }, { status: 200 });

    for (const merchantId in merchants) {
      const events = merchants[merchantId];
      
      for (const event of events) {
        if (event.type === "UPDATE" && event.objectId?.startsWith("O:")) {
          const orderId = event.objectId.replace("O:", "");
          
          // Consultamos la orden completa en Clover
          const orderRes = await fetch(`https://apisandbox.dev.clover.com/v3/merchants/${process.env.NEXT_PUBLIC_CLOVER_MERCHANT_ID}/orders/${orderId}?expand=lineItems`, {
            headers: { 
              'Authorization': `Bearer ${process.env.CLOVER_PRIVATE_TOKEN}`, 
              'Content-Type': 'application/json'
            }
          });
          
          if (!orderRes.ok) {
             console.error(`❌ Error consultando la orden de Clover ${orderId}`);
             continue; 
          }
          
          const orderData = await orderRes.json();

          // ✅ 4. VALIDACIÓN DE PAGO (A prueba de mayúsculas y minúsculas)
          const paymentState = orderData.paymentState ? orderData.paymentState.toUpperCase() : '';
          const isPaid = paymentState === 'PAID' || orderData.state === 'locked';
          
          if (!isPaid) {
            console.log(`⏳ La orden ${orderId} aún no está pagada (Estado real reportado: ${orderData.paymentState || 'N/A'}). Esperando...`);
            continue; 
          }

          if (!recentlyProcessedOrders.has(orderId)) {
            recentlyProcessedOrders.add(orderId);
            setTimeout(() => recentlyProcessedOrders.delete(orderId), 5 * 60 * 1000); // Prevenir duplicados por 5 mins

            console.log(`🚀 INICIANDO PROCESO PARA ORDEN PAGADA: ${orderId}`);

            // Agrupar productos
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

            // Crear el HTML de productos
            const itemsList = Array.from(itemMap.values()).map((item: any) => {
              const price = item.price ? (item.price / 100).toFixed(2) : "0.00";
              const noteHtml = item.note ? `<br/><span style="font-size: 11px; color: #666; font-style: italic;">Detalles: ${item.note}</span>` : '';
              return `
                <li style="margin-bottom: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">
                  <strong style="color: #000;">${item.quantity}x ${item.name}</strong> 
                  <br/>
                  <span style="font-size: 13px; font-weight: bold;">Precio unitario: $${price}</span>
                  ${noteHtml}
                </li>
              `;
            }).join('') || '<li>Producto no encontrado en la orden</li>';

            const total = orderData.total ? (Number(orderData.total) / 100).toFixed(2) : "0.00";

            // ✅ 5. ACTUALIZACIÓN AUTOMÁTICA EN SUPABASE Y OBTENER EMAIL
            const supabaseOrderId = orderData.note || orderData.title; 
            let clientEmailAddress = 'gregorick.liriano@gmail.com'; 

            try {
              if (supabaseOrderId) {
                // Actualizamos a 'Pagado'
                const { error: dbError } = await supabaseAdmin
                  .from('orders')
                  .update({
                    payment_status: 'paid',         
                    order_status: 'processing',     
                    payment_id: orderId             
                  })
                  .eq('id', supabaseOrderId);

                if (dbError) console.error("❌ Error actualizando estado en Supabase:", dbError.message);
                else console.log(`✅ Orden en Supabase actualizada a 'paid' exitosamente.`);
              }
            } catch (dbErr) {
              console.error("❌ Excepción crítica al conectar con Supabase:", dbErr);
            }

            // ✅ 6. ENVÍO DE CORREOS
            try {
              // Correo para el CLIENTE
              const clientEmail = await resend.emails.send({
                from: 'Fieldstone Embroidery <onboarding@resend.dev>',
                to: clientEmailAddress, 
                subject: `¡Gracias por tu compra! Pedido #${orderId.slice(-6)}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
                    <h2 style="text-align: center; color: #000; text-transform: uppercase;">Fieldstone Embroidery</h2>
                    <p>¡Hola! Hemos recibido tu pedido y el pago se ha procesado correctamente. Estamos listos para empezar a preparar tus artículos.</p>
                    <h3 style="border-bottom: 1px solid #000; padding-bottom: 5px;">Detalles de tu compra:</h3>
                    <ul style="list-style: none; padding: 0;">${itemsList}</ul>
                    <div style="background: #000; color: #fff; padding: 15px; text-align: center; margin-top: 20px;">
                      <h3 style="margin: 0;">Total pagado: $${total}</h3>
                    </div>
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
                      <p style="font-size: 14px; color: #333; margin: 0;"><strong>ID de transacción:</strong> ${orderId}</p>
                    </div>
                  </div>
                `
              });

              // Correo para el ADMINISTRADOR
              const adminEmail = await resend.emails.send({
                from: 'Fieldstone Notificaciones <onboarding@resend.dev>',
                to: 'gregorick.liriano@gmail.com', 
                subject: `🚨 NUEVO PEDIDO PAGADO - $${total} (ID: #${orderId.slice(-6)})`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 2px solid #28a745; border-radius: 8px;">
                    <h2 style="color: #28a745; text-transform: uppercase; margin-bottom: 0;">¡Nuevo Pedido Pagado!</h2>
                    <p style="color: #555;">Un cliente acaba de completar un pago exitoso en la tienda.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <p style="margin: 0 0 10px 0;"><strong>Monto Total:</strong> $${total}</p>
                      <p style="margin: 0 0 10px 0;"><strong>ID de Clover:</strong> ${orderId}</p>
                    </div>
                    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Productos a preparar:</h3>
                    <ul style="list-style: none; padding: 0;">${itemsList}</ul>
                  </div>
                `
              });

              if (clientEmail.error) console.error("❌ ERROR EN CORREO CLIENTE:", clientEmail.error);
              if (adminEmail.error) console.error("❌ ERROR EN CORREO ADMIN:", adminEmail.error);
              if (!clientEmail.error && !adminEmail.error) console.log(`✅ ¡Correos enviados exitosamente! (Orden ${orderId})`);

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

// ✅ ESCÁNER DE DIAGNÓSTICO (Para revisar tus variables desde el navegador)
export async function GET() {
  return NextResponse.json({ 
    status: "Activo",
    diagnostico_variables: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      resend_api_key: !!process.env.RESEND_API_KEY,
      clover_merchant_id: !!process.env.NEXT_PUBLIC_CLOVER_MERCHANT_ID,
      clover_token: !!process.env.CLOVER_PRIVATE_TOKEN
    }
  });
}