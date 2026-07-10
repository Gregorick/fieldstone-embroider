"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Image from "next/image";

// Importaciones de imágenes
import imgAbout from "@/public/emb/product-photo-(9).png";
import imgTshirts from "@/public/emb/product-photo-(4).png";
import imgHoodies from "@/public/emb/product-photo-(12).png";
import imgHats from "@/public/emb/fondo-1.png";
// Usamos require para imágenes con espacios/caracteres especiales en el nombre
import imgPromo from "@/public/emb/productphotodetamañomediano.jpeg";

export default function AboutUsPage() {
  return (
    <main className="bg-white min-h-screen">
      <Header />

      <div className="container mx-auto px-4 py-16 lg:py-24 max-w-6xl">
        
        {/* SECCIÓN 1: ABOUT US */}
        <section className="flex flex-col lg:flex-row items-center gap-12 mb-24">
          <div className="flex-1 space-y-6">
            <h1 className="text-5xl font-black uppercase tracking-tighter text-black italic">About Us</h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              At Fieldstone Embroidery and Promotions, we specialize in creating high-quality embroidery and promotional products. 
              Our company was established to help businesses, organizations, and individuals stand out from the rest. 
              We offer a diverse range of services, including embroidery, promotional products, and custom branding solutions.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              We are passionate about ensuring customer satisfaction and providing products that exceed expectations. 
              We take pride in building enduring relationships with our clients and consider ourselves creative partners 
              committed to improving brand visibility and leaving a lasting impression.
            </p>
          </div>
          <div className="flex-1 w-full lg:w-1/2">
            <div className="aspect-square relative rounded-3xl overflow-hidden shadow-2xl">
              <Image 
                src={imgAbout} 
                alt="About Fieldstone" 
                fill 
                className="object-contain" 
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: SERVICES */}
        <section className="mb-24 text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-black mb-8">Services</h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            We specialize in embroidering custom t-shirts, hoodies, sweaters, hats, and beanies using high-quality threads 
            and state-of-the-art machines. You have the freedom to select your design, color, size, and stitch style. 
            Your personalized t-shirt will be crafted and dispatched to you within 2-3 weeks. In addition to our embroidery 
            services, we offer an extensive range of promotional items suitable for any event or situation.
          </p>
        </section>

        {/* SECCIÓN 3: 4 COLUMNAS */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: "T-Shirts and Polos", img: imgTshirts },
            { title: "Hoodies and Sweaters", img: imgHoodies },
            { title: "Hats and Beanies", img: imgHats },
            { title: "Promotional Items", img: imgPromo },
          ].map((item, index) => (
            <div key={index} className="group cursor-pointer">
              <div className="aspect-[2/3] relative rounded-2xl overflow-hidden mb-4">
                <Image 
                  src={item.img} 
                  alt={item.title} 
                  fill 
                  className="object-contain transition-transform duration-500 group-hover:scale-105" 
                />
              </div>
              <h3 className="text-lg font-bold text-black uppercase tracking-tight group-hover:text-[#8012d8] transition-colors">
                {item.title}
              </h3>
            </div>
          ))}
        </section>

      </div>

      <Footer />
    </main>
  );
}