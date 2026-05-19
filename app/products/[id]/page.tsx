"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useCart } from "../../context/CartContext";
import { ChevronDown, ChevronRight, Check, AlertCircle, Info, ShieldCheck, Truck } from "lucide-react";

// Tiers de Decoración del PRD
const DECORATION_TIERS = [
  { min: 1, max: 11, emb: 12.45, sp: 8.00, dtf: 10.50 },
  { min: 12, max: 23, emb: 10.45, sp: 7.00, dtf: 9.45 },
  { min: 24, max: 71, emb: 9.00, sp: 6.00, dtf: 8.45 },
  { min: 72, max: 143, emb: 8.00, sp: 5.00, dtf: 7.45 },
  { min: 144, max: 287, emb: 7.00, sp: 4.00, dtf: 6.45 },
  { min: 288, max: 499, emb: 6.00, sp: 3.00, dtf: 5.45 },
];

const DISCLOSURES = [
  { id: "preview", icon: <Info size={16}/>, title: "What Your Logo Might Look Like", content: "Preview will not represent exact size or location. A proof will be provided before production begins. Logos placed in standard location unless otherwise requested." },
  { id: "one-logo", icon: <Check size={16}/>, title: "One Logo Per Order", content: "Logo goes on all products in the order. No need to upload logo on every item. Location changes should be noted at checkout. Color changes by item should be noted at checkout." },
  { id: "legal", icon: <ShieldCheck size={16}/>, title: "Legal Right to Use Logo", content: "You confirm you have legal right to use uploaded logo. We will cancel order if rights cannot be established." },
  { id: "pricing", icon: <AlertCircle size={16}/>, title: "Pricing & Fees", content: "All prices include your logo — no surprise charges. Orders under $300 → $65 small order processing fee. Mix and match styles to reach $300 and waive the fee. No size upcharge — 2XL and above same price as standard. 500+ pieces → use Request a Quote button." },
  { id: "shipping", icon: <Truck size={16}/>, title: "Turnaround & Shipping", content: "Standard orders: 7–10 business days after proof approval. Rush orders available — contact us before ordering. Free shipping on orders over $400. New logos require digitizing — allow 1 additional business day." },
];

// Orden lógico para las tallas
const SIZE_ORDER: Record<string, number> = { "XS": 1, "S": 2, "M": 3, "L": 4, "XL": 5, "2XL": 6, "3XL": 7, "4XL": 8, "5XL": 9, "6XL": 10 };

