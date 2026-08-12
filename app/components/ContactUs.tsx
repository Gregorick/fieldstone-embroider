"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ContactUs() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    mathAnswer: "",
  });

  // TRAMPA ANTI-SPAM (Honeypot)
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // 1. Verificar Honeypot (Si un bot llenó esto, cancelamos en silencio)
    if (honeypot.length > 0) {
      console.log("Spam detectado. Abortando.");
      setLoading(false);
      setSuccess(true); // Engañamos al bot haciéndole creer que funcionó
      return;
    }

    // 2. Verificar Captcha Matemático simple (1 + 8 = 9)
    if (formData.mathAnswer.trim() !== "9") {
      setError("Incorrect math answer. Please try again.");
      setLoading(false);
      return;
    }

    try {
      // 3. Enviar a Supabase
      const { error: dbError } = await supabase.from("contact_submissions").insert([
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
        }
      ]);

      if (dbError) throw dbError;

      setSuccess(true);
      setFormData({ name: "", email: "", phone: "", message: "", mathAnswer: "" });
    } catch (err: any) {
      setError("An error occurred while sending your message. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contactus" className="relative w-full min-h-[80vh] flex items-center overflow-hidden bg-black">
      
      {/* 🎥 VIDEO DE FONDO */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-70 grayscale">
          <source src="/fieldstone-embroider/video/header_main.mp4" type="video/mp4" />
          Tu navegador no soporta videos HTML5.
        </video>
      </div>

      {/* 📄 CONTENEDOR DEL FORMULARIO */}
      <div className="container relative z-10 mx-auto px-4 lg:px-8 flex justify-end items-center h-full py-16">
        
        <div className="w-full max-w-[500px] bg-white p-8 md:p-12 shadow-2xl rounded-sm">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-center text-black mb-4">
            Contact Us
          </h2>
          <p className="text-center text-sm font-medium text-gray-600 mb-8">
            Call us at <a href="tel:9782199071" className="text-[#5C92D1] hover:underline">978.219.9071</a> or use the form below:
          </p>

          {success && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wide border border-green-200 text-center">
              Message sent successfully! We will get back to you soon.
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wide border border-red-200 text-center">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* HONEYPOT - Oculto visualmente */}
            <div className="opacity-0 absolute -z-10 w-0 h-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="company_site">Leave empty if you are human</label>
              <input type="text" id="company_site" name="company_site" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            <div className="relative">
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-transparent border-b border-gray-300 py-3 text-sm text-black outline-none focus:border-black transition-colors placeholder-gray-400" placeholder="Full Name"/>
            </div>

            <div className="relative">
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-transparent border-b border-gray-300 py-3 text-sm text-black outline-none focus:border-black transition-colors placeholder-gray-400" placeholder="Email Address"/>
            </div>

            <div className="relative">
              <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-transparent border-b border-gray-300 py-3 text-sm text-black outline-none focus:border-black transition-colors placeholder-gray-400" placeholder="Phone #"/>
            </div>

            <div className="relative">
              <textarea required rows={3} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-transparent border-b border-gray-300 py-3 text-sm text-black outline-none focus:border-black transition-colors placeholder-gray-400 resize-none" placeholder="Type Your Message"></textarea>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span>1 + 8 =</span>
                <input type="text" required value={formData.mathAnswer} onChange={e => setFormData({...formData, mathAnswer: e.target.value})} className="w-12 border-b border-gray-400 text-center outline-none focus:border-black py-1"/>
              </div>

              <button type="submit" disabled={loading} className="bg-black text-white px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#8012d8] transition-colors disabled:opacity-50">
                {loading ? "Sending..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}