"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Login exitoso, enviamos al dashboard (lo crearemos en la Fase 2)
      router.push("/account");
      
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
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black italic mb-2">Welcome Back<span className="text-blue-600">.</span></h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wide rounded-xl flex items-center gap-2 border border-red-100">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Email Address</label>
              <input 
                type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:bg-white transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Password</label>
                <Link href="#" className="text-[10px] font-bold text-gray-400 hover:text-black">Forgot Password?</Link>
              </div>
              <input 
                type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:bg-white transition-colors"
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full h-14 mt-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <>Sign In <ArrowRight size={14} /></>}
            </button>
          </form>

          <p className="text-center mt-8 text-sm font-medium text-gray-500">
            Don't have an account? <Link href="/register" className="text-black font-bold hover:text-blue-600 transition-colors">Create one</Link>
          </p>
        </div>
      </div>
      
      <Footer />
    </main>
  );
}