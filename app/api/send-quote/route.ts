import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      customerName, 
      customerEmail, 
      customerPhone, 
      productTitle, 
      productStyle, 
      selectedColor, 
      selectedSize, 
      decorationMethod, 
      locations, 
      quantity, 
      logoUrl, 
      extraComments 
    } = body;

    // Procesar adjunto de forma segura si es un Base64 válido
    let attachments: any[] = [];
    if (logoUrl && typeof logoUrl === 'string' && logoUrl.includes('base64,')) {
      try {
        const base64Data = logoUrl.split('base64,')[1];
        const mimeType = logoUrl.split(';')[0].replace('data:', '');
        const extension = mimeType.split('/')[1] || 'png';

        if (base64Data) {
          attachments.push({
            filename: `customer-logo-${productStyle}.${extension}`,
            content: Buffer.from(base64Data, 'base64')
          });
        }
      } catch (e) {
        console.error("Error parsing base64 logo for email attachment:", e);
      }
    }

    const data = await resend.emails.send({
      from: 'Fieldstone Embroidery <info@fieldstoneembroidery.com>',
      to: ['customer@fieldstoneembroidery.com'],
      cc: ['Gregorick.liriano@gmail.com'],
      subject: `New Quote Request (500+ pcs) - ${productTitle}`,
      html: `
        <h2>New Quote Request Received</h2>
        <p><strong>Customer Name:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Phone:</strong> ${customerPhone}</p>
        <hr />
        <h3>Product Details:</h3>
        <ul>
          <li><strong>Product:</strong> ${productTitle} (Style: ${productStyle})</li>
          <li><strong>Color:</strong> ${selectedColor}</li>
          <li><strong>Size:</strong> ${selectedSize}</li>
          <li><strong>Decoration Method:</strong> ${decorationMethod}</li>
          <li><strong>Locations:</strong> ${locations}</li>
          <li><strong>Quantity:</strong> ${quantity} units</li>
          <li><strong>Extra Comments:</strong> ${extraComments || 'None'}</li>
        </ul>
        ${logoUrl && !logoUrl.startsWith('data:application/pdf') ? `<p><strong>Uploaded Logo Preview:</strong><br/><img src="${logoUrl}" alt="Logo" style="max-width:200px; max-height:200px;"/></p>` : '<p><strong>Logo format:</strong> PDF or Document attached.</p>'}
      `,
      attachments: attachments.length > 0 ? attachments : undefined
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Resend API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}