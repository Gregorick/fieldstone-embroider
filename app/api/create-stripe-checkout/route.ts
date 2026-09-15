import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.clover',
});

// 🚀 TRADUCTOR DE CÓDIGOS FISCALES (Verificado y Completo)
const getTaxCode = (category: string) => {
  const cat = category?.toLowerCase() || '';

  // 1. Bolsos, Mochilas y Equipaje (Bienes tangibles generales, SÍ pagan impuestos en MA)
  if (cat.includes('bag')) return 'txcd_99999999'; 

  // 2. Gorras, Sombreros y Accesorios 
  if (cat.includes('cap') || cat.includes('hat') || cat.includes('accessori')) {
    return 'txcd_30011000'; 
  }

  // 3. Protección Personal (Seguridad/Ocupacional)
  if (cat.includes('protection') || cat.includes('personal')) return 'txcd_30031405'; 
  
  // 4. ROPA GENERAL (Camisetas, Polos, Hoodies, etc.)
  // Exenta en MA si cuesta menos de $175
  if (
    cat.includes('t-shirt') || 
    cat.includes('polo') || 
    cat.includes('knit') || 
    cat.includes('sweatshirt') || 
    cat.includes('fleece') || 
    cat.includes('outerwear') || 
    cat.includes('activewear') || 
    cat.includes('workwear') || 
    cat.includes('women') || 
    cat.includes('youth') || 
    cat.includes('bottom') || 
    cat.includes('woven') || 
    cat.includes('infant') || 
    cat.includes('toddler')
  ) {
    return 'txcd_30011000'; 
  }
  
  // POR DEFECTO: Si no reconoce la categoría o llega vacía, asume Ropa General
  return 'txcd_30011000'; 
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, email, orderId, shippingCost, smallOrderFee } = body;

    // 1. Formateamos los productos
    const lineItems = items.map((item: any) => {
      
      // 🚀 EL CHISMOSO: Imprime en tu terminal de VS Code qué datos están llegando
      const codigoAsignado = getTaxCode(item.category);
      console.log(`🛒 Producto: ${item.title} | Categoría: ${item.category} | Código Stripe: ${codigoAsignado}`);

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${item.title} - ${item.size} / ${item.color}`,
            images: [item.image],
            tax_code: codigoAsignado, 
          },
          unit_amount: Math.round(item.price * 100),
          tax_behavior: 'exclusive',
        },
        quantity: item.quantity,
      };
    });

    // 2. Costo de envío
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { 
            name: 'Shipping',
            tax_code: 'txcd_92010001', // 🚀 Código correcto para envío
          },
          unit_amount: Math.round(shippingCost * 100),
          tax_behavior: 'exclusive',
        },
        quantity: 1,
      });
    }

    // 3. Tarifa de orden pequeña
    if (smallOrderFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { 
            name: 'Small Order Processing Fee',
            tax_code: 'txcd_20030000', 
          },
          unit_amount: Math.round(smallOrderFee * 100),
          tax_behavior: 'exclusive',
        },
        quantity: 1,
      });
    }

    // 4. Creamos la sesión
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: lineItems,
      mode: 'payment',
      
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?order_id=${orderId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,
      metadata: {
        orderId: orderId.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creando Stripe Checkout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}