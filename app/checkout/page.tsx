"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { ChevronRight, Lock, Truck, ShoppingBag, ShieldCheck, MapPin, UserCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createCompleteOrder } from "@/lib/orderService"; 

const LOCAL_PICKUP_ZIPS = [
  "01432", "01833", "01906", "02114", "02215", "03042", "01450", "01834", "01907", "02115", 
  "02222", "03044", "01451", "01835", "01908", "02116", "02238", "03049", "01460", "01840", 
  "01910", "02117", "02241", "03051", "01463", "01841", "01913", "02118", "02293", "03052", 
  "01470", "01842", "01915", "02128", "02297", "03053", "01471", "01843", "01921", "02129", 
  "02298", "03054", "01472", "01844", "01922", "02133", "02420", "03060", "01703", "01845", 
  "01923", "02134", "02421", "03061", "01704", "01850", "01929", "02135", "02446", "03062", 
  "01705", "01851", "01936", "02138", "02447", "03063", "01718", "01852", "01937", "02139", 
  "02451", "03064", "01719", "01853", "01938", "02140", "02452", "03073", "01720", "01854", 
  "01940", "02141", "02453", "03076", "01730", "01860", "01944", "02142", "02454", "03077", 
  "01731", "01862", "01945", "02143", "02455", "03079", "01741", "01863", "01949", "02144", 
  "02456", "03087", "01742", "01864", "01950", "02145", "02458", "03103", "01754", "01865", 
  "01951", "02148", "02459", "03109", "01773", "01866", "01952", "02149", "02460", "03811", 
  "01801", "01867", "01960", "02150", "02465", "03819", "01803", "01876", "01961", "02151", 
  "02466", "03826", "01805", "01879", "01965", "02152", "02471", "03827", "01810", "01880", 
  "01969", "02153", "02472", "03833", "01812", "01885", "01970", "02155", "02474", "03841", 
  "01813", "01886", "01971", "02156", "02475", "03842", "01815", "01887", "01982", "02176", 
  "02476", "03843", "01821", "01888", "01983", "02180", "02477", "03844", "01822", "01889", 
  "01984", "02196", "02478", "03848", "01824", "01890", "01985", "02199", "02479", "03858", 
  "01825", "01899", "02108", "02201", "02493", "03859", "01826", "01901", "02109", "02203", 
  "02495", "03865", "01827", "01902", "02110", "02205", "03032", "03873", "01830", "01903", 
  "02111", "02210", "03036", "03874", "01831", "01904", "02112", "02211", "03038", "05501", 
  "01832", "01905", "02113", "02212", "03041"
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, cartTotal, clearCart } = useCart();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<any>(null);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  
  // 🚀 ESTADO NUEVO: Control del Checkbox de Términos y Condiciones
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: ""
  });

  const feeThreshold = 300;
  const feeAmount = 65;
  const appliesSmallOrderFee = cartTotal > 0 && cartTotal < feeThreshold;
  const currentFee = appliesSmallOrderFee ? feeAmount : 0;

  useEffect(() => {
    async function fetchUserData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserId(session.user.id);
        setFormData(prev => ({ ...prev, email: session.user.email || "" }));

        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", session.user.id)
          .single();

        const { data: savedAddress } = await supabase
          .from("addresses")
          .select("street, city, zip, phone, first_name, last_name")
          .eq("user_id", session.user.id)
          .order("is_default", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (savedAddress) {
          setSavedProfile({
            first_name: savedAddress.first_name || profile?.first_name,
            last_name: savedAddress.last_name || profile?.last_name,
            address: savedAddress.street,
            city: savedAddress.city,
            state: "", 
            zip_code: savedAddress.zip,
            phone: savedAddress.phone
          });
        } else if (profile) {
          setSavedProfile({
            first_name: profile.first_name,
            last_name: profile.last_name
          });
        }
      }
    }
    fetchUserData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (useSavedAddress) setUseSavedAddress(false);
    if (addressError) setAddressError(null); 
  };

  const handleToggleSavedAddress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setUseSavedAddress(isChecked);
    setAddressError(null); 

    if (isChecked && savedProfile) {
      setFormData(prev => ({
        ...prev,
        firstName: savedProfile.first_name || prev.firstName,
        lastName: savedProfile.last_name || prev.lastName,
        address: savedProfile.address || prev.address,
        city: savedProfile.city || prev.city,
        state: prev.state,
        zipCode: savedProfile.zip_code || prev.zipCode,
        phone: savedProfile.phone || prev.phone,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        address: "",
        city: "",
        state: "",
        zipCode: "",
        phone: ""
      }));
    }
  };

  const checkIsLocalPickup = (zip: string) => {
    const cleanZip = zip.trim();
    return LOCAL_PICKUP_ZIPS.includes(cleanZip);
  };

  const isPickupEligible = checkIsLocalPickup(formData.zipCode);
  const shippingCost = isPickupEligible ? 0 : 40;
  const finalTotal = cartTotal + shippingCost + currentFee;

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agreedToTerms) return; // Validación extra de seguridad anti-bot

    setIsProcessing(true);
    setAddressError(null);

    try {
      if (!isPickupEligible) {
        const verifyRes = await fetch('/fieldstone-embroider/api/verify-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            street1: formData.address,
            city: formData.city,
            state: formData.state,
            zip: formData.zipCode,
          })
        });
        
        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
          setAddressError(verifyData.error);
          setIsProcessing(false);
          window.scrollTo({ top: 150, behavior: "smooth" });
          return; 
        }
      }

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      const orderResult = await createCompleteOrder(
        cartItems,
        { 
          name: fullName, 
          email: formData.email, 
          total: finalTotal,
          shipping_method: isPickupEligible ? "pickup" : "shipping",
          shipping_cost: shippingCost 
        },
        userId
      );

      if (!orderResult.success) {
        console.error("Error saving order:", orderResult.error);
        alert("There was an issue processing your order details. Please try again.");
        setIsProcessing(false);
        return;
      }

      const orderId = orderResult.orderId;

      const res = await fetch('/fieldstone-embroider/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          email: formData.email,
          orderId: orderId,
          shippingCost: shippingCost,
          smallOrderFee: currentFee
        }),
      });

      if (!res.ok) {
        throw new Error(`API respondió con error: ${res.status}`);
      }

      const data = await res.json();

      if (data.url) {
        clearCart();
        window.location.href = data.url;
      } else {
        alert("Ocurrió un error al contactar la pasarela de pago.");
        setIsProcessing(false);
      }

    } catch (error) {
      console.error("Error de red o servidor:", error);
      alert("Error de conexión. Revisa tu internet e intenta de nuevo.");
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <main className="bg-white min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto px-4 py-32 flex-1 flex flex-col items-center justify-center">
          <ShoppingBag size={64} className="text-gray-300 mb-6" strokeWidth={1} />
          <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-2">Your cart is empty</h2>
          <p className="text-sm font-medium text-gray-500 mb-8">You cannot checkout without products.</p>
          <Link href="/products" className="px-10 py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[#3b5bdb] transition-colors shadow-xl">
            Return to Shop
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="bg-white min-h-screen flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-12 flex-1 max-w-7xl">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 mb-10">
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/cart" className="hover:text-black transition-colors">Cart</Link>
          <ChevronRight size={10} />
          <span className="text-black">Checkout</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-7 space-y-12">
            
            {savedProfile && (
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 shadow-sm flex items-start gap-4">
                <div className="bg-white p-3 rounded-full shadow-sm">
                  <UserCheck size={24} className="text-[#3b5bdb]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-black mb-1">Welcome back, {savedProfile.first_name || "Customer"}!</h3>
                  <p className="text-xs text-gray-500 mb-4">Would you like to use your saved delivery address for this order?</p>
                  <label className="flex items-center gap-3 cursor-pointer w-max">
                    <input 
                      type="checkbox" 
                      checked={useSavedAddress} 
                      onChange={handleToggleSavedAddress}
                      className="w-5 h-5 accent-black cursor-pointer rounded" 
                    />
                    <span className="text-sm font-bold text-black uppercase tracking-wider">Use my saved address</span>
                  </label>
                </div>
              </div>
            )}

            {addressError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm flex items-start gap-4 animate-in fade-in">
                <div className="bg-red-100 p-2 rounded-full shadow-sm flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-900 mb-1">Shipping Address Issue</h3>
                  <p className="text-xs font-medium text-red-700 leading-relaxed">{addressError}</p>
                </div>
              </div>
            )}

            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-12">
              
              <section>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-xs">1</span>
                  Contact Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Email Address *</label>
                    <input 
                      type="email" 
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      className="w-full text-black bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-xs">2</span>
                  Delivery Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">First Name *</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="w-full text-black bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Last Name *</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="w-full text-black bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Street 1 *</label>
                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} required placeholder="123 Main St, Apt 4B" className="w-full text-black bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">City / Province *</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} required className="w-full text-black bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">State *</label>
                    <input type="text" name="state" value={formData.state} onChange={handleInputChange} required placeholder="MA" className="w-full text-black bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                  
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">ZIP / Postal Code *</label>
                    <input 
                      type="text" 
                      name="zipCode" 
                      required 
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="w-full text-black bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" 
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Phone Number *</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="w-full text-black bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors" />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-xs">3</span>
                  Payment
                </h2>
                <div className="border border-gray-200 rounded-xl overflow-hidden p-8 text-center bg-gray-50">
                  <ShieldCheck size={48} className="mx-auto text-green-500 mb-4" />
                  <h3 className="text-sm font-bold text-black mb-2">Secure Payment Authorization</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    To guarantee your security, Fieldstone Embroidery does not store credit card information. You will be redirected to Clover's secure vault to complete your purchase.
                  </p>
                </div>
              </section>

            </form>
          </div>

          <div className="lg:col-span-5 w-full bg-gray-50 p-8 md:p-10 rounded-[2.5rem] sticky top-8 border border-gray-100">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-8">Order Summary</h2>
            
            {appliesSmallOrderFee && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-wide">
                  Orders under ${feeThreshold} are subject to a ${feeAmount} small order processing fee.
                </p>
              </div>
            )}

            <div className="space-y-4 py-4 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="relative w-16 h-20 bg-[#F3F3F3] rounded-xl flex-shrink-0 p-2 border border-white shadow-sm">
                    <img src={item.image} alt={item.title} className="w-full h-full object-contain mix-blend-multiply" />
                    <span className="absolute -top-2 -right-2 bg-black text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[11px] font-bold text-black uppercase tracking-tight line-clamp-1">{item.title}</h3>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">
                      {item.size} / {item.color}
                    </p>
                  </div>
                  <div className="text-[12px] font-black text-black">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 border-t border-b border-gray-200 py-6 mb-6">
              <div className="flex justify-between text-[13px] font-bold text-gray-600">
                <span>Subtotal</span>
                <span className="text-black">${cartTotal.toFixed(2)}</span>
              </div>

              {appliesSmallOrderFee && (
                <div className="flex justify-between text-[13px] font-bold text-amber-600">
                  <span className="flex items-center gap-2">Small Order Fee</span>
                  <span>${currentFee.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-[13px] font-bold text-gray-600">
                <span className="flex items-center gap-2">
                  {isPickupEligible ? "Local Pickup" : "Shipping"} 
                  {isPickupEligible ? <MapPin size={14}/> : <Truck size={14}/>}
                </span>
                <span className="text-black">{isPickupEligible ? "FREE" : `$${shippingCost.toFixed(2)}`}</span>
              </div>
            </div>

            {isPickupEligible && formData.zipCode.length > 4 && (
              <div className="mb-6 p-4 bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl flex items-start gap-3 animate-in fade-in zoom-in duration-300">
                <MapPin size={24} className="text-[#059669] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#065f46] mb-1">Will Call / Pickup Available</h4>
                  <p className="text-xs font-medium text-[#047857] leading-relaxed">
                    We will call you when your order is ready for pickup at our facility:<br/>
                    <strong className="block mt-2 text-black">104 Kingston St<br/>Lawrence, MA 01843</strong>
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-end mb-6">
              <span className="text-[14px] font-black uppercase tracking-widest text-black">Total</span>
              <span className="text-4xl font-black text-black tracking-tighter leading-none">${finalTotal.toFixed(2)}</span>
            </div>

            {/* 🚀 CHECKBOX DE TÉRMINOS Y CONDICIONES */}
            <div className="mb-6 flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <input 
                type="checkbox" 
                id="terms-checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 accent-black cursor-pointer rounded" 
              />
              <label htmlFor="terms-checkbox" className="text-[11px] font-bold text-gray-600 leading-tight cursor-pointer">
                I agree to the <Link href="/terms-and-conditions" target="_blank" className="text-black underline hover:text-blue-600">Terms and Conditions</Link> and <Link href="/privacy-policy" target="_blank" className="text-black underline hover:text-blue-600">Privacy Policy</Link>. *
              </label>
            </div>

            <button 
              form="checkout-form" 
              type="submit"
              disabled={isProcessing || !agreedToTerms}
              className="w-full h-16 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[#3b5bdb] transition-colors shadow-2xl flex items-center justify-center gap-3 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Pay ${finalTotal.toFixed(2)} <Lock size={14} /></>
              )}
            </button>
          </div>

        </div>
      </div>
      <Footer />
    </main>
  );
}