import Link from "next/link"
import { Phone, Mail, MapPin, AlertCircle } from "lucide-react"

export function Contact() {
  return (
    <section id="contact" className="relative bg-gradient-to-br from-navy to-navy-light px-4 md:px-10 py-20 overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(42,127,127,0.2) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-[920px] mx-auto text-center">
        <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-white mb-4">
          Ready to Partner With Us?
        </h2>
        <p className="text-[1.05rem] text-white/70 max-w-[540px] mx-auto mb-10 font-light">
          Contact our team today to sign a Service Agreement, schedule your first evaluation, or
          simply learn more about how Bayside Dysphagia Diagnostics can support your patients.
        </p>
        <Link
          href="mailto:info@baysidefees.com"
          className="inline-block bg-gold text-navy px-8 py-3.5 rounded font-bold text-[0.95rem] tracking-wide border-2 border-gold transition-all hover:bg-gold-light hover:border-gold-light hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(201,151,62,0.35)]"
        >
          Get In Touch
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white/5 border border-white/15 rounded-lg p-6 transition-all hover:bg-white/10 hover:border-white/30">
            <Phone className="w-8 h-8 text-gold-light mx-auto mb-3" />
            <h4 className="text-[0.75rem] uppercase tracking-[0.15em] text-gold-light font-semibold mb-1">
              Phone
            </h4>
            <a
              href="tel:+15085348646"
              className="text-[0.95rem] text-white font-medium hover:text-gold-light transition-colors"
            >
              (508) 534-8646
            </a>
          </div>

          <div className="bg-white/5 border border-white/15 rounded-lg p-6 transition-all hover:bg-white/10 hover:border-white/30">
            <Mail className="w-8 h-8 text-gold-light mx-auto mb-3" />
            <h4 className="text-[0.75rem] uppercase tracking-[0.15em] text-gold-light font-semibold mb-1">
              Email
            </h4>
            <a
              href="mailto:info@baysidefees.com"
              className="text-[0.95rem] text-white font-medium hover:text-gold-light transition-colors"
            >
              info@baysidefees.com
            </a>
          </div>

          <div className="bg-white/5 border border-white/15 rounded-lg p-6 transition-all hover:bg-white/10 hover:border-white/30">
            <MapPin className="w-8 h-8 text-gold-light mx-auto mb-3" />
            <h4 className="text-[0.75rem] uppercase tracking-[0.15em] text-gold-light font-semibold mb-1">
              Service Area
            </h4>
            <p className="text-[0.95rem] text-white font-medium">Cape Cod &amp; South Shore</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function CancellationNotice() {
  return (
    <div className="bg-gradient-to-r from-[#f5f9ff] to-gray-light border-t border-b border-[#dde5ef] px-4 md:px-10 py-14">
      <div className="max-w-[720px] mx-auto flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-shrink-0 w-[52px] h-[52px] bg-navy rounded-full flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-gold" />
        </div>
        <div>
          <h3 className="font-serif text-xl text-navy mb-2">
            Rescheduling or Canceling an Evaluation
          </h3>
          <p className="text-[0.95rem] text-text-light leading-relaxed">
            If you need to reschedule or cancel, please contact us as soon as possible.
            Cancellations made with less than <strong className="text-navy">24 hours&apos; notice</strong> due to
            non-emergent circumstances may be subject to a cancellation fee. We understand the
            unpredictable nature of skilled nursing environments and work with you in good faith.
          </p>
        </div>
      </div>
    </div>
  )
}
