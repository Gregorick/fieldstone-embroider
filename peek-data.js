require('dotenv').config();
const Client = require('ssh2-sftp-client');
const csv = require('csv-parser');
const { Readable } = require('stream');

async function peekSanMarData() {
  const sftp = new Client();
  
  try {
    await sftp.connect({
      host: process.env.SANMAR_HOST,
      port: process.env.SANMAR_PORT,
      username: process.env.SANMAR_USER,
      password: process.env.SANMAR_PASS,
    });

    console.log("📥 Descargando muestra del catálogo...");
    const remotePath = '/SanmarPDD/SanMar_SDL_N.csv';
    
    // Obtenemos el archivo como un Buffer
    const fileBuffer = await sftp.get(remotePath);
    
    // Lo convertimos en un Stream para leer solo lo necesario
    const readableStream = Readable.from(fileBuffer);
    
    let rowCount = 0;
    const results = [];

    console.log("🔍 Analizando columnas y datos...");

    readableStream
      .pipe(csv())
      .on('data', (data) => {
        if (rowCount < 5) { // Solo tomamos las primeras 5 filas para estudio
          results.push(data);
          rowCount++;
        }
      })
      .on('end', () => {
        console.log("✅ Estructura de columnas detectada:");
        if (results.length > 0) {
          console.log(Object.keys(results[0])); // Muestra los nombres de las columnas
          console.log("\n📄 Ejemplo de filas (Primeras 5):");
          console.table(results);
        }
        sftp.end();
      });

  } catch (err) {
    console.error("❌ Error:", err.message);
    await sftp.end();
  }
}

peekSanMarData();