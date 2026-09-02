import React from 'react';
import Header from '../components/Header'; // Ajusta la ruta si es necesario
import Footer from '../components/Footer'; // Ajusta la ruta si es necesario

export const metadata = {
  title: 'Privacy Policy | Fieldstone Embroidery',
  description: 'Learn how Fieldstone Embroidery collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-16 text-gray-800">
        <h1 className="text-3xl md:text-4xl font-black mb-8 text-black border-b border-gray-200 pb-4">
          Privacy Policy
        </h1>

        <div className="space-y-6 text-base leading-relaxed font-medium">
          <p>
            At <strong className="text-black">Fieldstone Embroidery</strong>, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy outlines how we collect, use, and safeguard the data you provide to us when visiting our website or making a purchase.
          </p>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">1. Information We Collect</h2>
            <p>
              When you visit our website, request a quote, or place an order, we may collect the following information:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-black">Personal Information:</strong> Your name, email address, phone number, and billing/shipping address.</li>
              <li><strong className="text-black">Order Details:</strong> Information regarding the custom apparel, logos, and specifications you request.</li>
              <li><strong className="text-black">Device Information:</strong> Basic analytics such as your IP address, browser type, and operating system to improve our website experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">2. Payment Processing & Security</h2>
            <p>
              We take your financial security very seriously. All online payments are processed securely through our authorized payment gateway (Stripe). <strong className="text-black">Fieldstone Embroidery does not store, process, or have direct access to your raw credit card numbers.</strong> Your sensitive payment data is encrypted and handled directly by the payment processor in compliance with strict PCI-DSS standards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">3. How We Use Your Information</h2>
            <p>
              The information we collect is strictly used to provide and improve our services to you. We use your data to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Process and fulfill your custom embroidery orders.</li>
              <li>Communicate with you regarding order approvals, digital proofs, and shipping updates.</li>
              <li>Respond to customer service inquiries or refund requests.</li>
              <li>Improve our website performance and product offerings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">4. Sharing Your Information</h2>
            <p>
              <strong className="text-black">We do not sell, rent, or trade your personal information to third parties.</strong> We only share necessary information with trusted third-party service providers who assist us in operating our business, such as:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Shipping carriers (e.g., USPS, UPS, FedEx) to deliver your orders.</li>
              <li>Our secure payment processor (Stripe) to facilitate transactions.</li>
            </ul>
            <p className="mt-2">
              These partners are obligated to keep your information confidential and use it only for the services they provide to us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">5. Your Consent and Rights</h2>
            <p>
              By using our website and placing an order, you consent to the collection and use of your information as described in this policy. If you would like to request the deletion of your personal data or have questions about what information we have on file, please reach out to us directly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-black">6. Contact Us</h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy or how your data is handled, please contact us at:
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