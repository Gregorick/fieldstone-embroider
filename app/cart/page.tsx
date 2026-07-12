"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { Trash2, Plus, Minus, ChevronRight, ShoppingBag, ArrowRight } from "lucide-react";

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal } = useCart();
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  // Cargar el logo global subido por el cliente
  useEffect(() => {
    const savedLogo = localStorage.getItem("user_custom_logo");
    if (savedLogo) setCustomLogo(savedLogo);
  }, []);

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
          Your Cart<span className="text-blue-600">.</span>
        </h1>

        {cartItems.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200 shadow-sm">
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
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center border-b border-gray-100 pb-8 group/row">
                    
                    <div className="col-span-1 md:col-span-6 flex gap-6 items-center">
                      {/* IMAGEN DEL PRODUCTO + MINIATURA DEL LOGO */}
                      <Link href={`/products/${item.productId}`} className="w-28 h-36 bg-[#F3F3F3] rounded-3xl p-4 flex-shrink-0 relative overflow-hidden group-hover/row:border-gray-200 border border-gray-100 shadow-inner transition-colors">
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="absolute inset-0 w-full h-full object-contain mix-blend-multiply group-hover/row:scale-110 transition-transform duration-700 p-2" 
                        />
                        {/* Miniatura del logo superpuesta */}
                        {customLogo && (
                          <div 
                            className="absolute bottom-2 right-2 w-10 h-10 bg-white border border-gray-200 rounded-xl shadow-md p-1 flex items-center justify-center overflow-hidden z-10"
                            title="Your Custom Logo"
                          >
                            <img src={customLogo} alt="Logo" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </Link>

                      {/* DETALLES TÉCNICOS DEL PRODUCTO */}
                      <div className="flex-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">SanMar Catalog</span>
                        <Link href={`/products/${item.productId}`} className="text-[14px] font-bold text-black uppercase tracking-tight hover:text-blue-600 transition-colors block mb-2 line-clamp-2 pr-4">
                          {item.title}
                        </Link>
                        
                        {/* Etiqueta Técnica de Opciones */}
                        <div className="mt-3 space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100 inline-block min-w-full lg:min-w-[280px]">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> 
                            COLOR: <span className="text-black">{item.color}</span> <span className="text-gray-300">|</span> SIZE: <span className="text-black">{item.size}</span>
                          </p>
                          
                          {item.decorationMethod && (
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> 
                              DEC: <span className="text-blue-600">{item.decorationMethod === 'EMB' ? 'EMBROIDERY' : item.decorationMethod === 'SP' ? 'SCREEN PRINT' : item.decorationMethod}</span>
                            </p>
                          )}
                          
                          {item.location && (
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-start gap-2 line-clamp-2" title={item.location}>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1 flex-shrink-0"></span> 
                              LOC: <span className="text-black leading-tight">{item.location}</span>
                            </p>
                          )}
                        </div>

                        <p className="text-[12px] font-bold text-gray-400 mt-3 md:hidden">${item.price.toFixed(2)} /ea</p>
                      </div>
                    </div>

                    {/* CONTROLES DE CANTIDAD */}
                    <div className="col-span-1 md:col-span-3 flex justify-start md:justify-center">
                      <div className="flex items-center border border-gray-200 rounded-2xl h-12 bg-white transition-colors hover:border-gray-300 shadow-sm">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-4 text-gray-500 hover:text-black transition-colors"><Minus size={14} strokeWidth={3} /></button>
                        <span className="w-8 text-center text-black text-[13px] font-black">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-4 text-gray-500 hover:text-black transition-colors"><Plus size={14} strokeWidth={3} /></button>
                      </div>
                    </div>

                    {/* PRECIO TOTAL POR FILA */}
                    <div className="col-span-1 md:col-span-2 text-left md:text-right flex flex-col justify-center">
                      <span className="text-[11px] font-bold text-gray-400 mb-1 hidden md:block">${item.price.toFixed(2)}/ea</span>
                      <span className="text-xl font-black text-black tracking-tighter">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>

                    {/* BOTÓN DE ELIMINAR */}
                    <div className="col-span-1 text-right">
                      <button 
                        onClick={() => removeFromCart(item.id)} 
                        className="text-gray-300 hover:text-red-500 transition-all duration-300 p-3 bg-white border border-gray-100 hover:border-red-100 hover:bg-red-50 rounded-full shadow-sm"
                        title="Remove item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* RESUMEN DEL PEDIDO */}
            <div className="w-full lg:w-[400px] bg-gray-50 p-10 rounded-[2.5rem] sticky top-8 border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-8">Order Summary</h2>
              
              <div className="space-y-4 py-4 border-b border-gray-200 pb-6 mb-6">
                <div className="flex justify-between text-[13px] font-bold text-gray-600">
                  <span>Subtotal</span>
                  <span className="text-black font-black">${cartTotal.toFixed(2)}</span>
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

              <Link 
                href="/checkout"
                className="w-full h-16 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-2xl flex items-center justify-center gap-3"
              >
                Checkout Securely <ArrowRight size={16} />
              </Link>

              <div className="mt-6 flex flex-col items-center justify-center gap-4">
                 <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Accepted Payment Methods</p>
                 <div className="flex items-center gap-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                   <img src="mastercard.png" alt="Mastercard" className="h-6 object-contain" />
                   <img src="stripelogo.png" alt="Stripe" className="h-6 object-contain" />
                   <img src="visa.svg" alt="Visa" className="h-4 object-contain" />
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