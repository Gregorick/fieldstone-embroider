"use server";

import { XMLParser } from "fast-xml-parser";

export async function getLiveInventory(styleNumber) {
  if (!styleNumber || typeof styleNumber !== "string") return [];

  const cleanStyle = styleNumber.trim().toUpperCase();

  const apiId = process.env.SANMAR_API_ID;
  const apiPassword = process.env.SANMAR_API_PASSWORD;

  // 🛡️ Validación de seguridad: si faltan credenciales, evitamos llamadas innecesarias
  if (!apiId || !apiPassword) {
    console.error("❌ Faltan las credenciales de SanMar en las variables de entorno.");
    return [];
  }

  const SANMAR_SOAP_URL = "https://ws.sanmar.com:8080/promostandards/InventoryServiceBindingV2";

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
             <shar:productId>${cleanStyle}</shar:productId>
          </inv:GetInventoryLevelsRequest>
       </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await fetch(SANMAR_SOAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
      body: xmlPayload,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`❌ Error HTTP en SanMar para el estilo ${cleanStyle}:`, response.status);
      return [];
    }

    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const jsonData = parser.parse(xmlText);

    const envelope = jsonData["S:Envelope"] || jsonData["soapenv:Envelope"] || jsonData["env:Envelope"];
    const body = envelope?.["S:Body"] || envelope?.["soapenv:Body"] || envelope?.["env:Body"];
    
    if (!body) return [];

    const responseKey = Object.keys(body).find(k => k.includes("GetInventoryLevelsResponse"));
    if (!responseKey) return [];

    const inventoryResponse = body[responseKey];
    const inventoryContainer = inventoryResponse?.["Inventory"] || inventoryResponse?.["inv:Inventory"];
    
    // 🛡️ Búsqueda robusta del arreglo de inventario sin importar prefijos de namespaces (como ns2:)
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

    if (!partInventoryArray) return [];

    const cleanInventory = Array.isArray(partInventoryArray) ? partInventoryArray : [partInventoryArray];

    return cleanInventory.map((item) => {
      const qtyObj = item.quantityAvailable?.Quantity || item["ns2:quantityAvailable"]?.["ns2:Quantity"] || item.quantityAvailable;
      const qtyAvailable = qtyObj?.value ?? qtyObj?.["ns2:value"] ?? 0;

      const color = item.partColor || item["ns2:partColor"] || item.attributeSelection?.color || "N/A";
      const size = item.labelSize || item["ns2:labelSize"] || item.attributeSelection?.size || "N/A";
      const sku = item.partId || item["ns2:partId"] || "N/A";
      const description = item.partDescription || item["ns2:partDescription"] || "";

      return {
        sku: String(sku), // 🔑 Este es tu PART_ID que empalma directo con el UNIQUE_KEY
        color: String(color),
        size: String(size),
        description: String(description),
        qty: parseInt(qtyAvailable, 10) || 0,
      };
    });

  } catch (error) {
    console.error(`❌ Error procesando el inventario de SanMar para (${cleanStyle}):`, error);
    return []; 
  }
}