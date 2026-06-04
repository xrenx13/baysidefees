import { CheckCircle } from "lucide-react"

const referralSteps = [
  {
    title: "Identify the Need",
    body: "Typically determined by a Physician, SLP, or Nurse based on clinical observation or patient complaint.",
  },
  {
    title: "Obtain a Physician's Order",
    body: 'The order should read: "FEES procedure for Dysphagia" (CPT codes 92612 and 92526).',
  },
  {
    title: "Billing Authorization",
    body: "If the patient has Managed Care or Private Insurance, obtain prior authorization from your Facility's Business Office before scheduling.",
  },
  {
    title: "Contact Us",
    body: "Call, fax, or email to initiate the referral. We'll confirm scheduling and provide any forms needed.",
  },
]

const preparationSteps = [
  {
    title: "Physician Order",
    body: "Ensure order is available for our clinician to review.",
  },
  {
    title: "Patient Positioning",
    body: "Position the patient as they would normally be during meals (wheelchair, bed, chair) for the most realistic results.",
  },
  {
    title: "PO Trial Resources Ready",
    body: "Please have available: ice chips, nectar-thick liquid, thin liquid, purée (applesauce, pudding), mixed texture (canned fruit), and regular texture (cracker or cookie).",
  },
  {
    title: "Facility Representative Available",
    body: "A staff member (SLP or Rehab Director) should be on hand to observe and collaborate during the evaluation.",
  },
]

export function Checklists() {
  return (
    <section id="checklists" className="bg-gray-light px-4 md:px-10 py-20">
      <div className="max-w-[920px] mx-auto">
        <span className="text-[0.73rem] uppercase tracking-[0.2em] text-teal font-bold mb-2 block">
          Referral &amp; Preparation
        </span>
        <h2 className="font-serif text-3xl md:text-4xl text-navy mb-4 leading-tight">
          Easy Referral Process &amp; Facility Checklist
        </h2>
        <p className="text-[1.05rem] text-text-light max-w-[640px] mb-12 font-light">
          Following these steps ensures a smooth evaluation experience for your patients and staff.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Referral Process */}
          <div className="bg-white rounded-lg p-8 border border-[#dde5ef] shadow-[0_2px_12px_rgba(26,46,68,0.05)]">
            <h3 className="font-serif text-xl text-navy mb-5 pb-3 border-b-2 border-teal">
              Easy Referral Process
            </h3>
            <div className="space-y-4">
              {referralSteps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                  <div className="text-[0.92rem] text-text-primary">
                    <strong>{step.title}</strong> — {step.body}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preparation */}
          <div className="bg-white rounded-lg p-8 border border-[#dde5ef] shadow-[0_2px_12px_rgba(26,46,68,0.05)]">
            <h3 className="font-serif text-xl text-navy mb-5 pb-3 border-b-2 border-teal">
              Preparing for Our Arrival
            </h3>
            <div className="space-y-4">
              {preparationSteps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                  <div className="text-[0.92rem] text-text-primary">
                    <strong>{step.title}</strong> — {step.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
