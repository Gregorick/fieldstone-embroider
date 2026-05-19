"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- BOTÓN ESTILO FIELDSTONE ---
function CategoryButton({ text }: { text: string }) {
  return (
    <div className="absolute bottom-6 left-6 bg-white px-6 py-3 rounded-sm flex items-center gap-3 shadow-xl group-hover:bg-[#8012d8] group-hover:text-[#fff] transition-all duration-500 z-20">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] truncate max-w-[120px]">
        {text}
      </span>
      <ChevronRight size={14} strokeWidth={3} />
    </div>
  );
}

// --- COMPONENTE DE IMAGEN (Restaurando el estilo Visual Original) ---
function CategoryImage({ imageUrl, category }: { imageUrl: string; category: string }) {
  const getStyle = (url: string) => {
    if (!url) return "";
    const name = url.split('/').pop() || "";
    return name.split('_')[0].split('.')[0];
  };

  const style = getStyle(imageUrl);
  // Volvemos a la lógica de .jpg que llena mejor el espacio de categoría
  const [imgSrc, setImgSrc] = useState(`https://cdnm.sanmar.com/catalog/images/${style}.jpg`);

  return (
    <>
      <img 
        src={imgSrc} 
        alt={category}
        // ✅ Restauramos object-cover y quitamos el padding para que llene todo el recuadro
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        onError={(e) => {
          if (imgSrc.includes('.jpg') && !imgSrc.includes('_model_front')) {
            setImgSrc(`https://cdnm.sanmar.com/catalog/images/${style}_model_front.jpg`);
          }
        }}
      />
      {/* Capa de oscurecimiento sutil original */}
      <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500" />
    </>
  );
}

interface CategoryItem {
  name: string;
  imageUrl: string;
}

export default function TopCategories({ excludeCategories }: { excludeCategories: string[] }) {
  const [displayCategories, setDisplayCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopCategories() {
      setLoading(true);
      try {
        // 🚀 Una sola petición a la Vista Materializada (Instantáneo)
        const { data: products, error } = await supabase
          .from("products_unique_styles")
          .select("category, image_url")
          .not("category", "is", null)
          .not("image_url", "is", null)
          .limit(200);

        if (error) throw error;

        if (products) {
          const catMap = new Map();
          products.forEach(p => {
            if (!catMap.has(p.category) && !excludeCategories.includes(p.category)) {
              catMap.set(p.category, p.image_url);
            }
          });

          const availableCats = Array.from(catMap.entries()).map(([name, imageUrl]) => ({
            name,
            imageUrl
          }));

          const selected = availableCats
            .sort(() => 0.5 - Math.random())
            .slice(0, 4);

          setDisplayCategories(selected);
        }
      } catch (e) {
        console.error("Error en categorias:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTopCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || displayCategories.length < 4) return null;

  return (
    <section className="bg-white py-20 border-t border-gray-100">
      <div className="container mx-auto px-4">
        
        <div className="mb-16">
           <span className="color-primary text-[10px] font-black uppercase tracking-[0.4em] block mb-2">Curated Collections</span>
           <h2 className="text-5xl font-black uppercase tracking-tighter text-black italic">
              Top Categories<span className="color-primary">.</span>
           </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[600px]">
          {/* CATEGORÍA 1 - GRANDE */}
          <Link 
            href={`/products?category=${encodeURIComponent(displayCategories[0].name)}`} 
            className="relative text-gray-600 group col-span-2 row-span-2 rounded-xl overflow-hidden bg-[#F3F3F3] shadow-sm border border-gray-100"
          >
            <CategoryImage imageUrl={displayCategories[0].imageUrl} category={displayCategories[0].name} />
            <CategoryButton text={displayCategories[0].name} />
          </Link>

          {/* CATEGORÍA 2 */}
          <Link 
            href={`/products?category=${encodeURIComponent(displayCategories[1].name)}`} 
            className="relative text-gray-600 group rounded-xl overflow-hidden bg-[#F3F3F3] shadow-sm border border-gray-100"
          >
            <CategoryImage imageUrl={displayCategories[1].imageUrl} category={displayCategories[1].name} />
            <CategoryButton text={displayCategories[1].name} />
          </Link>

          {/* CATEGORÍA 3 */}
          <Link 
            href={`/products?category=${encodeURIComponent(displayCategories[2].name)}`} 
            className="relative text-gray-600 group rounded-xl overflow-hidden bg-[#F3F3F3] shadow-sm border border-gray-100"
          >
            <CategoryImage imageUrl={displayCategories[2].imageUrl} category={displayCategories[2].name} />
            <CategoryButton text={displayCategories[2].name} />
          </Link>

          {/* CATEGORÍA 4 - ANCHA */}
          <Link 
            href={`/products?category=${encodeURIComponent(displayCategories[3].name)}`} 
            className="relative text-gray-600 group col-span-2 rounded-xl overflow-hidden bg-[#F3F3F3] shadow-sm border border-gray-100"
          >
            <CategoryImage imageUrl={displayCategories[3].imageUrl} category={displayCategories[3].name} />
            <CategoryButton text={displayCategories[3].name} />
          </Link>
        </div>
      </div>
    </section>
  );
}