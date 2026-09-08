"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase"; // 🚀 Importamos Supabase para leer las reglas de precios

export interface CartItem {
  id: string; // ID único del producto (para poder borrarlo)
  productId: string;
  slug: string; 
  title: string;
  price: number; // Precio unitario final calculado
  basePrice?: number; // 🚀 AÑADIDO: Guardaremos el precio base de la ropa sin decorar
  image: string;
  size: string;
  color: string;
  quantity: number;
  decorationMethod?: string;
  location?: string;
  unique_key?: string;
  style?: string;
  extraComments?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  isCartOpen: boolean;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setIsCartOpen: (isOpen: boolean) => void;
  cartTotal: number;
  cartCount: number;
}

// Tiers por defecto por si tarda en cargar la base de datos
const DEFAULT_TIERS = [
  { min: 1, max: 11, emb: 12.45, sp: 8.00, dtf: 10.50, shipping: 40 },
  { min: 12, max: 23, emb: 10.45, sp: 7.00, dtf: 9.45, shipping: 40 },
  { min: 24, max: 71, emb: 9.00, sp: 6.00, dtf: 8.45, shipping: 40 },
  { min: 72, max: 143, emb: 8.00, sp: 5.00, dtf: 7.45, shipping: 40 },
  { min: 144, max: 287, emb: 7.00, sp: 4.00, dtf: 6.45, shipping: 40 },
  { min: 288, max: 499, emb: 6.00, sp: 3.00, dtf: 5.45, shipping: 40 },
];

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // 🚀 Estado para guardar las reglas de precios del administrador
  const [decorationTiers, setDecorationTiers] = useState<any[]>(DEFAULT_TIERS);

  // Cargar del localStorage al iniciar y traer los precios desde Supabase
  useEffect(() => {
    const savedCart = localStorage.getItem("fieldstone_cart");
    if (savedCart) setCartItems(JSON.parse(savedCart));

    const fetchTiers = async () => {
      const { data } = await supabase.from('store_settings').select('decoration_tiers').eq('id', 'default').single();
      if (data && data.decoration_tiers && Array.isArray(data.decoration_tiers)) {
         setDecorationTiers(data.decoration_tiers);
      }
    };
    fetchTiers();
  }, []);

  // Guardar en localStorage cada vez que el carrito cambie
  useEffect(() => {
    localStorage.setItem("fieldstone_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // 🚀 FUNCIÓN MÁGICA 1: Extrae el precio base original de la prenda (restándole la decoración)
  const getBasePrice = (item: CartItem, currentTiers: any[]) => {
    if (item.basePrice !== undefined) return item.basePrice;
    if (!item.decorationMethod) return item.price;
    
    // Buscamos qué tier se le aplicó originalmente
    const oldTier = currentTiers.find((t: any) => item.quantity >= Number(t.min) && item.quantity <= Number(t.max)) || currentTiers[currentTiers.length - 1];
    const method = item.decorationMethod.toLowerCase();
    
    let oldAddedPrice = 0;
    if (method === "emb") oldAddedPrice = Number(oldTier.emb) || 0;
    else if (method === "sp") oldAddedPrice = Number(oldTier.sp) || 0;
    
    return item.price - oldAddedPrice;
  };

  // 🚀 FUNCIÓN MÁGICA 2: Calcula el nuevo precio de la unidad basado en la nueva cantidad
  const calculateNewUnitPrice = (item: CartItem, newQuantity: number, currentTiers: any[]) => {
    const base = getBasePrice(item, currentTiers);
    if (!item.decorationMethod) return base;
    
    const method = item.decorationMethod.toLowerCase();
    // Buscamos el NUEVO TIER según la nueva cantidad
    const activeTier = currentTiers.find((t: any) => newQuantity >= Number(t.min) && newQuantity <= Number(t.max)) || currentTiers[currentTiers.length - 1];
    
    let addedPrice = 0;
    if (method === "emb") addedPrice = Number(activeTier.emb) || 0;
    else if (method === "sp") addedPrice = Number(activeTier.sp) || 0;
    
    return base + addedPrice;
  };

  const addToCart = (newItem: CartItem) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === newItem.id);
      
      if (existingItem) {
        // 🚀 Si agregas más del mismo producto, recalculamos el precio para el total sumado
        const newQty = existingItem.quantity + newItem.quantity;
        const newPrice = calculateNewUnitPrice(existingItem, newQty, decorationTiers);
        
        return prev.map((item) =>
          item.id === newItem.id ? { ...item, quantity: newQty, price: newPrice } : item
        );
      }
      
      // Guardamos el basePrice la primera vez para facilitar cálculos futuros
      const basePrice = getBasePrice(newItem, decorationTiers);
      return [...prev, { ...newItem, basePrice }];
    });
    setIsCartOpen(true); // Abrir el carrito automáticamente al añadir
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // 🚀 RECALCULAMOS EL PRECIO DINÁMICAMENTE AL DARLE A [+] O [-]
          const newPrice = calculateNewUnitPrice(item, quantity, decorationTiers);
          return { ...item, quantity, price: newPrice };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, isCartOpen, addToCart, removeFromCart, updateQuantity, clearCart, setIsCartOpen, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de un CartProvider");
  return context;
};