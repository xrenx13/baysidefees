import Link from "next/link"

const footerLinks = [
  { href: "#why-fees", label: "Why FEES" },
  { href: "#checklists", label: "Referral Process" },
  { href: "#what-to-expect", label: "What to Expect" },
  { href: "#billing", label: "Billing" },
  { href: "#faqs", label: "FAQ's" },
  { href: "#contact", label: "Contact" },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#0f1d2d] text-white/55 px-4 md:px-10 py-8 text-center text-[0.83rem]">
      <div className="max-w-[900px] mx-auto flex flex-col items-center gap-3">
        <div className="font-serif text-base text-white/80">Bayside Dysphagia Diagnostics</div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/60 hover:text-gold-light transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div>
          &copy; {currentYear} Bayside Dysphagia Diagnostics &middot; Cape Cod &amp; South Shore,
          Massachusetts &middot; All Rights Reserved
        </div>

        <div className="flex gap-4">
          <Link href="#" className="text-white/60 hover:text-gold-light transition-colors">
            Privacy Policy
          </Link>
          <span className="text-white/30">|</span>
          <Link href="#" className="text-white/60 hover:text-gold-light transition-colors">
            Accessibility
          </Link>
        </div>
      </div>
    </footer>
  )
}
