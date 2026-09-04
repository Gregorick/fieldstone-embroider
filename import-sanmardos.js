require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const readline = require("readline");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function importarCsvSanMar() {
  const filePath = "./SanMar_SDL_DS-updated.csv"; // 👈 Asegúrate de que el nombre del archivo sea correcto
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No se encuentra el archivo en la ruta: ${filePath}`);
    return;
  }

  console.log("🚀 Iniciando lectura optimizada del archivo CSV de SanMar...");

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  // Mapas temporales para agrupar y evitar duplicados por categorías
  const stylesMap = new Map();
  const variantsMap = new Map();

  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 50000 === 0) {
      console.log(`⏳ Procesadas ${lineCount} líneas...`);
    }

    // Parser básico de CSV considerando comas y comillas
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val ? val.replace(/^"|"$/g, "").trim() : "");
    
    const styleCode = cols[3] || cols[5]; 
    const rawTitle = cols[1] || "";
    const description = cols[2] || "";
    
    // 🧹 Extracción y limpieza automática de nombres de color tipo GIF a texto limpio
    const rawColor = cols[10] || cols[21] || "";
    let color = rawColor.replace(/^.*[\\/]/, '') // Eliminar rutas
                        .replace(/\.[^/.]+$/, '') // Eliminar extensión (.gif, .jpg)
                        .replace(/^(port|gildan|sanmar|nike|gio)_/i, '') // Quitar prefijos comunes
                        .replace(/_/g, ' '); // Cambiar guiones bajos por espacios

    color = color.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

    const size = cols[15];
    const weight = parseFloat(cols[16]) || 0;
    const brand = cols[23] || "SanMar";
    const frontImg = cols[27] || "";
    const backImg = cols[28] || "";
    const price = parseFloat(cols[7]) || 15.00;

    if (!styleCode || !color || !size) continue;

    // 1. Acumular Estilos Únicos
    if (!stylesMap.has(styleCode)) {
      const cleanTitle = rawTitle.split(".")[0].trim() || styleCode;
      const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + styleCode.toLowerCase();
      
      stylesMap.set(styleCode, {
        style: styleCode,
        slug: slug,
        title: cleanTitle,
        brand: brand,
        description: description,
        image_url: frontImg.startsWith("http") ? frontImg : `https://cdnm.sanmar.com/catalog/images/${styleCode}.jpg`,
        category: "Apparel"
      });
    }

    // 2. Acumular Variantes Únicas (Estilo + Color + Talla) para evitar duplicados de categorías
    const variantKey = `${styleCode}-${color}-${size}`.toUpperCase();
    if (!variantsMap.has(variantKey)) {
      variantsMap.set(variantKey, {
        style: styleCode,
        color_name: color,
        size: size,
        price: price,
        msrp: price,
        weight: weight,
        front_model_url: frontImg,
        back_model_url: backImg,
        image_url: frontImg.startsWith("http") ? frontImg : `https://cdnm.sanmar.com/catalog/images/${styleCode}.jpg`
      });
    }
  }

  console.log(`✅ Lectura finalizada. Estilos únicos encontrados: ${stylesMap.size}`);
  console.log(`✅ Variantes únicas encontradas: ${variantsMap.size}`);

  // 3. Subir Estilos a Supabase por lotes
  console.log("📤 Subiendo estilos únicos a Supabase...");
  const stylesArray = Array.from(stylesMap.values());
  for (let i = 0; i < stylesArray.length; i += 500) {
    const batch = stylesArray.slice(i, i + 500);
    const { error } = await supabase.from("products_unique_styles").upsert(batch, { onConflict: "style" });
    if (error) console.error("⚠️ Error en lote de estilos:", error.message);
  }

  // 4. Subir Variantes a Supabase por lotes
  console.log("📤 Subiendo variantes de productos a Supabase...");
  const variantsArray = Array.from(variantsMap.values());
  for (let i = 0; i < variantsArray.length; i += 500) {
    const batch = variantsArray.slice(i, i + 500);
    const { error } = await supabase.from("products").upsert(batch, { onConflict: "style,color_name,size" });
    if (error) console.error("⚠️ Error en lote de variantes:", error.message);
  }

  console.log("🎉 ¡Sincronización masiva y limpieza de colores completada con éxito!");
}

importarCsvSanMar();