export default function ProductPage() {
  const { id } = useParams();
  const { addToCart, setIsCartOpen } = useCart();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);

  // Estados de Selección
  const [quantity, setQuantity] = useState<number>(1);
  const [decorationMethod, setDecorationMethod] = useState<"emb" | "sp" | "dtf">("emb");
  
  // ✅ Estados Dinámicos de Variaciones y Precios
  const [variants, setVariants] = useState<any[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [basePrice, setBasePrice] = useState<number>(0);
  
  // ✅ Estados de la Galería
  const [mainImage, setMainImage] = useState<string>("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  useEffect(() => {
    // 1. Cargar el Logo del cliente
    const savedLogo = localStorage.getItem("user_custom_logo");
    if (savedLogo) setUploadedLogo(savedLogo);

    // 2. Cargar Producto y Variaciones
    async function fetchProductData() {
      const { data: productData } = await supabase.from("products_unique_styles").select("*").eq("id", id).single();
      
      if (productData) {
        setProduct(productData);
        setMainImage(productData.image_url);

        // Obtener TODAS las variaciones para extraer precios e imágenes reales
        const { data: variantsData } = await supabase
          .from("products")
          .select("*")
          .eq("style", productData.style);

        if (variantsData && variantsData.length > 0) {
          setVariants(variantsData);
          
          // Extraer colores y tallas
          const colors = Array.from(new Set(variantsData.map((v: any) => v.color_name))).filter(Boolean) as string[];
          const sizes = Array.from(new Set(variantsData.map((v: any) => v.size)))
                             .filter(Boolean)
                             .sort((a: any, b: any) => (SIZE_ORDER[a] || 99) - (SIZE_ORDER[b] || 99)) as string[];

          // Extraer imágenes únicas para la galería (evitando duplicados)
          const images = Array.from(new Set(variantsData.map((v: any) => v.color_front_image || v.image_url).filter(Boolean))) as string[];
          
          setAvailableColors(colors);
          setAvailableSizes(sizes);
          setGallery(images.slice(0, 8)); // Mostrar máximo 8 fotos en la galería
          
          if (colors.length > 0) setSelectedColor(colors[0]);
          if (sizes.length > 0) setSelectedSize(sizes[0]);
        }
      }
      setLoading(false);
    }

    if (id) fetchProductData();
  }, [id]);

  // ✅ EFECTO: Cuando cambia el color o la talla, actualizamos precio e imagen
  useEffect(() => {
    if (variants.length > 0 && selectedColor) {
      // 1. Buscar la variante exacta (color + talla) para el precio
      const exactVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize) 
                        || variants.find(v => v.color_name === selectedColor); // Fallback si no existe esa talla en ese color
      
      if (exactVariant) {
        // Asignamos el precio real de la BD (asumiendo que se llama piece_price o price)
        const price = parseFloat(exactVariant.piece_price || exactVariant.price || 0);
        if (price > 0) setBasePrice(price);

        // 2. Actualizar la imagen principal al color seleccionado
        const colorImage = exactVariant.color_front_image || exactVariant.image_url;
        if (colorImage) setMainImage(colorImage);
      }
    }
  }, [selectedColor, selectedSize, variants]);

  // Cálculos de Precio
  const currentTier = DECORATION_TIERS.find(t => quantity >= t.min && quantity <= t.max) || DECORATION_TIERS[DECORATION_TIERS.length - 1];
  const unitPrice = basePrice + currentTier[decorationMethod];
  const totalSubtotal = unitPrice * quantity;
  const isQuote = quantity >= 500;

  const handleAddToCart = () => {
    if (isQuote) {
      alert("Redirecting to Quote Form...");
      return;
    }
    
    addToCart({
      id: `${product.id}-${selectedColor}-${selectedSize}-${decorationMethod}`,
      productId: product.id,
      title: product.title || product.product_name,
      price: unitPrice,
      quantity: quantity,
      image: mainImage,
      size: selectedSize,
      color: selectedColor,
      decorationMethod: decorationMethod.toUpperCase()
    });
    setIsCartOpen(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center">Product not found</div>;

  return (
    <main className="bg-white min-h-screen flex flex-col">
      <Header />
      
      <div className="container mx-auto px-4 py-12 flex-1 max-w-7xl">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 mb-10">
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/products" className="hover:text-black transition-colors">{product.category}</Link>
          <ChevronRight size={10} />
          <span className="text-black">{product.brand}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          <div className="lg:col-span-6 sticky top-24">
            {/* ✅ IMAGEN PRINCIPAL */}
            <div className="w-full aspect-[4/5] bg-[#F3F3F3] rounded-[3rem] overflow-hidden p-10 flex items-center justify-center relative border border-gray-100 shadow-inner">
              <img 
                src={mainImage || `https://cdnm.sanmar.com/catalog/images/${product.style}.jpg`} 
                alt={product.title} 
                className="w-full h-full object-contain mix-blend-multiply transition-opacity duration-300"
              />
              {uploadedLogo && (
                <div className="absolute top-[35%] right-[35%] w-[12%] aspect-square opacity-90 transition-all duration-500 hover:scale-110 cursor-help" title="Approximate Logo Placement">
                  <img src={uploadedLogo} alt="Your Logo" className="w-full h-full object-contain drop-shadow-md" />
                </div>
              )}
            </div>
            
            {/* ✅ GALERÍA DE MINIATURAS */}
            {gallery.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto custom-scrollbar pb-2 pt-2">
                {gallery.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setMainImage(img)}
                    className={`w-20 h-24 rounded-2xl flex-shrink-0 overflow-hidden border-2 transition-all p-1 bg-[#F3F3F3] ${mainImage === img ? 'border-blue-600 shadow-md' : 'border-transparent hover:border-gray-300'}`}
                  >
                    <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-contain mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}

            {!uploadedLogo && (
               <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6">
                 Upload your logo in the menu to preview it here
               </p>
            )}
          </div>

          <div className="lg:col-span-6">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] color-primary block mb-2">{product.brand}</span>
            <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-black mb-4 leading-none">{product.title || product.product_name}</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 border-b border-gray-100 pb-8">Style: {product.style}</p>

            {/* COLORES */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Color: <span className="text-black">{selectedColor}</span></label>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 border-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${selectedColor === color ? 'border-black bg-black text-white shadow-md' : 'border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* TALLAS */}
            <div className="mb-8 pb-8 border-b border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Size: <span className="text-black">{selectedSize}</span></label>
                <button className="text-[9px] font-bold text-gray-400 underline hover:text-black transition-colors">Size Chart</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[3rem] h-12 px-3 flex items-center justify-center border-2 text-[11px] font-black rounded-xl transition-all ${selectedSize === size ? 'border-black bg-black text-white shadow-md' : 'border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* OPCIONES DE DECORACIÓN */}
            <div className="mb-8">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black mb-4">1. Select Decoration Method</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "emb", label: "Embroidery", notes: "1-3 Locations" },
                  { id: "sp", label: "Screen Print", notes: "1-4 Locations" },
                  { id: "dtf", label: "Full Color (DTF)", notes: "Unlimited Colors" }
                ].map((method) => (
                  <button 
                    key={method.id}
                    onClick={() => setDecorationMethod(method.id as any)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-1 ${decorationMethod === method.id ? "border-blue-600 bg-blue-50 shadow-sm" : "border-gray-100 hover:border-gray-300"}`}
                  >
                    <span className={`text-[11px] font-black uppercase tracking-widest ${decorationMethod === method.id ? "text-blue-600" : "text-black"}`}>{method.label}</span>
                    <span className="text-[9px] font-bold text-gray-400">{method.notes}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TABLA DE PRECIOS B2B */}
            <div className="mb-10 bg-gray-50 rounded-3xl p-6 border border-gray-100">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black mb-4 flex items-center justify-between">
                <span>2. Quantity & Pricing</span>
                <span className="text-gray-400">Garment MSRP: <span className="text-black font-black">${basePrice > 0 ? basePrice.toFixed(2) : "0.00"}</span></span>
              </h3>
              
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="grid grid-cols-4 bg-gray-900 text-white p-3 text-[9px] font-black uppercase tracking-widest text-center">
                  <div className="text-left pl-2">Quantity</div>
                  <div>EMB Price</div>
                  <div>SP Price</div>
                  <div>DTF Price</div>
                </div>
                {DECORATION_TIERS.map((tier, idx) => (
                  <div key={idx} className={`grid grid-cols-4 p-3 text-[11px] font-bold text-center border-b border-gray-100 last:border-0 transition-colors ${quantity >= tier.min && quantity <= tier.max ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}>
                    <div className="text-left pl-2">{tier.min}{tier.max === 499 ? "+" : ` - ${tier.max}`}</div>
                    <div className={decorationMethod === 'emb' ? "text-black font-black" : ""}>${(basePrice + tier.emb).toFixed(2)}</div>
                    <div className={decorationMethod === 'sp' ? "text-black font-black" : ""}>${(basePrice + tier.sp).toFixed(2)}</div>
                    <div className={decorationMethod === 'dtf' ? "text-black font-black" : ""}>${(basePrice + tier.dtf).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              
              {totalSubtotal < 300 && quantity < 500 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-wide">
                    Orders under $300 are subject to a $65 small order processing fee at checkout. <br/>
                    <span className="font-black text-amber-600">You are ${(300 - totalSubtotal).toFixed(2)} away from waiving this fee!</span>
                  </p>
                </div>
              )}
            </div>

            {/* CANTIDAD Y AÑADIR AL CARRITO */}
            <div className="flex items-end gap-4 mb-10 pb-10 border-b border-gray-100">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Quantity</label>
                <input 
                  type="number" min="1" max="5000" 
                  value={quantity} 
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-sm font-black outline-none focus:border-black transition-colors"
                />
              </div>
              
              <div className="flex-[2]">
                <button 
                  onClick={handleAddToCart}
                  className={`w-full h-[54px] text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-colors shadow-xl flex items-center justify-center gap-3 ${isQuote ? "bg-white border-2 border-black text-black hover:bg-black hover:text-white" : "bg-black text-white hover:bg-blue-600"}`}
                >
                  {isQuote ? "Request a Quote" : `Add to Cart • $${totalSubtotal.toFixed(2)}`}
                </button>
              </div>
            </div>

            {/* ACCORDIONS */}
            <div className="space-y-3">
              {DISCLOSURES.map((disc) => (
                <div key={disc.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setOpenAccordion(openAccordion === disc.id ? null : disc.id)}
                    className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 text-black">
                      {disc.icon}
                      <span className="text-[11px] font-black uppercase tracking-widest">{disc.title}</span>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${openAccordion === disc.id ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openAccordion === disc.id ? "max-h-[200px]" : "max-h-0"}`}>
                    <p className="p-5 pt-0 text-[11px] font-bold text-gray-500 leading-relaxed uppercase tracking-wide">
                      {disc.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}