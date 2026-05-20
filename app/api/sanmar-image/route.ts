import { NextResponse } from 'next/server';
import https from 'https';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageName = searchParams.get('image');

  if (!imageName) return new NextResponse('Falta imagen', { status: 400 });

  // SanMar es muy sensible. Vamos a enviarle el nombre decodificado.
  const cleanName = decodeURIComponent(imageName).replace(/^\//, "");
  const sanmarUrl = `https://view.sanmar.com/get-image?imageName=${cleanName}`;

  // 👇 AQUÍ ESTÁ LA MAGIA: Le decimos a TypeScript que esta promesa devuelve un NextResponse
  return new Promise<NextResponse>((resolve) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.sanmar.com/',
      },
      rejectUnauthorized: false,
      timeout: 10000
    };

    https.get(sanmarUrl, options, (res) => {
      if (res.statusCode !== 200) {
        resolve(new NextResponse('No encontrado', { status: 404 }));
        return;
      }

      // 👇 Mejoramos el tipado para evitar usar "any"
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(new NextResponse(buffer, {
          headers: {
            'Content-Type': res.headers['content-type'] || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
          },
        }));
      });
    }).on('error', (e) => {
      console.error("❌ Error en el túnel:", e.message);
      resolve(new NextResponse('Error de red local', { status: 500 }));
    });
  });
}