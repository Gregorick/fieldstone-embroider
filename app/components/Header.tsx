"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import logoImg from '@/public/logo.png';
import Link from "next/link";
import { Search, ShoppingBag, User, ChevronRight, X, ArrowRight, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "../context/CartContext";

// --- IMPORTACIONES DE LOGOS (Brands) ---
import logoA4 from "@/public/brands/mvp-brand-icon-a4.svg";
import logoAllmade from "@/public/brands/mvp-brand-icon-allmade.svg";
import logoBellaCanvas from "@/public/brands/mvp-brand-icon-bella-canvas.svg";
import logoBrooksBrothers from "@/public/brands/mvp-brand-icon-brook-brothers.svg";
import logoBulwark from "@/public/brands/mvp-brand-icon-bulwark.svg";
import logoCarhartt from "@/public/brands/mvp-brand-icon-carhartt.svg";
import logoChampion from "@/public/brands/mvp-brand-icon-champion.svg";
import logoComfortColors from "@/public/brands/mvp-brand-icon-comfort-colors.svg";
import logoCornerstone from "@/public/brands/CornerStone-Web-LogoBug.svg";
import logoCotopaxi from "@/public/brands/mvp-brand-icon-cotopaxi.svg";
import logoDistrict from "@/public/brands/mvp-brand-icon-district.svg";
import logoEddieBauer from "@/public/brands/mvp-brand-icon-eddie-bauer.svg";
import logoGildan from "@/public/brands/mvp-brand-icon-gildan.svg";
import logoJerzees from "@/public/brands/mvp-brand-icon-jerzees.svg";
import logoMercerMettle from "@/public/brands/mvp-brand-icon-mercer-mettle.svg";
import logoNewEra from "@/public/brands/mvp-brand-icon-new-era.svg";
import logoNextLevel from "@/public/brands/mvp-brand-icon-next-level-apparel.svg";
import logoNike from "@/public/brands/mvp-brand-icon-nike.svg";
import logoOgio from "@/public/brands/mvp-brand-icon-ogio.svg";
import logoOutdoorResearch from "@/public/brands/mvp-brand-icon-outdoor-research.svg";
import logoPortCo from "@/public/brands/mvp-brand-icon-port-company.svg";
import logoPortAuthority from "@/public/brands/mvp-brand-icon-port-authority.svg";
import logoRabbitSkins from "@/public/brands/mvp-brand-icon-rabbit-skins.svg";
import logoRedKap from "@/public/brands/mvp-brand-icon-red-kap.svg";
import logoRichardson from "@/public/brands/Richardson-20x20-2.svg";
import logoRussellOutdoors from "@/public/brands/mvp-brand-icon-russel-outdoors.svg";
import logoSpacecraft from "@/public/brands/mvp-brand-icon-spacecraft.svg";
import logoSportTek from "@/public/brands/mvp-brand-icon-sport-tek.svg";
import logoStanleyStella from "@/public/brands/mvp-brand-icon-stenley-stella.svg";
import logoTentree from "@/public/brands/mvp-brand-icon-tentree.svg";
import logoTheNorthFace from "@/public/brands/mvp-brand-icon-the-north-face.svg";
import logoTommyBahama from "@/public/brands/mvp-brand-icon-tommy-bahama.svg";
import logoTravisMathew from "@/public/brands/mvp-brand-icon-travismathew.svg";
import logoVolunteerKnitwear from "@/public/brands/mvp-brand-icon-volonteer-knitwear.svg";
import logoWink from "@/public/brands/mvp-brand-icon-wink.svg";

const brandImagesMap: Record<string, any> = {
  "A4": logoA4, "Allmade": logoAllmade, "BELLA+CANVAS": logoBellaCanvas, "Brooks Brothers": logoBrooksBrothers,
  "Bulwark": logoBulwark, "Carhartt": logoCarhartt, "Champion": logoChampion, "Comfort Colors": logoComfortColors,
  "CornerStone": logoCornerstone, "Cotopaxi": logoCotopaxi, "District": logoDistrict, "Eddie Bauer": logoEddieBauer,
  "Gildan": logoGildan, "Jerzees": logoJerzees, "Mercer+Mettle": logoMercerMettle, "New Era": logoNewEra,
  "Next Level Apparel": logoNextLevel, "Nike": logoNike, "OGIO": logoOgio, "Outdoor Research": logoOutdoorResearch,
  "Port & Co": logoPortCo, "Port Authority": logoPortAuthority, "Rabbit Skins": logoRabbitSkins, "Red Kap": logoRedKap,
  "Richardson": logoRichardson, "Russell Outdoors": logoRussellOutdoors, "Spacecraft": logoSpacecraft,
  "Sport-Tek": logoSportTek, "Stanley/Stella": logoStanleyStella, "tentree": logoTentree, "The North Face": logoTheNorthFace,
  "Tommy Bahama": logoTommyBahama, "TravisMathew": logoTravisMathew, "Volunteer Knitwear": logoVolunteerKnitwear, "Wink": logoWink
};

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
  const [isBrandMenuOpen, setIsBrandMenuOpen] = useState(false);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState<string>("");
  const { cartCount, setIsCartOpen } = useCart();
  
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ NUEVO: Guardamos los settings del Admin para aplicar filtros
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);
  const [allowedBrands, setAllowedBrands] = useState<string[]>([]);

  // ✅ ACTUALIZADO: Obtenemos los Settings, Marcas y Categorías sincronizados
  useEffect(() => {
    async function loadHeaderData() {
      // 1. Obtener configuraciones del admin
      let localAllowedCats: string[] = [];
      let localAllowedBrands: string[] = [];
      const { data: settings } = await supabase.from("store_settings").select("*").eq("id", "default").single();
      
      if (settings) {
        localAllowedCats = settings.visible_categories || [];
        localAllowedBrands = settings.visible_brands || [];
        setAllowedCategories(localAllowedCats);
        setAllowedBrands(localAllowedBrands);
      }

      // 2. Cargar y filtrar Categorías
      const { data: catData } = await supabase.rpc("get_unique_categories");
      if (catData) {
        let uniqueCats = catData.map((item: any) => item.category_name);
        if (localAllowedCats.length > 0) {
          uniqueCats = uniqueCats.filter((c: string) => localAllowedCats.includes(c));
        }
        setCategories(uniqueCats);
        if (uniqueCats.length > 0) setActiveCategory(uniqueCats[0]);
      }

      // 3. Cargar y filtrar Marcas (Solo las que tienen imagen configurada y el Admin permite)
      const { data: brandData } = await supabase.from("products_unique_styles").select("brand").not("brand", "is", null);
      if (brandData) {
        let uniqueBrands = Array.from(new Set(brandData.map((p) => p.brand))).filter(b => brandImagesMap[b as string]) as string[];
        if (localAllowedBrands.length > 0) {
          uniqueBrands = uniqueBrands.filter(b => localAllowedBrands.includes(b));
        }
        setAllBrands(uniqueBrands.sort());
      }
    }

    loadHeaderData();

    // Lógica para cargar el logo del usuario en local
    const savedLogo = localStorage.getItem("user_custom_logo");
    if (savedLogo) setUploadedLogo(savedLogo);

    const handleScroll = () => { setIsScrolled(window.scrollY > 10); };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Consultar perfil del usuario
  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from("profiles").select("avatar_url").eq("id", session.user.id).single();
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      } else {
        setUser(null);
        setAvatarUrl(null);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => { 
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from("profiles").select("avatar_url").eq("id", session.user.id).single();
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      } else {
        setUser(null);
        setAvatarUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ ACTUALIZADO: Cargar "Top Brands" de la categoría activa aplicando filtro del admin
  useEffect(() => {
    if (!activeCategory) return;
    async function fetchCategoryData() {
      const { data } = await supabase.from("products_unique_styles").select("brand, image_url").eq("category", activeCategory).limit(100);
      if (data) {
        let uniqueBrands = Array.from(new Set(data.map((item) => item.brand))) as string[];
        // Filtramos por las marcas permitidas por el Admin
        if (allowedBrands.length > 0) {
          uniqueBrands = uniqueBrands.filter(b => allowedBrands.includes(b));
        }
        setSubCategories(uniqueBrands.slice(0, 8)); // Top 8 permitidas
        if (data.length > 0) setActiveImage(data[0].image_url);
      }
    }
    fetchCategoryData();
  }, [activeCategory, allowedBrands]); // Depende también de allowedBrands

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUploadedLogo(base64String);
        localStorage.setItem("user_custom_logo", base64String);
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
        onMouseLeave={() => { setIsMegaMenuOpen(false); setIsBrandMenuOpen(false); }}
      >
        <div className="container mx-auto px-4 flex items-center justify-between relative min-h-[65px]">
          
          <div className="relative z-50 flex items-center h-full">
            <Link href="/" onClick={() => { setIsMegaMenuOpen(false); setIsBrandMenuOpen(false); }}>
              <Image 
                src={logoImg} 
                alt="Logo" 
                width={120} 
                height={35} 
                priority 
                className={`object-contain transition-all duration-500 ease-in-out h-auto ${isScrolled ? "w-[80px]" : "w-[120px]"}`} 
              />
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8 mx-auto h-full z-10">
            {/* SHOP */}
            <div onMouseEnter={() => { setIsMegaMenuOpen(true); setIsBrandMenuOpen(false); }} className="h-full cursor-pointer flex items-center">
              <Link href="/products" onClick={() => setIsMegaMenuOpen(false)} className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] py-5 block h-full flex items-center uppercase">
                Products
              </Link>
            </div>
            
            {/* BRANDS */}
            <div onMouseEnter={() => { setIsBrandMenuOpen(true); setIsMegaMenuOpen(false); }} className="h-full cursor-pointer flex items-center">
              <span className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] py-5 block cursor-pointer">BRANDS</span>
            </div>

            <Link href="/about" onMouseEnter={() => { setIsMegaMenuOpen(false); setIsBrandMenuOpen(false); }} className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] transition-colors">ABOUT</Link>
            <Link href="/contact" onMouseEnter={() => { setIsMegaMenuOpen(false); setIsBrandMenuOpen(false); }} className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] transition-colors">CONTACT US</Link>
          </nav>

          <div className="flex items-center gap-4 z-50" onMouseEnter={() => { setIsMegaMenuOpen(false); setIsBrandMenuOpen(false); }}>
            <div className="hidden lg:flex items-center gap-3 border-r border-gray-200 pr-4 mr-2">
              <input type="file" accept="image/png, image/jpeg, image/svg+xml" className="hidden" ref={fileInputRef} onChange={handleLogoUpload} />
              {uploadedLogo ? (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Logo:</span>
                  <div className="w-8 h-8 rounded-md border border-gray-200 p-1 flex items-center justify-center bg-gray-50 shadow-sm overflow-hidden"><img src={uploadedLogo} alt="Logo" className="w-full h-full object-contain" /></div>
                  <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-md hover:bg-[#8012d8] hover:!text-white transition-colors shadow-sm">Change Logo</button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:border-black transition-colors"><Upload size={14} /> Upload Logo</button>
              )}
            </div>

            <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-gray-50 rounded-full text-black transition-colors cursor-pointer"><Search size={20} strokeWidth={2.5} /></button>

            <div className="relative group py-4">
              <Link href={user ? "/account" : "/login"} className="flex items-center justify-center p-2 hover:bg-gray-50 rounded-full text-black transition-colors w-10 h-10">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User Avatar" className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                ) : (
                  <User size={20} strokeWidth={2.5} />
                )}
              </Link>
              
              <div className="absolute top-[80%] right-0 mt-1 w-48 bg-white border border-gray-100 shadow-xl rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 transform origin-top-right scale-95 group-hover:scale-100">
                <div className="p-2 flex flex-col gap-1">
                  {user ? (
                    <>
                      <Link href="/account" className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-black hover:bg-gray-50 rounded-xl transition-colors">My Account</Link>
                      <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-xl transition-colors">Logout</button>
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
              {cartCount > 0 && <span className="absolute top-1 right-1 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-in zoom-in">{cartCount}</span>}
            </div>
          </div>
        </div>

        {/* --- MEGA MENU BRANDS --- */}
        {isBrandMenuOpen && !isSearchOpen && (
          <div className="absolute top-full left-0 w-full bg-white shadow-2xl border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 p-8 z-[90] max-h-[600px] overflow-y-auto">
             <div className="container mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black uppercase tracking-widest text-black italic">Featured Brands</h3>
                    <button onClick={() => setIsBrandMenuOpen(false)}><X size={20}/></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {allBrands.map((brand) => (
                        <Link key={brand} href={`/products?brand=${encodeURIComponent(brand)}`} onClick={() => setIsBrandMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                           <img src={brandImagesMap[brand].src} alt={brand} className="h-12 w-full object-contain mix-blend-multiply opacity-70 hover:opacity-100 transition-opacity" />
                        </Link>
                    ))}
                </div>
             </div>
          </div>
        )}

        {/* --- MEGA MENU SHOP --- */}
        {isMegaMenuOpen && !isSearchOpen && (
          <div className="absolute top-full left-0 w-full bg-white shadow-2xl border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200 h-[calc(100vh-65px)] max-h-[850px] z-[90]" onMouseEnter={() => setIsMegaMenuOpen(true)}>
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
                            <Link href={`/products?category=${encodeURIComponent(activeCategory)}&brand=${encodeURIComponent(sub)}`} onClick={() => setIsMegaMenuOpen(false)}>{sub}</Link>
                          </li>
                        ))}
                        {subCategories.length > 0 && (
                          <li className="pt-2">
                             <Link href={`/products?category=${encodeURIComponent(activeCategory)}`} onClick={() => setIsMegaMenuOpen(false)} className="text-[10px] font-black text-[#8012d8] hover:text-black uppercase tracking-widest transition-colors flex items-center gap-1">
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
                          <Link href={`/products?category=${encodeURIComponent(activeCategory)}`} onClick={() => setIsMegaMenuOpen(false)}>
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
      
      {/* --- MODAL DE BÚSQUEDA A PANTALLA COMPLETA --- */}
      {isSearchOpen && (
          <div className="fixed inset-0 z-[200] bg-white/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <div className="container mx-auto px-4 py-8 flex justify-end">
            <button onClick={() => setIsSearchOpen(false)} className="p-3 bg-gray-500 hover:bg-black hover:text-white rounded-full transition-colors duration-300 flex-shrink-0"><X size={24} strokeWidth={2} /></button>
          </div>
          <div className="flex-1 container mx-auto px-4 flex flex-col max-w-4xl min-h-0">
            <div className="relative mb-8 flex-shrink-0">
              <input type="text" placeholder="Search products, brands, or categories..." autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-3xl md:text-5xl font-black tracking-tighter text-black bg-transparent border-b-4 border-gray-200 focus:border-black py-4 outline-none placeholder:text-gray-300 transition-colors" />
              {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" /></div>}
            </div>
            
            {/* --- LÓGICA VISUAL DE RESULTADOS DE BÚSQUEDA --- */}
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