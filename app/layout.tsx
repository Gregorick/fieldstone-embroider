import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// ✅ 1. Importa el Provider y el SlideOut
import { CartProvider } from "./context/CartContext";
import SlideOutCart from "./components/SlideOutCart";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fieldstone",
  description: "Premium Apparel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* ✅ 2. Envuelve todo en el Provider */}
        <CartProvider>
          {children}
          {/* ✅ 3. Coloca el SlideOut aquí para que esté disponible en toda la web */}
          <SlideOutCart />
        </CartProvider>
      </body>
    </html>
  );
}