import React from 'react';
import Header from '../components/Header'; // Ajusta la ruta según la estructura de tu proyecto
import Footer from '../components/Footer'; // Ajusta la ruta según la estructura de tu proyecto

export const metadata = {
  title: 'Return Policy | Fieldstone Embroidery',
  description: 'No Return or Refund Policy for Embroidery and Custom Apparel.',
};

export default function ReturnPolicyPage() {
  return (
    <>
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-16 text-gray-800">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900 border-b pb-4">
          No Return or Refund Policy for Embroidery and Custom Apparel
        </h1>

        <div className="space-y-6 text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">1. All Sales Are Final</h2>
            <p>
              At Fieldstone Embroidery, we take pride in creating custom, made-to-order apparel specifically tailored to your needs. Because every item is personalized with custom logos, designs, or text, we cannot restock or resell these items. Therefore, <strong>all sales are final, and we do not accept returns or offer refunds</strong> on any decorated or custom-embroidered apparel.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">2. Order Approval and Proofing</h2>
            <p>
              To ensure your complete satisfaction, we require customer approval on digital proofs before production begins. It is the customer's responsibility to carefully review the proof for:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Spelling and grammar</li>
              <li>Logo placement and sizing</li>
              <li>Thread colors and design accuracy</li>
              <li>Garment style, color, and sizes</li>
            </ul>
            <p className="mt-2">
              Once a proof is approved and the order moves into production, no changes can be made, and the customer assumes full responsibility for the design as approved.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">3. Defective Items or Errors</h2>
            <p>
              While we maintain strict quality control, occasional mistakes or manufacturer defects can happen. We will gladly replace or refund an item <strong>only</strong> under the following circumstances:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>The blank garment itself has a clear manufacturer defect (e.g., holes, broken zippers).</li>
              <li>The embroidery significantly deviates from the final approved digital proof (e.g., wrong logo used, incorrect thread colors used by our error).</li>
              <li>The wrong garment style, color, or size was decorated compared to the original invoice.</li>
            </ul>
            <p className="mt-2">
              Claims for defective items or errors on our part must be submitted within <strong>7 days</strong> of receiving your order. Please inspect your garments immediately upon delivery.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">4. Customer-Supplied Garments</h2>
            <p>
              If you are providing your own garments for embroidery, Fieldstone Embroidery is not responsible for any damage that may occur during the embroidery process. Embroidery machines are industrial equipment, and occasionally, garments can be damaged. We do not replace or refund customer-supplied items under any circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">5. Reporting an Issue</h2>
            <p>
              If you believe your order falls under our exceptions for defective items or errors, please contact us immediately at <strong>dmarra@fieldstoneembroidery.com</strong> or call us at <strong>+1 (978) 219-9071</strong>. Please include your order number and clear photos of the issue so our team can resolve it as quickly as possible.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}