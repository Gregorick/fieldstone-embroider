import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Inicializamos Stripe con tu clave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, email, orderId, shippingCost, smallOrderFee } = body;

    // 1. Formateamos los productos del carrito al estándar de Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${item.title} - ${item.size} / ${item.color}`,
          images: [item.image],
        },
        unit_amount: Math.round(item.price * 100), // Stripe requiere el precio en centavos
      },
      quantity: item.quantity,
    }));

    // 2. Si hay costo de envío, lo agregamos como un item extra
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Shipping' },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    // 3. Si aplica la tarifa de orden pequeña, la agregamos
    if (smallOrderFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Small Order Processing Fee' },
          unit_amount: Math.round(smallOrderFee * 100),
        },
        quantity: 1,
      });
    }

    // 4. Creamos la sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?order_id=${orderId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,
      metadata: {
        orderId: orderId.toString(), // 🚀 AQUÍ ESTÁ LA MAGIA: Vinculamos el ID de Supabase
      },
    });

    // Devolvemos la URL segura de Stripe para redirigir al cliente
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creando Stripe Checkout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}