"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";

// Estilos de Swiper
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

// ✅ 1. IMPORTAMOS LAS IMÁGENES DIRECTAMENTE (Esto evita rutas rotas)
import imgSlide1 from "@/public/emb/product-photo-(10).png";
import imgSlide2 from "@/public/emb/product-photo-(9).png";
import imgSlide3 from "@/public/emb/product-photo-(12).png";

// Definimos los 3 slides enfocados en el servicio de bordado/personalización
const SLIDES = [
  {
    tagline: "Premium Custom Apparel",
    headline: "Your Logo. Our Quality. Outwear Your Competition.",
    description: "High-quality embroidery and custom printing for teams, businesses, and events. All-in pricing with no hidden fees.",
    image: imgSlide1.src, // ✅ Usamos la imagen importada
    primaryAction: { label: "Start Designing", link: "/products" },
    secondaryAction: { label: "Request a Quote", link: "/quote" }
  },
  {
    tagline: "Expert Embroidery",
    headline: "Flawless Stitching on Premium Brands.",
    description: "From corporate polos to custom headwear, we bring your brand to life with industry-leading precision and care.",
    image: imgSlide2.src, // ✅ Usamos la imagen importada
    primaryAction: { label: "Shop Headwear", link: "/products?category=Headwear" },
    secondaryAction: { label: "View Brands", link: "/brands" }
  },
  {
    tagline: "Fast & Reliable",
    headline: "No Hidden Fees. Just Great Custom Gear.",
    description: "Your logo is included in the price. Enjoy fast turnaround times and digital proofs before production begins.",
    image: imgSlide3.src, // ✅ Usamos la imagen importada
    primaryAction: { label: "Explore Catalog", link: "/products" },
    secondaryAction: null
  }
];

export default function BannerPrincipal() {
  return (
    <section className="relative h-[100vh] w-full bg-[#f8f9fa] border-b border-gray-100 overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop={true}
        className="h-full"
      >
        {SLIDES.map((slide, i) => (
          <SwiperSlide key={i} className="bg-[#f8f9fa]">
            <div className="container mx-auto h-full px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-16">
              
              {/* COLUMNA IZQUIERDA: COPY (TEXTOS) */}
              <div className="space-y-6 text-center lg:text-left z-10 pt-10 lg:pt-0">
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                  <span className="h-[2px] w-8 bg-[#8012d8]"></span>
                  <span className="text-[#8012d8] text-[11px] font-black uppercase tracking-[0.3em]">
                    {slide.tagline}
                  </span>
                </div>
                
                <h2 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-black leading-[1.05]">
                  {slide.headline.split('. ').map((part, index, array) => (
                    <span key={index}>
                      {part}
                      {index < array.length - 1 && <span className="text-[#8012d8]">. </span>}
                    </span>
                  ))}
                </h2>
                
                <p className="text-gray-600 text-sm md:text-base max-w-lg leading-relaxed font-medium mx-auto lg:mx-0">
                  {slide.description}
                </p>
                
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link 
                    href={slide.primaryAction.link}
                    className="w-full sm:w-auto px-10 py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#8012d8] transition-colors rounded-full shadow-lg text-center"
                  >
                    {slide.primaryAction.label}
                  </Link>

                  {slide.secondaryAction && (
                    <Link 
                      href={slide.secondaryAction.link}
                      className="w-full sm:w-auto px-10 py-4 bg-transparent border-2 border-gray-300 text-black text-[11px] font-black uppercase tracking-[0.2em] hover:border-black transition-colors rounded-full text-center"
                    >
                      {slide.secondaryAction.label}
                    </Link>
                  )}
                </div>
              </div>

              {/* COLUMNA DERECHA: IMAGEN DESTACADA */}
              <div className="relative h-full flex items-center justify-center pb-10 lg:pb-0">
                <div className="absolute w-[80%] aspect-square bg-white rounded-full shadow-2xl opacity-50 blur-2xl"></div>
                
                <img 
                  src={slide.image} 
                  alt="Custom Embroidery Work"
                  className="relative z-10 w-full max-w-[300px] lg:max-w-[400px] object-contain drop-shadow-2xl mix-blend-multiply transform transition-transform duration-1000 hover:scale-105"
                />
              </div>

            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx global>{`
        .swiper-pagination-bullet {
          background: #d1d5db;
          opacity: 1;
        }
        .swiper-pagination-bullet-active { 
          background: #8012d8 !important; 
          width: 32px; 
          border-radius: 8px; 
          transition: all 0.3s ease; 
        }
        .swiper-pagination {
          bottom: 24px !important;
        }
      `}</style>
    </section>
  );
}