"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // 🚀 ¡ESTO ERA LO QUE FALTABA!
import { supabase } from "@/lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Save, AlertTriangle, Check, Loader2 } from "lucide-react";

const validatePassword = (password: string) => {
  const errors = [];
  if (password.length < 8) errors.push("At least 8 characters long");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("One number");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("One special character");
  
  const hasSequentialOrRepeatedNumbers = /(012|123|234|345|456|567|678|789|890|000|111|222|333|444|555|666|777|888|999)/.test(password);
  if (hasSequentialOrRepeatedNumbers) errors.push("No sequential or repeated numbers (e.g. 123 or 111)");

  return errors;
};

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRecoverySession = async () => {
      try {
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          const params = new URLSearchParams(hash.replace("#", "?"));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.");
        }
      } catch (err: any) {
        setError(err.message || "Error al procesar el enlace de recuperación.");
      } finally {
        setVerifying(false);
      }
    };

    handleRecoverySession();
  }, []);

  useEffect(() => {
    if (password.length > 0) {
      setPasswordErrors(validatePassword(password));
    } else {
      setPasswordErrors([]);
    }
  }, [password]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordErrors.length > 0) return;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      
      alert("¡Contraseña actualizada con éxito! Redirigiendo a tu cuenta...");
      router.push("/account");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <main className="bg-white min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
          <Loader2 size={40} className="animate-spin text-black mb-4" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Verificando enlace seguro...</p>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="bg-white min-h-screen flex flex-col">
      <Header />
      
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black italic mb-2">New Password<span className="text-blue-600">.</span></h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Please enter your secure new password</p>
          </div>

          {error ? (
            <div className="p-8 bg-red-50 border border-red-200 rounded-3xl text-center">
              <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-black uppercase tracking-widest text-red-900 mb-2">Access Denied</h3>
              <p className="text-xs font-medium text-red-700 leading-relaxed mb-6">{error}</p>
              <Link href="/forgot-password" className="inline-flex py-3 px-6 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors">
                Request New Link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">New Password</label>
                <input 
                  type="password" required placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-black font-medium rounded-xl px-4 py-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-colors"
                />
              </div>

              {password.length > 0 && passwordErrors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-800 mb-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Password Requirements:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    {passwordErrors.map((errorText, idx) => (
                      <li key={idx} className="text-xs font-bold text-red-600">{errorText}</li>
                    ))}
                  </ul>
                </div>
              )}

              {password.length > 0 && passwordErrors.length === 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                  <Check size={16} className="text-green-600" />
                  <p className="text-xs font-bold text-green-700">Strong password ready to save.</p>
                </div>
              )}

              <button 
                type="submit" disabled={loading || passwordErrors.length > 0 || !password}
                className="w-full h-14 mt-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-colors shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <>Update Password <Save size={14} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}