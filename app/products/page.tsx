"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ChevronRight, Filter, X } from "lucide-react";

// ✅ LISTA DE COLORES PRINCIPALES Y SU PALABRA CLAVE DE BÚSQUEDA
const MAIN_COLORS = [
  { name: "Blacks", base: "black", hex: "#333333" },
  { name: "Whites", base: "white", hex: "#FFFFFF" },
  { name: "Grays", base: "gray", hex: "#A0A4A8" },
  { name: "Blues", base: "blue", hex: "#5C92D1" },
  { name: "Reds", base: "red", hex: "#D9534F" },
  { name: "Greens", base: "green", hex: "#A0CC70" },
  { name: "Oranges", base: "orange", hex: "#E69A28" },
  { name: "Browns", base: "brown", hex: "#8B4513" },
  { name: "Pinks", base: "pink", hex: "#F5C6CB" },
  { name: "Purples", base: "purple", hex: "#800080" },
  { name: "Yellows", base: "yellow", hex: "#EDC33A" },
  { name: "Navies", base: "navy", hex: "#000080" },
  { name: "Charcoals", base: "charcoal", hex: "#36454F" },
  { name: "Beiges", base: "beige", hex: "#F5F5DC" }
];

// ✅ ORDEN ESTÁNDAR DE TALLAS Y TALLAS POR DEFECTO PARA EL INICIO
const sizeOrder = [
  "XXS", "XS", "S", "S/M", "SM", "M", "M/L", "L", "L/XL", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL", "5XL", "6XL",
  "OSFA", "ONE SIZE", "O/S"
];

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "OSFA"];

