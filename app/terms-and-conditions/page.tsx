"use client";

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { supabase } from '@/lib/supabase';

export default function TermsAndConditionsPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTerms() {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('terms_conditions')
          .eq('id', 'default')
          .single();

        if (error) {
          console.error("Error fetching terms and conditions:", error);
        } else if (data && data.terms_conditions) {
          setContent(data.terms_conditions);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTerms();
  }, []);

  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-16 text-gray-800">
        <h1 className="text-3xl md:text-4xl font-black mb-8 text-black border-b border-gray-200 pb-4">
          Terms and Conditions
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : content ? (
          <div 
            className="prose prose-base max-w-none text-gray-800 font-medium leading-relaxed 
                       break-words whitespace-normal w-full overflow-hidden
                       prose-h2:text-xl prose-h2:font-bold prose-h2:text-black prose-h2:mb-3 prose-h2:mt-8
                       prose-p:mb-4
                       prose-ul:list-disc prose-ul:pl-6 prose-ul:mt-2 prose-ul:space-y-1
                       prose-strong:text-black"
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        ) : (
          <p className="text-gray-500">Terms and conditions content is currently unavailable.</p>
        )}
      </main>

      <Footer />
    </div>
  );
}