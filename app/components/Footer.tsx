"use client";

import React from "react";
import Link from "next/link";
import { Mail, ChevronUp } from "lucide-react";

// --- COMPONENTES SVG PARA REDES SOCIALES (Ya que Lucide los eliminó) ---
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);
const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
);
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const LinkedinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const socialLinks = [
    { Icon: FacebookIcon, href: "#" },
    { Icon: TwitterIcon, href: "#" },
    { Icon: InstagramIcon, href: "#" },
    { Icon: LinkedinIcon, href: "#" },
  ];

  return (
    <footer className="bg-black text-white pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* COLUMNA 1: CONTACT US */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] mb-8 text-gray-400">Contact Us</h4>
            <div className="text-gray-400 text-xs leading-6 space-y-4 font-medium">
              <p className="text-white font-black tracking-tight text-sm">Fieldstone Embroidery Store</p>
              <p>
                Santo Domingo, Distrito Nacional<br />
                Dominican Republic
              </p>
              <p className="text-white font-bold">admin@fieldstone.com</p>
              
              <div className="pt-4">
                <p className="text-[10px] uppercase tracking-tighter text-gray-500 mb-1">
                  You Have Any Questions? Call Us 24x7
                </p>
                <p className="text-lg font-black text-white tracking-tighter">809-555-0123</p>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              {socialLinks.map((social, i) => (
                <Link key={i} href={social.href} className="w-10 h-10 rounded-full border border-gray-800 flex items-center justify-center hover:bg-white hover:text-black hover:border-white transition-all duration-300">
                  <social.Icon />
                </Link>
              ))}
            </div>
          </div>

          {/* COLUMNA 2: PRODUCTS */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] mb-8 text-gray-400">Products</h4>
            <ul className="space-y-4 text-gray-400 text-xs font-bold uppercase tracking-widest">
              <li><Link href="#" className="hover:text-blue-500 transition-colors">Prices drop</Link></li>
              <li><Link href="#" className="hover:text-blue-500 transition-colors">New products</Link></li>
              <li><Link href="#" className="hover:text-blue-500 transition-colors">Best sellers</Link></li>
            </ul>
          </div>

          {/* COLUMNA 3: OUR COMPANY */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] mb-8 text-gray-400">Our Company</h4>
            <ul className="space-y-4 text-gray-400 text-xs font-bold uppercase tracking-widest">
              <li><Link href="#" className="hover:text-blue-500 transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-blue-500 transition-colors">Legal Notice</Link></li>
              <li><Link href="#" className="hover:text-blue-500 transition-colors">Terms of use</Link></li>
              <li><Link href="#" className="hover:text-blue-500 transition-colors">Secure payment</Link></li>
              <li><Link href="#" className="hover:text-blue-500 transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-blue-500 transition-colors">Stores</Link></li>
            </ul>
          </div>

          {/* COLUMNA 4: NEWSLETTER */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] mb-8 text-gray-400">Newsletter</h4>
            <p className="text-gray-400 text-xs mb-6 leading-relaxed font-medium">
              Subscribe to receive inspiration, ideas & news in your inbox.
            </p>
            <form className="space-y-4">
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Your email address" 
                  className="w-full bg-zinc-900 border border-zinc-800 p-4 text-xs focus:outline-none focus:border-blue-600 transition-all pr-12 text-white font-medium"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              </div>
              <button className="w-full bg-white hover:bg-blue-600 text-black hover:text-white font-black uppercase text-[10px] py-4 tracking-[0.3em] transition-all duration-300">
                Subscribe
              </button>
              <div className="flex items-start gap-3 pt-2">
                <input type="checkbox" id="terms" className="mt-1 accent-blue-600 cursor-pointer" />
                <label htmlFor="terms" className="text-[9px] text-gray-500 leading-tight cursor-pointer">
                  I agree to the terms and conditions and the privacy policy
                </label>
              </div>
            </form>
          </div>
        </div>

        {/* BARRA INFERIOR */}
        <div className="border-t border-zinc-900 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 relative">
          <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em] font-bold">
            © 2026 - <span className="text-gray-500">Fieldstone Embroidery Store.</span> All Rights Reserved.
          </p>
          
          <div className="flex gap-4 items-center grayscale opacity-30">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Visa_Inc._logo_%282005%E2%80%932014%29.svg/960px-Visa_Inc._logo_%282005%E2%80%932014%29.svg.png?_=20170118154621" alt="Visa" className="h-5" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-5" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-10" />
          </div>

          <button 
            onClick={scrollToTop}
            className="md:absolute right-0 bottom-20 p-4 bg-zinc-900 hover:bg-blue-600 text-white transition-all duration-300 group shadow-2xl"
            title="Scroll to Top"
          >
            <ChevronUp size={20} className="group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </footer>
  );
}