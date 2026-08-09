import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const token = process.env.CLOVER_API_TOKEN?.trim();
    const merchantId = process.env.CLOVER_MERCHANT_ID?.trim();

    if (!token || !merchantId) {
      console.error("❌ ERROR: Credenciales de Clover faltantes");
      return NextResponse.json({ error: 'Configuración interna faltante' }, { status: 500 });
    }

    const { items, email, shippingCost, smallOrderFee } = await req.json(); 
    
    let totalItemsCents = 0;
    if (items && items.length > 0) {
      items.forEach((item: any) => {
        totalItemsCents += Math.round(Number(item.price) * 100) * item.quantity;
      });
    }

    const shippingCents = Math.round(Number(shippingCost || 0) * 100);
    const feeCents = Math.round(Number(smallOrderFee || 0) * 100);
    const grandTotalCents = totalItemsCents + shippingCents + feeCents;

    const finalPrice = grandTotalCents > 0 ? grandTotalCents : 150;

    // Sin el campo "id" para evitar que Clover busque un producto que no existe en su BD
    const payload = {
      currency: "USD",
      customer: {
        email: email || "gregorick.liriano@gmail.com",
        firstName: "Cliente"
      },
      shoppingCart: { 
        lineItems: [
          {
            name: "Fieldstone Store Order",
            unitQty: 1,
            price: finalPrice
          }
        ] 
      },
      redirectUrls: {
        success: "https://fieldstoneembroidery.com/fieldstone-embroider/success",
        failure: "https://fieldstoneembroidery.com/fieldstone-embroider/error",
        cancel: "https://fieldstoneembroidery.com/fieldstone-embroider/cart"
      }
    };

    console.log("👉 ENVIANDO A CLOVER:", JSON.stringify(payload, null, 2));

    const cloverUrl = 'https://apisandbox.dev.clover.com/invoicingcheckoutservice/v1/checkouts';
    
    const response = await fetch(cloverUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Clover-Merchant-Id': merchantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("👉 RESPUESTA DE CLOVER:", data);

    if (!response.ok) {
      console.error("❌ Clover rechazó la petición:", data);
      return NextResponse.json({ error: 'Clover rechazó el pago', details: data }, { status: response.status });
    }
    
    return NextResponse.json({ url: data.href });

  } catch (error) {
    console.error("❌ ERROR CRÍTICO EN NEXT.JS:", error);
    return NextResponse.json({ error: 'Error interno inesperado' }, { status: 500 });
  }
}