"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

const navLinks = [
  { href: "#why-fees", label: "Why FEES" },
  { href: "#checklists", label: "Referral Process" },
  { href: "#what-to-expect", label: "What to Expect" },
  { href: "#billing", label: "Billing" },
  { href: "#faqs", label: "FAQ's" },
]

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-navy shadow-[0_2px_20px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between px-4 md:px-10 h-[68px]">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-tight">
          <span className="font-serif text-[1.35rem] font-bold text-white tracking-tight">
            Bayside Dysphagia Diagnostics
          </span>
          <span className="text-[0.8rem] text-gold-light uppercase tracking-[0.12em] font-medium">
            Mobile FEES · Cape Cod &amp; South Shore
          </span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-white/80 text-[0.88rem] font-medium px-3 py-2 rounded transition-all hover:text-gold-light hover:bg-white/5"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="#contact"
              className="ml-2 bg-gold text-navy font-semibold text-[0.88rem] px-4 py-2 rounded transition-all hover:bg-gold-light"
            >
              Contact Us
            </Link>
          </li>
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy border-t border-white/10 pb-4">
          <ul className="flex flex-col px-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block text-white/80 text-[0.95rem] font-medium px-3 py-3 border-b border-white/5 transition-all hover:text-gold-light"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-3">
              <Link
                href="#contact"
                className="block text-center bg-gold text-navy font-semibold text-[0.95rem] px-4 py-3 rounded transition-all hover:bg-gold-light"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  )
}
