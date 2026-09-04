require("dotenv").config({ path: ".env.local" });
const { XMLParser } = require("fast-xml-parser");

async function verTodasLasVariantes(styleNumber) {
  const apiId = process.env.SANMAR_API_ID;
  const apiPassword = process.env.SANMAR_API_PASSWORD;
  
  if (!apiId || !apiPassword) {
    console.error("❌ Error: Las credenciales de SanMar no se encuentran en .env.local");
    return;
  }

  const SANMAR_SOAP_URL = "https://ws.sanmar.com:8080/promostandards/InventoryServiceBindingV2";

  console.log(`🔍 Consultando TODAS las variantes de SanMar para el estilo: [${styleNumber}]...\n`);

  const xmlPayload = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                      xmlns:inv="http://www.promostandards.org/WSDL/Inventory/2.0.0/"
                      xmlns:shar="http://www.promostandards.org/WSDL/Inventory/2.0.0/SharedObjects/">
       <soapenv:Header/>
       <soapenv:Body>
          <inv:GetInventoryLevelsRequest>
             <shar:wsVersion>2.0.0</shar:wsVersion>
             <shar:id>${apiId}</shar:id>
             <shar:password>${apiPassword}</shar:password>
             <shar:productId>${styleNumber}</shar:productId>
          </inv:GetInventoryLevelsRequest>
       </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await fetch(SANMAR_SOAP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      body: xmlPayload,
      cache: "no-store",
    });

    const xmlText = await response.text();
    if (!response.ok) {
      console.error("❌ Error HTTP en SanMar:", response.status);
      return;
    }

    const parser = new XMLParser({ ignoreAttributes: false });
    const jsonData = parser.parse(xmlText);

    const envelope = jsonData["S:Envelope"] || jsonData["soapenv:Envelope"] || jsonData["env:Envelope"];
    const body = envelope?.["S:Body"] || envelope?.["soapenv:Body"] || envelope?.["env:Body"];
    
    if (!body) {
      console.log("⚠️ No se encontró el Body en la respuesta XML.");
      return;
    }

    const responseKey = Object.keys(body).find(k => k.includes("GetInventoryLevelsResponse"));
    if (!responseKey) {
      console.log("⚠️ Respuesta completa de SanMar:", JSON.stringify(jsonData, null, 2));
      return;
    }

    const inventoryResponse = body[responseKey];
    const inventoryContainer = inventoryResponse?.["Inventory"] || inventoryResponse?.["inv:Inventory"];
    
    let partInventoryArray = inventoryContainer?.["PartInventoryArray"]?.["PartInventory"] ||
                             inventoryContainer?.["inv:PartInventoryArray"]?.["inv:PartInventory"];

    if (!partInventoryArray) {
      console.log("⚠️ El producto no devolvió inventario.");
      return;
    }

    const cleanInventory = Array.isArray(partInventoryArray) ? partInventoryArray : [partInventoryArray];

    console.log(`✅ Se encontraron ${cleanInventory.length} variantes en total. Mostrando tabla completa:\n`);
    
    // Mapeamos TODAS las variantes sin el slice(0, 5)
    const todasLasVariantes = cleanInventory.map((item, index) => {
      const qtyObj = item.quantityAvailable?.Quantity || item["ns2:quantityAvailable"]?.["ns2:Quantity"] || item.quantityAvailable;
      return {
        idx: index + 1,
        sku: item.partId || item["ns2:partId"] || "N/A",
        colorSanMar: item.partColor || item["ns2:partColor"] || "N/A",
        tallaSanMar: item.labelSize || item["ns2:labelSize"] || "N/A",
        cantidad: qtyObj?.value ?? qtyObj?.["ns2:value"] ?? 0
      };
    });

    console.table(todasLasVariantes);

  } catch (error) {
    console.error("❌ Error ejecutando la prueba:", error);
  }
}

const estilo = process.argv[2] || "A4N3142";
verTodasLasVariantes(estilo);