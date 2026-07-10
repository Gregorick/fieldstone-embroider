const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ribtxxtjltnxhbawxdnl.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYnR4eHRqbHRueGhiYXd4ZG5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ0ODUyNiwiZXhwIjoyMDkyMDI0NTI2fQ.JIT9u8SxDW7FJuSCt5Nnh4yc8ZHbHbfHUYNpDd_tQms'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CSV_FILE_PATH = path.join(__dirname, './SanMar_SDL_D.csv');
const BATCH_SIZE = 1000;

async function run() {
  console.log('🚀 Iniciando actualización robusta vinculando por UNIQUE_KEY...');
  
  let batch = [];
  let totalProcessed = 0;

  const stream = fs.createReadStream(CSV_FILE_PATH).pipe(csv());

  for await (const row of stream) {
    // Limpiamos los nombres de las llaves por si tienen caracteres invisibles
    const cleanRow = {};
    Object.keys(row).forEach(k => cleanRow[k.replace(/^\uFEFF/, '').trim()] = row[k]);

    const sku = cleanRow['UNIQUE_KEY']; 
    const rawMsrp = cleanRow['MSRP'];
    const rawBulk = cleanRow['CASE_PRICE'];

    // Solo procesamos si el ID (UNIQUE_KEY) existe
    if (sku && sku.trim() !== '') {
      batch.push({
        unique_key: String(sku).trim(), // ✅ Mapeado a unique_key
        msrp: parseFloat(rawMsrp) || 0,
        bulk_price: parseFloat(rawBulk) || 0
      });
    }

    if (batch.length >= BATCH_SIZE) {
      stream.pause();
      // Filtrar duplicados en memoria usando unique_key
      const uniqueBatch = [...new Map(batch.map(item => [item.unique_key, item])).values()];
      await sendBatch(uniqueBatch);
      totalProcessed += uniqueBatch.length;
      console.log(`⏳ Procesados: ${totalProcessed}...`);
      batch = [];
      stream.resume();
    }
  }

  if (batch.length > 0) {
    const uniqueBatch = [...new Map(batch.map(item => [item.unique_key, item])).values()];
    await sendBatch(uniqueBatch);
    totalProcessed += uniqueBatch.length;
  }
  console.log(`✅ ¡Proceso finalizado! Total: ${totalProcessed} registros.`);
}

async function sendBatch(batchData) {
  // ✅ Usamos unique_key para el upsert (onConflict)
  const { error } = await supabase.from('products').upsert(batchData, { onConflict: 'unique_key' });
  if (error) console.error('❌ Error Supabase:', error.message);
}

run().catch(console.error);