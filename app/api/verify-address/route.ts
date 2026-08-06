import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { street1, city, state, zip, country = "US" } = await req.json();
    
    const EASYPOST_API_KEY = (process.env.EASYPOST_API_KEY || "").trim();
    if (!EASYPOST_API_KEY) throw new Error("Falta la API Key de EasyPost en el .env");

    const authHeader = `Basic ${Buffer.from(`${EASYPOST_API_KEY}:`).toString('base64')}`;

    // Le pedimos a EasyPost que valide la dirección ("verify: ['delivery']")
    const res = await fetch('https://api.easypost.com/v2/addresses', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: {
          street1,
          city,
          state,
          zip,
          country
        },
        verify: ["delivery"]
      })
    });

    const data = await res.json();

    // Si EasyPost rechaza la petición por completo (ej. credenciales inválidas o falta un campo crítico)
    if (data.error) {
       return NextResponse.json({ success: false, error: data.error.message }, { status: 400 });
    }

    const delivery = data.verifications?.delivery;
    
    // Si la dirección no existe o no es válida para entregar paquetes
    if (!delivery || !delivery.success) {
        // Extraemos los errores exactos que da EasyPost (ej. "Apartment number missing", "Zip code invalid")
        const errorDetails = delivery?.errors?.map((e: any) => e.message).join(" | ") || "Invalid address format.";
        return NextResponse.json({
            success: false,
            error: `EasyPost could not verify this address: ${errorDetails}. Please check your Street, City, State, and Zip Code.`,
        }, { status: 400 });
    }

    // Si la dirección pasó la prueba de EasyPost, le damos luz verde al Checkout
    return NextResponse.json({
        success: true,
        address: {
            street1: data.street1,
            city: data.city,
            state: data.state,
            zip: data.zip
        }
    });

  } catch (error: any) {
    console.error("Address Verification Error:", error);
    return NextResponse.json({ success: false, error: "Server connection failed." }, { status: 500 });
  }
}