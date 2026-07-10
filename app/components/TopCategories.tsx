"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ✅ 1. IMPORTACIONES DIRECTAS CON LOS NOMBRES EXACTOS DEL HTML DE SANMAR
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

// ✅ 2. DICCIONARIO: Conecta el nombre en la Base de Datos con la Imagen
const brandImagesMap: Record<string, any> = {
  "A4": logoA4,
  "Allmade": logoAllmade,
  "BELLA+CANVAS": logoBellaCanvas,
  "Brooks Brothers": logoBrooksBrothers,
  "Bulwark": logoBulwark,
  "Carhartt": logoCarhartt,
  "Champion": logoChampion,
  "Comfort Colors": logoComfortColors,
  "CornerStone": logoCornerstone,
  "Cotopaxi": logoCotopaxi,
  "District": logoDistrict,
  "Eddie Bauer": logoEddieBauer,
  "Gildan": logoGildan,
  "Jerzees": logoJerzees,
  "Mercer+Mettle": logoMercerMettle,
  "New Era": logoNewEra,
  "Next Level Apparel": logoNextLevel,
  "Nike": logoNike,
  "OGIO": logoOgio,
  "Outdoor Research": logoOutdoorResearch,
  "Port & Co": logoPortCo,
  "Port Authority": logoPortAuthority,
  "Rabbit Skins": logoRabbitSkins,
  "Red Kap": logoRedKap,
  "Richardson": logoRichardson,
  "Russell Outdoors": logoRussellOutdoors,
  "Spacecraft": logoSpacecraft,
  "Sport-Tek": logoSportTek,
  "Stanley/Stella": logoStanleyStella,
  "tentree": logoTentree,
  "The North Face": logoTheNorthFace,
  "Tommy Bahama": logoTommyBahama,
  "TravisMathew": logoTravisMathew,
  "Volunteer Knitwear": logoVolunteerKnitwear,
  "Wink": logoWink
};

// 3. ORDEN DE PRIORIDAD DE LAS MARCAS DESTACADAS (Aparecerán primero)
const TOP_FEATURED_BRANDS = [
  "Nike", "The North Face", "Carhartt", "Comfort Colors", 
  "Stanley/Stella", "OGIO", "TravisMathew", "Gildan", 
  "Champion", "New Era", "Richardson", "Sport-Tek", 
  "BELLA+CANVAS", "Mercer+Mettle", "Port Authority", "District"
];

// --- COMPONENTE DE TARJETA DE MARCA ---
function BrandCard({ brandName }: { brandName: string }) {
  // Buscamos la imagen mapeada
  const importedImage = brandImagesMap[brandName];
  const [imgError, setImgError] = useState(false);

  return (
    <Link 
      href={`/products?brand=${encodeURIComponent(brandName)}`}
      className="group relative flex flex-col items-center justify-center h-24 bg-[#F3F4F6] rounded-xl border border-transparent hover:border-gray-300 hover:shadow-md transition-all duration-300 px-4"
    >
      {importedImage && !imgError ? (
        <img 
          src={importedImage.src} 
          alt={`${brandName} logo`}
          className="max-h-24 w-12 max-w-[90%] object-contain mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity duration-300"
          onError={() => {
            console.error(`🚨 Falló carga en el navegador: ${brandName}`);
            setImgError(true);
          }} 
        />
      ) : (
        // Fallback elegante en caso de que Next.js no empaquete bien la imagen o no exista
        <span className="text-sm font-black uppercase tracking-widest text-gray-800 text-center truncate w-full">
          {brandName}
        </span>
      )}
    </Link>
  );
}

export default function FeaturedBrands() {
  const [displayBrands, setDisplayBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeaturedBrands() {
      setLoading(true);
      try {
        // ✅ AÑADIDO: 1. Consultar la configuración del administrador primero
        const { data: settings } = await supabase.from("store_settings").select("*").eq("id", "default").single();
        const allowedBrands: string[] = settings?.visible_brands || [];

        // 2. Consultar las marcas de los productos
        const { data: products, error } = await supabase
          .from("products_unique_styles")
          .select("brand")
          .not("brand", "is", null)
          .limit(5000);

        if (error) throw error;

        if (products) {
          // 3. Obtenemos todas las marcas únicas de tu base de datos
          const availableBrands = Array.from(new Set(products.map(p => p.brand)));
          
          // 4. Filtramos: Que tengan imagen AND (Opcional) que el admin las permita
          let filteredBrands = availableBrands.filter(b => brandImagesMap[b]);
          
          if (allowedBrands.length > 0) {
            filteredBrands = filteredBrands.filter(b => allowedBrands.includes(b));
          }
          
          // 5. Ordenamos: Las TOP primero, luego el resto en orden alfabético
          const sortedBrands = filteredBrands.sort((a, b) => {
            const indexA = TOP_FEATURED_BRANDS.indexOf(a);
            const indexB = TOP_FEATURED_BRANDS.indexOf(b);
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB; // Ambas son TOP
            if (indexA !== -1) return -1; // Solo A es TOP
            if (indexB !== -1) return 1;  // Solo B es TOP
            
            return a.localeCompare(b); // Ninguna es TOP, orden alfabético normal
          });

          // 6. Mostramos todas las marcas filtradas y ordenadas
          setDisplayBrands(sortedBrands);
        }
      } catch (e) {
        console.error("Error cargando marcas:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchFeaturedBrands();
  }, []);

  if (loading || displayBrands.length === 0) return null;

  return (
    <section className="bg-white py-16 border-t border-gray-100">
      <div className="container mx-auto px-4 lg:px-8 max-w-screen-2xl">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
              Shop Featured Brands
            </h2>
            <p className="text-sm font-medium text-gray-500 mt-2">
              Premium apparel ready for your custom logo.
            </p>
          </div>
          
          <Link 
            href="/products" 
            className="text-sm font-bold text-[#3b5bdb] hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            See All Featured Brands <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        {/* GRID DE LOGOS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
          {displayBrands.map((brandName, idx) => (
            <BrandCard key={idx} brandName={brandName} />
          ))}
        </div>

      </div>
    </section>
  );
}