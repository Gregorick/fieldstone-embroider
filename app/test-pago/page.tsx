"use client";

import { useState } from "react";

export default function PaginaDePruebaPago() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // OJO AQUÍ: Usamos tu basePath '/fieldstone-embroider' en la URL
      const res = await fetch('/fieldstone-embroider/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount: 2500, // 2500 centavos = $25.00
          orderId: `TEST-ORDEN-${Date.now()}` // Un ID único para esta prueba
        }),
      });

      const data = await res.json();

      if (data.url) {
        // ¡Si todo sale bien, enviamos al cliente a la bóveda de Clover!
        window.location.href = data.url;
      } else {
        alert("Clover no devolvió la URL: " + JSON.stringify(data));
        setLoading(false);
      }
    } catch (error) {
      console.error("Error al procesar:", error);
      alert("Hubo un problema conectando con tu API local.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-8 text-black">Prueba de Hosted Checkout</h1>
      <p className="mb-8 text-gray-600">Total a pagar: <strong>$25.00</strong></p>
      
      <button 
        onClick={handlePayment}
        disabled={loading}
        className="bg-black text-white px-8 py-4 uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:bg-gray-400"
      >
        {loading ? "Generando Link..." : "Pagar Seguro con Clover"}
      </button>
    </div>
  );
}