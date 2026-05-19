"use client";

import { useCart } from "../context/CartContext";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function SlideOutCart() {
  const { isCartOpen, setIsCartOpen, cartItems, removeFromCart, updateQuantity, cartTotal } = useCart();

  if (!isCartOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white z-[201] shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-gray-400" size={20} />
            <h2 className="text-xl font-black uppercase tracking-tighter text-gray-400">Your Cart</h2>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="text-gray-400" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingBag size={48} strokeWidth={1} />
              <p className="text-[11px] font-black uppercase tracking-widest">Your cart is empty</p>
              <button onClick={() => setIsCartOpen(false)} className="mt-4 px-8 py-3 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-sm hover:bg-blue-600 transition-colors">
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-24 h-32 bg-[#F3F3F3] rounded-xl p-2 flex items-center justify-center flex-shrink-0">
                    <img src={item.image} alt={item.title} className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-[12px] font-bold text-black uppercase tracking-tight line-clamp-2 pr-4">{item.title}</h3>
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors mt-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                        Size: {item.size} | {item.color}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-gray-200 rounded-lg h-8">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 text-gray-500 hover:text-black"><Minus size={12} /></button>
                        <span className="w-6 text-center text-[12px] font-bold text-gray-400">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 text-gray-500 hover:text-black"><Plus size={12} /></button>
                      </div>
                      <span className="text-[13px] font-black text-black tracking-tight">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-gray-100 p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[12px] font-black uppercase tracking-widest text-gray-500">Subtotal</span>
              <span className="text-2xl font-black text-black tracking-tighter">${cartTotal.toFixed(2)}</span>
            </div>
            <p className="text-[10px] font-medium text-gray-400 mb-6 text-center italic">Shipping, taxes, and discounts calculated at checkout.</p>
            <div className="flex flex-col gap-3">
              <Link href="/cart" onClick={() => setIsCartOpen(false)} className="w-full h-14 flex items-center justify-center border-2 border-black text-[10px] font-black uppercase tracking-[0.2em] text-black hover:bg-black hover:text-white transition-colors rounded-sm">
                View Cart
              </Link>
              
              {/* ✅ AQUÍ ESTÁ EL CAMBIO: Ahora es un Link hacia /checkout */}
              <Link 
                href="/checkout" 
                onClick={() => setIsCartOpen(false)}
                className="w-full h-14 bg-[#8012d8] text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-colors rounded-sm shadow-xl flex items-center justify-center"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}