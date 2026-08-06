import { NextResponse } from 'next/server';

// 🔥 ESTO ES CLAVE: Obliga a Next.js a consultar a Google en vivo y no usar caché viejo
export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    // Limpiamos espacios en blanco accidentales
    const API_KEY = (process.env.GOOGLE_PLACES_API_KEY || "").trim();
    const PLACE_ID = (process.env.GOOGLE_PLACE_ID || "").trim();

    if (!API_KEY || !PLACE_ID) {
      return NextResponse.json({ success: false, error: "Faltan credenciales" });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,name&key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.result && data.result.reviews) {
      return NextResponse.json({ success: true, reviews: data.result.reviews });
    } else {
      return NextResponse.json({ success: false, error: "No reviews found" });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}