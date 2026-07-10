"use client";

import Link from "next/link";

export default function ContactUs() {
  return (
    <section className="relative w-full min-h-[80vh] flex items-center overflow-hidden bg-black">
      
      {/* 🎥 VIDEO DE FONDO (SIN PARALLAX) */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-70 grayscale"
        >
          <source src="/fieldstone-embroider/video/header_main.mp4" type="video/mp4" />
          Tu navegador no soporta videos HTML5.
        </video>
      </div>

      {/* 📄 CONTENEDOR DEL FORMULARIO (FLOTANTE A LA DERECHA) */}
      <div className="container relative z-10 mx-auto px-4 lg:px-8 flex justify-end items-center h-full py-16">
        
        <div className="w-full max-w-[500px] bg-white p-8 md:p-12 shadow-2xl rounded-sm">
          
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-center text-black mb-4">
            Contact Us
          </h2>
          
          <p className="text-center text-sm font-medium text-gray-600 mb-8">
            Call us at <a href="tel:9782199071" className="text-[#5C92D1] hover:underline">978.219.9071</a> or use the form below:
          </p>

          <form 
            className="space-y-6" 
            onSubmit={(e) => {
              e.preventDefault();
              alert("Form submitted!"); 
            }}
          >
            {/* Campo: Nombre */}
            <div className="relative">
              <input 
                type="text" 
                id="name"
                name="name"
                required
                className="w-full bg-transparent border-b border-gray-300 py-3 text-sm text-black outline-none focus:border-black transition-colors placeholder-gray-400"
                placeholder="Full Name"
              />
            </div>

            {/* Campo: Email */}
            <div className="relative">
              <input 
                type="email" 
                id="email"
                name="email"
                required
                className="w-full bg-transparent border-b border-gray-300 py-3 text-sm text-black outline-none focus:border-black transition-colors placeholder-gray-400"
                placeholder="Email Address"
              />
            </div>

            {/* Campo: Teléfono */}
            <div className="relative">
              <input 
                type="tel" 
                id="phone"
                name="phone"
                required
                className="w-full bg-transparent border-b border-gray-300 py-3 text-sm text-black outline-none focus:border-black transition-colors placeholder-gray-400"
                placeholder="Phone #"
              />
            </div>

            {/* Campo: Mensaje */}
            <div className="relative">
              <textarea 
                id="message"
                name="message"
                required
                rows={3}
                className="w-full bg-transparent border-b border-gray-300 py-3 text-sm text-black outline-none focus:border-black transition-colors placeholder-gray-400 resize-none"
                placeholder="Type Your Message"
              ></textarea>
            </div>

            {/* Fila Inferior: Captcha y Botón */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span>1 + 8 =</span>
                <input 
                  type="text" 
                  required
                  className="w-12 border-b border-gray-400 text-center outline-none focus:border-black py-1"
                />
              </div>

              <button 
                type="submit"
                className="bg-black text-white px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#8012d8] transition-colors"
              >
                Submit
              </button>
            </div>

          </form>
        </div>
      </div>
    </section>
  );
}