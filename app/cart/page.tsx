"use client";

import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { Trash2, Plus, Minus, ChevronRight, ShoppingBag, ArrowRight } from "lucide-react";

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal } = useCart();

  return (
    <main className="bg-white min-h-screen flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-12 flex-1 max-w-7xl">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 mb-10">
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/products" className="hover:text-black transition-colors">Shop</Link>
          <ChevronRight size={10} />
          <span className="text-black">Shopping Cart</span>
        </div>

        <h1 className="text-5xl font-black uppercase tracking-tighter text-black italic leading-none mb-12">
          Your Cart<span className="color-primary">.</span>
        </h1>

        {cartItems.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
            <ShoppingBag size={64} className="text-gray-300 mb-6" strokeWidth={1} />
            <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-2">It's empty here</h2>
            <p className="text-sm font-medium text-gray-500 mb-8">Looks like you haven't added any items to your cart yet.</p>
            <Link href="/products" className="px-10 py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            
            <div className="flex-1 w-full">
              <div className="hidden md:grid grid-cols-12 gap-4 border-b border-black pb-4 mb-8 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="col-span-6">Product</div>
                <div className="col-span-3 text-center">Quantity</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-8">
                {cartItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center border-b border-gray-100 pb-8 group">
                    <div className="col-span-1 md:col-span-6 flex gap-6 items-center">
                      <Link href={`/products/${item.productId}`} className="w-28 h-36 bg-[#F3F3F3] rounded-3xl p-4 flex-shrink-0 relative overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="absolute inset-0 w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700 p-2" 
                        />
                      </Link>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">SanMar Catalog</span>
                        <Link href={`/products/${item.productId}`} className="text-[14px] font-bold text-black uppercase tracking-tight hover:text-blue-600 transition-colors block mb-2 line-clamp-2 pr-4">
                          {item.title}
                        </Link>
                        <div className="flex gap-4">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Size: <span className="text-black">{item.size}</span>
                          </p>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Color: <span className="text-black">{item.color}</span>
                          </p>
                        </div>
                        <p className="text-[12px] font-bold text-gray-400 mt-3 md:hidden">${item.price.toFixed(2)} each</p>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-3 flex justify-start md:justify-center">
                      <div className="flex items-center border-2 border-gray-100 rounded-2xl h-12 bg-white transition-colors hover:border-gray-200">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-4 text-gray-500 hover:text-black transition-colors"><Minus size={14} /></button>
                        <span className="w-8 text-center text-gray-400 text-[12px] font-black">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-4 text-gray-500 hover:text-black transition-colors"><Plus size={14} /></button>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 text-left md:text-right">
                      <span className="text-xl font-black text-black tracking-tighter">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>

                    <div className="col-span-1 text-right">
                      <button 
                        onClick={() => removeFromCart(item.id)} 
                        className="text-gray-300 hover:text-red-500 transition-colors p-2 bg-gray-50 hover:bg-red-50 rounded-full"
                        title="Remove item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-[400px] bg-gray-50 p-10 rounded-[2.5rem] sticky top-8 border border-gray-100">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-8">Order Summary</h2>
              
              <div className="space-y-4 py-4 border-b border-gray-200 pb-6 mb-6">
                <div className="flex justify-between text-[13px] font-bold text-gray-600">
                  <span>Subtotal</span>
                  <span className="text-black">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[13px] font-bold text-gray-600">
                  <span>Estimated Shipping</span>
                  <span className="text-gray-400 italic">Calculated at checkout</span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8">
                <span className="text-[14px] font-black uppercase tracking-widest text-black">Total</span>
                <span className="text-4xl font-black text-black tracking-tighter leading-none">${cartTotal.toFixed(2)}</span>
              </div>

              {/* ✅ AQUÍ ESTÁ EL CAMBIO: Convertimos el botón en Link */}
              <Link 
                href="/checkout"
                className="w-full h-16 bg-[#8012d8] text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-2xl flex items-center justify-center gap-3"
              >
                Checkout Securely <ArrowRight size={16} />
              </Link>

              <div className="mt-6 flex flex-col items-center justify-center gap-4">
                 <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Accepted Payment Methods</p>
                 <div className="flex items-center gap-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                   <img src="mastercard.png" alt="Visa" className="h-6 object-contain" />
                   <img src="stripelogo.png" alt="Mastercard" className="h-6 object-contain" />
                   <img src="visa.svg" alt="PayPal" className="h-4 object-contain" />
                 </div>
              </div>
            </div>

          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}