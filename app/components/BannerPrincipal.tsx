"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Swiper core y módulos
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";

// Estilos de Swiper
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

interface BannerSlide {
  brand: string;
  style: string;
}

// --- COMPONENTE DE IMAGEN (Lógica CDNM ganadora) ---
function BannerImage({ style, brand }: { style: string; brand: string }) {
  const cleanStyle = style?.split('_')[0]?.replace(/^\//, "") || "";
  const [imgSrc, setImgSrc] = useState(`https://cdnm.sanmar.com/catalog/images/${cleanStyle}.jpg`);
  const [retry, setRetry] = useState(0);

  const handleError = () => {
    if (retry === 0) {
      setImgSrc(`https://cdnm.sanmar.com/catalog/images/${cleanStyle.toLowerCase()}_model_front.jpg`);
      setRetry(1);
    } else if (retry === 1) {
      setImgSrc(`https://cdnm.sanmar.com/catalog/images/${cleanStyle}_front_1.jpg`);
      setRetry(2);
    }
  };

  return (
    <div className="relative w-full h-[50vh] flex items-center justify-center p-4">
      {/* Círculo decorativo de fondo */}
      <div className="absolute w-[300px] md:w-[500px] aspect-square bg-blue-50/50 rounded-full blur-3xl -z-10 flex items-end justify-content-end" />
      
      {/* IMG es un void element: AUTO-CERRADO y SIN hijos */}
      <img 
        src={imgSrc} 
        alt={brand}
        className="max-w-full max-h-full-[500px] object-contain mix-blend-multiply transform transition-transform duration-1000 hover:scale-105"
        onError={handleError}
      />
    </div>
  );
}

export default function BannerPrincipal() {
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBannerData() {
      setLoading(true);
      try {
        // Consultamos la tabla de productos para obtener marcas que tengan imagen
        const { data: rawProducts, error } = await supabase
          .from("products")
          .select("brand, style, image_url")
          .not("brand", "is", null)
          .limit(200);

        if (error) throw error;

        if (rawProducts) {
          // 1. Obtenemos marcas únicas
          const uniqueBrands = Array.from(new Set(rawProducts.map(p => p.brand)))
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);

          // 2. Para cada marca elegimos un producto aleatorio del pool
          const selectedSlides = uniqueBrands.map(brandName => {
            const brandPool = rawProducts.filter(p => p.brand === brandName);
            const randomProd = brandPool[Math.floor(Math.random() * brandPool.length)];
            return {
              brand: brandName,
              // Usamos style si existe, si no extraemos del image_url
              style: randomProd.style || randomProd.image_url?.split('_')[0]?.replace(/^\//, "") || ""
            };
          });

          setSlides(selectedSlides);
        }
      } catch (err) {
        console.error("Error en Banner:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBannerData();
  }, []);

  if (loading || slides.length === 0) return <div className="h-[60vh] bg-gray-50 animate-pulse" />;

  return (
    <section className="h-[60vh] w-full bg-white border-b border-gray-100 overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        autoplay={{ delay: 6000 }}
        pagination={{ clickable: true }}
        loop={true}
        className="h-full"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i} className="bg-white">
            <div className="container mx-auto h-full px-6 grid grid-cols-1 md:grid-cols-2 items-center">
              
              {/* COLUMNA IZQUIERDA: CONTENIDO */}
              <div className="space-y-6 md:text-left text-center">
                <div className="flex items-center gap-3 md:justify-start justify-center">
                  <span className="h-[1px] w-8 bg-[#8012d8]"></span>
                  <span className="color-primary text-[10px] font-black uppercase tracking-[0.4em]">Featured Collection</span>
                </div>
                
                <h2 className="text-6xl md:text-8xl font-light tracking-tighter text-black leading-none">
                  {slide.brand}<span className="font-black color-primary">.</span>
                </h2>
                
                <p className="text-gray-400 text-sm max-w-md leading-relaxed font-medium md:mx-0 mx-auto">
                  Experience the perfect blend of style and durability. Our {slide.brand} collection offers premium fabrics designed specifically for high-quality embroidery and custom branding.
                </p>
                
                <div className="pt-4">
                  <Link 
                    href={`/products?brand=${encodeURIComponent(slide.brand)}`}
                    className="inline-block px-12 py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#8012d8] transition-all rounded-full shadow-lg"
                  >
                    Explore Brand
                  </Link>
                </div>
              </div>

              {/* COLUMNA DERECHA: IMAGEN */}
              <div className="h-full flex items-center justify-center">
                <BannerImage style={slide.style} brand={slide.brand} />
              </div>

            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx global>{`
        .swiper-pagination-bullet-active { background: #8012d8 !important; width: 25px; border-radius: 5px; transition: all 0.3s; }
      `}</style>
    </section>
  );
}