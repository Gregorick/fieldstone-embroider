"use client";

import { useState, useCallback } from "react";
import Header from "./components/Header";
import BannerPrincipal from "./components/BannerPrincipal";
import TopCategories from "./components/TopCategories";
import ContactUs from "./components/ContactUs";
import LoopProducts from "./components/LoopProducts";
import Testimonios from "./components/Testimonios";
import Footer from "./components/Footer";

export default function Home() {
  const [excludeCats, setExcludeCats] = useState<string[]>([]);

  // Usamos useCallback para que la función sea estable y no dispare re-renders infinitos
  const handleCategoriesFetched = useCallback((cats: string[]) => {
    setExcludeCats(cats);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <BannerPrincipal />
      {/* Solo mostramos TopCategories cuando LoopProducts nos diga qué excluir */}
      <TopCategories excludeCategories={excludeCats} />
      <div className="h-20" />
      <ContactUs />
      <div className="h-20" />
      <LoopProducts onCategoriesFetched={handleCategoriesFetched} />
      <div className="h-20" />
      <Testimonios />
      <Footer />
    </main>
  );
}