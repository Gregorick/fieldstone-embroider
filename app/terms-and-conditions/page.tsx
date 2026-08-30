import React from 'react';
import Header from '../components/Header'; // Ajusta la ruta si es necesario
import Footer from '../components/Footer'; // Ajusta la ruta si es necesario

export const metadata = {
  title: 'Terms and Conditions | Fieldstone Embroidery',
  description: 'Terms and conditions for purchasing custom embroidery and apparel from Fieldstone Embroidery.',
};

export default function TermsAndConditionsPage() {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-16 text-gray-800">
        <h1 className="text-3xl md:text-4xl font-black mb-8 text-black border-b border-gray-200 pb-4">
          Terms and Conditions
        </h1>

        <div className="space-y-6 text-base leading-relaxed font-medium">
          <p>
            Welcome to <strong className="text-black">Fieldstone Embroidery</strong>. By accessing our website, requesting a quote, or placing an order, you agree to comply with and be bound by the following terms and conditions. Please read them carefully before making a purchase.
          </p>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">1. Orders and Acceptance</h2>
            <p>
              All orders placed through our website are subject to acceptance by Fieldstone Embroidery. We reserve the right to refuse or cancel any order for reasons including, but not limited to, product availability, errors in pricing or product descriptions, or concerns regarding custom artwork rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">2. Custom Artwork and Intellectual Property</h2>
            <p>
              When you submit logos, designs, or text to be embroidered, you represent and warrant that you own all rights to the artwork or have explicit permission to use it. Fieldstone Embroidery assumes no liability for copyright or trademark infringements. We reserve the right to photograph or display completed custom work for promotional purposes unless explicitly requested otherwise in writing by the customer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">3. Pricing, Payments, and Billing</h2>
            <p>
              Prices for our products and services are subject to change without notice. All online transactions are processed securely through our authorized payment processor (Stripe). Full payment is typically required before production begins unless a corporate or pre-approved account agreement states otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">4. Production Proofs and Approvals</h2>
            <p>
              For custom orders, digital mockups or proofs will be provided for your review. Production will not begin until you have approved the final proof. Once approved, the design, spelling, colors, and garment selections are final, and changes cannot be accommodated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">5. Limitation of Liability</h2>
            <p>
              Fieldstone Embroidery shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or website. Our total liability for any claim related to an order shall not exceed the total amount paid by the customer for that specific order.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">6. Changes to Terms</h2>
            <p>
              We reserve the right to update or modify these Terms and Conditions at any time without prior notice. Continued use of our website following any changes constitutes your agreement to follow and be bound by the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">7. Contact Information</h2>
            <p>
              If you have any questions or concerns regarding these Terms and Conditions, please reach out to us:
            </p>
            <div className="mt-3 p-5 bg-gray-50 rounded-xl border border-gray-200 text-sm">
              <p><strong className="text-black">Email:</strong> customerservice@fieldstoneembroidery.com</p>
              <p><strong className="text-black">Phone:</strong> +1 (978) 219-9071</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}