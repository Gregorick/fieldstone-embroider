import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
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
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Gracias por tu compra. Hemos recibido tu pago correctamente y tu pedido de <strong>Fieldstone Embroidery</strong> ya está en proceso. Te enviaremos un correo electrónico con los detalles pronto.
        </p>

        {/* Botón para volver al inicio */}
        <Link 
          href="/"
          className="inline-block bg-black text-white px-8 py-4 uppercase tracking-widest hover:bg-gray-800 transition-colors w-full font-medium"
        >
          Volver a la tienda
        </Link>
        
      </div>
    </div>
  );
}