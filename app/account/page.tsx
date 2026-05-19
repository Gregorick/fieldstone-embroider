"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { User, MapPin, Package, LogOut, Camera, Save, Plus, Trash2, X } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Estados para el perfil
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    avatar_url: ""
  });

  // Estado para direcciones
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    first_name: "", last_name: "", street: "", city: "", zip: "", phone: ""
  });

  useEffect(() => {
    async function getInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // Cargar Perfil
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profileData) {
        setProfile({
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          avatar_url: profileData.avatar_url || ""
        });
      }

      // Cargar Direcciones
      fetchAddresses(user.id);
      
      setLoading(false);
    }
    getInitialData();
  }, [router]);

  const fetchAddresses = async (userId: string) => {
    const { data } = await supabase.from("addresses").select("*").eq("user_id", userId).order('created_at', { ascending: false });
    if (data) setAddresses(data);
  };

  const updateProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      first_name: profile.first_name,
      last_name: profile.last_name,
      updated_at: new Date()
    }).eq("id", user.id);

    if (error) alert(error.message);
    else alert("Profile updated successfully!");
    setLoading(false);
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("addresses").insert([{ ...newAddress, user_id: user.id }]);
    
    if (error) {
      alert(error.message);
    } else {
      setIsAddingAddress(false);
      setNewAddress({ first_name: "", last_name: "", street: "", city: "", zip: "", phone: "" });
      fetchAddresses(user.id); // Recargar la lista
    }
    setLoading(false);
  };

  const deleteAddress = async (id: string) => {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (!error) {
      setAddresses(addresses.filter(addr => addr.id !== id));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading && !user) return <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <main className="bg-white min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* SIDEBAR DE NAVEGACIÓN */}
          <aside className="w-full lg:w-[280px] space-y-2">
            <div className="p-8 bg-gray-50 rounded-[2.5rem] mb-8 flex flex-col items-center text-center">
              <div className="relative w-24 h-24 mb-4">
                <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-gray-400" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg">
                  <Camera size={14} />
                </button>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-black">
                {profile.first_name ? `${profile.first_name} ${profile.last_name}` : "Fieldstone Member"}
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{user?.email}</p>
            </div>

            <nav className="space-y-1">
              <button onClick={() => setActiveTab("profile")} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "profile" ? "bg-black text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                <User size={18} /> My Profile
              </button>
              <button onClick={() => setActiveTab("addresses")} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "addresses" ? "bg-black text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                <MapPin size={18} /> Addresses
              </button>
              <button onClick={() => setActiveTab("orders")} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "orders" ? "bg-black text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                <Package size={18} /> Orders
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all mt-10">
                <LogOut size={18} /> Logout
              </button>
            </nav>
          </aside>

          {/* CONTENIDO DINÁMICO */}
          <div className="flex-1 bg-white">
            
            {/* PESTAÑA: PERFIL */}
            {activeTab === "profile" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-black italic mb-8">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">First Name</label>
                    <input type="text" value={profile.first_name} onChange={(e) => setProfile({...profile, first_name: e.target.value})} className="w-full text-gray-400 bg-gray-50 border border-transparent rounded-2xl px-6 py-4 text-sm outline-none focus:border-black focus:bg-white transition-all"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Last Name</label>
                    <input type="text" value={profile.last_name} onChange={(e) => setProfile({...profile, last_name: e.target.value})} className="w-full text-gray-400 bg-gray-50 border border-transparent rounded-2xl px-6 py-4 text-sm outline-none focus:border-black focus:bg-white transition-all"/>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Email Address (Login)</label>
                    <input type="email" disabled value={user?.email} className="w-full bg-gray-100 border border-transparent rounded-2xl px-6 py-4 text-sm text-gray-400 outline-none cursor-not-allowed"/>
                  </div>
                </div>
                <button onClick={updateProfile} className="mt-8 flex items-center gap-3 px-10 py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-2xl">
                  {loading ? "Saving..." : "Save Changes"} <Save size={16} />
                </button>
              </div>
            )}

            {/* PESTAÑA: DIRECCIONES */}
            {activeTab === "addresses" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-black italic leading-none">Addresses</h3>
                  {!isAddingAddress && (
                    <button onClick={() => setIsAddingAddress(true)} className="flex items-center text-gray-500 gap-2 px-6 py-3 border-2 border-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all rounded-xl">
                      <Plus size={14} /> Add New
                    </button>
                  )}
                </div>

                {isAddingAddress ? (
                  <form onSubmit={saveAddress} className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 mb-8 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-lg font-black uppercase tracking-tight text-gray-400">New Address</h4>
                      <button type="button" onClick={() => setIsAddingAddress(false)} className="text-gray-400 hover:text-black"><X size={20}/></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" required placeholder="First Name" value={newAddress.first_name} onChange={e => setNewAddress({...newAddress, first_name: e.target.value})} className="w-full text-gray-400 bg-white border border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"/>
                      <input type="text" required placeholder="Last Name" value={newAddress.last_name} onChange={e => setNewAddress({...newAddress, last_name: e.target.value})} className="w-full text-gray-400 bg-white border border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"/>
                      <input type="text" required placeholder="Street Address" value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} className="md:col-span-2 w-full text-gray-400 bg-white border border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"/>
                      <input type="text" required placeholder="City" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="w-full text-gray-400 bg-white border border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"/>
                      <input type="text" required placeholder="ZIP Code" value={newAddress.zip} onChange={e => setNewAddress({...newAddress, zip: e.target.value})} className="w-full text-gray-400 bg-white border border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"/>
                      <input type="tel" required placeholder="Phone Number" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="md:col-span-2 w-full text-gray-400 bg-white border border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"/>
                    </div>
                    <button type="submit" className="mt-6 w-full py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors">
                      {loading ? "Saving..." : "Save Address"}
                    </button>
                  </form>
                ) : addresses.length === 0 ? (
                  <div className="p-20 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                    <MapPin size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-tight">No addresses saved yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map((addr) => (
                      <div key={addr.id} className="p-6 border border-gray-200 rounded-[2rem] relative group hover:border-black transition-colors">
                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-tight mb-2">{addr.first_name} {addr.last_name}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {addr.street}<br/>
                          {addr.city}, {addr.zip}<br/>
                          {addr.phone}
                        </p>
                        <button onClick={() => deleteAddress(addr.id)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white rounded-full p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA: PEDIDOS */}
            {activeTab === "orders" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-black italic mb-8">Recent Orders</h3>
                <div className="p-20 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                    <Package size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-tight">You haven't placed any orders yet.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}