"use client";

import { useState, useEffect } from "react";

export default function Testimonios() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debugError, setDebugError] = useState("");
  
  // Lógica de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 12 elementos por página (3 columnas x 4 filas)

  // Limpiador de texto para caracteres raros de Google
  const cleanText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/â€™/g, "'")
      .replace(/â€”/g, "—")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"');
  };

  // Avatar por defecto en caso de error (Icono SVG en Base64)
  const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch('/fieldstone-embroider/api/google-reviews');
        
        if (!res.ok) {
          throw new Error(`El servidor devolvió un error: ${res.status}`);
        }

        const data = await res.json();
        
        if (data.success && data.reviews) {
          const processedReviews = data.reviews
            // 1. FILTRO: Solo mejores valorados (4 o 5 estrellas) con texto
            .filter((rev: any) => rev.rating >= 4 && rev.text && rev.text.trim().length > 0)
            // 2. ORDEN: Siempre los últimos de primero (por fecha/tiempo de Google)
            .sort((a: any, b: any) => b.time - a.time);
            
          setTestimonials(processedReviews);
        } else {
          setDebugError("Error de Google: " + (data.error || "No se encontraron reseñas."));
        }
      } catch (error: any) {
        setDebugError("Error de la Página: " + error.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReviews();
  }, []);

  // Cálculos para la paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = testimonials.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(testimonials.length / itemsPerPage);

  // Funciones para cambiar de página
  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToPage = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <section className="py-20 bg-gray-100">
      <div className="container mx-auto px-4 max-w-7xl">
        
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black mb-4">
            What Our Clients Say
          </h2>
          <div className="w-24 h-1 bg-[#8012d8] mx-auto rounded-full"></div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#8012d8] rounded-full animate-spin"></div>
          </div>
        ) : debugError ? (
          <div className="text-center bg-red-100 text-red-600 p-6 rounded-2xl font-black max-w-2xl mx-auto border-2 border-red-200">
            {debugError}
          </div>
        ) : testimonials.length > 0 ? (
          <>
            {/* GRID DE RESEÑAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentItems.map((testimonial, index) => (
                <div key={index} className="flex flex-col h-full pt-4">
                  
                  {/* Burbuja de texto */}
                  <div className="relative bg-gray-50 rounded-xl p-8 mb-8 flex-1 border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      ))}
                    </div>

                    <p className="text-gray-500 leading-relaxed text-[15px] line-clamp-6">
                      "{cleanText(testimonial.text)}"
                    </p>
                    <div className="absolute -bottom-5 left-10 w-0 h-0 border-l-[15px] border-l-transparent border-t-[20px] border-t-gray-50 border-r-[15px] border-r-transparent drop-shadow-sm"></div>
                  </div>

                  {/* Avatar y Nombre */}
                  <div className="flex items-center gap-4 px-6">
                    <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100 shadow-sm bg-white p-1">
                      <img 
                        src={testimonial.profile_photo_url || defaultAvatar} 
                        alt={testimonial.author_name}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => { 
                          e.currentTarget.onerror = null; 
                          e.currentTarget.src = defaultAvatar;
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="text-black font-black text-lg tracking-tight line-clamp-1">
                        {testimonial.author_name}
                      </h4>
                      {/* Solo muestra "Google Review", sin fechas ni tiempos */}
                      <p className="text-[#8012d8] text-sm italic font-medium">
                        Google Review
                      </p>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* CONTROLES DE PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-16 space-x-2">
                <button 
                  onClick={prevPage} 
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-md font-bold transition-colors ${
                    currentPage === 1 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#8012d8] text-white hover:bg-[#6a0eb3]"
                  }`}
                >
                  Prev
                </button>

                <div className="flex space-x-1 mx-4">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i + 1)}
                      className={`w-10 h-10 rounded-md font-bold transition-colors ${
                        currentPage === i + 1 
                          ? "bg-[#8012d8] text-white" 
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={nextPage} 
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-md font-bold transition-colors ${
                    currentPage === totalPages ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#8012d8] text-white hover:bg-[#6a0eb3]"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 py-10 font-bold">
            No reviews available at the moment.
          </div>
        )}

      </div>
    </section>
  );
}