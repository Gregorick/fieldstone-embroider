require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const csv = require("csv-parser");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function importarSanMarActualizacion() {
  const productosMap = new Map();
  console.log("⏳ Analizando archivo CSV de SanMar para actualización inteligente...");

  const rutaArchivo = "SanMar_SDL_DS-updated.csv";

  if (!fs.existsSync(rutaArchivo)) {
    console.error(`❌ No se encuentra el archivo en la ruta: ${rutaArchivo}`);
    return;
  }

  let totalFilasLeidas = 0;
  let filasOmitidasEstado = 0;

  fs.createReadStream(rutaArchivo)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '')
    }))
    .on("data", (row) => {
      totalFilasLeidas++;

      // 1. Validar estatus para filtrar descontinuados o inactivos
      const status = (row["PRODUCT_STATUS"] || "Active").toLowerCase();
      if (status.includes("discontinue") || status.includes("inactive")) {
        filasOmitidasEstado++;
        return; 
      }

      const styleCode = (row["STYLE#"] || row["PRODUCT_STYLE"] || "").trim();
      
      // Obtener la llave única de la variante (con comillas corregidas)
      const key = row["UNIQUE_KEY"] || 
                  (row["INVENTORY_KEY"] && row["SIZE_INDEX"] ? `${row["INVENTORY_KEY"]}-${row["SIZE_INDEX"]}` : null) ||
                  (styleCode + "_" + (row["COLOR_NAME"] || "default") + "_" + (row["SIZE"] || "default"));

      if (!key || !styleCode) return;

      if (!productosMap.has(key)) {
        // 🛡️ Lectura segura y limpia de marca y categoría
        const brandName = (row["MILL"] || row["BRAND"] || row["BRAND_NAME"] || "Generic").trim();
        const categoryName = (row["CATEGORY_NAME"] || "Uncategorized").trim();

        productosMap.set(key, {
          supplier: "SanMar",
          unique_key: key,
          style: styleCode,
          title: row["PRODUCT_TITLE"] || styleCode,
          description: row["PRODUCT_DESCRIPTION"] || "",
          brand: brandName,
          category: categoryName,
          color_name: row["COLOR_NAME"] || row["SANMAR_MAINFRAME_COLOR"] || "",
          size: row["SIZE"] || "",
          price: parseFloat(row["PIECE_PRICE"] || 0),
          weight: parseFloat(row["PIECE_WEIGHT"] || 0),
          image_url: row["FRONT_MODEL_IMAGE_URL"] || row["COLOR_PRODUCT_IMAGE"] || "",
          front_model_url: row["FRONT_MODEL_IMAGE_URL"] || "",
          back_model_url: row["BACK_MODEL_IMAGE_URL"] || "",
          front_flat_url: row["FRONT_FLAT_IMAGE_URL"] || "",
          back_flat_url: row["BACK_FLAT_IMAGE_URL"] || "",
          inventory_qty: 100,
          status: row["PRODUCT_STATUS"] || "Active",
        });
      }
    })
    .on("end", async () => {
      const productos = Array.from(productosMap.values());
      
      if (productos.length === 0) {
        console.error("❌ No se procesaron productos válidos.");
        return;
      }

      console.log(`📊 Total filas leídas del CSV: ${totalFilasLeidas}`);
      console.log(`- Omitidas por estatus: ${filasOmitidasEstado}`);
      console.log(`✅ ${productos.length} productos listos para sincronizar.`);

      console.log("🚀 Sincronizando con Supabase (actualizando existentes y agregando nuevos)...");

      const batchSize = 500;
      for (let i = 0; i < productos.length; i += batchSize) {
        const batch = productos.slice(i, i + batchSize);
        
        const { error } = await supabase.from("products").upsert(batch, {
          onConflict: "unique_key",
        });

        if (error) {
          console.error(`❌ Error en lote ${i}:`, error.message);
        } else {
          console.log(`✅ Lote procesado: ${i + batch.length} / ${productos.length}`);
        }
      }

      console.log("🎉 ¡Actualización inteligente finalizada con éxito!");
      console.log("👉 Recuerda ejecutar en el SQL Editor de Supabase: REFRESH MATERIALIZED VIEW CONCURRENTLY products_unique_styles;");
    });
}

importarSanMarActualizacion();