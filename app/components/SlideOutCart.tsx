"use client";

import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { X, Plus, Minus, Trash2, ShoppingBag, Lock } from "lucide-react"; // ✅ Lock importado correctamente
import Link from "next/link";

export default function SlideOutCart() {
  const { isCartOpen, setIsCartOpen, cartItems, removeFromCart, updateQuantity, cartTotal } = useCart();
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  // Cargar el logo global subido por el cliente al abrir el carrito
  useEffect(() => {
    if (isCartOpen) {
      const savedLogo = localStorage.getItem("user_custom_logo");
      if (savedLogo) setCustomLogo(savedLogo);
    }
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <>
      {/* OVERLAY FONDO OSCURO */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      {/* PANEL DEL CARRITO */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white z-[201] shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
        
        {/* HEADER CARRITO */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-black" size={20} strokeWidth={2.5} />
            <h2 className="text-xl font-black uppercase tracking-tighter text-black">Your Cart</h2>
            <span className="bg-black text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center">
              {cartItems.length}
            </span>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="text-gray-500" size={20} />
          </button>
        </div>

        {/* CUERPO DEL CARRITO (LISTA DE ITEMS) */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingBag size={48} strokeWidth={1} className="mb-2 text-gray-300" />
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Your cart is empty</p>
              <button onClick={() => setIsCartOpen(false)} className="mt-4 px-8 py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-lg">
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-5 group">
                  
                  {/* IMAGEN DEL PRODUCTO + MINIATURA DEL LOGO */}
                  <div className="w-24 h-32 bg-[#F3F3F3] rounded-2xl p-2 flex items-center justify-center flex-shrink-0 relative border border-gray-100 shadow-inner group-hover:border-gray-200 transition-colors">
                    <img src={item.image} alt={item.title} className="w-full h-full object-contain mix-blend-multiply" />
                    
                    {/* Badge de Miniatura del Logo */}
                    {customLogo && (
                      <div 
                        className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border border-gray-200 rounded-xl shadow-md p-1 flex items-center justify-center overflow-hidden z-10"
                        title="Your Custom Logo"
                      >
                        <img src={customLogo} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>

                  {/* DETALLES DEL PRODUCTO */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-[13px] font-bold text-black uppercase tracking-tight line-clamp-2 leading-tight">
                          {item.title}
                        </h3>
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1" title="Remove Item">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {/* INFORMACIÓN ACTUALIZADA DE CONFIGURACIÓN */}
                      <div className="mt-3 space-y-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> 
                          COLOR: <span className="text-black">{item.color}</span> <span className="mx-1 text-gray-300">|</span> SIZE: <span className="text-black">{item.size}</span>
                        </p>
                        
                        {item.decorationMethod && (
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> 
                            DEC: <span className="text-blue-600">{item.decorationMethod === 'EMB' ? 'EMBROIDERY' : item.decorationMethod === 'SP' ? 'SCREEN PRINT' : item.decorationMethod}</span>
                          </p>
                        )}
                        
                        {item.location && (
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-start gap-1 line-clamp-2" title={item.location}>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1 flex-shrink-0"></span> 
                            LOC: <span className="text-black leading-tight">{item.location}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* CONTROLES DE CANTIDAD Y PRECIO */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-gray-200 rounded-lg h-9 bg-white shadow-sm">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 text-gray-500 hover:text-black transition-colors"><Minus size={12} strokeWidth={3} /></button>
                        <span className="w-8 text-center text-[12px] font-black text-black">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 text-gray-500 hover:text-black transition-colors"><Plus size={12} strokeWidth={3} /></button>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 block -mb-1">${item.price.toFixed(2)}/ea</span>
                        <span className="text-[15px] font-black text-black tracking-tight">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER CARRITO (TOTALES Y CHECKOUT) */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-100 p-6 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20 relative">
            <div className="flex justify-between items-end mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subtotal</span>
              <span className="text-3xl font-black text-black tracking-tighter leading-none">${cartTotal.toFixed(2)}</span>
            </div>
            
            <p className="text-[10px] font-bold text-gray-400 mb-6 text-center bg-gray-50 p-2 rounded-lg border border-gray-100">
              Shipping, taxes, and Small Order Fees (if applicable) calculated at checkout.
            </p>
            
            <div className="flex flex-col gap-3">
              <Link 
                href="/cart" 
                onClick={() => setIsCartOpen(false)} 
                className="w-full h-12 flex items-center justify-center border-2 border-gray-200 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 hover:border-black hover:text-black hover:bg-gray-50 transition-all rounded-xl"
              >
                View Full Cart
              </Link>
              
              <Link 
                href="/checkout" 
                onClick={() => setIsCartOpen(false)}
                className="w-full h-14 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-colors rounded-xl shadow-xl flex items-center justify-center gap-2"
              >
                <Lock size={14} className="text-white/70" /> Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}