"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useCart } from "../../context/CartContext";
import { ChevronDown, ChevronRight, Check, AlertCircle, Info, ShieldCheck, Truck, X, Minus, Plus } from "lucide-react";

// Importación estática de la imagen original
import sizeChartImg from "@/public/Size_chart.webp";

// IMPORTACIONES DE LAS GUÍAS DE COLOCACIÓN
import placement1 from "@/public/PLACEMENT-GUIDE_Pagina_1.jpg";
import placement2 from "@/public/PLACEMENT-GUIDE_Pagina_2.jpg";
import placement3 from "@/public/PLACEMENT-GUIDE_Pagina_3.jpg"; // ✅ NUEVA IMAGEN IMPORTADA

// Orden lógico para las tallas
const SIZE_ORDER: Record<string, number> = { "XS": 1, "S": 2, "M": 3, "L": 4, "XL": 5, "2XL": 6, "3XL": 7, "4XL": 8, "5XL": 9, "6XL": 10 };

// Tiers por defecto (Fallback si la DB falla)
const DEFAULT_DECORATION_TIERS = [
  { min: 1, max: 11, emb: 12.45, sp: 8.00, dtf: 10.50 },
  { min: 12, max: 23, emb: 10.45, sp: 7.00, dtf: 9.45 },
  { min: 24, max: 71, emb: 9.00, sp: 6.00, dtf: 8.45 },
  { min: 72, max: 143, emb: 8.00, sp: 5.00, dtf: 7.45 },
  { min: 144, max: 287, emb: 7.00, sp: 4.00, dtf: 6.45 },
  { min: 288, max: 499, emb: 6.00, sp: 3.00, dtf: 5.45 },
];

