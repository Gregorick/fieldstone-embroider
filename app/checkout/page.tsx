"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { ChevronRight, Lock, CreditCard, Truck, ShoppingBag } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, cartTotal } = useCart();
  
  // Simulamos un costo de envío fijo
  const shippingCost = cartTotal > 0 ? 15.00 : 0;
  const finalTotal = cartTotal + shippingCost;

  // Estado simple para simular la carga del pago
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Aquí iría la lógica de conexión con tu pasarela de pago
    setTimeout(() => {
      setIsProcessing(false);
      alert("Order placed successfully! (Simulation)");
      // router.push("/success"); // Redirigir a página de éxito
    }, 2000);
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
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 mb-10">
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/cart" className="hover:text-black transition-colors">Cart</Link>
          <ChevronRight size={10} />
          <span className="text-black">Checkout</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* --- FORMULARIO DE CHECKOUT (Izquierda) --- */}
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
                    <input type="text" required className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Last Name *</label>
                    <input type="text" required className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
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

              {/* Sección 3: Pago (Visual) */}
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-xs">3</span>
                  Payment
                </h2>
                <p className="text-[11px] font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={12} /> All transactions are secure and encrypted
                </p>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Opción Tarjeta */}
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
                    <input type="radio" name="payment" id="credit-card" defaultChecked className="w-4 h-4 accent-black cursor-pointer" />
                    <label htmlFor="credit-card" className="flex-1 text-sm font-bold text-black cursor-pointer flex items-center justify-between">
                      Credit Card
                      <CreditCard size={18} className="text-gray-400" />
                    </label>
                  </div>
                  <div className="p-6 bg-white space-y-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Card Number</label>
                      <input type="text" placeholder="0000 0000 0000 0000" className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Expiration Date</label>
                        <input type="text" placeholder="MM / YY" className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Security Code</label>
                        <input type="text" placeholder="CVC" className="w-full text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* Opción PayPal */}
                  <div className="p-4 bg-white flex items-center gap-4 border-t border-gray-200">
                    <input type="radio" name="payment" id="paypal" className="w-4 h-4 accent-black cursor-pointer" />
                    <label htmlFor="paypal" className="flex-1 text-sm font-bold text-black cursor-pointer flex items-center justify-between">
                      PayPal
                      <img src="paypal.webp" alt="PayPal" className="h-4 object-contain grayscale opacity-50" />
                    </label>
                  </div>
                </div>
              </section>

            </form>
          </div>

          {/* --- RESUMEN DEL PEDIDO (Derecha Sticky) --- */}
          <div className="lg:col-span-5 w-full bg-gray-50 p-8 md:p-10 rounded-[2.5rem] sticky top-8 border border-gray-100">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-8">Order Summary</h2>
            
            {/* Lista de productos minimizada */}
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

            {/* Botón enlazado al formulario de la izquierda */}
            <button 
              form="checkout-form" 
              type="submit"
              disabled={isProcessing}
              className="w-full h-16 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-2xl flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
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