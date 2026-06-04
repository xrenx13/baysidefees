import Link from "next/link"
import { CheckCircle } from "lucide-react"

export function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-navy via-navy-light to-[#1d4a5e] px-4 md:px-10 pt-24 pb-20 overflow-hidden">
      {/* Background gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 80% 20%, rgba(42,127,127,0.18) 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, rgba(201,151,62,0.10) 0%, transparent 50%)",
        }}
      />

      {/* Wave at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 bg-white"
        style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }}
      />

      <div className="relative z-10 max-w-[860px] mx-auto text-center">
        <div className="fade-up inline-block bg-gold/15 border border-gold/40 text-gold-light text-xs uppercase tracking-[0.18em] font-semibold px-4 py-1.5 rounded-full mb-6">
          Serving Nursing Homes &amp; SNFs — Cape Cod &amp; South Shore
        </div>

        <h1 className="fade-up delay-1 font-serif text-4xl md:text-5xl lg:text-[3.4rem] font-bold text-white leading-tight mb-5">
          <span className="text-gold-light">Bayside Dysphagia Diagnostics</span>
        </h1>

        <p className="fade-up delay-2 text-lg text-white/70 max-w-[600px] mx-auto mb-10 font-light leading-relaxed">
          We bring certified, mobile FEES evaluations directly to your facility — so your patients
          receive timely, accurate dysphagia diagnostics without leaving the building.
        </p>

        <div className="fade-up delay-3 flex flex-wrap gap-4 justify-center">
          <Link
            href="#why-fees"
            className="inline-block bg-gold text-navy px-8 py-3.5 rounded font-bold text-[0.95rem] tracking-wide border-2 border-gold transition-all hover:bg-gold-light hover:border-gold-light hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(201,151,62,0.35)]"
          >
            Why Choose FEES
          </Link>
          <Link
            href="#contact"
            className="inline-block bg-transparent text-white px-8 py-3.5 rounded font-semibold text-[0.95rem] border-2 border-white/40 transition-all hover:border-white hover:bg-white/10"
          >
            Contact Our Team
          </Link>
        </div>
      </div>
    </section>
  )
}

export function TrustBar() {
  const trustItems = [
    "CCC-SLP Certified Clinicians",
    "Fully Mobile — No Transport Required",
    "HIPAA Compliant Reporting",
    "Serving All of South Shore & Cape Cod",
  ]

  return (
    <div className="bg-cream border-b border-[#e0dbd3] px-4 md:px-10 py-5">
      <div className="max-w-[900px] mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {trustItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <div className="hidden md:block w-px h-6 bg-[#ccc] -ml-5 mr-5" />
            )}
            <CheckCircle className="w-5 h-5 text-teal flex-shrink-0" />
            <span className="text-[0.85rem] font-semibold text-navy tracking-wide">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
