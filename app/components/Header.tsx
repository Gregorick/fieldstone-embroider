"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import logoImg from '@/public/logo.png';
import Link from "next/link";
import { Search, ShoppingBag, User, ChevronRight, X, ArrowRight, Upload, Grip, Menu, Check, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "../context/CartContext";

// --- IMPORTACIONES DE LOGOS EXACTAS (Sin modificaciones) ---
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
  "a4": logoA4,
  "allmade": logoAllmade,
  "bellacanvas": logoBellaCanvas,
  "brooksbrothers": logoBrooksBrothers,
  "bulwark": logoBulwark,
  "carhartt": logoCarhartt,
  "champion": logoChampion,
  "comfortcolors": logoComfortColors,
  "cornerstone": logoCornerstone,
  "cotopaxi": logoCotopaxi,
  "district": logoDistrict,
  "eddiebauer": logoEddieBauer,
  "gildan": logoGildan,
  "jerzees": logoJerzees,
  "mercermettle": logoMercerMettle,
  "newera": logoNewEra,
  "nextlevelapparel": logoNextLevel,
  "nike": logoNike,
  "ogio": logoOgio,
  "outdoorresearch": logoOutdoorResearch,
  "portco": logoPortCo,
  "portauthority": logoPortAuthority,
  "rabbitskins": logoRabbitSkins,
  "redkap": logoRedKap,
  "richardson": logoRichardson,
  "russelloutdoors": logoRussellOutdoors,
  "spacecraft": logoSpacecraft,
  "sporttek": logoSportTek,
  "stanleystella": logoStanleyStella,
  "tentree": logoTentree,
  "thenorthface": logoTheNorthFace,
  "tommybahama": logoTommyBahama,
  "travismathew": logoTravisMathew,
  "volunteerknitwear": logoVolunteerKnitwear,
  "wink": logoWink
};

