"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const shortOrderId = orderId ? orderId.split('-')[0].toUpperCase() : null;

  return (
    <div className="bg-white p-10 rounded-lg shadow-sm max-w-lg w-full text-center border border-gray-100">
      {/* Ícono de Check Verde (SVG) */}
      <div className="flex justify-center mb-6">
        <svg 
          className="w-20 h-20 text-green-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        ¡Pago Exitoso!
      </h1>
      
      {shortOrderId && (
        <p className="text-sm font-bold text-[#3b5bdb] uppercase tracking-widest mb-4">
          Orden #{shortOrderId}
        </p>
      )}
      
      <p className="text-gray-600 mb-8 leading-relaxed">
        Gracias por tu compra. Hemos recibido tu pago correctamente y tu pedido de <strong>Fieldstone Embroidery</strong> ya está en proceso. Te enviaremos un correo electrónico con tu recibo y los detalles de tu orden pronto.
      </p>

      {/* Botón para volver al inicio */}
      <Link 
        href="/"
        className="inline-block bg-black text-white px-8 py-4 uppercase tracking-widest rounded-xl hover:bg-[#3b5bdb] transition-colors w-full font-black text-[11px] shadow-lg"
      >
        Volver a la tienda
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      {/* Usamos Suspense porque useSearchParams desactiva el renderizado estático en Next.js */}
      <Suspense fallback={<div className="animate-pulse w-full h-96 bg-gray-200 rounded-lg max-w-lg"></div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}