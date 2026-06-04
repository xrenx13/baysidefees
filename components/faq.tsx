"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "What is a FEES evaluation?",
    answer:
      "FEES stands for Fiberoptic Endoscopic Evaluation of Swallowing. It is a comprehensive diagnostic, bedside procedure performed by a certified Speech-Language Pathologist (SLP). A thin, flexible endoscope is gently passed through the nose to visualize the throat and larynx during swallowing. The procedure allows clinicians to directly observe whether food or liquid is entering the airway (aspiration) and assess the safety and efficiency of a patient's swallow function.",
  },
  {
    question: "Why choose FEES over a Modified Barium Swallow Study (MBSS)?",
    answer:
      "FEES can be performed right at your facility — no transport required. This is especially valuable for medically fragile patients in SNFs and nursing homes. FEES uses no radiation, can be performed at bedside in any position, and allows real-time assessment using actual food and liquid textures from the patient's diet. Results are available immediately, and the procedure is generally well-tolerated.",
  },
  {
    question: "Who can refer a patient for a FEES evaluation?",
    answer:
      'A referring physician must provide a written order for the FEES procedure (CPT codes 92612 and 92526). The need for the evaluation is typically identified by a Speech-Language Pathologist, Registered Nurse, Dietitian, or Physician based on clinical signs of dysphagia such as coughing during meals, unexplained weight loss, recurrent aspiration pneumonia, or a patient\'s self-reported difficulty swallowing.',
  },
  {
    question: "How is a FEES evaluation billed?",
    answer:
      "Bayside Dysphagia Diagnostics bills for the FEES procedure (CPT 92612) and the dysphagia treatment/evaluation component (CPT 92526). For patients covered by Medicare Part B, these services are billed directly to Medicare. For patients with Managed Care or private insurance, prior authorization should be obtained by your facility's Business Office before scheduling. Our team is happy to assist with billing questions.",
  },
  {
    question: "Is the procedure safe? What are the risks?",
    answer:
      "FEES is a minimally invasive, well-tolerated procedure with an excellent safety record. It is performed by our CCC-SLP certified clinicians following strict infection control protocols. Potential side effects are rare but may include mild nasal discomfort or, very rarely, a vasovagal response. We review each patient's medical history prior to the evaluation and will advise if any contraindications exist.",
  },
  {
    question: "How long does a FEES evaluation take?",
    answer:
      "A typical FEES evaluation takes approximately 30–45 minutes from setup to completion, including chart review, patient preparation, the procedure itself, and equipment disinfection. Results and preliminary recommendations are shared with your facility representative immediately following the evaluation. A full written report is provided shortly thereafter.",
  },
  {
    question: "What geographic areas do you serve?",
    answer:
      "Bayside Dysphagia Diagnostics provides mobile FEES evaluations throughout the South Shore and Cape Cod regions of Massachusetts, including nursing homes, skilled nursing facilities (SNFs), long-term care facilities, and assisted living communities. If you're unsure whether your facility is within our service area, please contact us and we'll be happy to confirm.",
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faqs" className="bg-cream px-4 md:px-10 py-20">
      <div className="max-w-[920px] mx-auto">
        <span className="text-[0.73rem] uppercase tracking-[0.2em] text-teal font-bold mb-2 block">
          Common Questions
        </span>
        <h2 className="font-serif text-3xl md:text-4xl text-navy mb-4 leading-tight">
          Frequently Asked Questions
        </h2>
        <p className="text-[1.05rem] text-text-light max-w-[640px] mb-12 font-light">
          Have questions about FEES evaluations or partnering with Bayside Dysphagia Diagnostics?
          We&apos;ve answered the most common ones below.
        </p>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white border border-[#dde5ef] rounded-lg overflow-hidden transition-shadow hover:shadow-[0_4px_18px_rgba(26,46,68,0.08)]"
            >
              <button
                onClick={() => toggleFaq(index)}
                aria-expanded={openIndex === index}
                className={cn(
                  "w-full bg-transparent border-0 px-6 py-5 flex items-center justify-between gap-4 cursor-pointer text-left text-base font-semibold text-navy transition-colors hover:bg-gray-light",
                  openIndex === index && "text-teal"
                )}
              >
                {faq.question}
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-teal flex-shrink-0 transition-transform duration-300",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  openIndex === index ? "max-h-[600px] pb-5 px-6" : "max-h-0 px-6"
                )}
              >
                <p className="text-[0.95rem] text-text-light leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
