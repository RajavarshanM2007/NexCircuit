import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'About Us',
  description: 'VIT is a next-generation tech and gadget brand dedicated to engineering high-performance hardware, smart audio, and intelligent devices.',
  alternates:  { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="font-serif text-5xl tracking-luxury text-luxury-white mb-12">About VIT</h1>

      <div className="space-y-10 text-luxury-muted text-sm leading-relaxed tracking-wide">
        <p>
          Founded with a passion for future-ready engineering, VIT designs and delivers cutting-edge
          smart gadgets, high-fidelity audio, wearables, and computing peripherals. We bridge the
          gap between industrial elegance and peak hardware performance.
        </p>

        <section>
          <p className="text-luxury-white text-xs tracking-luxury uppercase mb-3">Our Philosophy</p>
          <p>
            We believe smart technology should be seamless, powerful, and durable. Every device
            undergoes rigorous testing &mdash; from thermal dissipation to wireless latency &mdash;
            ensuring you experience innovation without friction.
          </p>
        </section>

        <section>
          <p className="text-luxury-white text-xs tracking-luxury uppercase mb-3">Precision Engineering</p>
          <p>
            From custom acoustic drivers to aerospace-grade CNC aluminum frames, our hardware is
            crafted using advanced fabrication techniques and certified components built to outlast
            the competition.
          </p>
        </section>

        <section>
          <p className="text-luxury-white text-xs tracking-luxury uppercase mb-3">Innovation & Quality</p>
          <p>
            All VIT devices feature over-the-air firmware support, GaN energy efficiency standards,
            and eco-conscious recyclable packaging designed to reduce electronic waste.
          </p>
        </section>

        <section>
          <p className="text-luxury-white text-xs tracking-luxury uppercase mb-3">Headquarters</p>
          <p>
            VIT Tech Labs, Cyber Innovation Hub, Bengaluru 560100, India.
          </p>
        </section>
      </div>
    </div>
  )
}
