// 🚀 TRADUCTOR DE CÓDIGOS FISCALES (Totalmente explícito)
const getTaxCode = (category: string) => {
  const cat = category?.toLowerCase() || '';

  // 1. Bolsos y Equipaje
  if (cat.includes('bag')) return 'txcd_10010001'; 
  
  // 2. Gorras y Sombreros
  if (cat.includes('cap') || cat.includes('hat')) return 'txcd_20030002'; 
  
  // 3. Accesorios
  if (cat.includes('accessori')) return 'txcd_20030010'; 

  // 4. Protección Personal (Seguridad)
  if (cat.includes('protection') || cat.includes('personal')) return 'txcd_20060020'; 
  
  // 5. ROPA GENERAL (Todas las demás categorías de tu tienda)
  if (
    cat.includes('t-shirt') || 
    cat.includes('polo') || 
    cat.includes('knit') || 
    cat.includes('sweatshirt') || 
    cat.includes('fleece') || 
    cat.includes('outerwear') || 
    cat.includes('activewear') || 
    cat.includes('workwear') || 
    cat.includes('women') || 
    cat.includes('youth') || 
    cat.includes('bottom') || 
    cat.includes('woven') || 
    cat.includes('infant') || 
    cat.includes('toddler')
  ) {
    return 'txcd_20030000'; // Código de Stripe para Ropa General
  }
  
  // POR DEFECTO (Cualquier cosa nueva que agregues en el futuro y se te olvide poner aquí)
  return 'txcd_20030000'; 
};