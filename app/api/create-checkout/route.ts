import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Limpieza y validación estricta de variables
    const token = process.env.CLOVER_API_TOKEN?.trim();
    const merchantId = process.env.CLOVER_MERCHANT_ID?.trim();

    if (!token || !merchantId) {
      console.error("❌ ERROR: Credenciales de Clover no configuradas en .env.local");
      return NextResponse.json({ error: 'Configuración interna faltante' }, { status: 500 });
    }

    const { items, email } = await req.json(); 
    
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
    }

    // 2. AGRUPAMOS PRODUCTOS
    const itemMap = new Map();
    items.forEach((item: any) => {
      const name = item.title || "Producto";
      const note = `${item.size || ''} ${item.color || ''}`.trim();
      const price = Math.round(Number(item.price) * 100); 
      const quantity = Number(item.quantity) || 1; 
      const key = `${name}-${note}`;

      if (itemMap.has(key)) {
        itemMap.get(key).unitQty += quantity;
      } else {
        itemMap.set(key, { name, unitQty: quantity, price, note });
      }
    });

    const cloverLineItems = Array.from(itemMap.values()).map((item: any) => ({
      name: item.unitQty > 1 ? `[${item.unitQty}x] ${item.name}` : item.name,
      price: item.price * (item.unitQty > 1 ? item.unitQty : 1), // Ajuste según la lógica de empaquetado
      unitQty: 1, 
      note: item.note
    }));

    // 3. CONFIGURACIÓN DE URL (FORZANDO LOCALHOST PARA EVITAR EL ERROR 400 DE CLOVER)
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    
    // Si estamos en desarrollo, forzamos localhost. Si es producción, usa el dominio real.
    const domain = process.env.NODE_ENV === 'development' 
      ? 'https://wireless-ambiguity-bloating.ngrok-free.dev/' 
      : `https://${host}`;
      
    // Le agregamos explícitamente el subdirectorio de tu proyecto
    const baseUrl = `${domain}/fieldstone-embroider`;

    // 4. PETICIÓN A CLOVER
    const cloverUrl = 'https://apisandbox.dev.clover.com/invoicingcheckoutservice/v1/checkouts';
    
    const response = await fetch(cloverUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Clover-Merchant-Id': merchantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: {
          email: email || "gregorick.liriano@gmail.com",
          firstName: "Cliente",
          lastName: "Fieldstone"
        },
        shoppingCart: { lineItems: cloverLineItems },
        redirectUrls: {
          success: `${baseUrl}/success`,
          failure: `${baseUrl}/error`,
          cancel: `${baseUrl}/cart`
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ Clover rechazó la petición. Estado:", response.status, "Detalles:", data);
      return NextResponse.json({ error: 'Clover rechazó el pago', details: data }, { status: response.status });
    }
    
    return NextResponse.json({ url: data.href });

  } catch (error) {
    console.error("❌ ERROR CRÍTICO EN NEXT.JS:", error);
    return NextResponse.json({ error: 'Error interno inesperado' }, { status: 500 });
  }
}