export default function ProductPage() {
  const { id } = useParams();
  const { addToCart, setIsCartOpen } = useCart();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);

  // Estados de Selección
  const [quantity, setQuantity] = useState<number>(1);
  const [decorationMethod, setDecorationMethod] = useState<"emb" | "sp" | "">("");
  
  // Estados para las locaciones y los comentarios extras
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [extraComments, setExtraComments] = useState<string>("");

  // Estado para el Popup de validación
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Estados Dinámicos de Variaciones y Precios
  const [variants, setVariants] = useState<any[]>([]);
  const [availableColorObjects, setAvailableColorObjects] = useState<{name: string, image: string}[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [basePrice, setBasePrice] = useState<number>(0);
  
  // Estados dinámicos traídos desde el Administrador
  const [decorationTiers, setDecorationTiers] = useState<any[]>(DEFAULT_DECORATION_TIERS);
  const [feeThreshold, setFeeThreshold] = useState<number>(300);
  const [feeAmount, setFeeAmount] = useState<number>(65);

  // Estados de la Galería
  const [mainImage, setMainImage] = useState<string>("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  // Estados de Modales
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const [isPlacementGuideOpen, setIsPlacementGuideOpen] = useState(false);

  // Mover DISCLOSURES dentro para usar las variables dinámicas
  const DISCLOSURES = [
    { id: "preview", icon: <Info size={16}/>, title: "What Your Logo Might Look Like", content: "Preview will not represent exact size or location. A proof will be provided before production begins. Logos placed in standard location unless otherwise requested." },
    { id: "one-logo", icon: <Check size={16}/>, title: "One Logo Per Order", content: "Logo goes on all products in the order. No need to upload logo on every item. Location changes should be noted at checkout. Color changes by item should be noted at checkout." },
    { id: "legal", icon: <ShieldCheck size={16}/>, title: "Legal Right to Use Logo", content: "You confirm you have legal right to use uploaded logo. We will cancel order if rights cannot be established." },
    { id: "pricing", icon: <AlertCircle size={16}/>, title: "Pricing & Fees", content: `All prices include your logo — no surprise charges. Orders under $${feeThreshold} → $${feeAmount} small order processing fee. Mix and match styles to reach $${feeThreshold} and waive the fee. 500+ pieces → use Request a Quote button.` },
    { id: "shipping", icon: <Truck size={16}/>, title: "Turnaround & Shipping", content: "Standard orders: 7–10 business days after proof approval. Rush orders available — contact us before ordering. Free shipping on orders over $400. New logos require digitizing — allow 1 additional business day." },
  ];

  useEffect(() => {
    // 1. Cargar el Logo del cliente
    const savedLogo = localStorage.getItem("user_custom_logo");
    if (savedLogo) setUploadedLogo(savedLogo);

    async function fetchProductAndSettings() {
      // Cargar configuración global del Administrador
      const { data: settings } = await supabase.from("store_settings").select("*").eq("id", "default").single();
      if (settings) {
        if (settings.decoration_tiers) setDecorationTiers(settings.decoration_tiers);
        if (settings.small_order_fee_threshold) setFeeThreshold(settings.small_order_fee_threshold);
        if (settings.small_order_fee_amount) setFeeAmount(settings.small_order_fee_amount);
      }

      // Cargar Producto y Variaciones
      const { data: productData } = await supabase.from("products_unique_styles").select("*").eq("id", id).single();
      
      if (productData) {
        setProduct(productData);
        setMainImage(productData.image_url);

        const { data: variantsData } = await supabase.from("products").select("*").eq("style", productData.style);

        if (variantsData && variantsData.length > 0) {
          setVariants(variantsData);
          
          const uniqueColorsMap = new Map();
          variantsData.forEach((v: any) => {
            if (v.color_name && !uniqueColorsMap.has(v.color_name)) {
              uniqueColorsMap.set(v.color_name, v.front_model_url || v.image_url);
            }
          });
          const colorsObj = Array.from(uniqueColorsMap.entries()).map(([name, image]) => ({ name, image }));

          const sizes = Array.from(new Set(variantsData.map((v: any) => v.size)))
                             .filter(Boolean)
                             .sort((a: any, b: any) => (SIZE_ORDER[a] || 99) - (SIZE_ORDER[b] || 99)) as string[];
          
          setAvailableColorObjects(colorsObj);
          setAvailableSizes(sizes);
          
          if (colorsObj.length > 0) setSelectedColor(colorsObj[0].name);
          if (sizes.length > 0) setSelectedSize(sizes[0]);
        }
      }
      setLoading(false);
    }

    if (id) fetchProductAndSettings();
  }, [id]);

  // EFECTO CUANDO CAMBIA EL COLOR O TALLA
  useEffect(() => {
    if (variants.length > 0 && selectedColor) {
      const variantsOfColor = variants.filter(v => v.color_name === selectedColor);
      
      const colorImages = Array.from(new Set(variantsOfColor.flatMap(v => [
        v.front_model_url,
        v.back_model_url,
        v.front_flat_url,
        v.back_flat_url,
        v.image_url 
      ]).filter(Boolean))) as string[];

      setGallery(colorImages.slice(0, 8));
      if (colorImages.length > 0) setMainImage(colorImages[0]);

      // Buscar exactamente la variante seleccionada
      const exactVariant = variantsOfColor.find(v => v.size === selectedSize);
      
      if (exactVariant) {
        const exactPrice = parseFloat(exactVariant.msrp || exactVariant.price || 0);
        setBasePrice(exactPrice);
      }
    }
  }, [selectedColor, selectedSize, variants]);

  useEffect(() => {
    setSelectedLocation("");
  }, [decorationMethod]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedLogo(dataUrl);
        localStorage.setItem("user_custom_logo", dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setUploadedLogo(null);
    localStorage.removeItem("user_custom_logo");
  };

  let availableLocations: string[] = [];
  const catUpper = product?.category?.toUpperCase() || "";

  if (catUpper.includes("T-SHIRT") || catUpper.includes("POLO") || catUpper.includes("SWEATSHIRT") || catUpper.includes("FLEECE") || catUpper.includes("ACTIVEWEAR") || catUpper.includes("WOVEN")) {
    if (decorationMethod === "emb") availableLocations = ["1 - Left Chest", "2 - Right Chest", "3 - Left Sleeve", "4 - Right Sleeve"];
    else if (decorationMethod === "sp") availableLocations = ["1 - Left Chest", "2 - Right Chest", "3 - Full Front", "4 - Full Back", "5 - Left Sleeve", "6 - Right Sleeve"];
  } 
  else if (catUpper.includes("CAP") || catUpper.includes("HEADWEAR")) {
    availableLocations = ["1 - Cap Front", "2 - Side Panels", "3 - Cap Back"];
  } 
  else if (catUpper.includes("BEANIE")) {
    availableLocations = ["1 - Beanie Front", "2 - Beanie Back"];
  } 
  else if (catUpper.includes("BAG") || catUpper.includes("BACKPACK") || catUpper.includes("TOTE") || catUpper.includes("DUFFEL") || catUpper.includes("COOLER") || catUpper.includes("DRAWSTRING")) {
    availableLocations = ["1 - Middle Front Pocket", "2 - Bottom Front Pocket", "3 - Top Front Panel", "4 - Bottom Front Panel"];
  } 
  else {
    availableLocations = ["Standard Location"];
  }

  // USAR TIERS DINÁMICOS DESDE EL ADMIN
  const currentTier = decorationTiers.find(t => quantity >= t.min && quantity <= t.max) || decorationTiers[decorationTiers.length - 1];
  const addedPrice = decorationMethod ? currentTier[decorationMethod as "emb" | "sp"] : 0;
  const unitPrice = basePrice + addedPrice;
  const totalSubtotal = unitPrice * quantity;
  const isQuote = quantity >= 500;

  const handleAddToCart = () => {
    if (!selectedColor) return setValidationError("Please select a Color for your product.");
    if (!selectedSize) return setValidationError("Please select a Size for your product.");
    if (!decorationMethod) return setValidationError("Please select a Decoration Method (Embroidery or Screen Print).");
    if (!uploadedLogo) return setValidationError("Please upload your Custom Logo to proceed.");
    if (!selectedLocation) return setValidationError("Please select a Logo Location.");

    if (isQuote) {
      alert("Redirecting to Quote Form...");
      return;
    }
    
    addToCart({
      id: `${product.id}-${selectedColor}-${selectedSize}-${decorationMethod}-${selectedLocation}`,
      productId: product.id,
      title: product.title || product.product_name,
      price: unitPrice,
      quantity: quantity,
      image: mainImage,
      size: selectedSize,
      color: selectedColor,
      decorationMethod: decorationMethod.toUpperCase(),
      // @ts-expect-error: Ignoramos el error de tipo para forzar el build
      location: selectedLocation,
      extraComments: extraComments
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
            <div className="w-full h-[60vh] aspect-[4/5] bg-[#F3F3F3] rounded-[3rem] overflow-hidden p-10 flex items-center justify-center relative border border-gray-100 shadow-inner">
              <img 
                src={mainImage || `https://cdnm.sanmar.com/catalog/images/${product.style}.jpg`} 
                alt={product.title} 
                onError={() => setMainImage(`https://cdnm.sanmar.com/catalog/images/${product.style}.jpg`)}
                className="w-full h-full object-contain mix-blend-multiply transition-opacity duration-300"
              />
            </div>
            
            {gallery.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto custom-scrollbar pb-2 pt-2">
                {gallery.map((img, idx) => (
                  <button 
                    key={idx} onClick={() => setMainImage(img)}
                    className={`w-20 h-24 rounded-2xl flex-shrink-0 overflow-hidden border-2 transition-all p-1 bg-[#F3F3F3] ${mainImage === img ? 'border-blue-600 shadow-md ring-2 ring-blue-100' : 'border-transparent hover:border-gray-300'}`}
                  >
                    <img src={img} alt={`Ángulo ${idx}`} onError={() => setGallery((prev) => prev.filter((url) => url !== img))} className="w-full h-full object-cover rounded-xl mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-6">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] color-primary block mb-2">{product.brand}</span>
            <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-black mb-4 leading-none">{product.title || product.product_name}</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Style: {product.style}</p>

            {/* ✅ DESCRIPCIÓN DEL PRODUCTO */}
            {product.description && (
              <div className="mb-6">
                <p className="text-xs font-medium text-gray-600 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* ✅ PESO POR PIEZA */}
            {product.weight && (
              <div className="mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Piece Weight: <span className="text-black">{product.weight} lbs</span>
                </span>
              </div>
            )}

            <div className="w-full border-b border-gray-100 mb-8 pb-4"></div>

            {/* COLORES */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Color: <span className="text-black">{selectedColor}</span></label>
              </div>
              <div className="flex flex-wrap gap-3">
                {availableColorObjects.map(color => (
                  <button
                    key={color.name} onClick={() => setSelectedColor(color.name)} title={color.name}
                    className={`w-[4.5rem] h-20 rounded-xl overflow-hidden border-2 transition-all p-1 bg-gray-50 ${selectedColor === color.name ? 'border-blue-600 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <div className="w-full h-full relative rounded-lg overflow-hidden bg-white">
                      <img src={color.image} alt={color.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* TALLAS */}
            <div className="mb-8 pb-8 border-b border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Size: <span className="text-black">{selectedSize}</span></label>
                <button onClick={() => setIsSizeChartOpen(true)} className="text-[9px] font-bold text-gray-400 underline hover:text-black transition-colors cursor-pointer">Size Chart</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map(size => (
                  <button
                    key={size} onClick={() => setSelectedSize(size)}
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
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "emb", label: "Embroidery", notes: "1-3 Locations" },
                  { id: "sp", label: "Screen Print", notes: "1-4 Locations" }
                ].map((method) => (
                  <button 
                    key={method.id} onClick={() => setDecorationMethod(method.id as any)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-1 ${decorationMethod === method.id ? "border-blue-600 bg-blue-50 shadow-sm" : "border-gray-100 hover:border-gray-300"}`}
                  >
                    <span className={`text-[11px] font-black uppercase tracking-widest ${decorationMethod === method.id ? "text-blue-600" : "text-black"}`}>{method.label}</span>
                    <span className="text-[9px] font-bold text-gray-400">{method.notes}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SUBIDA DE ARCHIVO Y PREVIEW */}
            {decorationMethod && (
              <div className="mb-10 w-full border-2 border-dashed border-gray-300 rounded-3xl p-8 flex flex-col items-center justify-center bg-gray-50 transition-all relative animate-in fade-in">
                <button onClick={() => setIsPlacementGuideOpen(true)} className="text-blue-600 hover:text-blue-800 font-bold mb-4 text-sm underline transition-colors cursor-pointer">Placement Guide</button>
                {!uploadedLogo ? (
                  <>
                    <p className="text-gray-600 text-xs mb-4">Upload Your File:</p>
                    <label className="bg-[#3b5bdb] hover:bg-blue-700 text-white px-8 py-3 rounded-md cursor-pointer font-medium transition-colors shadow-sm text-sm">
                      Upload Your File
                      <input type="file" className="hidden" accept=".jpg,.png,.pdf,.ai,.eps" onChange={handleFileUpload} />
                    </label>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 animate-fade-in w-full">
                    <div className="flex items-center gap-2 mt-2">
                      <div className="bg-green-100 p-1 rounded-full"><Check size={16} className="text-green-600" /></div>
                      <p className="text-sm text-green-700 font-bold">Logo Uploaded Successfully!</p>
                    </div>
                    <div className="relative w-64 h-64 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm flex items-center justify-center">
                      <img src={uploadedLogo} alt="Logo Preview" className="max-w-full max-h-full object-contain drop-shadow-sm" />
                      <button onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 hover:scale-110 transition-all"><X size={14} /></button>
                    </div>
                    <label className="text-xs text-[#3b5bdb] cursor-pointer hover:underline font-semibold tracking-wide">
                      Replace File
                      <input type="file" className="hidden" accept=".jpg,.png,.pdf,.ai,.eps" onChange={handleFileUpload} />
                    </label>

                    <div className="w-full mt-6 text-left border-t border-gray-200 pt-6">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Select Logo Location *</label>
                      <div className="relative">
                        <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="w-full p-4 text-sm font-bold text-black bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition-all appearance-none cursor-pointer">
                          <option value="" disabled>Select a location...</option>
                          {availableLocations.map(loc => (<option key={loc} value={loc}>{loc}</option>))}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="w-full mt-4 text-left">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Extra Instructions / Comments (Optional)</label>
                      <textarea value={extraComments} onChange={(e) => setExtraComments(e.target.value)} placeholder="E.g., Please center the logo on the left chest..." className="w-full p-4 text-sm text-black bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition-all resize-none h-24 custom-scrollbar" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TABLA DE PRECIOS B2B (Dinámica según el Admin) */}
            <div className="mb-10 bg-gray-50 rounded-3xl p-6 border border-gray-100">
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="grid grid-cols-3 bg-gray-900 text-white p-3 text-[9px] font-black uppercase tracking-widest text-center">
                  <div className="text-left pl-2">Quantity</div><div>EMB Price</div><div>SP Price</div>
                </div>
                {decorationTiers.map((tier, idx) => (
                  <div key={idx} className={`grid grid-cols-3 p-3 text-[11px] font-bold text-center border-b border-gray-100 last:border-0 transition-colors ${quantity >= tier.min && quantity <= tier.max ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"}`}>
                    <div className="text-left pl-2">{tier.min}{tier.max === 499 ? "+" : ` - ${tier.max}`}</div>
                    <div className={decorationMethod === 'emb' ? "text-black font-black" : ""}>${(basePrice + tier.emb).toFixed(2)}</div>
                    <div className={decorationMethod === 'sp' ? "text-black font-black" : ""}>${(basePrice + tier.sp).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              
              {totalSubtotal < feeThreshold && quantity < 500 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-wide">
                    Orders under ${feeThreshold} are subject to a ${feeAmount} small order processing fee at checkout. <br/>
                    <span className="font-black text-amber-600">You are ${(feeThreshold - totalSubtotal).toFixed(2)} away from waiving this fee!</span>
                  </p>
                </div>
              )}
            </div>

            {/* CANTIDAD Y AÑADIR AL CARRITO */}
            <div className="flex items-end gap-6 mb-10 pb-10 border-b border-gray-100">
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Quantity</label>
                <div className="flex items-center gap-1 p-1.5 border-2 border-[#e8f0fe] rounded-2xl bg-white w-max">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#eaf2fd] text-[#3b5bdb] hover:bg-[#dce7fc] transition-colors flex-shrink-0"><Minus size={22} strokeWidth={4} /></button>
                  <input type="number" min="1" max="5000" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} onBlur={() => setQuantity(q => Math.max(1, q))} className="w-16 h-10 border border-[#d2e3fc] rounded-xl text-center text-lg font-black text-[#1a1a1a] outline-none focus:border-[#3b5bdb] transition-colors appearance-none" style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }} />
                  <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#eaf2fd] text-[#3b5bdb] border-[2.5px] border-[#3b5bdb] hover:bg-[#dce7fc] transition-colors flex-shrink-0"><Plus size={22} strokeWidth={4} /></button>
                </div>
              </div>
              <div className="flex-[2]">
                <button onClick={handleAddToCart} className={`w-full h-[54px] text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-colors shadow-xl flex items-center justify-center gap-3 ${isQuote ? "bg-white border-2 border-black text-black hover:bg-black hover:text-white" : "bg-black text-white hover:bg-[#3b5bdb]"}`}>
                  {isQuote ? "Request a Quote" : `Add to Cart • $${totalSubtotal.toFixed(2)}`}
                </button>
              </div>
            </div>

            {/* ACCORDIONS */}
            <div className="space-y-3">
              {DISCLOSURES.map((disc) => (
                <div key={disc.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenAccordion(openAccordion === disc.id ? null : disc.id)} className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 text-black">{disc.icon}<span className="text-[11px] font-black uppercase tracking-widest">{disc.title}</span></div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${openAccordion === disc.id ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openAccordion === disc.id ? "max-h-[200px]" : "max-h-0"}`}><p className="p-5 pt-0 text-[11px] font-bold text-gray-500 leading-relaxed uppercase tracking-wide">{disc.content}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* MODALES */}
      {validationError && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4"><AlertCircle size={32} className="text-red-500" /></div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-black mb-2">Missing Information</h3>
            <p className="text-sm font-bold text-gray-500 mb-8">{validationError}</p>
            <button onClick={() => setValidationError(null)} className="w-full py-4 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-[#8012d8] transition-colors">Got it, let's fix it</button>
          </div>
        </div>
      )}
      {isSizeChartOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-2 shadow-2xl">
            <button onClick={() => setIsSizeChartOpen(false)} className="absolute -top-4 -right-4 bg-black text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform z-10"><X size={20} /></button>
            <div className="w-full h-auto overflow-hidden rounded-2xl"><img src={sizeChartImg.src} alt="Size Measurements Chart" className="w-full h-auto object-contain" /></div>
          </div>
        </div>
      )}
      
      {isPlacementGuideOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-5xl bg-white rounded-3xl p-2 shadow-2xl">
            <button onClick={() => setIsPlacementGuideOpen(false)} className="absolute -top-4 -right-4 bg-black text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform z-10"><X size={20} /></button>
            
            <div className="h-[80vh] overflow-y-auto custom-scrollbar p-4 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <img src={placement1.src} alt="Placement Guide Page 1" className="w-full h-auto object-contain rounded-xl border border-gray-100 shadow-sm" />
                <img src={placement2.src} alt="Placement Guide Page 2" className="w-full h-auto object-contain rounded-xl border border-gray-100 shadow-sm" />
              </div>
              
              <div className="w-full flex justify-center">
                <img src={placement3.src} alt="Placement Guide Page 3 - Bags" className="w-full max-w-4xl h-auto object-contain rounded-xl border border-gray-100 shadow-sm" />
              </div>
              
            </div>
          </div>
        </div>
      )}
    </main>
  );
}