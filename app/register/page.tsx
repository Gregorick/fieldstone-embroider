"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowRight, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });

      if (authError) throw authError;

      // Si todo sale bien, lo mandamos al login o al dashboard
      alert("Registration successful! Please sign in.");
      router.push("/login");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-white min-h-screen flex flex-col">
      <Header />
      
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black italic mb-2">Create Account<span className="text-blue-600">.</span></h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Join Fieldstone for exclusive benefits</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wide rounded-xl flex items-center gap-2 border border-red-100">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">First Name</label>
                <input 
                  type="text" required
                  value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Last Name</label>
                <input 
                  type="text" required
                  value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:bg-white transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Email Address</label>
              <input 
                type="email" required
                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Password</label>
              <input 
                type="password" required minLength={6}
                value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:bg-white transition-colors"
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full h-14 mt-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <>Create Account <ArrowRight size={14} /></>}
            </button>
          </form>

          <p className="text-center mt-8 text-sm font-medium text-gray-500">
            Already have an account? <Link href="/login" className="text-black font-bold hover:text-blue-600 transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
      
      <Footer />
    </main>
  );
}