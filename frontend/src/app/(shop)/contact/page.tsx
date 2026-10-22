import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Contact Us',
  description: 'Get in touch with VIT. Our support team is available to assist with orders, device technical specs, and warranty enquiries.',
  alternates:  { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="font-serif text-5xl tracking-luxury text-luxury-white mb-12">Contact Us</h1>

      <div className="space-y-10 text-luxury-muted text-sm leading-relaxed tracking-wide">
        <p>
          We&apos;d love to hear from you. Whether you have a question about device specifications,
          firmware updates, shipping, or want to share feedback, our technical support team is here to help.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <p className="text-luxury-white text-xs tracking-luxury uppercase mb-3">Customer & Tech Support</p>
            <p>Email: <a href="mailto:support@vit.com" className="text-luxury-gold hover:underline">support@vit.com</a></p>
            <p>Phone: +91 80 4000 1234</p>
            <p>Hours: Mon&ndash;Sat, 9:00 AM &ndash; 8:00 PM IST</p>
          </div>

          <div>
            <p className="text-luxury-white text-xs tracking-luxury uppercase mb-3">Head Office</p>
            <p>VIT Tech Labs Pvt. Ltd.</p>
            <p>Cyber Innovation Hub, Outer Ring Road</p>
            <p>Bengaluru 560100</p>
            <p>India</p>
          </div>
        </div>

        <div>
          <p className="text-luxury-white text-xs tracking-luxury uppercase mb-3">Enterprise &amp; Bulk Enquiries</p>
          <p>Email: <a href="mailto:enterprise@vit.com" className="text-luxury-gold hover:underline">enterprise@vit.com</a></p>
        </div>
      </div>
    </div>
  )
}
