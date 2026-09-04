const fs = require("fs");
const csv = require("csv-parser");

function extraerSoloColores() {
  const rutaArchivoEntrada = "SanMar_SDL_DS-updated.csv"; 
  const rutaArchivoSalida = "sanmar_solo_colores.csv";    

  if (!fs.existsSync(rutaArchivoEntrada)) {
    console.error(`❌ No se encuentra el archivo gigante en: ${rutaArchivoEntrada}`);
    return;
  }

  console.log("⏳ Aspirando el archivo de 500MB para extraer SKU, Estilo, Color y Talla...");

  const writeStream = fs.createWriteStream(rutaArchivoSalida);
  // Agregamos SIZE, es crucial para cruzar con el partId de PromoStandards
  writeStream.write("UNIQUE_KEY,STYLE,COLOR_NAME,SIZE\n");

  let contador = 0;

  fs.createReadStream(rutaArchivoEntrada)
    .pipe(csv({ mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '') }))
    .on("data", (row) => {
      // Filtramos la basura (productos inactivos o descontinuados)
      const status = (row["PRODUCT_STATUS"] || "Active").toLowerCase();
      if (status.includes("discontinue") || status.includes("inactive")) return;

      const styleCode = (row["STYLE#"] || row["PRODUCT_STYLE"] || "").trim();
      const colorName = (row["COLOR_NAME"] || row["SANMAR_MAINFRAME_COLOR"] || "").trim();
      const size = (row["SIZE"] || "").trim();

      // 🛡️ Lógica infalible: Si no hay UNIQUE_KEY de fábrica, lo armamos nosotros
      const uniqueKey = row["UNIQUE_KEY"] || 
                  (row["INVENTORY_KEY"] && row["SIZE_INDEX"] ? `${row["INVENTORY_KEY"]}-${row["SIZE_INDEX"]}` : null) ||
                  (styleCode + "_" + (colorName || "default") + "_" + (size || "default"));

      // Validamos que al menos exista el estilo y el color
      if (styleCode && colorName) {
        writeStream.write(`${uniqueKey},${styleCode},"${colorName}","${size}"\n`);
        contador++;
      }
    })
    .on("end", () => {
      writeStream.end();
      console.log(`✅ ¡Misión cumplida! Se extrajeron ${contador} variantes exactas.`);
      console.log(`📂 Archivo listo para comparar: ${rutaArchivoSalida}`);
    });
}

extraerSoloColores();