"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";

// Importaciones de estilos de Swiper
import "swiper/css";
import "swiper/css/pagination";

// Importaciones de imágenes
import imgMirella from "@/public/testimonios/MirellaS.jpeg";
import imgFrancisco from "@/public/testimonios/FranciscoC.jpeg";
import imgWilliam from "@/public/testimonios/Willian_Batista.jpeg";
import imgBrenda from "@/public/testimonios/BrendaS.jpeg";

const TESTIMONIALS_DATA = [
  {
    id: 1,
    name: "Mirella Herrera",
    role: "Verified Customer",
    text: "Our local baseball team needed hats embroidered for our upcoming season, and we were so happy with the results from Fieldstone Embroidery. The hats were high-quality, and the embroidery was done perfectly. We couldn’t have been more pleased with the service we received. Thank you, Daniel and team!",
    image: imgMirella,
  },
  {
    id: 2,
    name: "Francisco Cespedes",
    role: "Verified Customer",
    text: "Fieldstone Embroidery did an amazing job with our custom t-shirts! The quality of the embroidery was top-notch, and the turnaround time was quick. I recommend them to anyone looking for high-quality embroidery and promotional products.",
    image: imgFrancisco,
  },
  {
    id: 3,
    name: "William Miller",
    role: "Verified Customer",
    text: "I recently used Fieldstone Embroidery to create custom pens and notepads for my company’s annual conference. The pens were a hit with the attendees and a great way to promote our brand. The notepads were also well-received and a handy way for attendees to take notes during the conference. I would highly recommend Fieldstone Embroidery to anyone looking for promotional items for their next conference.",
    image: imgWilliam,
  },
  {
    id: 4,
    name: "Brenda Schmidt",
    role: "Verified Customer",
    text: "I used Fieldstone to make branded hats and t-shirts for my small business. Top-notch quality, fast turnaround, excellent customer service! 5/5 stars.",
    image: imgBrenda,
  }
];

export default function Testimonios() {
  return (
    <section className="py-20 bg-gray-100">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Título de la sección (Opcional, lo puedes quitar si no lo necesitas) */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black mb-4">
            What Our Clients Say
          </h2>
          <div className="w-24 h-1 bg-[#8012d8] mx-auto rounded-full"></div>
        </div>

        {/* Swiper Slider */}
        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={30}
          slidesPerView={1}
          loop={true}
          autoplay={{
            delay: 7000,
            disableOnInteraction: false,
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          breakpoints={{
            // En tablets (md) muestra 2 columnas
            768: {
              slidesPerView: 2,
            },
            // En pantallas grandes (lg) muestra 3 columnas
            1024: {
              slidesPerView: 3,
            },
          }}
          className="pb-14" // Espacio inferior para los puntitos (pagination)
        >
          {TESTIMONIALS_DATA.map((testimonial) => (
            <SwiperSlide key={testimonial.id} className="h-auto">
              <div className="flex flex-col h-full pt-4">
                
                {/* Burbuja de texto */}
                <div className="relative bg-gray-50 rounded-xl p-8 mb-8 flex-1 border border-gray-100 shadow-sm">
                  <p className="text-gray-500 leading-relaxed text-[15px]">
                    "{testimonial.text}"
                  </p>
                  
                  {/* El "pico" de la burbuja usando CSS borders */}
                  <div className="absolute -bottom-5 left-10 w-0 h-0 border-l-[15px] border-l-transparent border-t-[20px] border-t-gray-50 border-r-[15px] border-r-transparent drop-shadow-sm"></div>
                </div>

                {/* Avatar y Nombre */}
                <div className="flex items-center gap-4 px-6">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100 shadow-sm bg-gray-200">
                    <Image 
                      src={testimonial.image} 
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-black font-black text-lg tracking-tight">
                      {testimonial.name}
                    </h4>
                    <p className="text-[#8012d8] text-sm italic font-medium">
                      {testimonial.role}
                    </p>
                  </div>
                </div>

              </div>
            </SwiperSlide>
          ))}
        </Swiper>

      </div>
    </section>
  );
}