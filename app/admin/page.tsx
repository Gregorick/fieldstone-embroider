"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, ShoppingBag, FolderTree, User, Users, UserPlus,
  LogOut, Search, Eye, Edit, Check, X, Camera, Save, Lock,
  Package, ChevronDown, Download, BarChart3, Trash2, DollarSign, Truck
} from "lucide-react";

// Tiers por defecto en caso de que la DB esté vacía
const DEFAULT_TIERS = [
  { min: 1, max: 11, emb: 12.45, sp: 8.00, dtf: 10.50 },
  { min: 12, max: 23, emb: 10.45, sp: 7.00, dtf: 9.45 },
  { min: 24, max: 71, emb: 9.00, sp: 6.00, dtf: 8.45 },
  { min: 72, max: 143, emb: 8.00, sp: 5.00, dtf: 7.45 },
  { min: 144, max: 287, emb: 7.00, sp: 4.00, dtf: 6.45 },
  { min: 288, max: 499, emb: 6.00, sp: 3.00, dtf: 5.45 },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // --- ESTADOS: PERFIL ADMIN ---
  const [profile, setProfile] = useState({ first_name: "", last_name: "", avatar_url: "" });
  const [password, setPassword] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // --- ESTADOS: ÓRDENES ---
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // --- ESTADOS: ENVÍO (EASYPOST) ---
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [packageLength, setPackageLength] = useState<number>(12);
  const [packageWidth, setPackageWidth] = useState<number>(12);
  const [packageHeight, setPackageHeight] = useState<number>(2);
  const [packageWeight, setPackageWeight] = useState<number>(80);

  // --- ESTADOS: CATEGORÍAS Y MARCAS ---
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [visibleBrands, setVisibleBrands] = useState<string[]>([]);

  // --- ESTADOS: PRECIOS Y TARIFAS ---
  const [feeThreshold, setFeeThreshold] = useState<number>(300);
  const [feeAmount, setFeeAmount] = useState<number>(65);
  const [pricingTiers, setPricingTiers] = useState<any[]>(DEFAULT_TIERS);

  // --- ESTADOS: USUARIOS ---
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ first_name: "", last_name: "", email: "", password: "", role: "customer" });

  useEffect(() => {
    setMounted(true);
    checkAdminAndLoadData();
  }, []);

  async function checkAdminAndLoadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData || profileData.role !== 'admin') {
      router.push("/account");
      return;
    }

    setAdminUser(user);
    setProfile({
      first_name: profileData.first_name || "",
      last_name: profileData.last_name || "",
      avatar_url: profileData.avatar_url || ""
    });

    fetchOrders();
    fetchUsers();

    const { data: catData } = await supabase.rpc("get_unique_categories");
    let cats: string[] = [];
    if (catData) {
      cats = catData.map((item: any) => item.category_name);
      setAllCategories(cats);
    }

    const { data: brandData } = await supabase.from("products_unique_styles").select("brand").not("brand", "is", null);
    let brands: string[] = [];
    if (brandData) {
      brands = Array.from(new Set(brandData.map((item: any) => item.brand))).sort() as string[];
      setAllBrands(brands);
    }

    // Cargar configuraciones globales
    const { data: settings } = await supabase.from("store_settings").select("*").eq("id", "default").single();
    if (settings) {
      setVisibleCategories(settings.visible_categories || cats);
      setVisibleBrands(settings.visible_brands || brands);
      if (settings.small_order_fee_threshold) setFeeThreshold(settings.small_order_fee_threshold);
      if (settings.small_order_fee_amount) setFeeAmount(settings.small_order_fee_amount);
      if (settings.decoration_tiers) setPricingTiers(settings.decoration_tiers);
    } else {
      setVisibleCategories(cats); 
      setVisibleBrands(brands);
    }

    setLoading(false);
  }

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select(`*, order_items (*)`).order("created_at", { ascending: false });
    if (data) setOrders(data);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ order_status: newStatus }).eq("id", orderId);
    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) setSelectedOrder({ ...selectedOrder, order_status: newStatus });
    } else alert("Error updating order: " + error.message);
  };

  // --- FUNCIÓN DE GENERAR ETIQUETA UPS (CORREGIDA) ---
  const handleGenerateLabel = async () => {
    if (!packageWeight || !packageLength || !packageWidth || !packageHeight) {
      alert("Please fill in all package dimensions and weight.");
      return;
    }
    if (!confirm(`Generate a UPS label for a ${packageLength}x${packageWidth}x${packageHeight} package weighing ${packageWeight}oz?`)) return;
    
    setIsGeneratingLabel(true);
    try {
      // ✅ SE LE AÑADIÓ /fieldstone-embroider A LA RUTA
      const res = await fetch('/fieldstone-embroider/api/easypost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: selectedOrder.id, 
          weightOz: packageWeight,
          length: packageLength,
          width: packageWidth,
          height: packageHeight
        }) 
      });
      
      // Validación estricta para atrapar errores 404 antes de procesar JSON
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errData = await res.json();
          throw new Error(errData.error || "Error de la API de envíos");
        } else {
          throw new Error("Endpoint no encontrado (404). Verifica que la carpeta /api/easypost existe.");
        }
      }
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setSelectedOrder({
        ...selectedOrder, 
        tracking_number: data.trackingNumber,
        shipping_label_url: data.labelUrl,
        tracking_url: data.trackingUrl,
        order_status: 'shipped'
      });
      fetchOrders(); 
      alert("Success! UPS Label generated and order marked as Shipped.");

    } catch (error: any) {
      alert("Failed to generate label: " + error.message);
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const chartData = useMemo(() => {
    const data: any[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      data.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear(), revenue: 0, ordersCount: 0 });
    }
    orders.forEach(order => {
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const target = data.find(item => item.key === key);
      if (target) { target.revenue += Number(order.total_amount) || 0; target.ordersCount += 1; }
    });
    return data;
  }, [orders]);
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 100);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsersList(data);
  };
  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) setUsersList(usersList.map(u => u.id === userId ? { ...u, role: newRole } : u));
    else alert("Error: " + error.message);
  };
  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user?")) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) setUsersList(usersList.filter(u => u.id !== userId));
    else alert("Error: " + error.message);
  };
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { error } = await supabase.from('profiles').insert([{ id: "user-" + Date.now(), ...newUser }]);
      if (error) throw error;
      alert("User added!"); setIsUserModalOpen(false); setNewUser({ first_name: "", last_name: "", email: "", password: "", role: "customer" }); fetchUsers();
    } catch (err: any) { alert("Error: " + err.message); } finally { setLoading(false); }
  };

  const toggleCategoryVisibility = (cat: string) => setVisibleCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const toggleBrandVisibility = (brand: string) => setVisibleBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  
  const handleTierPriceChange = (index: number, method: 'emb' | 'sp', value: string) => {
    const newTiers = [...pricingTiers];
    newTiers[index][method] = Number(value);
    setPricingTiers(newTiers);
  };

  const saveSettings = async () => {
    setLoading(true);
    const { error } = await supabase.from("store_settings").upsert({
      id: "default",
      visible_categories: visibleCategories,
      visible_brands: visibleBrands,
      small_order_fee_threshold: feeThreshold,
      small_order_fee_amount: feeAmount,
      decoration_tiers: pricingTiers
    });
    setLoading(false);
    if (error) alert("Error saving settings: " + error.message);
    else alert("Store settings updated successfully!");
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files?.length) return;
      const file = event.target.files[0];
      setIsUploadingAvatar(true);
      const fileName = `admin-${adminUser.id}-${Math.random()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', adminUser.id);
      setProfile({ ...profile, avatar_url: urlData.publicUrl }); alert("Avatar updated!");
    } catch (error: any) { alert(error.message); } finally { setIsUploadingAvatar(false); }
  };

  const updateAdminProfile = async () => {
    setLoading(true);
    await supabase.from("profiles").update({ first_name: profile.first_name, last_name: profile.last_name }).eq("id", adminUser.id);
    if (password.trim() !== "") await supabase.auth.updateUser({ password });
    alert("Profile saved!"); setLoading(false);
  };
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  if (!mounted || loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen flex bg-gray-50">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-[#111111] text-white flex flex-col fixed h-full z-50">
        <div className="h-20 flex items-center px-6 border-b border-gray-800">
          <h1 className="text-xl font-black uppercase tracking-widest italic">FS Admin<span className="text-blue-500">.</span></h1>
        </div>
        
        <div className="p-6 border-b border-gray-800 flex items-center gap-4">
           <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden border-2 border-gray-600 flex-shrink-0">
             {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-gray-400" />}
           </div>
           <div>
             <p className="text-xs font-bold uppercase tracking-wider">{profile.first_name || "Admin"}</p>
             <p className="text-[9px] text-gray-400">Store Manager</p>
           </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "dashboard" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button onClick={() => setActiveTab("orders")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "orders" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <ShoppingBag size={16} /> Orders
          </button>
          <button onClick={() => setActiveTab("pricing")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "pricing" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <DollarSign size={16} /> Pricing Rules
          </button>
          <button onClick={() => setActiveTab("categories")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "categories" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <FolderTree size={16} /> Shop Filters
          </button>
          <button onClick={() => setActiveTab("users")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "users" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <Users size={16} /> Users
          </button>
          <button onClick={() => setActiveTab("profile")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "profile" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <User size={16} /> Admin Profile
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 ml-64 p-10 min-h-screen">
        
        {/* PESTAÑA: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in duration-500 max-w-5xl">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-8">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Orders</p>
                <p className="text-4xl font-black text-black">{orders.length}</p>
                <ShoppingBag className="absolute -bottom-4 -right-4 w-24 h-24 text-gray-50 opacity-50" />
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Revenue</p>
                <p className="text-4xl font-black text-blue-600">${orders.reduce((sum, o) => sum + Number(o.total_amount), 0).toFixed(2)}</p>
                <BarChart3 className="absolute -bottom-4 -right-4 w-24 h-24 text-blue-50 opacity-50" />
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Pending Processing</p>
                <p className="text-4xl font-black text-amber-500">{orders.filter(o => o.order_status === 'processing').length}</p>
                <Package className="absolute -bottom-4 -right-4 w-24 h-24 text-amber-50 opacity-50" />
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-black uppercase tracking-widest text-black">Revenue Analytics</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1 rounded-full">Last 12 Months</span>
              </div>
              <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 relative pt-10">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-full border-t border-gray-100 border-dashed h-0 flex items-center">
                      <span className="bg-white text-[9px] font-bold text-gray-300 pr-2 -translate-y-1/2 absolute -left-2">${(maxRevenue - (maxRevenue / 3) * i).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                {chartData.map((data) => {
                  const heightPercent = data.revenue > 0 ? (data.revenue / maxRevenue) * 100 : 2; 
                  return (
                    <div key={data.key} className="relative flex-1 flex flex-col items-center group h-full justify-end z-10">
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] font-black px-3 py-2 rounded-lg pointer-events-none flex flex-col items-center whitespace-nowrap shadow-lg">
                        ${data.revenue.toFixed(2)}<span className="text-[8px] font-medium text-gray-400">{data.ordersCount} Orders</span><div className="absolute -bottom-1 w-2 h-2 bg-black rotate-45"></div>
                      </div>
                      <div className="w-full max-w-[40px] bg-blue-100 rounded-t-lg group-hover:bg-blue-600 transition-colors duration-300 relative overflow-hidden cursor-pointer" style={{ height: `calc(${heightPercent}% - 24px)` }}>
                         <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-blue-200/50 to-transparent"></div>
                      </div>
                      <span className="text-[10px] font-black uppercase text-gray-400 mt-3 group-hover:text-black transition-colors">{data.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: ÓRDENES */}
        {activeTab === "orders" && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-8">Manage Orders</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="p-6">Order ID / Date</th>
                    <th className="p-6">Customer</th>
                    <th className="p-6">Total</th>
                    <th className="p-6">Status</th>
                    <th className="p-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-6">
                        <p className="text-xs font-bold text-black uppercase tracking-wider">#{order.id.split('-')[0]}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                      </td>
                      <td className="p-6">
                        <p className="text-xs font-bold text-black">{order.customer_name}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{order.customer_email}</p>
                      </td>
                      <td className="p-6 text-sm font-black text-black">${Number(order.total_amount).toFixed(2)}</td>
                      <td className="p-6">
                        <select 
                          value={order.order_status} onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg outline-none cursor-pointer border bg-gray-50 border-gray-200"
                        >
                          <option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="completed">Completed</option>
                        </select>
                      </td>
                      <td className="p-6 text-right">
                        <button onClick={() => setSelectedOrder(order)} className="p-2 bg-black text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><Eye size={14} /> View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA: REGLAS DE PRECIOS */}
        {activeTab === "pricing" && (
          <div className="animate-in fade-in duration-500 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Pricing Rules</h2>
              <button onClick={saveSettings} className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2">
                <Save size={14} /> Save Pricing
              </button>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 mb-8 flex gap-4 items-start">
              <div className="bg-blue-600 p-2 rounded-full text-white mt-1"><DollarSign size={20} /></div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-900 mb-2">How Pricing Rules Work</h3>
                <p className="text-xs font-medium text-blue-800/80 leading-relaxed max-w-3xl">
                  Here you can dynamically adjust the extra cost added per product based on the decoration method (Embroidery or Screen Print) and the quantity ordered. You can also modify the threshold for the <strong>Small Order Fee</strong>. When you save these changes, the product page and the checkout cart will automatically update their calculations to reflect your new pricing immediately.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Small Order Threshold ($)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" value={feeThreshold} onChange={(e) => setFeeThreshold(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-black outline-none focus:border-blue-600 transition-colors"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Small Order Fee Amount ($)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" value={feeAmount} onChange={(e) => setFeeAmount(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-black outline-none focus:border-blue-600 transition-colors"/>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <h3 className="text-lg font-black uppercase tracking-widest text-black">Decoration Price Tiers</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="p-6">Quantity Range</th>
                    <th className="p-6">Embroidery (EMB) Price Added</th>
                    <th className="p-6">Screen Print (SP) Price Added</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingTiers.map((tier, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-6">
                        <span className="px-4 py-2 bg-gray-100 text-black text-xs font-black rounded-lg">
                          {tier.min} {tier.max === 499 ? "+" : `- ${tier.max}`} items
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="relative w-32">
                          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="number" step="0.01" value={tier.emb} onChange={(e) => handleTierPriceChange(idx, 'emb', e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="relative w-32">
                          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="number" step="0.01" value={tier.sp} onChange={(e) => handleTierPriceChange(idx, 'sp', e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA: USUARIOS */}
        {activeTab === "users" && (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Manage Users</h2>
              <button onClick={() => setIsUserModalOpen(true)} className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2"><UserPlus size={14} /> Add New User</button>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="p-6">User Details</th><th className="p-6">Email Address</th><th className="p-6">Role</th><th className="p-6">Joined Date</th><th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-6 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">{u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-gray-400" />}</div>
                        <div><p className="text-xs font-bold text-black uppercase tracking-wider">{u.first_name || "Unknown"} {u.last_name || ""}</p><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">ID: {u.id.substring(0, 8)}</p></div>
                      </td>
                      <td className="p-6"><p className="text-xs font-bold text-gray-600">{u.email || "No email recorded"}</p></td>
                      <td className="p-6"><select value={u.role || 'customer'} onChange={(e) => updateUserRole(u.id, e.target.value)} disabled={u.id === adminUser.id} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg outline-none cursor-pointer border bg-gray-50 border-gray-200 disabled:opacity-50"><option value="customer">Customer</option><option value="admin">Admin</option></select></td>
                      <td className="p-6"><p className="text-xs font-bold text-gray-500">{new Date(u.created_at).toLocaleDateString()}</p></td>
                      <td className="p-6 text-right"><button onClick={() => deleteUser(u.id)} disabled={u.id === adminUser.id} className="p-2 bg-white border border-gray-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA: CATEGORÍAS Y MARCAS */}
        {activeTab === "categories" && (
          <div className="animate-in fade-in duration-500 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Shop Filters Configuration</h2>
              <button onClick={saveSettings} className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2">
                <Save size={14} /> Save Changes
              </button>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
              <h3 className="text-lg font-black uppercase tracking-widest text-black mb-2">Visible Categories</h3>
              <p className="text-xs font-medium text-gray-500 mb-6">Select which categories should be displayed in the Shop sidebar.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {allCategories.map(cat => (
                  <div key={cat} onClick={() => toggleCategoryVisibility(cat)} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${visibleCategories.includes(cat) ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${visibleCategories.includes(cat) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{visibleCategories.includes(cat) && <Check size={12} strokeWidth={4} />}</div>
                    <span className={`text-xs font-bold uppercase tracking-widest ${visibleCategories.includes(cat) ? 'text-blue-700' : 'text-gray-600'}`}>{cat}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-black uppercase tracking-widest text-black mb-2">Visible Brands</h3>
              <p className="text-xs font-medium text-gray-500 mb-6">Select which brands should be displayed in the Shop sidebar.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                {allBrands.map(brand => (
                  <div key={brand} onClick={() => toggleBrandVisibility(brand)} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${visibleBrands.includes(brand) ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${visibleBrands.includes(brand) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{visibleBrands.includes(brand) && <Check size={10} strokeWidth={4} />}</div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest truncate ${visibleBrands.includes(brand) ? 'text-blue-700' : 'text-gray-600'}`} title={brand}>{brand}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: PERFIL ADMIN */}
        {activeTab === "profile" && (
          <div className="animate-in fade-in duration-500 max-w-2xl">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-8">Admin Profile</h2>
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 space-y-8">
              <div className="flex items-center gap-8 pb-8 border-b border-gray-100">
                <div className="relative w-24 h-24"><div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-200">{profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-400" />}</div><button onClick={() => avatarInputRef.current?.click()} disabled={isUploadingAvatar} className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg disabled:bg-gray-400">{isUploadingAvatar ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={14} />}</button><input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} /></div>
                <div><h3 className="text-lg font-black uppercase tracking-tight text-black">Profile Picture</h3><p className="text-xs font-medium text-gray-400 mt-1">Recommended size: 500x500px. Max 1MB.</p></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">First Name</label><input type="text" value={profile.first_name} onChange={(e) => setProfile({...profile, first_name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"/></div>
                <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Last Name</label><input type="text" value={profile.last_name} onChange={(e) => setProfile({...profile, last_name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"/></div>
                <div className="col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Email Address</label><input type="email" disabled value={adminUser?.email} className="w-full bg-gray-100 border border-transparent rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed"/></div>
                <div className="col-span-2 pt-4"><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-800 block mb-4 flex items-center gap-2"><Lock size={14} /> Security</h4><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">New Password (leave blank to keep current)</label><input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"/></div>
              </div>
              <div className="pt-6"><button onClick={updateAdminProfile} className="w-full py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl">Save Admin Profile</button></div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL DETALLES DE LA ORDEN --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div><h3 className="text-xl font-black uppercase tracking-tighter text-black">Order Details</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">ID: {selectedOrder.id}</p></div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-black hover:bg-gray-200 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              
              {/* ✅ SECCIÓN DE ENVÍO Y UPS (EASYPOST) CON DIMENSIONES Y PESO */}
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-black flex items-center gap-2">
                    <Truck size={18} /> Shipping & Fulfillment
                  </h4>
                  <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${selectedOrder.tracking_number ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedOrder.tracking_number ? 'Label Created' : 'Awaiting Fulfillment'}
                  </span>
                </div>

                {selectedOrder.tracking_number ? (
                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">UPS Tracking Number</p>
                      <a href={selectedOrder.tracking_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline">
                        {selectedOrder.tracking_number}
                      </a>
                    </div>
                    <a 
                      href={selectedOrder.shipping_label_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      🖨️ Print Label
                    </a>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 border-dashed">
                    <p className="text-xs font-bold text-gray-500 mb-6">
                      Ready to ship? Enter the package details to generate a UPS label. Customs forms will be added automatically for international orders.
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Length (in)</label>
                        <input type="number" min="1" value={packageLength} onChange={(e) => setPackageLength(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Width (in)</label>
                        <input type="number" min="1" value={packageWidth} onChange={(e) => setPackageWidth(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Height (in)</label>
                        <input type="number" min="1" value={packageHeight} onChange={(e) => setPackageHeight(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Weight (oz)</label>
                        <input type="number" min="1" value={packageWeight} onChange={(e) => setPackageWeight(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm" />
                      </div>
                    </div>

                    <button 
                      onClick={handleGenerateLabel}
                      disabled={isGeneratingLabel}
                      className="w-full py-4 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingLabel ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Package size={16} />
                      )}
                      {isGeneratingLabel ? "Processing Label..." : "Generate UPS Label"}
                    </button>
                  </div>
                )}
              </div>

              <div className={`grid grid-cols-2 ${selectedOrder.payment_id ? 'md:grid-cols-3' : ''} gap-8 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl`}>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Customer Name</p><p className="text-sm font-bold text-blue-900">{selectedOrder.customer_name}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Contact Email</p><p className="text-sm font-bold text-blue-900">{selectedOrder.customer_email}</p></div>
                {selectedOrder.payment_id && (<div><p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Clover Trans. ID</p><p className="text-sm font-bold text-blue-900 truncate" title={selectedOrder.payment_id}>{selectedOrder.payment_id}</p></div>)}
              </div>

              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-black mb-4 border-b border-gray-100 pb-2">Products ({selectedOrder.order_items?.length})</h4>
                <div className="space-y-4">
                  {selectedOrder.order_items?.map((item: any) => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-2xl flex gap-6 items-start bg-gray-50">
                      {item.custom_logo_url ? (
                        <div className="relative w-20 h-20 bg-white rounded-xl border border-gray-200 p-1 flex-shrink-0 group">
                          <img src={item.custom_logo_url} alt="Logo" className="w-full h-full object-contain" />
                          <a href={item.custom_logo_url} target="_blank" rel="noopener noreferrer" download={`logo-${item.product_id}`} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl" title="Download Logo"><Download size={20} className="text-white" /></a>
                        </div>
                      ) : (<div className="w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 text-[9px] font-black text-gray-400 uppercase">No Logo</div>)}
                      <div className="flex-1">
                        <Link href={`/products/${item.product_id}`} target="_blank" className="text-sm font-black text-black uppercase tracking-tight hover:text-blue-600 hover:underline transition-colors block w-fit">{item.product_name}</Link>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                          <div><span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Size / Color:</span><p className="text-xs font-bold text-gray-800">{item.size} / {item.color}</p></div>
                          <div><span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Qty & Price:</span><p className="text-xs font-bold text-gray-800">{item.quantity} x ${Number(item.unit_price).toFixed(2)}</p></div>
                          <div><span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Decoration:</span><p className="text-xs font-bold text-gray-800">{item.decoration_method}</p></div>
                          <div><span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Location:</span><p className="text-xs font-bold text-gray-800">{item.location}</p></div>
                        </div>
                        {item.extra_comments && (<div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg"><p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Extra Comments / Instructions:</p><p className="text-xs font-medium text-amber-900 italic">"{item.extra_comments}"</p></div>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Paid</p><p className="text-2xl font-black text-black">${Number(selectedOrder.total_amount).toFixed(2)}</p></div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Quick Status Update:</span>
                <select value={selectedOrder.order_status} onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:border-black cursor-pointer shadow-sm">
                  <option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CREAR USUARIO --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setIsUserModalOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="text-xl font-black uppercase tracking-tighter text-black">Create New User</h3><button onClick={() => setIsUserModalOpen(false)} className="p-2 bg-white rounded-full text-gray-400 hover:text-black hover:bg-gray-200 transition-colors"><X size={20}/></button></div>
            <form onSubmit={handleCreateUser} className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">First Name *</label><input type="text" required value={newUser.first_name} onChange={e => setNewUser({...newUser, first_name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"/></div>
                 <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Last Name *</label><input type="text" required value={newUser.last_name} onChange={e => setNewUser({...newUser, last_name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"/></div>
               </div>
               <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Email Address *</label><input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"/></div>
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Password *</label><input type="password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"/></div>
                 <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">User Role</label><select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-widest text-black outline-none focus:border-black transition-colors cursor-pointer"><option value="customer">Customer</option><option value="admin">Admin</option></select></div>
               </div>
               <button type="submit" disabled={loading} className="w-full py-4 mt-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl disabled:opacity-50">{loading ? "Creating..." : "Save User"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 