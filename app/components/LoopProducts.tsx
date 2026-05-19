"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
// ✅ 1. Importamos el Contexto del Carrito y el ícono Plus
import { useCart } from "@/app/context/CartContext"; 
import { Plus } from "lucide-react";

// --- COMPONENTE DE IMAGEN (Restauramos tu fórmula que funcionaba para los estilos) ---
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
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-3xl">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No Image</span>
    </div>
  );

  return (
    <img 
      src={imgSrc} 
      alt={title}
      className="w-full h-full object-contain mix-blend-multiply transition-all duration-700 group-hover:scale-110 p-8"
      onError={handleError}
    />
  );
}

interface LoopProductsProps {
  onCategoriesFetched: (categories: string[]) => void;
}

export default function LoopProducts({ onCategoriesFetched }: LoopProductsProps) {
  const [categoriesData, setCategoriesData] = useState<{ [key: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  
  // ✅ 2. Instanciamos el carrito
  const { addToCart } = useCart();
  
  // EL ESCUDO CONTRA EL BUCLE INFINITO
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    async function fetchProductsLoop() {
      if (hasFetchedRef.current) return;

      setLoading(true);
      try {
        const { data: allProducts, error } = await supabase
          .from("products_unique_styles")
          .select("*")
          .not("category", "is", null)
          .limit(500);

        if (error) {
          console.error("Error cargando productos del Home:", error.message);
          throw error;
        }

        if (allProducts && allProducts.length > 0) {
          const grouped: { [key: string]: any[] } = {};
          const categories = Array.from(new Set(allProducts.map(p => p.category))).slice(0, 5);

          if (!hasFetchedRef.current) {
            onCategoriesFetched(categories);
            hasFetchedRef.current = true;
          }

          categories.forEach(cat => {
            grouped[cat] = allProducts
              .filter(p => p.category === cat)
              .sort(() => 0.5 - Math.random()) 
              .slice(0, 10);
          });
          setCategoriesData(grouped);
        }
      } catch (err) {
        console.error("Error en Loop:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProductsLoop();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div className="py-40 text-center">
      <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black uppercase tracking-[0.3em] text-gray-400 text-xs">Loading Collections</p>
    </div>
  );

  return (
    <div className="space-y-32 pb-32">
      {Object.entries(categoriesData).map(([category, products]) => (
        <section key={category} className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 border-b border-gray-100 pb-6 gap-4">
            <div>
              <span className="color-primary text-[10px] font-black uppercase tracking-[0.4em]">Featured</span>
              <h2 className="text-5xl font-black uppercase tracking-tighter text-black mt-2 leading-none">
                {category}
              </h2>
            </div>
            <Link 
              href={`/products?category=${encodeURIComponent(category)}`} 
              className="text-xs font-black uppercase tracking-widest text-gray-400 hover:color-primary transition-all"
            >
              Explore All →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="group block">
                {/* Contenedor de la Imagen */}
                <div className="relative aspect-[3/4] bg-[#F3F3F3] rounded-[2rem] overflow-hidden mb-6 transition-all duration-500 group-hover:shadow-xl border border-transparent group-hover:border-gray-200 group-hover:bg-white group-hover:-translate-y-1 flex items-center justify-center">
                  
                  <ProductImage 
                    style={product.style} 
                    dbImage={product.image_url}
                    title={product.title || product.product_name || product.name} 
                  />

                  {/* ✅ 3. EL NUEVO BOTÓN "QUICK ADD" */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault(); // Evita que se abra la página del producto
                      e.stopPropagation(); // Evita que el clic "burbujee" al Link
                      addToCart({
                        id: `${product.id}-default`,
                        productId: product.id,
                        title: product.title || product.product_name || product.name,
                        price: product.price || 0,
                        image: product.image_url || `https://cdnm.sanmar.com/catalog/images/${product.style}.jpg`,
                        size: product.size || "Default", 
                        color: product.color_name || "Default",
                        quantity: 1
                      });
                    }}
                    className="absolute bottom-4 left-4 right-4 bg-[#8012d8] text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-[1rem] opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-20 flex items-center justify-center gap-2 shadow-2xl hover:bg-blue-600"
                  >
                    Add to cart <Plus size={14} />
                  </button>

                </div>

                {/* Textos inferiores */}
                <div className="px-2">
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{product.style}</span>
                  <h3 className="text-[13px] font-black uppercase tracking-tight text-gray-900 line-clamp-1 group-hover:text-[#8012d8] transition-colors mt-1">
                    {product.title || product.product_name || product.name}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {product.brand}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}