export default function Header() {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isBrandMenuOpen, setIsBrandMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [viewState, setViewState] = useState<"grid" | "category">("grid");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [categoryFeatured, setCategoryFeatured] = useState<any[]>([]);
  
  const { cartCount, setIsCartOpen } = useCart();
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);
  const [isLegalWarningOpen, setIsLegalWarningOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadHeaderData() {
      const { data: settings } = await supabase.from("store_settings").select("*").eq("id", "default").single();
      
      // 1. Cargar todas las marcas y categorías directamente desde la base de datos (SIN FILTROS)
      const { data: catData } = await supabase.from("products_unique_styles").select("category").not("category", "is", null).limit(5000);
      const { data: brandData } = await supabase.from("products_unique_styles").select("brand").not("brand", "is", null).limit(5000);

      const dbCats = Array.from(new Set(catData?.map(c => c.category?.trim()).filter(Boolean))).sort();
      const dbBrands = Array.from(new Set(brandData?.map(b => b.brand?.trim()).filter(Boolean))).sort();

      // 2. Respetar el orden guardado, pero AÑADIR las nuevas (como Stanley/Stella)
      let orderedCats = settings?.visible_categories || [];
      let orderedBrands = settings?.visible_brands || [];

      const finalCats = [
        ...orderedCats.filter((c: string) => dbCats.includes(c)),
        ...dbCats.filter((c: string) => !orderedCats.includes(c))
      ];

      const finalBrands = [
        ...orderedBrands.filter((b: string) => dbBrands.includes(b)),
        ...dbBrands.filter((b: string) => !orderedBrands.includes(b))
      ];

      setCategories(finalCats);
      setAllBrands(finalBrands);

      // Cargar imágenes de categorías
      const imgMap: Record<string, string> = {};
      const imagePromises = finalCats.map(async (cat: string) => {
        const { data } = await supabase.from("products_unique_styles").select("image_url").eq("category", cat).not("image_url", "is", null).limit(1).maybeSingle();
        if (data?.image_url) imgMap[cat] = data.image_url;
      });
      await Promise.all(imagePromises);
      setCategoryImages(imgMap);
    }

    loadHeaderData();
    const savedLogo = localStorage.getItem("user_custom_logo");
    if (savedLogo) setUploadedLogo(savedLogo);

    const handleScroll = () => { setIsScrolled(window.scrollY > 10); };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from("profiles").select("avatar_url").eq("id", session.user.id).single();
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      }
    }
    loadUser();
  }, []);

  // 🔥 MEGAMENU: Carga de marcas por categoría sin filtro
  useEffect(() => {
    if (!activeCategory || viewState === "grid") return;
    
    async function fetchCategoryData() {
      const { data } = await supabase.from("products_unique_styles").select("id, slug, brand, image_url, title").eq("category", activeCategory).limit(1000);
      
      if (data) {
        const uniqueBrandsInCat = Array.from(new Set(data.map((item) => item.brand).filter(Boolean))) as string[];
        setSubCategories(uniqueBrandsInCat); 
        
        const uniqueImageProducts = [];
        const seenImages = new Set();
        for (const item of data) {
          if (item.image_url && !seenImages.has(item.image_url)) {
            seenImages.add(item.image_url);
            uniqueImageProducts.push(item);
          }
          if (uniqueImageProducts.length >= 6) break; 
        }
        setCategoryFeatured(uniqueImageProducts);
      }
    }
    fetchCategoryData();
  }, [activeCategory, viewState]); 

  // 🔥 BUSCADOR TOTALMENTE LIBERADO
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      
      // Limpiamos comas o símbolos extraños que rompan Supabase
      const safeQuery = searchQuery.replace(/[,]/g, ' ').trim();
      
      try {
        let allSearchData: any[] = [];
        let searchFrom = 0;
        let fetchMoreSearch = true;

        while (fetchMoreSearch) {
          const { data, error } = await supabase
            .from("products_unique_styles")
            .select("id, slug, title, style, image_url, brand, category")
            .or(`title.ilike.%${safeQuery}%,style.ilike.%${safeQuery}%,brand.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%`)
            .range(searchFrom, searchFrom + 999);
            
          if (error || !data || data.length === 0) {
            fetchMoreSearch = false;
          } else {
            allSearchData.push(...data);
            if (data.length < 1000) fetchMoreSearch = false;
            else searchFrom += 1000;
          }
        }
        
        // Asignamos directamente todos los resultados sin filtrarlos
        setSearchResults(allSearchData);

      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchOpen || isMobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    if (!isSearchOpen) setSearchQuery(""); 
  }, [isSearchOpen, isMobileMenuOpen]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setUploadedLogo(dataUrl);
        localStorage.setItem("user_custom_logo", dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => { setUploadedLogo(null); localStorage.removeItem("user_custom_logo"); };

  const handleAcceptLegalWarning = () => {
    setIsLegalWarningOpen(false);
    if (fileInputRef.current) fileInputRef.current.click();
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
          
          <div className="relative z-50 flex items-center h-full gap-3">
            <button className="md:hidden p-1 -ml-1 text-black hover:text-[#8012d8] transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={26} strokeWidth={2} />
            </button>
            <Link href="/" onClick={() => { setIsMegaMenuOpen(false); setIsBrandMenuOpen(false); }}>
              <Image src={logoImg} alt="Logo" width={120} height={35} priority className={`object-contain transition-all duration-500 ease-in-out h-auto ${isScrolled ? "w-[80px]" : "w-[120px]"}`} />
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8 mx-auto h-full z-10">
            <div onMouseEnter={() => { setViewState("grid"); setIsMegaMenuOpen(true); setIsBrandMenuOpen(false); }} className="h-full cursor-pointer flex items-center">
              <Link href="/products" onClick={() => setIsMegaMenuOpen(false)} className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] py-5 block h-full flex items-center uppercase">
                Products
              </Link>
            </div>
            <div onMouseEnter={() => { setIsBrandMenuOpen(true); setIsMegaMenuOpen(false); }} className="h-full cursor-pointer flex items-center">
              <span className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] py-5 block cursor-pointer">BRANDS</span>
            </div>
            <Link href="/about" onMouseEnter={() => { setIsMegaMenuOpen(false); setIsBrandMenuOpen(false); }} className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] transition-colors">ABOUT</Link>
            <Link href="/#contactus" onMouseEnter={() => { setIsMegaMenuOpen(false); setIsBrandMenuOpen(false); }} className="text-[12px] tracking-widest font-bold text-black hover:text-[#8012d8] transition-colors">CONTACT US</Link>
          </nav>

          <div className="flex items-center gap-4 z-50" onMouseEnter={() => { setIsMegaMenuOpen(false); setIsBrandMenuOpen(false); }}>
            <div className="hidden lg:flex items-center gap-3 border-r border-gray-200 pr-4 mr-2">
              <input type="file" accept="image/png, image/jpeg, application/pdf, .ai, .eps" className="hidden" ref={fileInputRef} onChange={handleLogoUpload} />
              {uploadedLogo ? (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Logo:</span>
                  <div className="relative w-8 h-8 rounded-md border border-gray-200 p-1 flex items-center justify-center bg-gray-50 shadow-sm overflow-hidden group">
                    {uploadedLogo.startsWith("data:application/pdf") ? (
                      <iframe src={`${uploadedLogo}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full rounded border-none pointer-events-none" title="PDF Preview" />
                    ) : uploadedLogo.startsWith("data:image/") ? (
                      <img src={uploadedLogo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Check size={12} className="text-green-500" />
                    )}
                    <button onClick={removeLogo} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} className="text-white" /></button>
                  </div>
                  <button onClick={() => setIsLegalWarningOpen(true)} className="px-3 py-1.5 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-md hover:bg-[#8012d8] transition-colors shadow-sm">Change Logo</button>
                </div>
              ) : (
                <button onClick={() => setIsLegalWarningOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:border-black transition-colors"><Upload size={14} /> Upload Logo</button>
              )}
            </div>

            <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-gray-50 rounded-full text-black transition-colors cursor-pointer"><Search size={20} strokeWidth={2.5} /></button>

            <div className="relative hidden md:block group py-4">
              <Link href={user ? "/account" : "/login"} className="flex items-center justify-center p-2 hover:bg-gray-50 rounded-full text-black transition-colors w-10 h-10">
                {avatarUrl ? <img src={avatarUrl} alt="User Avatar" className="w-7 h-7 rounded-full object-cover border border-gray-200" /> : <User size={20} strokeWidth={2.5} />}
              </Link>
              <div className="absolute top-[80%] right-0 mt-1 w-48 bg-white border border-gray-100 shadow-xl rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
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

        {/* 📱 Menú Móvil */}
        <div className={`fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"}`} onClick={() => setIsMobileMenuOpen(false)} />
        <div className={`fixed top-0 left-0 h-full w-[85%] max-w-[340px] bg-white z-[200] transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl md:hidden ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 min-h-[65px] bg-white shrink-0">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)}><Image src={logoImg} alt="Logo" width={100} height={30} className="object-contain" /></Link>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-black transition-colors"><X size={20} strokeWidth={2} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-white">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-5">Shop Categories</p>
                  <div className="space-y-5">
                     <Link href="/products" onClick={() => setIsMobileMenuOpen(false)} className="block text-xl font-black uppercase tracking-tighter text-black hover:text-[#8012d8] transition-colors">All Products</Link>
                     {categories.map(cat => (
                        <Link key={cat} href={`/products?category=${encodeURIComponent(cat)}`} onClick={() => setIsMobileMenuOpen(false)} className="block text-sm font-bold text-gray-600 hover:text-[#8012d8] transition-colors uppercase tracking-widest">{cat}</Link>
                     ))}
                  </div>
               </div>
               <div className="w-full h-px bg-gray-100" />
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-5">Top Brands</p>
                  <div className="space-y-5">
                     {allBrands.map(brand => (
                        <Link key={brand} href={`/products?brand=${encodeURIComponent(brand)}`} onClick={() => setIsMobileMenuOpen(false)} className="block text-sm font-bold text-gray-600 hover:text-[#8012d8] transition-colors uppercase tracking-widest">{brand}</Link>
                     ))}
                  </div>
               </div>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 p-6 flex flex-col gap-6 shrink-0">
               <div className="flex items-center justify-between">
                  {user ? (
                     <div className="flex flex-col gap-3 w-full">
                        <Link href="/account" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-black hover:text-[#8012d8] transition-colors"><User size={18} /> My Account</Link>
                        <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors text-left pl-7">Logout Session</button>
                     </div>
                  ) : (
                     <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-black hover:text-[#8012d8] transition-colors"><User size={18} /> Sign In / Register</Link>
                  )}
               </div>
            </div>
        </div>

        {/* 🏢 Menú de Marcas */}
        {isBrandMenuOpen && !isSearchOpen && (
          <div className="absolute top-full left-0 w-full bg-white shadow-2xl border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 p-8 z-[90] max-h-[600px] overflow-y-auto custom-scrollbar hidden md:block">
             <div className="container mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black uppercase tracking-widest text-black italic">Featured Brands</h3>
                    <button onClick={() => setIsBrandMenuOpen(false)}><X size={20}/></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {allBrands.map((brand) => {
                        const normalizedKey = brand ? brand.toLowerCase().replace(/[^a-z0-9]/g, '') : "";
                        const brandLogo = brandImagesMap[normalizedKey];

                        return (
                            <Link key={brand} href={`/products?brand=${encodeURIComponent(brand)}`} prefetch={false} onClick={() => setIsBrandMenuOpen(false)} className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 hover:border-gray-300">
                               {brandLogo ? (
                                   <img src={brandLogo.src} alt={brand} className="h-12 w-full object-contain mix-blend-multiply opacity-70 hover:opacity-100 transition-opacity" />
                               ) : (
                                   <span className="h-12 w-full flex items-center justify-center text-[11px] font-black uppercase tracking-tight text-gray-800 text-center">{brand}</span>
                               )}
                            </Link>
                        );
                    })}
                </div>
             </div>
          </div>
        )}

        {/* 🏢 MegaMenu Productos */}
        {isMegaMenuOpen && !isSearchOpen && (
          <div className="absolute top-full left-0 w-full bg-white shadow-2xl border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200 h-[calc(100vh-65px)] max-h-[850px] z-[90] hidden md:block" onMouseEnter={() => setIsMegaMenuOpen(true)}>
            <div className="container mx-auto flex h-full relative">
              <button onClick={() => setIsMegaMenuOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-all z-50">
                <X size={24} strokeWidth={1.5} />
              </button>
              
              <div className="w-[300px] bg-gray-50 p-8 overflow-y-auto custom-scrollbar h-full flex flex-col">
                <button onMouseEnter={() => setViewState("grid")} className={`w-full text-left text-[13px] font-black uppercase tracking-widest p-4 rounded-xl transition-all flex items-center gap-3 mb-6 ${viewState === "grid" ? "bg-black text-white shadow-lg" : "text-black border border-gray-200 hover:border-black bg-white"}`}>
                  <Grip size={16} className={viewState === "grid" ? "text-white" : "text-black"} /> View All Categories
                </button>
                <ul className="space-y-1">
                  {categories.map((cat) => (
                    <li key={cat}>
                      <button onMouseEnter={() => { setActiveCategory(cat); setViewState("category"); }} className={`w-full text-left text-[13px] font-bold p-3 rounded transition-all flex items-center justify-between ${viewState === "category" && activeCategory === cat ? "bg-white text-[#8012d8] shadow-md translate-x-1" : "text-gray-700 hover:bg-white"}`}>
                        {cat} <ChevronRight size={14} className={viewState === "category" && activeCategory === cat ? "opacity-100" : "opacity-0"} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex-1 flex h-full overflow-y-auto custom-scrollbar relative">
                {viewState === "grid" && (
                  <div className="flex-1 p-12">
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black italic mb-10">Explore Our Shop</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
                      {categories.map((cat) => (
                        <Link key={cat} href={`/products?category=${encodeURIComponent(cat)}`} prefetch={false} onClick={() => setIsMegaMenuOpen(false)} className="p-4 bg-white border border-gray-100 hover:border-black rounded-3xl transition-all hover:shadow-xl flex flex-col items-center text-center group">
                          <div className="w-full aspect-square bg-[#f8fafc] rounded-2xl overflow-hidden mb-4 p-5 flex items-center justify-center border border-transparent group-hover:border-gray-200 transition-colors relative">
                            {categoryImages[cat] ? (
                              <img src={categoryImages[cat]} alt={cat} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=No+Image"; }}/>
                            ) : (
                              <ShoppingBag className="text-gray-300" size={32} />
                            )}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-black group-hover:text-[#8012d8] transition-colors leading-relaxed px-2 break-words">{cat}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {viewState === "category" && (
                  <div className="flex-1 p-12 flex flex-col h-full animate-in fade-in duration-300">
                    <h2 className="text-5xl font-black uppercase tracking-tighter text-black mb-10 italic">{activeCategory}</h2>
                    <div className="grid grid-cols-2 gap-12 mb-10 shrink-0">
                      <div>
                        <h3 className="text-[11px] font-black tracking-widest text-gray-400 mb-6 uppercase">Top Brands</h3>
                        <ul className="grid grid-cols-2 gap-y-4 gap-x-6">
                          {subCategories.map((sub) => (
                            <li key={sub} className="text-xs font-bold text-gray-800 hover:text-[#8012d8] cursor-pointer uppercase truncate">
                              <Link href={`/products?category=${encodeURIComponent(activeCategory)}&brand=${encodeURIComponent(sub)}`} prefetch={false} onClick={() => setIsMegaMenuOpen(false)}>{sub}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black tracking-widest text-gray-400 mb-6 uppercase">Shortcuts</h3>
                        <ul className="space-y-4">
                          <li className="text-xs font-bold text-black border-b-2 border-black inline-block cursor-pointer hover:text-[#8012d8] hover:border-[#8012d8] transition-colors">
                            <Link href={`/products?category=${encodeURIComponent(activeCategory)}`} prefetch={false} onClick={() => setIsMegaMenuOpen(false)}>VIEW ALL {activeCategory}</Link>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-auto border-t border-gray-100 pt-8 pb-12">
                      <h3 className="text-[11px] font-black tracking-widest text-gray-400 mb-6 uppercase">Featured in {activeCategory}</h3>
                      {categoryFeatured.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4">
                          {categoryFeatured.map((prod, idx) => (
                            <Link key={idx} href={`/products/${prod.slug || prod.id}`} prefetch={false} onClick={() => setIsMegaMenuOpen(false)} className="group relative aspect-square bg-[#F3F3F3] rounded-2xl overflow-hidden border border-gray-100 hover:border-black hover:shadow-lg transition-all flex items-center justify-center p-4">
                              <img src={prod.image_url} alt={prod.title || activeCategory} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=No+Image"; }}/>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-gray-50 flex items-center justify-center rounded-2xl">
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">No Images Available</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
      
      {/* 🔍 MODAL DE BUSCADOR */}
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
                    Search Results ({searchResults.length})
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
                        href={`/products/${product.slug || product.id}`} 
                        prefetch={false}
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

      {isLegalWarningOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-black mb-2">Notice</h3>
            <p className="text-xs font-bold text-gray-500 mb-8 uppercase tracking-widest leading-relaxed">
              YOU CONFIRM YOU HAVE LEGAL RIGHT TO USE UPLOADED LOGO. WE WILL CANCEL ORDER IF RIGHTS CANNOT BE ESTABLISHED.
            </p>
            <div className="flex w-full gap-3">
              <button onClick={() => setIsLegalWarningOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleAcceptLegalWarning} className="flex-1 py-4 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-[#8012d8] transition-colors shadow-lg">I Accept</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}