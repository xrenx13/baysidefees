import { Navigation } from "@/components/navigation"
import { Hero, TrustBar } from "@/components/hero"
import { WhyFees } from "@/components/why-fees"
import { Checklists } from "@/components/checklists"
import { WhatToExpect } from "@/components/what-to-expect"
import { Billing } from "@/components/billing"
import { FAQ } from "@/components/faq"
import { Contact, CancellationNotice } from "@/components/contact"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main>
      <Navigation />
      <Hero />
      <TrustBar />
      <WhyFees />
      <Checklists />
      <WhatToExpect />
      <Billing />
      <FAQ />
      <Contact />
      <CancellationNotice />
      <Footer />
    </main>
  )
}