const sortSizes = (sizes: { name: string; count: number }[]) => {
  return [...sizes].sort((a, b) => {
    const indexA = sizeOrder.indexOf(a.name.toUpperCase());
    const indexB = sizeOrder.indexOf(b.name.toUpperCase());
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
};

function CatalogImage({ imageUrl, title }: { imageUrl: string; title: string }) {
  return (
    <>
      <img 
        src={imageUrl || "https://via.placeholder.com/600x800?text=Cargando"} 
        alt={title}
        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/600x800?text=No+Image"; }}
      />
      <div className="absolute inset-0 bg-black/[0.02] group-hover:bg-transparent transition-colors" />
    </>
  );
}

const ITEMS_PER_PAGE = 24;

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialBrand = searchParams.get("brand") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]); 

  const [dynamicSizes, setDynamicSizes] = useState<{name: string, count: number}[]>([]);
  const [dynamicColors, setDynamicColors] = useState<{name: string, count: number}[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [dynamicBrands, setDynamicBrands] = useState<string[]>([]);

  const isRootView = !selectedCategory && !selectedBrand;

  useEffect(() => {
    const currentCategory = searchParams.get("category") || "";
    const currentBrand = searchParams.get("brand") || "";
    setSelectedCategory(currentCategory);
    setSelectedBrand(currentBrand);
    setCurrentPage(1);
  }, [searchParams]);

  // 🔥 FETCH 1: CARGA LAS OPCIONES DEL MENÚ LATERAL Y ORDEN DE DB
  useEffect(() => {
    async function fetchFilters() {
      const { data: settings } = await supabase.from("store_settings").select("visible_categories, visible_brands").eq("id", "default").single();
      
      let orderedCats: string[] = [];
      let orderedBrands: string[] = [];

      if (settings) {
        orderedCats = settings.visible_categories || [];
        orderedBrands = settings.visible_brands || [];
      }

      setDynamicCategories(orderedCats);

      if (!selectedCategory) {
        setDynamicBrands(orderedBrands);
      } else {
        const { data: brandData } = await supabase
          .from("products_unique_styles")
          .select("brand")
          .eq("category", selectedCategory)
          .not("brand", "is", null)
          .limit(5000);
          
        if (brandData) {
           const catsBrands = Array.from(new Set(brandData.map(b => b.brand)));
           const sortedCatBrands = orderedBrands.filter(b => catsBrands.includes(b));
           setDynamicBrands(sortedCatBrands);
        }
      }

      const { data: sizesData } = await supabase.rpc('get_dynamic_sizes', {
        p_category: selectedCategory || null,
        p_brand: selectedBrand || null
      });
      if (sizesData && sizesData.length > 0) {
        setDynamicSizes(sortSizes(sizesData));
      } else if (isRootView) {
        setDynamicSizes(DEFAULT_SIZES.map(s => ({ name: s, count: 0 })));
      }

      const { data: colorsData } = await supabase.rpc('get_dynamic_colors', {
        p_category: selectedCategory || null,
        p_brand: selectedBrand || null
      });
      if (colorsData) {
        setDynamicColors(colorsData);
      }
    }
    fetchFilters();
  }, [selectedCategory, selectedBrand, isRootView]);

  // 🔥 FUNCIÓN PARA ORGANIZAR LOS PRODUCTOS: 9 Caps -> 9 Bags -> 9 Polos -> El resto "Random"
  const organizeProducts = (productsList: any[]) => {
    const caps: any[] = [];
    const bags: any[] = [];
    const polos: any[] = [];
    const others: any[] = [];

    productsList.forEach(p => {
      const cat = (p.category || "").toLowerCase();
      if (cat.includes('cap') || cat.includes('headwear')) {
        caps.push(p);
      } else if (cat.includes('bag')) {
        bags.push(p);
      } else if (cat.includes('polo') || cat.includes('knit')) {
        polos.push(p);
      } else {
        others.push(p);
      }
    });

    // Extraemos hasta 9 productos de cada grupo prioritario
    const topCaps = caps.slice(0, 9);
    const topBags = bags.slice(0, 9);
    const topPolos = polos.slice(0, 9);

    // Agrupamos todo el inventario sobrante (gorras, bolsos y polos que no entraron en el top 9 + el resto de categorías)
    const remainingProducts = [
      ...caps.slice(9),
      ...bags.slice(9),
      ...polos.slice(9),
      ...others
    ];

    // Mezcla ESTABLE del inventario sobrante.
    // Usamos el ID o el style como factor pseudo-aleatorio para que se vea mezclado, pero sin romper la paginación.
    remainingProducts.sort((a, b) => ((a.style || a.id) > (b.style || b.id) ? 1 : -1));

    // Retornamos el orden final
    return [...topCaps, ...topBags, ...topPolos, ...remainingProducts];
  };

  // 🔥 FETCH 2: CARGAMOS, ORDENAMOS GLOBALMENTE Y LUEGO PAGINAMOS
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setDbError(null);

      try {
        const isDeepFiltering = selectedSizes.length > 0 || selectedColors.length > 0;
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE; // Punto de corte final para Slice

        let matchingStyles: string[] = [];
        let styleToImageMap = new Map<string, string>(); 

        if (isDeepFiltering) {
          let exactColorMatches: string[] = [];
          
          if (selectedColors.length > 0) {
            for (const colorName of selectedColors) {
              const colorObj = MAIN_COLORS.find(c => c.name === colorName);
              const baseKeyword = colorObj ? colorObj.base : colorName.toLowerCase();
              
              const matched = dynamicColors.filter(c => c.name.toLowerCase().includes(baseKeyword));
              if (matched.length > 0) {
                exactColorMatches.push(...matched.map(c => c.name));
              } else {
                const { data: dbColors } = await supabase
                  .from("products")
                  .select("color_name")
                  .ilike("color_name", `%${baseKeyword}%`)
                  .limit(1000); 
                  
                if (dbColors && dbColors.length > 0) {
                  exactColorMatches.push(...Array.from(new Set(dbColors.map(c => c.color_name))));
                } else {
                  exactColorMatches.push(
                    baseKeyword, 
                    baseKeyword.charAt(0).toUpperCase() + baseKeyword.slice(1),
                    baseKeyword.toUpperCase()
                  );
                }
              }
            }
          }

          let variantQuery = supabase.from("products").select("style, image_url");
          
          if (selectedCategory) variantQuery = variantQuery.eq("category", selectedCategory);
          if (selectedBrand) variantQuery = variantQuery.eq("brand", selectedBrand);
          if (selectedSizes.length > 0) variantQuery = variantQuery.in("size", selectedSizes);
          if (selectedColors.length > 0) variantQuery = variantQuery.in("color_name", exactColorMatches);
          
          variantQuery = variantQuery.limit(10000);
          
          const { data: variantData, error: variantError } = await variantQuery;
          if (variantError) throw variantError;

          if (!variantData || variantData.length === 0) {
            setProducts([]);
            setTotalProducts(0);
            setLoading(false);
            return;
          }

          for (const v of variantData) {
            if (v.style && v.image_url && !styleToImageMap.has(v.style)) {
              styleToImageMap.set(v.style, v.image_url);
            }
          }

          matchingStyles = Array.from(new Set(variantData.map(v => v.style).filter(Boolean)));
          matchingStyles = matchingStyles.slice(0, 800); 
        }

        // 🟢 TRAEMOS TODOS LOS PRODUCTOS PARA ORDENARLOS CORRECTAMENTE EN JS ANTES DE MOSTRARLOS
        let query = supabase.from("products_unique_styles").select("*");

        if (selectedCategory) query = query.eq("category", selectedCategory);
        if (selectedBrand) query = query.eq("brand", selectedBrand);

        if (isDeepFiltering) {
          query = query.in("style", matchingStyles);
        }

        query = query.limit(5000); // Límite alto para abarcar toda la colección y poder ordenar
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (data) {
          let customizedData = data.map(item => {
            if (isDeepFiltering && styleToImageMap.has(item.style)) {
              return { ...item, image_url: styleToImageMap.get(item.style) };
            }
            return item;
          });
          
          // 🔥 1. APLICAMOS LA REGLA: 9 Caps -> 9 Bags -> 9 Polos -> Resto Mixto
          customizedData = organizeProducts(customizedData);

          // 🔥 2. FIJAMOS EL TOTAL REAL Y DIVIDIMOS LA LISTA ORDENADA PARA LA PÁGINA ACTUAL
          setTotalProducts(customizedData.length);
          setProducts(customizedData.slice(from, to));
        }

      } catch (err: any) {
        console.error("Error cargando productos:", err);
        setDbError(err.message || JSON.stringify(err));
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [selectedCategory, selectedBrand, selectedSizes, selectedColors, currentPage, dynamicColors]);

  const handleCategoryChange = (cat: string) => { setSelectedCategory(cat); setCurrentPage(1); };
  const handleBrandChange = (brand: string) => { setSelectedBrand(brand); setCurrentPage(1); };
  
  const toggleSize = (size: string) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
    setCurrentPage(1);
  };

  const toggleColor = (colorName: string) => {
    setSelectedColors(prev => prev.includes(colorName) ? prev.filter(c => c !== colorName) : [...prev, colorName]);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSelectedCategory(""); setSelectedBrand(""); setSelectedSizes([]); setSelectedColors([]);
    setCurrentPage(1);
  };

  const getColorGroupCount = (baseColor: string) => {
    const matched = dynamicColors.filter(c => c.name.toLowerCase().includes(baseColor));
    return matched.reduce((acc, curr) => acc + curr.count, 0);
  };

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
  const showingFrom = totalProducts === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, totalProducts);

  const buildProductUrl = (product: any) => {
    const params = new URLSearchParams();
    if (selectedColors.length > 0) params.append("color", selectedColors[0]);
    if (selectedSizes.length > 0) params.append("size", selectedSizes[0]);
    
    const queryString = params.toString();
    const identifier = product.slug || product.id;
    
    return `/products/${identifier}${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <main className="bg-white min-h-screen">
      <Header />

      <div className="container mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 mb-6">
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight size={10} />
          <span className="text-black">Shop All</span>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 lg:gap-0 border-b border-gray-100 pb-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tighter text-black italic leading-tight lg:leading-none break-words">
            {selectedCategory || "The Collection"}
          </h1>
          <button 
            className="lg:hidden w-fit flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-black border border-gray-200 px-6 py-2.5 rounded-full"
            onClick={() => setIsMobileFiltersOpen(true)}
          >
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>

      <section className="container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-12 items-start">
        
        {/* SIDEBAR DE FILTROS */}
        <aside className={`w-full lg:w-[260px] flex-shrink-0 ${isMobileFiltersOpen ? 'fixed inset-0 z-[200] bg-white overflow-y-auto p-6' : 'hidden lg:block'}`}>
          {isMobileFiltersOpen && (
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Filters</h2>
              <button onClick={() => setIsMobileFiltersOpen(false)}><X size={24} /></button>
            </div>
          )}

          {dynamicSizes.length > 0 && (
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-black mb-6 tracking-tight">Size</h3>
              <ul className="space-y-4">
                {dynamicSizes.map(s => (
                  <li key={s.name} className="flex items-center justify-between group cursor-pointer" onClick={() => toggleSize(s.name)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 border-2 flex items-center justify-center transition-colors ${selectedSizes.includes(s.name) ? 'border-black bg-black' : 'border-gray-200 group-hover:border-black'}`}>
                        {selectedSizes.includes(s.name) && <div className="w-2 h-2 bg-white"></div>}
                      </div>
                      <span className="text-[17px] font-medium text-black">{s.name}</span>
                    </div>
                    <span className="text-[15px] text-gray-500">{s.count > 0 ? `(${s.count})` : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-10">
            <h3 className="text-2xl font-bold text-black mb-6 tracking-tight">Color</h3>
            <ul className="space-y-4">
              {MAIN_COLORS.map(c => {
                const count = getColorGroupCount(c.base);
                
                if (count === 0 && !isRootView) return null; 
                
                const isSelected = selectedColors.includes(c.name);
                return (
                  <li key={c.name} className="flex items-center justify-between group cursor-pointer" onClick={() => toggleColor(c.name)}>
                    <div className="flex items-center gap-4">
                      <div 
                        className={`w-6 h-6 rounded-full shadow-sm border ${isSelected ? 'ring-2 ring-offset-2 ring-black' : 'border-gray-300 group-hover:border-black'}`}
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className={`text-[17px] font-medium transition-colors ${isSelected ? 'text-black font-bold' : 'text-gray-700'}`}>{c.name}</span>
                    </div>
                    <span className="text-[15px] text-gray-500">{count > 0 ? `(${count})` : ""}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 border-b pb-2">Category</h3>
            <ul className="space-y-2">
              <li onClick={() => handleCategoryChange("")} className={`text-xs font-bold uppercase cursor-pointer ${!selectedCategory ? 'text-[#8012d8]' : 'text-gray-500 hover:text-black'}`}>All Categories</li>
              {dynamicCategories.map(cat => (
                <li key={cat} onClick={() => handleCategoryChange(cat)} className={`text-xs font-bold uppercase cursor-pointer ${selectedCategory === cat ? 'text-[#8012d8]' : 'text-gray-500 hover:text-[#8012d8]'}`}>
                  {cat}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 border-b pb-2">Brands</h3>
            <ul className="space-y-2">
              <li onClick={() => handleBrandChange("")} className={`text-xs font-bold uppercase cursor-pointer ${!selectedBrand ? 'text-[#8012d8]' : 'text-gray-500 hover:text-[#8012d8]'}`}>All Brands</li>
              {dynamicBrands.map(brand => (
                <li key={brand} onClick={() => handleBrandChange(brand)} className={`text-xs font-bold uppercase cursor-pointer ${selectedBrand === brand ? 'text-[#8012d8]' : 'text-gray-500 hover:text-[#8012d8]'}`}>
                  {brand}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex-1 w-full pb-32">
          
          <div className="flex justify-between items-center mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Showing {showingFrom} - {showingTo} of {totalProducts} Products
            </span>
            <select className="text-[10px] font-black uppercase tracking-widest text-black border-none outline-none bg-transparent cursor-pointer">
              <option>Sort By: Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest Arrivals</option>
            </select>
          </div>

          {loading ? (
            <div className="py-40 flex justify-center">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#8012d8] rounded-full animate-spin" />
            </div>
          ) : dbError ? (
            <div className="py-20 text-center bg-red-50 rounded-3xl border border-dashed border-red-300">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-red-600 mb-2">Database Error</h3>
              <p className="text-sm font-medium text-red-500 mb-6 max-w-lg mx-auto">{dbError}</p>
              <button 
                onClick={clearAllFilters}
                className="px-8 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-colors rounded-sm"
              >
                Clear Filters & Reset
              </button>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                {products.map((product) => (
                  <Link key={product.id} href={buildProductUrl(product)} className="group block">
                    <div className="relative aspect-[3/4] bg-[#F3F3F3] rounded-2xl overflow-hidden mb-4 group-hover:shadow-md transition-all duration-500 flex items-center justify-center">
                      <CatalogImage imageUrl={product.image_url} title={product.title} />
                    </div>

                    <div className="px-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                        {product.brand}
                      </span>
                      <h3 className="text-[12px] font-bold text-gray-900 leading-tight group-hover:text-[#8012d8] transition-colors uppercase tracking-tight line-clamp-2">
                        {product.title || product.product_name}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-20 pt-10 border-t border-gray-100">
                  <button
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-[#8012d8] text-white rounded-sm disabled:opacity-30 disabled:bg-gray-400 hover:bg-black transition-all shadow-sm"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2 px-4 text-[12px] font-bold text-gray-400">
                    <span className="text-black">{currentPage}</span> / <span>{totalPages}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-[#8012d8] text-white rounded-sm disabled:opacity-30 disabled:bg-gray-400 hover:bg-black transition-all shadow-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-32 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-black mb-2">No products found</h3>
              <p className="text-sm font-medium text-gray-500">Try adjusting your filters or search criteria.</p>
              <button 
                onClick={clearAllFilters}
                className="mt-6 px-8 py-3 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-colors rounded-sm"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

      </section>
      <Footer />
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#8012d8] rounded-full animate-spin" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}