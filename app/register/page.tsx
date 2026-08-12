"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowRight, AlertCircle, Check, X } from "lucide-react";

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

  // 1. ESTADO DEL HONEYPOT (Anti-Spam)
  const [honeypot, setHoneypot] = useState("");

  // 2. ESTADO DE VALIDACIÓN DE CONTRASEÑA
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Función para validar la contraseña en tiempo real
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, password: val });
    
    setPasswordCriteria({
      length: val.length >= 8,
      uppercase: /[A-Z]/.test(val),
      lowercase: /[a-z]/.test(val),
      number: /[0-9]/.test(val),
      special: /[^A-Za-z0-9]/.test(val),
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // TRAMPA ANTI-SPAM: Si un bot llenó este campo oculto, detenemos la ejecución silenciosamente
    if (honeypot.length > 0) {
      console.log("Bot detectado. Bloqueando registro.");
      setLoading(false);
      return; 
    }

    // VALIDACIÓN DE CONTRASEÑA
    const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
    if (!isPasswordValid) {
      setError("Please ensure your password meets all the security requirements.");
      setLoading(false);
      return;
    }

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
            
            {/* HONEYPOT - Oculto visualmente y para lectores de pantalla */}
            <div className="opacity-0 absolute -z-10 w-0 h-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Leave this field blank</label>
              <input 
                type="text" 
                id="website" 
                name="website" 
                tabIndex={-1} 
                autoComplete="off"
                value={honeypot} 
                onChange={(e) => setHoneypot(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">First Name</label>
                <input 
                  type="text" required
                  value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-300 text-black font-medium placeholder-gray-500 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Last Name</label>
                <input 
                  type="text" required
                  value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-300 text-black font-medium placeholder-gray-500 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Email Address</label>
              <input 
                type="email" required
                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-gray-50 border border-gray-300 text-black font-medium placeholder-gray-500 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Password</label>
              <input 
                type="password" required
                value={formData.password} onChange={handlePasswordChange}
                className="w-full bg-gray-50 border border-gray-300 text-black font-medium placeholder-gray-500 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-colors"
              />
              
              {/* INDICADORES DE SEGURIDAD DE CONTRASEÑA */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${passwordCriteria.length ? 'text-green-600' : 'text-gray-400'}`}>
                  {passwordCriteria.length ? <Check size={12} strokeWidth={3}/> : <X size={12} strokeWidth={3}/>} 8+ Characters
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${passwordCriteria.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                  {passwordCriteria.uppercase ? <Check size={12} strokeWidth={3}/> : <X size={12} strokeWidth={3}/>} 1 Uppercase
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${passwordCriteria.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                  {passwordCriteria.lowercase ? <Check size={12} strokeWidth={3}/> : <X size={12} strokeWidth={3}/>} 1 Lowercase
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${passwordCriteria.number ? 'text-green-600' : 'text-gray-400'}`}>
                  {passwordCriteria.number ? <Check size={12} strokeWidth={3}/> : <X size={12} strokeWidth={3}/>} 1 Number
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider col-span-1 sm:col-span-2 ${passwordCriteria.special ? 'text-green-600' : 'text-gray-400'}`}>
                  {passwordCriteria.special ? <Check size={12} strokeWidth={3}/> : <X size={12} strokeWidth={3}/>} 1 Special Character (@$!%*?&)
                </div>
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full h-14 mt-6 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
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