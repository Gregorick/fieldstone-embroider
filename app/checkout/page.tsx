"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { ChevronRight, Lock, Truck, ShoppingBag, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createCompleteOrder } from "@/lib/orderService"; // ✅ IMPORTAMOS NUESTRO SERVICIO DE ÓRDENES

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, cartTotal } = useCart();
  
  // Simulamos un costo de envío fijo
  const shippingCost = cartTotal > 0 ? 15.00 : 0;
  const finalTotal = cartTotal + shippingCost;

  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // 1. Extraemos los datos del formulario
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const firstName = formData.get("firstName") as string;
      const lastName = formData.get("lastName") as string;
      const fullName = `${firstName} ${lastName}`.trim();

      // 2. Verificamos si hay un usuario logueado actualmente
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      // ✅ 3. PASO 3: GUARDAMOS LA ORDEN EN SUPABASE ANTES DE IR A CLOVER
      // Esto sube el logo al bucket y guarda todo en las tablas orders y order_items
      const orderResult = await createCompleteOrder(
        cartItems,
        { name: fullName, email: email, total: finalTotal },
        userId
      );

      if (!orderResult.success) {
        console.error("Error saving order to Supabase:", orderResult.error);
        alert("There was an issue processing your order details. Please try again.");
        setIsProcessing(false);
        return;
      }

      // El ID real generado por la base de datos
      const orderId = orderResult.orderId;

      // 4. Llamamos a nuestra API de Clover para iniciar el pago
      // (Ajusté la ruta a /api/create-checkout asumiendo que está en tu raíz)
      const res = await fetch('/fieldstone-embroider/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          email: email,
          orderId: orderId // Opcional: Le pasamos el ID a tu API para tracking
        }),
      });

      if (!res.ok) {
        throw new Error(`La API respondió con error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // 5. Redireccionamos a la bóveda segura si Clover nos da la URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Clover rechazó la creación del pago:", data);
        alert("Ocurrió un error al contactar la pasarela de pago. Intenta de nuevo.");
        setIsProcessing(false);
      }

    } catch (error) {
      console.error("Error de red o servidor:", error);
      alert("Error de conexión. Revisa tu internet e intenta de nuevo.");
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <main className="bg-white min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto px-4 py-32 flex-1 flex flex-col items-center justify-center">
          <ShoppingBag size={64} className="text-gray-300 mb-6" strokeWidth={1} />
          <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-2">Your cart is empty</h2>
          <p className="text-sm font-medium text-gray-500 mb-8">You cannot checkout without products.</p>
          <Link href="/products" className="px-10 py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl">
            Return to Shop
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="bg-white min-h-screen flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-12 flex-1 max-w-7xl">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 mb-10">
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/cart" className="hover:text-black transition-colors">Cart</Link>
          <ChevronRight size={10} />
          <span className="text-black">Checkout</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          <div className="lg:col-span-7 space-y-12">
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-12">
              
              {/* Sección 1: Contacto */}
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-xs">1</span>
                  Contact Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Email Address *</label>
                    <input 
                      type="email" 
                      name="email"
                      required
                      placeholder="you@example.com"
                      className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <input type="checkbox" id="newsletter" className="w-4 h-4 accent-black cursor-pointer" />
                    <label htmlFor="newsletter" className="text-sm font-medium text-gray-600 cursor-pointer">
                      Email me with news and offers
                    </label>
                  </div>
                </div>
              </section>

              {/* Sección 2: Envío */}
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-xs">2</span>
                  Delivery Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">First Name *</label>
                    {/* ✅ Añadido name="firstName" */}
                    <input type="text" name="firstName" required className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Last Name *</label>
                    {/* ✅ Añadido name="lastName" */}
                    <input type="text" name="lastName" required className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Street Address *</label>
                    <input type="text" required placeholder="123 Main St, Apt 4B" className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">City *</label>
                    <input type="text" required className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">ZIP / Postal Code *</label>
                    <input type="text" required className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Phone Number *</label>
                    <input type="tel" required className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                </div>
              </section>

              {/* Sección 3: Pago */}
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-xs">3</span>
                  Payment
                </h2>
                
                <div className="border border-gray-200 rounded-xl overflow-hidden p-8 text-center bg-gray-50">
                  <ShieldCheck size={48} className="mx-auto text-green-500 mb-4" />
                  <h3 className="text-sm font-bold text-black mb-2">Secure Payment Authorization</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    To guarantee your security, Fieldstone Embroidery does not store credit card information. You will be redirected to Clover's secure vault to complete your purchase.
                  </p>
                </div>
              </section>

            </form>
          </div>

          <div className="lg:col-span-5 w-full bg-gray-50 p-8 md:p-10 rounded-[2.5rem] sticky top-8 border border-gray-100">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-8">Order Summary</h2>
            
            <div className="space-y-4 py-4 mb-8 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="relative w-16 h-20 bg-[#F3F3F3] rounded-xl flex-shrink-0 p-2 border border-white shadow-sm">
                    <img src={item.image} alt={item.title} className="w-full h-full object-contain mix-blend-multiply" />
                    <span className="absolute -top-2 -right-2 bg-black text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[11px] font-bold text-black uppercase tracking-tight line-clamp-1">{item.title}</h3>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">
                      {item.size} / {item.color}
                    </p>
                  </div>
                  <div className="text-[12px] font-black text-black">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-4 border-t border-b border-gray-200 py-6 mb-6">
              <div className="flex justify-between text-[13px] font-bold text-gray-600">
                <span>Subtotal</span>
                <span className="text-black">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[13px] font-bold text-gray-600">
                <span className="flex items-center gap-2">Shipping <Truck size={14}/></span>
                <span className="text-black">${shippingCost.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-end mb-8">
              <span className="text-[14px] font-black uppercase tracking-widest text-black">Total</span>
              <span className="text-4xl font-black text-black tracking-tighter leading-none">${finalTotal.toFixed(2)}</span>
            </div>

            <button 
              form="checkout-form" 
              type="submit"
              disabled={isProcessing}
              className="w-full h-16 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-gray-800 transition-colors shadow-2xl flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Pay ${finalTotal.toFixed(2)} <Lock size={14} /></>
              )}
            </button>
          </div>

        </div>
      </div>
      <Footer />
    </main>
  );
}