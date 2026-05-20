"use client";

// ✅ 1. Importamos Suspense de react
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ChevronRight, Filter, X, Plus } from "lucide-react";
import { useCart } from "../context/CartContext";

// --- MAPA DE COLORES EXTENDIDO ---
const colorMap: Record<string, string> = {
  "Gray": "#A0A4A8", "Taupe": "#C6BCA1", "Beige": "#F5F5DC", "Off White": "#F8EFE6",
  "Red": "#D9534F", "Black": "#333333", "Camel": "#B89060", "Orange": "#E69A28",
  "Blue": "#5C92D1", "Green": "#A0CC70", "Yellow": "#EDC33A", "Brown": "#8B4513",
  "Pink": "#F5C6CB", "White": "#FFFFFF", "Navy": "#000080", "Charcoal": "#36454F",
  "Silver": "#C0C0C0", "Maroon": "#800000", "Purple": "#800080"
};

const getHexForColor = (colorName: string) => {
  const name = colorName.split('/')[0].trim();
  return colorMap[name] || colorMap[colorName] || "#E5E7EB"; 
};

// --- COMPONENTE DE IMAGEN ---
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

// ✅ 2. Renombramos tu componente principal a "ProductsContent"
function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialBrand = searchParams.get("brand") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Estados de Filtros Activos
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number>(78);

  // Estados de Listas Dinámicas
  const [dynamicSizes, setDynamicSizes] = useState<{name: string, count: number}[]>([]);
  const [dynamicColors, setDynamicColors] = useState<{name: string, count: number}[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [dynamicBrands, setDynamicBrands] = useState<string[]>([]);

  const { addToCart } = useCart();

  useEffect(() => {
    async function fetchFilters() {
      const { data: catData } = await supabase.rpc('get_unique_categories');
      if (catData) setDynamicCategories(catData.map((c: any) => c.category_name));

      let brandQuery = supabase.from("products_unique_styles").select("brand").not("brand", "is", null);
      if (selectedCategory) brandQuery = brandQuery.eq("category", selectedCategory);
      const { data: brandData } = await brandQuery.limit(500);
      if (brandData) {
        setDynamicBrands(Array.from(new Set(brandData.map(b => b.brand))).slice(0, 10));
      }

      const { data: sizesData } = await supabase.rpc('get_dynamic_sizes', {
        p_category: selectedCategory || null,
        p_brand: selectedBrand || null
      });
      if (sizesData) setDynamicSizes(sizesData);

      const { data: colorsData } = await supabase.rpc('get_dynamic_colors', {
        p_category: selectedCategory || null,
        p_brand: selectedBrand || null
      });
      if (colorsData) setDynamicColors(colorsData);
    }
    fetchFilters();
  }, [selectedCategory, selectedBrand]);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const isDeepFiltering = selectedSizes.length > 0 || selectedColors.length > 0;
        
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from(isDeepFiltering ? "products" : "products_unique_styles")
          .select("*", { count: "exact" })
          .range(from, to);

        if (selectedCategory) query = query.eq("category", selectedCategory);
        if (selectedBrand) query = query.eq("brand", selectedBrand);
        
        if (selectedSizes.length > 0) query = query.in("size", selectedSizes);
        if (selectedColors.length > 0) query = query.in("color_name", selectedColors);
        
        query = query.lte("price", priceRange);

        const { data, count, error } = await query;
        if (error) throw error;
        
        if (count !== null) setTotalProducts(count);

        if (isDeepFiltering && data) {
          const uniqueStyles = Array.from(new Map(data.map(item => [item.style, item])).values());
          setProducts(uniqueStyles);
        } else if (data) {
          setProducts(data);
        }
      } catch (err) {
        console.error("Error cargando productos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [selectedCategory, selectedBrand, selectedSizes, selectedColors, priceRange, currentPage]);

  const handleCategoryChange = (cat: string) => { setSelectedCategory(cat); setCurrentPage(1); };
  const handleBrandChange = (brand: string) => { setSelectedBrand(brand); setCurrentPage(1); };
  const handlePriceChange = (e: any) => { setPriceRange(Number(e.target.value)); setCurrentPage(1); };
  
  const toggleSize = (size: string) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
    setCurrentPage(1);
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSelectedCategory(""); setSelectedBrand(""); setSelectedSizes([]); setSelectedColors([]);
    setPriceRange(150); setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
  const showingFrom = totalProducts === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, totalProducts);

  return (
    <main className="bg-white min-h-screen">
      <Header />

      <div className="container mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 mb-6">
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight size={10} />
          <span className="text-black">Shop All</span>
        </div>
        <div className="flex justify-between items-end border-b border-gray-100 pb-6">
          <h1 className="text-5xl font-black uppercase tracking-tighter text-black italic leading-none">
            {selectedCategory || "The Collection"}
          </h1>
          <button 
            className="lg:hidden flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black border border-gray-200 px-4 py-2 rounded-full"
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

          <div className="mb-10">
            <h3 className="text-2xl font-bold text-black mb-4 tracking-tight">Price</h3>
            <p className="text-[15px] font-medium text-black mb-4">€13.00 - €{priceRange}.00</p>
            <div className="relative h-2 bg-gray-200 rounded-full flex items-center mt-6">
              <div className="absolute left-0 -ml-2 w-6 h-6 bg-[#8012d8] rounded-full shadow-md z-10"></div>
              <input 
                type="range" min="13" max="150" value={priceRange} 
                onChange={handlePriceChange}
                className="absolute w-full appearance-none bg-transparent outline-none z-20 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-[#8012d8] [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          </div>

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
                    <span className="text-[15px] text-gray-500">({s.count})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dynamicColors.length > 0 && (
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-black mb-6 tracking-tight">Color</h3>
              <ul className="space-y-4">
                {dynamicColors.map(c => (
                  <li key={c.name} className="flex items-center justify-between group cursor-pointer" onClick={() => toggleColor(c.name)}>
                    <div className="flex items-center gap-4">
                      <div 
                        className={`w-6 h-6 rounded-full shadow-sm border ${selectedColors.includes(c.name) ? 'ring-2 ring-offset-2 ring-black' : 'border-gray-200'}`}
                        style={{ backgroundColor: getHexForColor(c.name) }}
                      />
                      <span className="text-[17px] font-medium text-black capitalize">{c.name.toLowerCase()}</span>
                    </div>
                    <span className="text-[15px] text-gray-500">({c.count})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 border-b pb-2">Category</h3>
            <ul className="space-y-2">
              <li onClick={() => handleCategoryChange("")} className={`text-xs font-bold uppercase cursor-pointer ${!selectedCategory ? 'color-primary' : 'text-gray-500 hover:text-black'}`}>All Categories</li>
              {dynamicCategories.slice(0, 10).map(cat => (
                <li key={cat} onClick={() => handleCategoryChange(cat)} className={`text-xs font-bold uppercase cursor-pointer ${selectedCategory === cat ? 'color-primary' : 'text-gray-500 hover:text-[#8012d8]'}`}>
                  {cat}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 border-b pb-2">Brands</h3>
            <ul className="space-y-2">
              <li onClick={() => handleBrandChange("")} className={`text-xs font-bold uppercase cursor-pointer ${!selectedBrand ? 'color-primary' : 'text-gray-500 hover:text-[#8012d8]'}`}>All Brands</li>
              {dynamicBrands.map(brand => (
                <li key={brand} onClick={() => handleBrandChange(brand)} className={`text-xs font-bold uppercase cursor-pointer ${selectedBrand === brand ? 'color-primary' : 'text-gray-500 hover:text-[#8012d8]'}`}>
                  {brand}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* GRID DE PRODUCTOS */}
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
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                {products.map((product) => (
                  <Link key={product.id} href={`/products/${product.id}`} className="group block">
                    
                    <div className="relative aspect-[3/4] bg-[#F3F3F3] rounded-2xl overflow-hidden mb-4 group-hover:shadow-md transition-all duration-500 flex items-center justify-center">
                      <CatalogImage imageUrl={product.image_url} title={product.title} />
                      
                      <button 
                        onClick={(e) => {
                          e.preventDefault(); 
                          e.stopPropagation(); 
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
                        className="absolute bottom-4 left-4 right-4 bg-[#8012d8] text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-[1rem] opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-20 flex items-center justify-center gap-2 shadow-2xl hover:bg-black"
                      >
                        Add to cart <Plus size={14} />
                      </button>
                    </div>

                    <div className="px-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                        {product.brand}
                      </span>
                      <h3 className="text-[12px] font-bold text-gray-900 leading-tight group-hover:text-[#8012d8] transition-colors uppercase tracking-tight line-clamp-2">
                        {product.title || product.product_name}
                      </h3>
                      <p className="text-[12px] font-black text-black mt-2 tracking-tighter">
                        ${product.price}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* PAGINACIÓN */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-20 pt-10 border-t border-gray-100">
                  <button
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] border border-gray-200 rounded-sm disabled:opacity-30 hover:border-black hover:bg-black hover:text-white transition-all"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2 px-4 text-[12px] font-bold text-gray-400">
                    <span className="text-black">{currentPage}</span> / <span>{totalPages}</span>
                  </div>
                  <button
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] border border-gray-200 rounded-sm disabled:opacity-30 hover:border-black hover:bg-black hover:text-white transition-all"
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

// ✅ 3. Creamos el nuevo componente principal que envuelve a ProductsContent en Suspense
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