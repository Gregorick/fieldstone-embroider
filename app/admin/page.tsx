"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, ShoppingBag, FolderTree, User, Users, UserPlus,
  LogOut, Search, Eye, Edit, Check, X, Camera, Save, Lock,
  Package, ChevronDown, Download, BarChart3, Trash2, DollarSign, Truck,
  ChevronLeft, ChevronRight, BellRing, ArrowUpRight, Send, AlertTriangle,
  MessageSquare, PanelBottom 
} from "lucide-react";

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

  const [profile, setProfile] = useState({ first_name: "", last_name: "", avatar_url: "" });
  const [password, setPassword] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState(""); 
  
  const [unseenOrders, setUnseenOrders] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  
  const [trackingUrlInput, setTrackingUrlInput] = useState("");
  const [isSendingTracking, setIsSendingTracking] = useState(false);

  const [pendingStatusChange, setPendingStatusChange] = useState<{order: any, newStatus: string} | null>(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [visibleBrands, setVisibleBrands] = useState<string[]>([]);

  const [feeThreshold, setFeeThreshold] = useState<number>(300);
  const [feeAmount, setFeeAmount] = useState<number>(65);
  const [pricingTiers, setPricingTiers] = useState<any[]>(DEFAULT_TIERS);

  const [footerData, setFooterData] = useState({
    companyName: "Fieldstone Embroidery Store",
    address: "Santo Domingo, Distrito Nacional\nDominican Republic",
    email: "dmarra@fieldstoneembroidery.com",
    facebookUrl: "#",
    twitterUrl: "#",
    instagramUrl: "#",
    linkedinUrl: "#"
  });

  const [usersList, setUsersList] = useState<any[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ first_name: "", last_name: "", email: "", password: "", role: "customer" });

  const [contactForms, setContactForms] = useState<any[]>([]);
  const [newsletterForms, setNewsletterForms] = useState<any[]>([]);
  const [activeFormTab, setActiveFormTab] = useState("contacts"); 
  
  const [currentFormPage, setCurrentFormPage] = useState(1);
  const formsPerPage = 20;

  useEffect(() => {
    setMounted(true);
    checkAdminAndLoadData();
  }, []);

  useEffect(() => {
    setCurrentFormPage(1);
  }, [activeFormTab]);

  async function checkAdminAndLoadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data: profileData, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profileError || !profileData || profileData.role !== 'admin') return router.push("/account");

    setAdminUser(user);
    setProfile({ first_name: profileData.first_name || "", last_name: profileData.last_name || "", avatar_url: profileData.avatar_url || "" });

    await fetchOrders();
    fetchUsers();
    fetchFormsData(); 

    const { data: catData } = await supabase.rpc("get_unique_categories");
    if (catData) setAllCategories(catData.map((item: any) => item.category_name));

    const { data: brandData } = await supabase.from("products_unique_styles").select("brand").not("brand", "is", null);
    if (brandData) setAllBrands(Array.from(new Set(brandData.map((item: any) => item.brand))).sort() as string[]);

    const { data: settings } = await supabase.from("store_settings").select("*").eq("id", "default").single();
    if (settings) {
      setVisibleCategories(settings.visible_categories || allCategories);
      setVisibleBrands(settings.visible_brands || allBrands);
      if (settings.small_order_fee_threshold) setFeeThreshold(settings.small_order_fee_threshold);
      if (settings.small_order_fee_amount) setFeeAmount(settings.small_order_fee_amount);
      if (settings.decoration_tiers) setPricingTiers(settings.decoration_tiers);
      
      setFooterData({
        companyName: settings.footer_company_name || "Fieldstone Embroidery Store",
        address: settings.footer_address || "Santo Domingo, Distrito Nacional\nDominican Republic",
        email: settings.footer_email || "dmarra@fieldstoneembroidery.com",
        facebookUrl: settings.footer_facebook_url || "#",
        twitterUrl: settings.footer_twitter_url || "#",
        instagramUrl: settings.footer_instagram_url || "#",
        linkedinUrl: settings.footer_linkedin_url || "#"
      });
    }

    setLoading(false);
  }

  const fetchOrders = async () => {
    try {
      const res = await fetch('/fieldstone-embroider/api/admin-data?type=orders');
      const { data } = await res.json();
      if (data) {
        setOrders(data);
        const viewedIds = JSON.parse(localStorage.getItem("viewed_order_ids") || "[]");
        const freshOrders = data.filter((o: any) => !viewedIds.includes(o.id));
        setUnseenOrders(freshOrders);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/fieldstone-embroider/api/admin-data?type=users');
      const { data } = await res.json();
      if (data) setUsersList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFormsData = async () => {
    try {
      const { data: contacts } = await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
      if (contacts) setContactForms(contacts);

      const { data: newsletters } = await supabase.from("newsletter_subscriptions").select("*").order("created_at", { ascending: false });
      if (newsletters) setNewsletterForms(newsletters);
    } catch (err) {
      console.error(err);
    }
  };

  const exportToCSV = (data: any[], filename: string, columns: {header: string, key: string}[]) => {
    if (data.length === 0) return alert("No data to export");
    const csvRows = [];
    csvRows.push(columns.map(c => c.header).join(','));
    
    data.forEach(row => {
      const values = columns.map(c => {
        let val = row[c.key] ? row[c.key].toString() : '';
        val = val.replace(/"/g, '""'); 
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportNewsletterToCSV = () => {
    const authorizedSubscribers = newsletterForms.filter(sub => sub.authorized === true);
    if (authorizedSubscribers.length === 0) {
      return alert("No authorized subscribers to export.");
    }
    exportToCSV(authorizedSubscribers, 'newsletter_authorized_subscribers.csv', [
      {header: 'Date', key: 'created_at'}, 
      {header: 'Email', key: 'email'}
    ]);
  };

  // 🟢 FUNCIÓN PARA ELIMINAR MENSAJES DE CONTACTO
  const deleteContactMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
      if (error) throw error;
      setContactForms(prev => prev.filter(msg => msg.id !== id));
    } catch (err: any) {
      alert("Error deleting message: " + err.message);
    }
  };

  // 🟢 FUNCIÓN PARA ELIMINAR SUSCRIPTORES DEL NEWSLETTER
  const deleteNewsletterSubscriber = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscriber?")) return;
    try {
      const { error } = await supabase.from("newsletter_subscriptions").delete().eq("id", id);
      if (error) throw error;
      setNewsletterForms(prev => prev.filter(sub => sub.id !== id));
    } catch (err: any) {
      alert("Error deleting subscriber: " + err.message);
    }
  };

  const handleOpenOrder = (order: any) => {
    setSelectedOrder(order);
    setTrackingUrlInput("");
    
    if (unseenOrders.some(o => o.id === order.id)) {
      const updatedUnseen = unseenOrders.filter(o => o.id !== order.id);
      setUnseenOrders(updatedUnseen);
      
      const viewedIds = JSON.parse(localStorage.getItem("viewed_order_ids") || "[]");
      if (!viewedIds.includes(order.id)) {
        viewedIds.push(order.id);
        localStorage.setItem("viewed_order_ids", JSON.stringify(viewedIds));
      }
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch('/fieldstone-embroider/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_order', payload: { orderId, status: newStatus } })
      });
      const { success, error } = await res.json();
      
      if (success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
        if (selectedOrder && selectedOrder.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, order_status: newStatus }));
      } else {
        alert("Error updating order: " + error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChangeClick = (order: any, newStatus: string) => {
    if (['shipped', 'delivered', 'completed'].includes(newStatus)) {
      setPendingStatusChange({ order, newStatus });
    } else {
      updateOrderStatus(order.id, newStatus);
    }
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    setIsStatusUpdating(true);
    
    const { order, newStatus } = pendingStatusChange;
    await updateOrderStatus(order.id, newStatus);

    try {
      await fetch('/fieldstone-embroider/api/notify-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: order.id, 
          status: newStatus,
          email: order.customer_email,
          name: order.customer_name,
          trackingUrl: order.tracking_url
        })
      });
    } catch (err) {
      console.error("Error trigger email", err);
    }

    setIsStatusUpdating(false);
    setPendingStatusChange(null);
  };

  const cancelStatusChange = () => {
    setPendingStatusChange(null);
  };

  const handleSendTracking = async () => {
    if (!trackingUrlInput.trim()) return alert("Please paste the tracking link.");
    
    setIsSendingTracking(true);
    try {
      const res = await fetch('/fieldstone-embroider/api/easypost', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: selectedOrder.id, 
          trackingUrl: trackingUrlInput.trim() 
        }) 
      });
      
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to update tracking.");
      
      setSelectedOrder({ 
        ...selectedOrder, 
        tracking_url: trackingUrlInput.trim(), 
        order_status: 'shipped' 
      });
      
      fetchOrders(); 
      setTrackingUrlInput("");
      alert("Success! The customer has been notified and the order is marked as Shipped.");
    } catch (error: any) { 
      alert("Error: " + error.message); 
    } finally { 
      setIsSendingTracking(false); 
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

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const lowerQuery = searchQuery.toLowerCase();
    return orders.filter(o => 
      (o.payment_id && o.payment_id.toLowerCase().includes(lowerQuery)) ||
      (o.id && o.id.toLowerCase().includes(lowerQuery)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(lowerQuery)) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(lowerQuery))
    );
  }, [orders, searchQuery]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ordersPerPage;
    return filteredOrders.slice(start, start + ordersPerPage);
  }, [filteredOrders, currentPage]);

  const totalContactPages = Math.ceil(contactForms.length / formsPerPage) || 1;
  const paginatedContacts = useMemo(() => {
    const start = (currentFormPage - 1) * formsPerPage;
    return contactForms.slice(start, start + formsPerPage);
  }, [contactForms, currentFormPage]);

  const totalNewsletterPages = Math.ceil(newsletterForms.length / formsPerPage) || 1;
  const paginatedNewsletters = useMemo(() => {
    const start = (currentFormPage - 1) * formsPerPage;
    return newsletterForms.slice(start, start + formsPerPage);
  }, [newsletterForms, currentFormPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/fieldstone-embroider/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', payload: { userId, role: newRole } })
      });
      const { success, error } = await res.json();
      if (success) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else alert("Error: " + error);
    } catch (err) { console.error(err); }
  };
  
  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch('/fieldstone-embroider/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', payload: { userId } })
      });
      const { success, error } = await res.json();
      if (success) {
        setUsersList(prev => prev.filter(u => u.id !== userId));
      } else alert("Error: " + error);
    } catch (err) { console.error(err); }
  };
  
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch('/fieldstone-embroider/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_user', payload: newUser })
      });
      const { success, error } = await res.json();
      
      if (!success) throw new Error(error);
      
      alert("User successfully added and registered in Auth!"); 
      setIsUserModalOpen(false); 
      setNewUser({ first_name: "", last_name: "", email: "", password: "", role: "customer" }); 
      fetchUsers();
    } catch (err: any) { 
      alert("Error: " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const toggleCategoryVisibility = (cat: string) => setVisibleCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const toggleBrandVisibility = (brand: string) => setVisibleBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  
  const handleTierPriceChange = (index: number, method: 'emb' | 'sp', value: string) => { 
    const newTiers = [...pricingTiers]; 
    newTiers[index][method] = Number(value); 
    setPricingTiers(newTiers); 
  };

  const handleTierRangeChange = (index: number, field: 'min' | 'max', value: string) => {
    const newTiers = [...pricingTiers];
    newTiers[index][field] = Number(value);
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
      decoration_tiers: pricingTiers,
      footer_company_name: footerData.companyName,
      footer_address: footerData.address,
      footer_email: footerData.email,
      footer_facebook_url: footerData.facebookUrl,
      footer_twitter_url: footerData.twitterUrl,
      footer_instagram_url: footerData.instagramUrl,
      footer_linkedin_url: footerData.linkedinUrl
    });
    setLoading(false);
    if (error) alert("Error saving settings: " + error.message); else alert("Store settings updated successfully!");
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files?.length) return;
      setIsUploadingAvatar(true);
      const file = event.target.files[0];
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
             {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : <User className="w-full h-full p-2 text-gray-400" />}
           </div>
           <div>
             <p className="text-xs font-bold uppercase tracking-wider">{profile.first_name || "Admin"}</p>
             <p className="text-[9px] text-gray-400">Store Manager</p>
           </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "dashboard" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}><LayoutDashboard size={16} /> Dashboard</button>
          <button onClick={() => setActiveTab("orders")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "orders" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}><ShoppingBag size={16} /> Orders</button>
          <button onClick={() => setActiveTab("pricing")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "pricing" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}><DollarSign size={16} /> Pricing Rules</button>
          <button onClick={() => setActiveTab("categories")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "categories" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}><FolderTree size={16} /> Shop Filters</button>
          <button onClick={() => setActiveTab("footer")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "footer" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}><PanelBottom size={16} /> Footer Details</button>
          <button onClick={() => setActiveTab("users")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "users" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}><Users size={16} /> Users</button>
          <button onClick={() => setActiveTab("forms")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "forms" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}><MessageSquare size={16} /> Form Data</button>
          <button onClick={() => setActiveTab("profile")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === "profile" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}><User size={16} /> Admin Profile</button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"><LogOut size={16} /> Logout</button>
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
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
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

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <BellRing size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-widest text-black">New Order Alerts</h3>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Unseen live incoming store orders</p>
                  </div>
                </div>
                {unseenOrders.length > 0 && (
                  <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">
                    {unseenOrders.length} New
                  </span>
                )}
              </div>

              {unseenOrders.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  <Package size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No new incoming orders right now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unseenOrders.map(order => (
                    <div key={order.id} className="p-5 bg-gradient-to-r from-blue-50/40 to-white border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                          <h4 className="text-xs font-black text-black uppercase tracking-wider">
                            Order: #{order.id.split('-')[0]}
                          </h4>
                          <span className="text-[9px] font-black uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                            ${Number(order.total_amount).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-800">{order.customer_name} <span className="text-gray-500 font-normal">({order.customer_email})</span></p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
                      </div>

                      <button 
                        onClick={() => handleOpenOrder(order)}
                        className="px-5 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Eye size={14} /> View Details & Mark Read
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA: ÓRDENES */}
        {activeTab === "orders" && (
          <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Manage Orders</h2>
              
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Trans ID, Order ID, Customer..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-black outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <th className="p-6">Order Info</th>
                    <th className="p-6">Customer</th>
                    <th className="p-6">Total</th>
                    <th className="p-6">Status</th>
                    <th className="p-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 text-sm font-medium">
                        No orders found matching "{searchQuery}"
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map(order => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-6">
                          <p className="text-xs font-bold text-black uppercase tracking-wider mb-1">
                            Order: #{order.id.split('-')[0]}
                          </p>
                          
                          <div className="flex items-center gap-1.5 mb-2">
                             <div className={`w-2 h-2 rounded-full shadow-sm ${order.payment_id ? 'bg-blue-500' : 'bg-amber-400'}`}></div>
                             <p className={`text-[10px] font-black uppercase tracking-widest ${order.payment_id ? 'text-blue-700' : 'text-amber-700'}`}>
                               CLOVER ID: {order.payment_id || "PENDIENTE"}
                             </p>
                          </div>

                          <p className="text-[10px] text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-bold text-black">{order.customer_name}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{order.customer_email}</p>
                        </td>
                        <td className="p-6 text-sm font-black text-black">${Number(order.total_amount).toFixed(2)}</td>
                        <td className="p-6">
                          <select 
                            value={order.order_status} onChange={(e) => handleStatusChangeClick(order, e.target.value)}
                            className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg outline-none cursor-pointer border bg-white border-gray-300 text-black shadow-sm focus:border-black focus:ring-1 focus:ring-black transition-all hover:bg-gray-50"
                          >
                            <option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="p-6 text-right">
                          <button onClick={() => handleOpenOrder(order)} className="p-2 bg-black text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><Eye size={14} /> View</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filteredOrders.length > 0 && (
                <div className="p-6 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Showing <span className="text-black font-black">{((currentPage - 1) * ordersPerPage) + 1}</span> to <span className="text-black font-black">{Math.min(currentPage * ordersPerPage, filteredOrders.length)}</span> of <span className="text-black font-black">{filteredOrders.length}</span> orders
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <span className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-white border border-gray-300 text-black rounded-xl shadow-sm">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA: REGLAS DE PRECIOS */}
        {activeTab === "pricing" && (
          <div className="animate-in fade-in duration-500 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Pricing Rules</h2>
              <button onClick={saveSettings} className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2">
                <Save size={14} /> Save Pricing
              </button>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-200 mb-8 flex gap-4 items-start">
              <div className="bg-blue-600 p-2 rounded-full text-white mt-1"><DollarSign size={20} /></div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-900 mb-2">How Pricing Rules Work</h3>
                <p className="text-xs font-medium text-blue-800/80 leading-relaxed max-w-3xl">
                  Here you can dynamically adjust the extra cost added per product based on the decoration method (Embroidery or Screen Print) and modify both the quantity range bounds and the Small Order Fee threshold.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Small Order Threshold ($)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="number" value={feeThreshold} onChange={(e) => setFeeThreshold(Number(e.target.value))} className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Small Order Fee Amount ($)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="number" value={feeAmount} onChange={(e) => setFeeAmount(Number(e.target.value))} className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-black uppercase tracking-widest text-black">Decoration Price Tiers & Quantity Ranges</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <th className="p-6">Quantity Range (Min - Max)</th>
                    <th className="p-6">Embroidery (EMB) Price Added</th>
                    <th className="p-6">Screen Print (SP) Price Added</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingTiers.map((tier, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={tier.min} 
                            onChange={(e) => handleTierRangeChange(idx, 'min', e.target.value)} 
                            className="w-20 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-600 text-center shadow-sm"
                          />
                          <span className="text-gray-500 font-black">to</span>
                          <input 
                            type="number" 
                            value={tier.max} 
                            onChange={(e) => handleTierRangeChange(idx, 'max', e.target.value)} 
                            className="w-20 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-600 text-center shadow-sm"
                          />
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">items</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="relative w-32">
                          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input type="number" step="0.01" value={tier.emb} onChange={(e) => handleTierPriceChange(idx, 'emb', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="relative w-32">
                          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input type="number" step="0.01" value={tier.sp} onChange={(e) => handleTierPriceChange(idx, 'sp', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA: CATEGORÍAS */}
        {activeTab === "categories" && (
          <div className="animate-in fade-in duration-500 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Shop Filters Configuration</h2>
              <button onClick={saveSettings} className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2">
                <Save size={14} /> Save Changes
              </button>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 mb-8">
              <h3 className="text-lg font-black uppercase tracking-widest text-black mb-2">Visible Categories</h3>
              <p className="text-xs font-medium text-gray-500 mb-6">Select which categories should be displayed in the Shop sidebar.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {allCategories.map(cat => (
                  <div key={cat} onClick={() => toggleCategoryVisibility(cat)} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${visibleCategories.includes(cat) ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${visibleCategories.includes(cat) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{visibleCategories.includes(cat) && <Check size={12} strokeWidth={4} />}</div>
                    <span className={`text-xs font-bold uppercase tracking-widest ${visibleCategories.includes(cat) ? 'text-blue-700' : 'text-gray-800'}`}>{cat}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-black uppercase tracking-widest text-black mb-2">Visible Brands</h3>
              <p className="text-xs font-medium text-gray-500 mb-6">Select which brands should be displayed in the Shop sidebar.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                {allBrands.map(brand => (
                  <div key={brand} onClick={() => toggleBrandVisibility(brand)} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${visibleBrands.includes(brand) ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${visibleBrands.includes(brand) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{visibleBrands.includes(brand) && <Check size={10} strokeWidth={4} />}</div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest truncate ${visibleBrands.includes(brand) ? 'text-blue-700' : 'text-gray-800'}`} title={brand}>{brand}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- NUEVA PESTAÑA: FOOTER SETTINGS --- */}
        {activeTab === "footer" && (
          <div className="animate-in fade-in duration-500 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Footer Details</h2>
              <button onClick={saveSettings} className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2">
                <Save size={14} /> Save Footer
              </button>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 mb-8 space-y-6">
              <div>
                <h3 className="text-lg font-black uppercase tracking-widest text-black mb-1">Company Contact Info</h3>
                <p className="text-xs font-medium text-gray-500 mb-6">This information will be displayed in the first column of the footer.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Company Name</label>
                  <input type="text" value={footerData.companyName} onChange={e => setFooterData({...footerData, companyName: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                </div>
                
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Physical Address (Use Shift+Enter for new line)</label>
                  <textarea rows={3} value={footerData.address} onChange={e => setFooterData({...footerData, address: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Contact Email</label>
                  <input type="email" value={footerData.email} onChange={e => setFooterData({...footerData, email: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 space-y-6">
              <div>
                <h3 className="text-lg font-black uppercase tracking-widest text-black mb-1">Social Media Links</h3>
                <p className="text-xs font-medium text-gray-500 mb-6">Enter the full URLs for your social media profiles. Leave as "#" if you don't have one.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Facebook URL</label>
                  <input type="url" value={footerData.facebookUrl} onChange={e => setFooterData({...footerData, facebookUrl: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-blue-600 outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Twitter / X URL</label>
                  <input type="url" value={footerData.twitterUrl} onChange={e => setFooterData({...footerData, twitterUrl: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-blue-600 outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Instagram URL</label>
                  <input type="url" value={footerData.instagramUrl} onChange={e => setFooterData({...footerData, instagramUrl: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-blue-600 outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">LinkedIn URL</label>
                  <input type="url" value={footerData.linkedinUrl} onChange={e => setFooterData({...footerData, linkedinUrl: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-blue-600 outline-none focus:border-blue-600 transition-colors shadow-sm"/>
                </div>
              </div>
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
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <th className="p-6">User Details</th><th className="p-6">Email Address</th><th className="p-6">Role</th><th className="p-6">Joined Date</th><th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-6 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-300 overflow-hidden flex-shrink-0">{u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-gray-500" />}</div>
                        <div><p className="text-xs font-bold text-black uppercase tracking-wider">{u.first_name || "Unknown"} {u.last_name || ""}</p><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">ID: {u.id.substring(0, 8)}</p></div>
                      </td>
                      <td className="p-6"><p className="text-xs font-bold text-gray-800">{u.email || "No email recorded"}</p></td>
                      <td className="p-6">
                        <select value={u.role || 'customer'} onChange={(e) => updateUserRole(u.id, e.target.value)} disabled={u.id === adminUser.id} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg outline-none cursor-pointer border bg-white border-gray-300 text-black shadow-sm focus:border-black focus:ring-1 focus:ring-black transition-all hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500">
                          <option value="customer">Customer</option><option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-6"><p className="text-xs font-bold text-gray-600">{new Date(u.created_at).toLocaleDateString()}</p></td>
                      <td className="p-6 text-right"><button onClick={() => deleteUser(u.id)} disabled={u.id === adminUser.id} className="p-2 bg-white border border-gray-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA: FORM DATA */}
        {activeTab === "forms" && (
          <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black">Form Submissions</h2>
              
              {activeFormTab === "contacts" ? (
                <button 
                  onClick={() => exportToCSV(contactForms, 'contact_messages.csv', [
                    {header: 'Date', key: 'created_at'}, {header: 'Name', key: 'name'}, {header: 'Email', key: 'email'}, {header: 'Phone', key: 'phone'}, {header: 'Message', key: 'message'}
                  ])}
                  className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2"
                >
                  <Download size={14} /> Export Contacts to CSV
                </button>
              ) : (
                <button 
                  onClick={exportNewsletterToCSV} // 🟢 USAMOS LA NUEVA FUNCIÓN AQUI
                  className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors shadow-lg flex items-center gap-2"
                >
                  <Download size={14} /> Export Authorized to CSV
                </button>
              )}
            </div>

            <div className="flex gap-4 mb-6 border-b border-gray-200">
              <button 
                onClick={() => setActiveFormTab("contacts")} 
                className={`pb-4 px-2 text-[11px] font-black uppercase tracking-widest transition-all ${activeFormTab === "contacts" ? "border-b-2 border-black text-black" : "text-gray-400 hover:text-gray-700"}`}
              >
                Contact Us Messages ({contactForms.length})
              </button>
              <button 
                onClick={() => setActiveFormTab("newsletters")} 
                className={`pb-4 px-2 text-[11px] font-black uppercase tracking-widest transition-all ${activeFormTab === "newsletters" ? "border-b-2 border-black text-black" : "text-gray-400 hover:text-gray-700"}`}
              >
                Newsletter Subscribers ({newsletterForms.length})
              </button>
            </div>

            {activeFormTab === "contacts" && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500"><th className="p-6">Date</th><th className="p-6">Sender Details</th><th className="p-6">Message</th><th className="p-6 text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {paginatedContacts.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-sm font-medium">No messages found.</td></tr>
                    ) : (
                      paginatedContacts.map(form => (
                        <tr key={form.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-6 align-top">
                            <p className="text-[10px] font-bold text-gray-500 whitespace-nowrap">{new Date(form.created_at).toLocaleString()}</p>
                          </td>
                          <td className="p-6 align-top">
                            <p className="text-xs font-black text-black">{form.name}</p>
                            <p className="text-[11px] font-bold text-blue-600 mt-1"><a href={`mailto:${form.email}`}>{form.email}</a></p>
                            <p className="text-[10px] font-bold text-gray-500 mt-1">{form.phone}</p>
                          </td>
                          <td className="p-6 align-top max-w-lg">
                            <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap">{form.message}</p>
                          </td>
                          <td className="p-6 align-top text-right">
                            <button onClick={() => deleteContactMessage(form.id)} className="p-2 bg-white border border-gray-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors shadow-sm" title="Delete Message"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* PAGINACIÓN CONTACTOS */}
                {contactForms.length > 0 && (
                  <div className="p-6 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Showing <span className="text-black font-black">{((currentFormPage - 1) * formsPerPage) + 1}</span> to <span className="text-black font-black">{Math.min(currentFormPage * formsPerPage, contactForms.length)}</span> of <span className="text-black font-black">{contactForms.length}</span> messages
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentFormPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentFormPage === 1}
                        className="p-2 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-white border border-gray-300 text-black rounded-xl shadow-sm">
                        Page {currentFormPage} of {totalContactPages}
                      </span>
                      <button 
                        onClick={() => setCurrentFormPage(prev => Math.min(prev + 1, totalContactPages))}
                        disabled={currentFormPage === totalContactPages}
                        className="p-2 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeFormTab === "newsletters" && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden max-w-4xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500">
                      <th className="p-6">Subscribed Date</th><th className="p-6">Email Address</th><th className="p-6 text-center">Authorized</th><th className="p-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedNewsletters.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-sm font-medium">No subscribers found.</td></tr>
                    ) : (
                      paginatedNewsletters.map(sub => (
                        <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-6">
                            <p className="text-[10px] font-bold text-gray-500">{new Date(sub.created_at).toLocaleString()}</p>
                          </td>
                          <td className="p-6">
                            <p className="text-sm font-bold text-black">{sub.email}</p>
                          </td>
                          <td className="p-6 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${sub.authorized ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {sub.authorized ? "YES" : "NO"}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                            <button onClick={() => deleteNewsletterSubscriber(sub.id)} className="p-2 bg-white border border-gray-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors shadow-sm" title="Delete Subscriber"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* PAGINACIÓN NEWSLETTER */}
                {newsletterForms.length > 0 && (
                  <div className="p-6 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Showing <span className="text-black font-black">{((currentFormPage - 1) * formsPerPage) + 1}</span> to <span className="text-black font-black">{Math.min(currentFormPage * formsPerPage, newsletterForms.length)}</span> of <span className="text-black font-black">{newsletterForms.length}</span> subscribers
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentFormPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentFormPage === 1}
                        className="p-2 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-white border border-gray-300 text-black rounded-xl shadow-sm">
                        Page {currentFormPage} of {totalNewsletterPages}
                      </span>
                      <button 
                        onClick={() => setCurrentFormPage(prev => Math.min(prev + 1, totalNewsletterPages))}
                        disabled={currentFormPage === totalNewsletterPages}
                        className="p-2 rounded-xl border border-gray-300 bg-white text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: PERFIL */}
        {activeTab === "profile" && (
          <div className="animate-in fade-in duration-500 max-w-2xl">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-8">Admin Profile</h2>
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200 space-y-8">
              <div className="flex items-center gap-8 pb-8 border-b border-gray-200">
                <div className="relative w-24 h-24"><div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-300">{profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-400" />}</div><button onClick={() => avatarInputRef.current?.click()} disabled={isUploadingAvatar} className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg disabled:bg-gray-400">{isUploadingAvatar ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={14} />}</button><input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} /></div>
                <div><h3 className="text-lg font-black uppercase tracking-tight text-black">Profile Picture</h3><p className="text-xs font-medium text-gray-500 mt-1">Recommended size: 500x500px. Max 1MB.</p></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">First Name</label><input type="text" value={profile.first_name} onChange={(e) => setProfile({...profile, first_name: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-black transition-colors"/></div>
                <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Last Name</label><input type="text" value={profile.last_name} onChange={(e) => setProfile({...profile, last_name: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-black transition-colors"/></div>
                <div className="col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Email Address</label><input type="email" disabled value={adminUser?.email} className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed"/></div>
                <div className="col-span-2 pt-4"><h4 className="text-[10px] font-black uppercase tracking-widest text-gray-800 block mb-4 flex items-center gap-2"><Lock size={14} /> Security</h4><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">New Password (leave blank to keep current)</label><input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-black transition-colors"/></div>
              </div>
              <div className="pt-6"><button onClick={updateAdminProfile} className="w-full py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl">Save Admin Profile</button></div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL ORDEN */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div><h3 className="text-xl font-black uppercase tracking-tighter text-black">Order Details</h3><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">ID: {selectedOrder.id}</p></div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-white rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition-colors shadow-sm"><X size={20}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              
              <div className="bg-gray-50 border border-gray-300 p-6 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-black flex items-center gap-2">
                    <Truck size={18} /> Shipping & Fulfillment
                  </h4>
                  <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${selectedOrder.tracking_url ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {selectedOrder.tracking_url ? 'Tracking Sent' : 'Awaiting Tracking'}
                  </span>
                </div>

                {selectedOrder.tracking_url ? (
                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-300 shadow-sm">
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Tracking Link</p>
                      <a href={selectedOrder.tracking_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline">
                        {selectedOrder.tracking_url.length > 50 ? selectedOrder.tracking_url.substring(0, 50) + "..." : selectedOrder.tracking_url}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-xl border border-gray-300 border-dashed">
                    <p className="text-xs font-bold text-gray-600 mb-6">
                      Ready to ship? Paste the tracking link below to notify the customer.
                    </p>
                    
                    <div className="mb-6">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Tracking URL *</label>
                      <input 
                        type="url" 
                        value={trackingUrlInput} 
                        onChange={(e) => setTrackingUrlInput(e.target.value)} 
                        placeholder="https://www.ups.com/track?loc=en_US&tracknum=..."
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-sm font-bold text-black outline-none focus:border-blue-600 transition-colors shadow-sm" 
                      />
                    </div>

                    <button 
                      onClick={handleSendTracking}
                      disabled={isSendingTracking || !trackingUrlInput.trim()}
                      className="w-full py-4 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSendingTracking ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      {isSendingTracking ? "Sending Notification..." : "Send Tracking to Customer"}
                    </button>
                  </div>
                )}
              </div>

              <div className={`grid grid-cols-2 ${selectedOrder.payment_id ? 'md:grid-cols-3' : ''} gap-8 p-6 bg-blue-50/50 border border-blue-200 rounded-2xl`}>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Customer Name</p><p className="text-sm font-bold text-blue-900">{selectedOrder.customer_name}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Contact Email</p><p className="text-sm font-bold text-blue-900">{selectedOrder.customer_email}</p></div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Clover Trans. ID</p>
                   <p className="text-sm font-bold text-blue-900 truncate" title={selectedOrder.payment_id}>
                     {selectedOrder.payment_id || "PENDIENTE"}
                   </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-black mb-4 border-b border-gray-200 pb-2">Products ({selectedOrder.order_items?.length || 0})</h4>
                <div className="space-y-4">
                  {selectedOrder.order_items?.map((item: any) => (
                    <div key={item.id} className="p-4 border border-gray-300 rounded-2xl flex gap-6 items-start bg-gray-50 shadow-sm">
                      {item.custom_logo_url ? (
                        <div className="relative w-20 h-20 bg-white rounded-xl border border-gray-300 p-1 flex-shrink-0 group">
                          <img src={item.custom_logo_url} alt="Logo" className="w-full h-full object-contain" />
                          <a href={item.custom_logo_url} target="_blank" rel="noopener noreferrer" download={`logo-${item.product_id}`} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl" title="Download Logo"><Download size={20} className="text-white" /></a>
                        </div>
                      ) : (<div className="w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 text-[9px] font-black text-gray-500 uppercase border border-gray-300">No Logo</div>)}
                      <div className="flex-1">
                        <Link href={`/products/${item.product_id}`} target="_blank" className="text-sm font-black text-black uppercase tracking-tight hover:text-blue-600 hover:underline transition-colors block w-fit">{item.product_name}</Link>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                          <div><span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Size / Color:</span><p className="text-xs font-bold text-gray-900">{item.size} / {item.color}</p></div>
                          <div><span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Qty & Price:</span><p className="text-xs font-bold text-gray-900">{item.quantity} x ${Number(item.unit_price).toFixed(2)}</p></div>
                          <div><span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Decoration:</span><p className="text-xs font-bold text-gray-900">{item.decoration_method}</p></div>
                          <div><span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Locations:</span><p className="text-xs font-bold text-gray-900">{item.location}</p></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Paid</p><p className="text-2xl font-black text-black">${Number(selectedOrder.total_amount).toFixed(2)}</p></div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Quick Status Update:</span>
                <select value={selectedOrder.order_status} onChange={(e) => handleStatusChangeClick(selectedOrder, e.target.value)} className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-xs font-bold uppercase tracking-widest text-black outline-none focus:border-black focus:ring-1 focus:ring-black cursor-pointer shadow-sm hover:bg-gray-50 transition-all">
                  <option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL USUARIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setIsUserModalOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50"><h3 className="text-xl font-black uppercase tracking-tighter text-black">Create New User</h3><button onClick={() => setIsUserModalOpen(false)} className="p-2 bg-white rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition-colors shadow-sm"><X size={20}/></button></div>
            <form onSubmit={handleCreateUser} className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">First Name *</label><input type="text" required value={newUser.first_name} onChange={e => setNewUser({...newUser, first_name: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-black transition-colors"/></div>
                 <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Last Name *</label><input type="text" required value={newUser.last_name} onChange={e => setNewUser({...newUser, last_name: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-black transition-colors"/></div>
               </div>
               <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Email Address *</label><input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-black transition-colors"/></div>
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Password *</label><input type="password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-black transition-colors"/></div>
                 <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">User Role</label>
                   <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-widest text-black outline-none focus:border-black transition-colors cursor-pointer">
                     <option value="customer">Customer</option><option value="admin">Admin</option>
                   </select>
                 </div>
               </div>
               <button type="submit" disabled={loading} className="w-full py-4 mt-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl disabled:opacity-50">{loading ? "Creating..." : "Save User"}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ADVERTENCIA PARA CAMBIO DE ESTADO MANUAL */}
      {pendingStatusChange && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-amber-500" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-black mb-2">Warning</h3>
            <p className="text-[11px] font-bold text-gray-500 mb-8 uppercase tracking-widest leading-relaxed">
              CHANGING THE STATUS TO <span className="text-black font-black">"{pendingStatusChange.newStatus}"</span> WILL AUTOMATICALLY SEND AN EMAIL NOTIFICATION TO THE CUSTOMER. DO YOU WANT TO PROCEED?
            </p>
            <div className="flex w-full gap-3">
              <button 
                onClick={cancelStatusChange} 
                disabled={isStatusUpdating}
                className="flex-1 py-4 bg-gray-100 text-gray-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                I Disagree
              </button>
              <button 
                onClick={confirmStatusChange} 
                disabled={isStatusUpdating}
                className="flex-1 py-4 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors shadow-lg disabled:opacity-50 flex justify-center items-center"
              >
                {isStatusUpdating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "I Agree"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 