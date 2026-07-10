"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ✅ LISTA ESTRICTA DE CATEGORÍAS PRINCIPALES
const ALLOWED_CATEGORIES = [
  "Polos/Knits",
  "Caps",
  "Sweatshirts/Fleece",
  "T-Shirts",
  "Activewear"
];

// --- COMPONENTE DE IMAGEN ---
function ProductImage({ style, title, dbImage }: { style: string; title: string; dbImage?: string }) {
  const cleanStyle = style?.trim() || "";
  
  const initialImg = dbImage?.startsWith("http") ? dbImage : `https://cdnm.sanmar.com/catalog/images/${cleanStyle.toUpperCase()}.jpg`;
  
  const [imgSrc, setImgSrc] = useState(initialImg);
  const [retry, setRetry] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (retry === 0) {
      setImgSrc(`https://cdnm.sanmar.com/catalog/images/${cleanStyle.toUpperCase()}_model_front.jpg`);
      setRetry(1);
    } else if (retry === 1) {
      setImgSrc(`https://cdnm.sanmar.com/catalog/images/${cleanStyle.toLowerCase()}_model_front.jpg`);
      setRetry(2);
    } else {
      setHasError(true);
    }
  };

  if (hasError) return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-2xl">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No Image</span>
    </div>
  );

  return (
    <img 
      src={imgSrc} 
      alt={title}
      className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105 p-6"
      onError={handleError}
    />
  );
}

interface LoopProductsProps {
  onCategoriesFetched: (categories: string[]) => void;
}

export default function LoopProducts({ onCategoriesFetched }: LoopProductsProps) {
  const [displayCategories, setDisplayCategories] = useState<{ originalCategory: string, cleanCategory: string, product: any }[]>([]);
  const [loading, setLoading] = useState(true);
  
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    async function fetchCategoryCards() {
      if (hasFetchedRef.current) return;

      setLoading(true);
      try {
        const { data: allProducts, error } = await supabase
          .from("products_unique_styles")
          .select("*")
          .not("category", "is", null)
          .limit(1000); 

        if (error) throw error;

        if (allProducts && allProducts.length > 0) {
          const uniqueCategories = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));

          // 1. Filtramos las categorías principales permitidas
          const prioritizedCategories = uniqueCategories.filter(cat => 
            ALLOWED_CATEGORIES.includes(cat.trim())
          );

          // 2. Filtramos el resto de categorías que NO están en la lista principal
          const otherCategories = uniqueCategories.filter(cat => 
            !ALLOWED_CATEGORIES.includes(cat.trim())
          );

          // 3. Calculamos cuántas faltan para llegar a 8 y completamos
          const extraNeeded = 8 - prioritizedCategories.length;
          const selectedCategories = [
            ...prioritizedCategories,
            ...otherCategories.slice(0, extraNeeded)
          ];

          if (!hasFetchedRef.current) {
            onCategoriesFetched(selectedCategories.map(cat => cat.trim()));
            hasFetchedRef.current = true;
          }

          const mappedData = selectedCategories.map(cat => {
            const catProducts = allProducts.filter(p => p.category === cat);
            const randomProduct = catProducts.length > 0 
              ? catProducts[Math.floor(Math.random() * catProducts.length)] 
              : null;
            
            return {
              originalCategory: cat, // Mantiene el espacio oculto para que el enlace funcione en la URL
              cleanCategory: cat.trim(), // Nombre limpio para mostrar visualmente
              product: randomProduct
            };
          }).filter(item => item.product !== null);

          setDisplayCategories(mappedData);
        }
      } catch (err) {
        console.error("Error en Loop:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCategoryCards();
    
  }, []);

  if (loading) return (
    <div className="py-40 text-center">
      <div className="inline-block w-8 h-8 border-4 border-[#8012d8] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black uppercase tracking-[0.3em] text-gray-400 text-xs">Loading Collections</p>
    </div>
  );

  return (
    <section className="container mx-auto px-4 py-16 mb-20 border-t border-gray-100">
      
      {/* TÍTULO DE LA SECCIÓN */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 gap-4">
        <div>
          <span className="text-[#8012d8] text-[10px] font-black uppercase tracking-[0.4em]">
            Outfit Your Team
          </span>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black mt-2 leading-[1.1] max-w-2xl">
            Custom T-Shirts & Promotional Products
          </h2>
        </div>
        <Link 
          href="/products" 
          className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#8012d8] transition-colors whitespace-nowrap"
        >
          View All Products →
        </Link>
      </div>

      {/* GRID DE CATEGORÍAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {displayCategories.map((item, index) => (
          <Link 
            key={index} 
            href={`/products?category=${encodeURIComponent(item.originalCategory)}`} 
            className="group block"
          >
            {/* Contenedor de la Imagen */}
            <div className="relative aspect-square bg-[#F3F4F6] rounded-2xl overflow-hidden mb-4 transition-all duration-300 group-hover:shadow-md flex items-center justify-center border border-transparent group-hover:border-gray-200 group-hover:bg-white group-hover:-translate-y-1">
              <ProductImage 
                style={item.product.style} 
                dbImage={item.product.image_url}
                title={item.cleanCategory} 
              />
            </div>

            {/* Texto Inferior Limpio */}
            <div className="px-1">
              <h3 className="text-[16px] font-semibold text-gray-900 group-hover:text-[#8012d8] transition-colors">
                {item.cleanCategory}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}