"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/fieldstone-embroider/update-password`,
      });

      if (error) throw error;
      setSuccess(true);
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
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black italic mb-2">Reset Password<span className="text-blue-600">.</span></h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Enter your email to receive a reset link</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wide rounded-xl flex items-center gap-2 border border-red-100">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {success ? (
            <div className="p-8 bg-green-50 border border-green-200 rounded-3xl text-center">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-black uppercase tracking-widest text-green-900 mb-2">Check your email</h3>
              <p className="text-xs font-medium text-green-700 leading-relaxed mb-6">We have sent a password reset link to <strong>{email}</strong>.</p>
              <Link href="/login" className="inline-flex py-3 px-6 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors">
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Email Address</label>
                <input 
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-black font-medium placeholder-gray-500 rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-colors"
                />
              </div>

              <button 
                type="submit" disabled={loading || !email}
                className="w-full h-14 mt-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <>Send Reset Link <ArrowRight size={14} /></>}
              </button>
            </form>
          )}

          {!success && (
            <p className="text-center mt-8 text-sm font-medium text-gray-500">
              Remember your password? <Link href="/login" className="text-black font-bold hover:text-blue-600 transition-colors">Sign in</Link>
            </p>
          )}
        </div>
      </div>
      
      <Footer />
    </main>
  );
}