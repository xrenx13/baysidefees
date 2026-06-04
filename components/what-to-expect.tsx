const timelineItems = [
  {
    title: "Arrival & Setup",
    description:
      "Our clinician arrives with all necessary equipment and conducts a thorough review of the patient's medical chart before the evaluation begins.",
  },
  {
    title: "Patient Consultation & Prep",
    description:
      "We discuss the FEES procedure with the patient and complete any additional patient preparation work needed to ensure comfort and accuracy.",
  },
  {
    title: "FEES Evaluation",
    description:
      "The endoscopist passes the endoscope transnasally and guides your facility's representative through the PO presentations. Both the patient and facility representative may observe the video in real time.",
  },
  {
    title: "Compensatory Strategies & Positioning",
    description:
      "During the FEES, we assess compensatory strategies and positioning techniques to determine the safest and most appropriate diet for your patient.",
  },
  {
    title: "Detailed Diagnostic Report",
    description:
      "We review the video recording and produce a comprehensive report including PO recommendations, compensatory strategies, therapy suggestions, and any referral recommendations as needed.",
  },
  {
    title: "Results Debrief & Care Planning",
    description:
      "Our clinician will discuss results with an appropriate facility representative and collaborates with your SLP on treatment planning.",
  },
  {
    title: "Documentation & Invoicing",
    description:
      "Our clinician will then review the video and complete a detailed diagnostic report, including PO recommendations, strategies, therapy suggestions, and potential referral recommendations. An invoice for billed services will follow.",
  },
]

export function WhatToExpect() {
  return (
    <section id="what-to-expect" className="bg-white px-4 md:px-10 py-20">
      <div className="max-w-[920px] mx-auto">
        <span className="text-[0.73rem] uppercase tracking-[0.2em] text-teal font-bold mb-2 block">
          Day-of Evaluation
        </span>
        <h2 className="font-serif text-3xl md:text-4xl text-navy mb-4 leading-tight">
          What to Expect Once We Arrive
        </h2>
        <p className="text-[1.05rem] text-text-light max-w-[640px] mb-12 font-light">
          Our clinicians work efficiently and collaboratively with your team, keeping patients
          comfortable throughout the process.
        </p>

        <div className="relative pl-10">
          {/* Timeline line */}
          <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-teal to-teal/15" />

          <div className="space-y-8">
            {timelineItems.map((item, index) => (
              <div key={index} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-10 top-6 w-3.5 h-3.5 rounded-full bg-teal border-[3px] border-white shadow-[0_0_0_2px_var(--teal)]" />

                <div className="bg-cream rounded-lg p-6 border-l-[3px] border-teal">
                  <h4 className="font-serif text-[1.05rem] text-navy mb-1">{item.title}</h4>
                  <p className="text-[0.92rem] text-text-light">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
