require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const csv = require("csv-parser");
const { XMLParser } = require("fast-xml-parser");

const SANMAR_API_ID = process.env.SANMAR_API_ID;
const SANMAR_API_PASSWORD = process.env.SANMAR_API_PASSWORD;

const PS_INVENTORY_URL = "https://ws.sanmar.com:8080/promostandards/InventoryServiceBindingV2"; 

async function obtenerStockDePromoStandards() {
  if (!SANMAR_API_ID || !SANMAR_API_PASSWORD) {
    console.error("❌ FALTAN LAS CREDENCIALES: Revisa que SANMAR_API_ID y SANMAR_API_PASSWORD estén en tu archivo .env");
    return;
  }

  const estilosUnicos = new Set();
  const rutaArchivoEntrada = "sanmar_solo_colores.csv";
  const rutaArchivoSalida = "promostandards_stock_completo.csv"; // Nombre actualizado para el archivo completo

  if (!fs.existsSync(rutaArchivoEntrada)) {
    console.error(`❌ No encuentro el archivo: ${rutaArchivoEntrada}`);
    return;
  }

  console.log("⏳ 1. Leyendo estilos únicos de tu CSV ligero...");

  await new Promise((resolve) => {
    fs.createReadStream(rutaArchivoEntrada)
      .pipe(csv())
      .on("data", (row) => {
        if (row.STYLE) estilosUnicos.add(row.STYLE);
      })
      .on("end", resolve);
  });

  const estilosArray = Array.from(estilosUnicos);
  console.log(`✅ Se encontraron ${estilosArray.length} estilos únicos.`);
  console.log(`🚀 Empezando a consultar la API de PromoStandards de SanMar V2 para TODO el catálogo...`);

  const writeStream = fs.createWriteStream(rutaArchivoSalida);
  writeStream.write("STYLE,PART_ID,COLOR_NAME,SIZE,QUANTITY\n");

  const parser = new XMLParser({ ignoreAttributes: false });

  // 🔥 CATÁLOGO COMPLETO: Recorremos los 3,187 estilos
  const totalEstilos = estilosArray.length; 

  for (let i = 0; i < totalEstilos; i++) {
    const estilo = estilosArray[i];

    const xmlPayload = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                      xmlns:inv="http://www.promostandards.org/WSDL/Inventory/2.0.0/"
                      xmlns:shar="http://www.promostandards.org/WSDL/Inventory/2.0.0/SharedObjects/">
       <soapenv:Header/>
       <soapenv:Body>
          <inv:GetInventoryLevelsRequest>
             <shar:wsVersion>2.0.0</shar:wsVersion>
             <shar:id>${SANMAR_API_ID}</shar:id>
             <shar:password>${SANMAR_API_PASSWORD}</shar:password>
             <shar:productId>${estilo}</shar:productId>
          </inv:GetInventoryLevelsRequest>
       </soapenv:Body>
    </soapenv:Envelope>
    `;

    try {
      // Muestra el progreso en tiempo real en tu terminal
      process.stdout.write(`Consultando [${i + 1}/${totalEstilos}]: ${estilo}... \r`);
      
      const response = await fetch(PS_INVENTORY_URL, {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8" },
        body: xmlPayload
      });

      if (!response.ok) {
        continue;
      }

      const xmlText = await response.text();
      const jsonData = parser.parse(xmlText);

      const envelope = jsonData["S:Envelope"] || jsonData["soapenv:Envelope"] || jsonData["env:Envelope"];
      const body = envelope?.["S:Body"] || envelope?.["soapenv:Body"] || envelope?.["env:Body"];
      
      if (body) {
        const responseKey = Object.keys(body).find(k => k.includes("GetInventoryLevelsResponse"));
        if (responseKey) {
          const inventoryResponse = body[responseKey];
          const inventoryContainer = inventoryResponse?.["Inventory"] || inventoryResponse?.["inv:Inventory"];
          
          let partInventoryArray = inventoryContainer?.["PartInventoryArray"]?.["PartInventory"] ||
                                   inventoryContainer?.["inv:PartInventoryArray"]?.["inv:PartInventory"];

          if (!partInventoryArray) {
            const findKeyRecursive = (obj, targetKey) => {
              if (!obj || typeof obj !== 'object') return null;
              if (obj[targetKey]) return obj[targetKey];
              for (const k of Object.keys(obj)) {
                const res = findKeyRecursive(obj[k], targetKey);
                if (res) return res;
              }
              return null;
            };
            partInventoryArray = findKeyRecursive(inventoryResponse, "PartInventory");
          }

          if (partInventoryArray) {
            const cleanInventory = Array.isArray(partInventoryArray) ? partInventoryArray : [partInventoryArray];

            cleanInventory.forEach((item) => {
              const qtyObj = item.quantityAvailable?.Quantity || item["ns2:quantityAvailable"]?.["ns2:Quantity"] || item.quantityAvailable;
              const qtyAvailable = qtyObj?.value ?? qtyObj?.["ns2:value"] ?? 0;

              const color = item.partColor || item["ns2:partColor"] || item.attributeSelection?.color || "N/A";
              const size = item.labelSize || item["ns2:labelSize"] || item.attributeSelection?.size || "N/A";
              const sku = item.partId || item["ns2:partId"] || "N/A";

              writeStream.write(`${estilo},${sku},"${color}","${size}",${parseInt(qtyAvailable, 10) || 0}\n`);
            });
          }
        }
      }

      // ⏱️ Pausa obligatoria de 300ms para cuidar el rate limit de SanMar
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      // Salto silencioso en errores de red puntuales para que no se detenga el script
    }
  }

  writeStream.end();
  console.log(`\n\n🎉 ¡Catálogo completo descargado con éxito! Archivo guardado como: ${rutaArchivoSalida}`);
}

obtenerStockDePromoStandards();