import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { orderId, status, email, name, trackingUrl } = await req.json();

    if (!orderId || !status || !email) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const shortOrderId = orderId.split('-')[0].toUpperCase();
    const clientName = name || 'Valued Customer';
    
    let subject = '';
    let headline = '';
    let message = '';

    switch (status) {
      case 'shipped':
        subject = `Your Order #${shortOrderId} is on its way! 🚚`;
        headline = 'Order Shipped';
        message = `Great news! Your order <strong>#${shortOrderId}</strong> has been shipped and is currently on its way to you.`;
        break;
      
      case 'ready_for_pickup':
        subject = `Your Order #${shortOrderId} is Ready for Pickup! 📍`;
        headline = 'Ready for Pickup';
        message = `Great news! Your custom items for order <strong>#${shortOrderId}</strong> are finished and ready for you to pick up.<br/><br/>
        Please visit our facility at your earliest convenience:<br/>
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin-top: 15px;">
          <h4 style="margin: 0 0 8px 0; color: #065f46; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Fieldstone Embroidery</h4>
          <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.5;">104 Kingston St<br/>Lawrence, MA 01843</p>
        </div>`;
        break;

      case 'delivered':
        subject = `Your Order #${shortOrderId} has been delivered! 🎁`;
        headline = 'Order Delivered';
        message = `Excellent news! Your order <strong>#${shortOrderId}</strong> has been successfully delivered. We hope you love your custom items!`;
        break;

      case 'completed':
        subject = `Your Order #${shortOrderId} is complete! ✅`;
        headline = 'Order Completed';
        message = `Your order <strong>#${shortOrderId}</strong> has been marked as completed. Thank you for trusting Fieldstone Embroidery for your custom apparel needs.`;
        break;

      default:
        subject = `Update on your Order #${shortOrderId}`;
        headline = 'Order Update';
        message = `The status of your order <strong>#${shortOrderId}</strong> has been updated to: <span style="text-transform: uppercase; font-weight: bold; color: #3b5bdb;">${status}</span>.`;
    }

    const trackingHtmlBlock = (trackingUrl && status !== 'ready_for_pickup') ? `
      <div style="margin: 35px 0; text-align: center;">
        <a href="${trackingUrl}" target="_blank" style="background-color: #3b5bdb; color: #ffffff; text-decoration: none; padding: 16px 32px; font-weight: 900; border-radius: 8px; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          Track Your Package
        </a>
      </div>
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #f3f4f6;">
        <p style="font-size: 12px; color: #6b7280; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Tracking Link (if button fails):</p>
        <a href="${trackingUrl}" target="_blank" style="font-size: 13px; color: #3b5bdb; word-break: break-all;">${trackingUrl}</a>
      </div>
    ` : ''; 

    const emailResult = await resend.emails.send({
      from: 'Fieldstone Embroidery <info@fieldstoneembroidery.com>',
      replyTo: 'gregorick.liriano@gmail.com',                       
      to: email,
      subject: subject,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #000; color: #fff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">${headline}</h1>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; margin-bottom: 20px; color: #111827;">Hi <strong>${clientName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
              ${message}
            </p>
            
            ${trackingHtmlBlock}
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">Thank you for choosing Fieldstone Embroidery!</p>
          </div>
        </div>
      `,
    });

    if (emailResult.error) {
      console.error("Error sending status update email:", emailResult.error);
      return NextResponse.json({ error: emailResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Notification email sent successfully." });

  } catch (error: any) {
    console.error("Status Notify API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}