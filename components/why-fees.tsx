const steps = [
  {
    number: "01",
    title: "No Transport Necessary",
    body: "FEES is performed entirely at bedside — eliminating the cost, risk, and logistical burden of transporting medically fragile residents to an outside facility for a Modified Barium Swallow Study.",
  },
  {
    number: "02",
    title: "No Radiation Exposure",
    body: "Unlike fluoroscopic swallow studies, FEES uses no radiation whatsoever. This makes it safer for repeated assessments and ideal for elderly residents who require ongoing dysphagia monitoring.",
  },
  {
    number: "03",
    title: "Real Foods, Real Results",
    body: "We assess swallowing using your patient's actual diet textures and consistencies — not barium-coated substitutes — producing clinically meaningful results that directly guide care planning.",
  },
  {
    number: "04",
    title: "Immediate, Actionable Findings",
    body: "Results are visible in real time. Preliminary diet and strategy recommendations are shared with your team immediately after the procedure, enabling faster and safer care decisions.",
  },
  {
    number: "05",
    title: "Comprehensive Written Report",
    body: "Every evaluation is followed by a detailed diagnostic report documenting aspiration risk, compensatory strategy effectiveness, diet recommendations, appropriate referrals and therapy suggestions.",
  },
  {
    number: "06",
    title: "Collaborative Care Approach",
    body: "Our clinicians work alongside your in-house SLP or Rehab team — sharing findings, answering questions, and supporting care planning to ensure continuity and the best possible outcomes for your residents.",
  },
]

export function WhyFees() {
  return (
    <section id="why-fees" className="bg-white px-4 md:px-10 py-20">
      <div className="max-w-[920px] mx-auto">
        <span className="text-[0.73rem] uppercase tracking-[0.2em] text-teal font-bold mb-2 block">
          Why Choose FEES
        </span>
        <h2 className="font-serif text-3xl md:text-4xl text-navy mb-4 leading-tight">
          Why FEES? The Advantages Are Clear
        </h2>
        <p className="text-[1.05rem] text-text-light max-w-[640px] mb-12 font-light">
          FEES (Fiberoptic Endoscopic Evaluation of Swallowing) is a cost-effective and convenient
          tool for assessing swallowing disorders that provides direct visualization of the swallow in the patient&apos;s natural eating environment.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative p-8 border border-[#e0e8f0] rounded-lg bg-white transition-all hover:shadow-[0_8px_32px_rgba(26,46,68,0.1)] hover:border-teal-light group overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal to-teal-light scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              <div className="font-serif text-6xl font-bold text-teal/10 leading-none mb-2">
                {step.number}
              </div>
              <h3 className="font-serif text-lg text-navy mb-3 font-semibold">{step.title}</h3>
              <p className="text-[0.93rem] text-text-light">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
