require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const csv = require("csv-parser");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function importarSanMar() {
  const productosMap = new Map();
  console.log("⏳ Analizando archivo CSV...");

  const rutaArchivo = "SanMar_SDL_D.csv";

  // Usamos mapHeaders para limpiar espacios o caracteres invisibles en los nombres de las columnas
  fs.createReadStream(rutaArchivo)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '')
    }))
    .on("data", (row) => {
      // Intentamos obtener la llave única de varias formas por seguridad
      const key = row["UNIQUE_KEY"] || 
                  (row["INVENTORY_KEY"] && row["SIZE_INDEX"] ? `${row["INVENTORY_KEY"]}-${row["SIZE_INDEX"]}` : null);

      if (key && !productosMap.has(key)) {
        productosMap.set(key, {
          supplier: "SanMar",
          unique_key: key,
          style: row["STYLE#"] || row["PRODUCT_STYLE"],
          title: row["PRODUCT_TITLE"],
          description: row["PRODUCT_DESCRIPTION"],
          brand: row["MILL"] || "Generic",
          category: row["CATEGORY_NAME"] || "Uncategorized",
          color_name: row["COLOR_NAME"] || row["SANMAR_MAINFRAME_COLOR"],
          size: row["SIZE"],
          price: parseFloat(row["PIECE_PRICE"] || 0),
          weight: parseFloat(row["PIECE_WEIGHT"] || 0),
          
          // 🚀 AQUÍ ESTÁ LA MAGIA: Tomamos el link absoluto y completo
          image_url: row["FRONT_MODEL_IMAGE_URL"] || row["COLOR_PRODUCT_IMAGE"],
          
          // Opcional: Si tienes estas columnas en Supabase, se llenarán. Si no, quítalas.
          front_model_url: row["FRONT_MODEL_IMAGE_URL"],
          back_model_url: row["BACK_MODEL_IMAGE_URL"],
          front_flat_url: row["FRONT_FLAT_IMAGE_URL"],
          back_flat_url: row["BACK_FLAT_IMAGE_URL"],

          inventory_qty: 100,
          status: row["PRODUCT_STATUS"] || "Active",
        });
      }
    })
    .on("end", async () => {
      const productos = Array.from(productosMap.values());
      
      if (productos.length === 0) {
        console.error("❌ No se procesaron productos. Revisa si los nombres de las columnas en el CSV coinciden.");
        return;
      }

      console.log(`✅ ¡Éxito! ${productos.length} productos únicos detectados.`);
      console.log("🚀 Iniciando actualización masiva en Supabase...");

      const batchSize = 500;
      for (let i = 0; i < productos.length; i += batchSize) {
        const batch = productos.slice(i, i + batchSize);
        // Upsert actualizará las filas existentes gracias al onConflict
        const { error } = await supabase.from("products").upsert(batch, {
          onConflict: "unique_key",
          ignoreDuplicates: false,
        });

        if (error) {
          console.error(`❌ Error en lote ${i}:`, error.message);
        } else {
          console.log(`✅ Lote completado: ${i + batch.length} / ${productos.length}`);
        }
      }

      console.log("🎉 Importación finalizada correctamente. ¡Las imágenes están arregladas!");
    });
}

importarSanMar();