"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingBag, User, ChevronRight, X, ArrowRight, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "../context/CartContext";

// --- COMPONENTE DE IMAGEN DEL MEGA MENU ---
function MegaMenuImage({ imageUrl, category }: { imageUrl: string; category: string }) {
  if (!imageUrl)
    return (
      <div className="w-full h-full bg-gray-50 flex items-center justify-center rounded-[2rem]">
        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">No Image</span>
      </div>
    );

  return (
    <div className="relative w-full h-full animate-in fade-in duration-500">
      <img
        src={imageUrl}
        alt={category}
        className="w-full h-full object-contain mix-blend-multiply p-4"
        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/400x500?text=Product"; }}
      />
      <div className="absolute bottom-6 left-6 right-6 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#8012d8] mb-1">Featured Item</p>
        <p className="text-xs font-bold text-black truncate uppercase tracking-tighter">{category}</p>
      </div>
    </div>
  );
}

export default function Header() {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState<string>("");
  const { cartCount, setIsCartOpen } = useCart();
  
  // ESTADO PARA EL USUARIO
  const [user, setUser] = useState<any>(null);

  // ESTADOS PARA EL BUSCADOR
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // ESTADOS PARA EL LOGO DEL CLIENTE
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Recuperar el logo si ya lo había subido antes (Local Storage)
    const savedLogo = localStorage.getItem("user_custom_logo");
    if (savedLogo) setUploadedLogo(savedLogo);

    const handleScroll = () => { setIsScrolled(window.scrollY > 10); };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user || null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user || null); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.rpc("get_unique_categories");
      if (data) {
        const uniqueCats = data.map((item: any) => item.category_name);
        setCategories(uniqueCats);
        if (uniqueCats.length > 0) setActiveCategory(uniqueCats[0]);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!activeCategory) return;
    async function fetchCategoryData() {
      const { data } = await supabase.from("products_unique_styles").select("brand, image_url").eq("category", activeCategory).limit(20);
      if (data) {
        const uniqueBrands = Array.from(new Set(data.map((item) => item.brand))).slice(0, 8);
        setSubCategories(uniqueBrands);
        if (data.length > 0) setActiveImage(data[0].image_url);
      }
    }
    fetchCategoryData();
  }, [activeCategory]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      const safeQuery = searchQuery.replace(/,/g, '');
      try {
        const { data, error } = await supabase
          .from("products_unique_styles")
          .select("id, title, style, image_url, brand, category")
          .or(`title.ilike.%${safeQuery}%,style.ilike.%${safeQuery}%,brand.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%`)
          .limit(10);
        if (error) throw error;
        if (data) setSearchResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    document.body.style.overflow = isSearchOpen ? "hidden" : "unset";
    if (!isSearchOpen) setSearchQuery(""); 
  }, [isSearchOpen]);

  // FUNCIÓN PARA MANEJAR LA SUBIDA DEL LOGO
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUploadedLogo(base64String);
        localStorage.setItem("user_custom_logo", base64String); // Guardamos para que persista
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>

      <header 
        className={`sticky top-0 z-[100] w-full bg-white border-b border-gray-100 transition-all duration-300 ${isScrolled ? "shadow-sm py-1" : "py-2"}`} 
        onMouseLeave={() => setIsMegaMenuOpen(false)}
      >
        <div className="container mx-auto px-4 flex items-center justify-between relative min-h-[65px]">
          
          <div className="relative z-50 flex items-center h-full">
            <Link href="/">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                width={120} 
                height={35} 
                priority 
                className={`object-contain transition-all duration-500 ease-in-out h-auto ${isScrolled ? "w-[80px]" : "w-[120px]"}`} 
              />
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8 mx-auto h-full z-10">
            <div onMouseEnter={() => setIsMegaMenuOpen(true)} className="h-full cursor-pointer flex items-center">
              <Link href="/products" className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] py-5 block">SHOP</Link>
            </div>
            <Link href="/brands" onMouseEnter={() => setIsMegaMenuOpen(false)} className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] transition-colors">BRANDS</Link>
            <Link href="/about" onMouseEnter={() => setIsMegaMenuOpen(false)} className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] transition-colors">ABOUT</Link>
            <Link href="/contact" onMouseEnter={() => setIsMegaMenuOpen(false)} className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] transition-colors">CONTACT US</Link>
          </nav>

          <div className="flex items-center gap-4 z-50" onMouseEnter={() => setIsMegaMenuOpen(false)}>
            
            {/* SECCIÓN DE UPLOAD LOGO (Estilo Thread Logic) */}
            <div className="hidden lg:flex items-center gap-3 border-r border-gray-200 pr-4 mr-2">
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/svg+xml" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
              />
              
              {uploadedLogo ? (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Logo:</span>
                  <div className="w-8 h-8 rounded-md border border-gray-200 p-1 flex items-center justify-center bg-gray-50 shadow-sm overflow-hidden">
                    <img src={uploadedLogo} alt="Uploaded Logo" className="w-full h-full object-contain" />
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-md hover:bg-[#8012d8] hover:!text-white transition-colors shadow-sm"
                  >
                    Change Logo
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:border-black transition-colors"
                >
                  <Upload size={14} /> Upload Logo
                </button>
              )}
            </div>

            {/* Iconos normales (Buscar, Usuario, Carrito) */}
            <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-gray-50 rounded-full text-black transition-colors cursor-pointer">
              <Search size={20} strokeWidth={2.5} />
            </button>

            <div className="relative group py-4">
              <Link href={user ? "/account" : "/login"} className="p-2 hover:bg-gray-50 rounded-full text-black block transition-colors">
                <User size={20} strokeWidth={2.5} />
              </Link>
              <div className="absolute top-[80%] right-0 mt-1 w-48 bg-white border border-gray-100 shadow-xl rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 transform origin-top-right scale-95 group-hover:scale-100">
                <div className="p-2 flex flex-col gap-1">
                  {user ? (
                    <>
                      <Link href="/account" className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-black hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-between">My Account</Link>
                      <button onClick={() => supabase.auth.signOut()} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2">Logout</button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-black hover:bg-gray-50 rounded-xl transition-colors">Sign In</Link>
                      <Link href="/register" className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-black hover:bg-gray-50 rounded-xl transition-colors">Create Account</Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="relative cursor-pointer p-2 hover:bg-gray-50 rounded-full text-black transition-colors" onClick={() => setIsCartOpen(true)}>
              <ShoppingBag size={20} strokeWidth={2.5} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-in zoom-in">{cartCount}</span>
              )}
            </div>
          </div>
        </div>

        {/* MEGA MENU */}
        {isMegaMenuOpen && !isSearchOpen && (
          <div className="absolute top-full left-0 w-full bg-white shadow-2xl border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200 h-[calc(100vh-65px)] max-h-[850px]" onMouseEnter={() => setIsMegaMenuOpen(true)}>
            <div className="container mx-auto flex h-full relative">
              <button onClick={() => setIsMegaMenuOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-all z-50">
                <X size={24} strokeWidth={1.5} />
              </button>
              
              <div className="w-[300px] bg-gray-50 p-8 overflow-y-auto custom-scrollbar h-full">
                <ul className="space-y-1 py-12">
                  {categories.map((cat) => (
                    <li key={cat}>
                      <button onMouseEnter={() => setActiveCategory(cat)} className={`w-full text-left text-[13px] font-bold p-3 rounded transition-all flex items-center justify-between ${activeCategory === cat ? "bg-white text-[#8012d8] shadow-md translate-x-1" : "text-gray-700 hover:bg-white"}`}>
                        {cat} <ChevronRight size={14} className={activeCategory === cat ? "opacity-100" : "opacity-0"} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex-1 flex h-full overflow-y-auto custom-scrollbar">
                <div className="flex-1 p-12">
                  <h2 className="text-5xl font-black uppercase tracking-tighter text-black mb-10 italic">{activeCategory}</h2>
                  <div className="grid grid-cols-2 gap-12">
                    
                    <div>
                      <h3 className="text-[11px] font-black tracking-widest text-gray-400 mb-6 uppercase">Top Brands</h3>
                      <ul className="space-y-4">
                        {subCategories.map((sub) => (
                          <li key={sub} className="text-xs font-bold text-gray-800 hover:text-[#8012d8] cursor-pointer uppercase">
                            <Link href={`/products?category=${encodeURIComponent(activeCategory)}&brand=${encodeURIComponent(sub)}`}>{sub}</Link>
                          </li>
                        ))}
                        {subCategories.length > 0 && (
                          <li className="pt-2">
                             <Link href={`/products?category=${encodeURIComponent(activeCategory)}`} className="text-[10px] font-black text-[#8012d8] hover:text-black uppercase tracking-widest transition-colors flex items-center gap-1">
                                See All Brands <ChevronRight size={12} />
                             </Link>
                          </li>
                        )}
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-[11px] font-black tracking-widest text-gray-400 mb-6 uppercase">Shortcuts</h3>
                      <ul className="space-y-4">
                        <li className="text-xs font-bold text-black border-b-2 border-black inline-block cursor-pointer hover:text-[#8012d8] hover:border-[#8012d8] transition-colors">
                          <Link href={`/products?category=${encodeURIComponent(activeCategory)}`}>
                            VIEW ALL {activeCategory}
                          </Link>
                        </li>
                      </ul>
                    </div>

                  </div>
                </div>

                <div className="w-[450px] p-10 h-full flex items-center">
                  <div className="w-full aspect-[3/4] bg-[#F3F3F3] rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-inner flex items-center justify-center relative">
                    <MegaMenuImage imageUrl={activeImage} category={activeCategory} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </header>

      {/* MODAL DE BÚSQUEDA A PANTALLA COMPLETA */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[200] bg-white/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-300">
          
          <div className="container mx-auto px-4 py-8 flex justify-end">
            <button onClick={() => setIsSearchOpen(false)} className="p-3 bg-gray-100 hover:bg-black hover:text-white rounded-full transition-colors duration-300 flex-shrink-0">
              <X size={24} strokeWidth={2} />
            </button>
          </div>

          <div className="flex-1 container mx-auto px-4 flex flex-col max-w-4xl min-h-0">
            
            <div className="relative mb-8 flex-shrink-0">
              <input 
                type="text" 
                placeholder="Search products, brands, or categories..." 
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-3xl md:text-5xl font-black tracking-tighter text-black bg-transparent border-b-4 border-gray-200 focus:border-black py-4 outline-none placeholder:text-gray-300 transition-colors"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 pr-4">
              {searchQuery.length > 0 && searchQuery.length < 2 && (
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-center mt-10">Keep typing to search...</p>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="text-center mt-20">
                  <Search size={48} className="mx-auto text-gray-200 mb-6" strokeWidth={1} />
                  <p className="text-xl font-black uppercase tracking-tighter text-black">No results found for "{searchQuery}"</p>
                  <p className="text-sm font-bold text-gray-400 mt-2">Try searching for a category like "Bags" or a brand like "Nike".</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 border-b border-gray-100 pb-2">
                    Top Results ({searchResults.length})
                  </p>
                  {searchResults.map((product) => (
                    <div key={product.id} className="flex items-center gap-6 p-4 rounded-[2rem] hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
                      
                      <div className="w-20 h-24 bg-[#F3F3F3] rounded-2xl flex-shrink-0 p-2 overflow-hidden border border-gray-200">
                        <img 
                          src={product.image_url || `https://cdnm.sanmar.com/catalog/images/${product.style}.jpg`} 
                          alt={product.title} 
                          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=No+Image"; }}
                        />
                      </div>
                      
                      <div className="flex-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                          {product.brand || "Fieldstone"} - {product.category}
                        </span>
                        <h3 className="text-[15px] font-bold text-black uppercase tracking-tight line-clamp-1 group-hover:text-[#8012d8] transition-colors">
                          {product.title}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          Style: {product.style}
                        </p>
                      </div>

                      <Link 
                        href={`/products/${product.id}`}
                        onClick={() => setIsSearchOpen(false)} 
                        className="px-6 py-4 bg-white border-2 border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-black group-hover:bg-black group-hover:border-black group-hover:text-white transition-all flex items-center gap-2 flex-shrink-0 shadow-sm"
                      >
                        Read More <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </Link>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}