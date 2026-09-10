"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import { Hammer, HardHat, ArrowLeft } from "lucide-react";

export default function PromotionalItemsPage() {
  return (
    <main className="bg-white min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 bg-gray-50/50">
        <div className="max-w-2xl w-full bg-white border border-gray-100 p-12 md:p-20 rounded-[3rem] shadow-xl shadow-gray-200/40 text-center relative overflow-hidden">
          
          {/* Fondo decorativo sutil */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Contenedor de iconos */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gray-100 text-black rounded-2xl flex items-center justify-center transform -rotate-12 shadow-sm">
                <Hammer size={32} strokeWidth={2} />
              </div>
              <div className="w-20 h-20 bg-[#8012d8] text-white rounded-3xl flex items-center justify-center z-10 shadow-lg shadow-purple-500/30">
                <HardHat size={40} strokeWidth={2} />
              </div>
              <div className="w-16 h-16 bg-gray-100 text-black rounded-2xl flex items-center justify-center transform rotate-12 shadow-sm">
                <Hammer size={32} strokeWidth={2} className="scale-x-[-1]" />
              </div>
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8012d8] mb-4 block">
              Under Construction
            </span>
            
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-black mb-6 leading-none">
              Coming Soon
            </h1>
            
            <p className="text-sm md:text-base font-medium text-gray-500 mb-10 max-w-md mx-auto leading-relaxed">
              We are working hard behind the scenes to bring you an incredible selection of promotional items. Stay tuned for updates!
            </p>

            <Link 
              href="/products" 
              className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[#8012d8] transition-colors shadow-xl"
            >
              <ArrowLeft size={16} /> Explore Apparel
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}