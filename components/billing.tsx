"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

type TabId = "overview" | "reports" | "facility" | "insurance" | "cpt"

const tabs = [
  { id: "overview" as TabId, label: "Overview" },
  { id: "reports" as TabId, label: "Reports & Documentation" },
  { id: "facility" as TabId, label: "Facility Billing" },
  { id: "insurance" as TabId, label: "Insurance by Plan Type" },
  { id: "cpt" as TabId, label: "CPT & ICD-10 Codes" },
]

function BillingPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-teal/10 text-teal rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide font-mono mr-1">
      {children}
    </span>
  )
}

function BillingCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg p-8 border border-[#dde5ef] shadow-[0_2px_12px_rgba(26,46,68,0.05)] relative overflow-hidden transition-all hover:shadow-[0_8px_32px_rgba(26,46,68,0.1)] hover:border-teal-light group">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal to-teal-light scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
      <h4 className="font-serif text-xl text-navy mb-4 pb-3 border-b-2 border-teal">{title}</h4>
      {children}
    </div>
  )
}

function InsuranceCard({
  badge,
  badgeType,
  title,
  children,
}: {
  badge: string
  badgeType: "consolidated" | "billable" | "preauth"
  title: string
  children: React.ReactNode
}) {
  const badgeColors = {
    consolidated: "bg-red-100 text-red-700",
    billable: "bg-green-100 text-green-700",
    preauth: "bg-orange-100 text-orange-700",
  }

  return (
    <div className="bg-white rounded-lg p-8 border border-[#dde5ef] shadow-[0_2px_12px_rgba(26,46,68,0.05)] relative overflow-hidden transition-all hover:shadow-[0_8px_32px_rgba(26,46,68,0.1)] hover:border-teal-light group">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal to-teal-light scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
      <span
        className={cn(
          "inline-block text-[0.72rem] font-bold px-2 py-0.5 rounded mb-2 uppercase tracking-wide",
          badgeColors[badgeType]
        )}
      >
        {badge}
      </span>
      <h4 className="font-serif text-xl text-navy mb-4 pb-3 border-b-2 border-teal">{title}</h4>
      {children}
    </div>
  )
}

export function Billing() {
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  return (
    <section id="billing" className="bg-gray-light px-4 md:px-10 py-20">
      <div className="max-w-[920px] mx-auto">
        <span className="text-[0.73rem] uppercase tracking-[0.2em] text-teal font-bold mb-2 block">
          Financial Reference Guide
        </span>
        <h2 className="font-serif text-3xl md:text-4xl text-navy mb-4 leading-tight">
          FEES Billing Information
        </h2>
        <p className="text-[1.05rem] text-text-light max-w-[640px] mb-8 font-light">
          A quick-reference billing guide for facility administrators, SLPs, and Directors of
          Rehabilitation. Select a topic below.
        </p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-[#dde5ef] pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "bg-white border border-[#dde5ef] border-b-[3px] -mb-0.5 px-4 py-2.5 text-[0.9rem] font-semibold cursor-pointer transition-all rounded-t tracking-wide shadow-[0_1px_4px_rgba(26,46,68,0.04)]",
                activeTab === tab.id
                  ? "text-navy border-b-teal border-t-[3px] border-t-teal bg-white"
                  : "text-text-light border-b-transparent hover:text-teal hover:bg-gray-light hover:border-teal-light"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Panel */}
        {activeTab === "overview" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <BillingCard title="How BDD Charges Work">
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  BDD contracts directly with your facility at a{" "}
                  <strong>flat per-procedure rate</strong>. We do not bill residents or any
                  insurance plan. Our contract for FEES services is between BDD and the facility —
                  for services and payment.
                </p>
              </BillingCard>
              <BillingCard title="BDD Is Not a Third-Party Biller">
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  All insurance billing is the facility&apos;s responsibility. Because a FEES
                  evaluation is a therapy service performed by a therapist under the roof of your
                  facility, <strong>consolidated billing rules apply</strong>.
                </p>
              </BillingCard>
              <BillingCard title="The Facility Is Always the Provider">
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  The FEES is a swallowing evaluation performed by a therapist in your facility.
                  Accordingly, the facility is the billing provider for any insurance reimbursement
                  — not BDD.
                </p>
              </BillingCard>
              <BillingCard title="Potential Reimbursement">
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  Under some insurance plans, the facility may capture reimbursement for a portion
                  of the FEES cost (e.g. Medicare B, MCO/HMO — may require prior authorization).
                </p>
              </BillingCard>
            </div>
            <div className="bg-[#fff8ee] border border-[#f0c97a] border-l-4 border-l-gold rounded-lg p-5 shadow-[0_2px_8px_rgba(26,46,68,0.05)]">
              <p className="text-[0.92rem] text-text-primary leading-relaxed">
                <strong className="text-navy">SOC Date:</strong> The FEES can be used as the Start
                of Care (SOC) date for a dysphagia patient. If billed on the same day as{" "}
                <BillingPill>CPT 92610</BillingPill> (Swallow Eval),{" "}
                <BillingPill>CPT 92612</BillingPill> requires <strong>Modifier *59</strong> to
                identify it as a separate and distinct procedure.
              </p>
            </div>
          </div>
        )}

        {/* Reports Panel */}
        {activeTab === "reports" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <BillingCard title="What's Included in Each Receipt">
              <ul className="text-[0.92rem] text-text-primary leading-relaxed list-disc pl-4 space-y-1">
                <li>Resident name</li>
                <li>Date of service</li>
                <li>Applicable CPT code(s)</li>
                <li>Corresponding ICD-10 code(s)</li>
                <li>BDD provider information</li>
              </ul>
            </BillingCard>
            <BillingCard title="Shared Facility Folder">
              <p className="text-[0.92rem] text-text-primary leading-relaxed">
                Following each FEES exam, a detailed receipt is uploaded alongside the FEES report
                to your shared facility folder. This is accessible for <strong>60 days</strong> by
                your facility SLP and/or DOR to download at any time.
              </p>
            </BillingCard>
            <BillingCard title="EHR Documentation Options">
              <p className="text-[0.92rem] text-text-primary leading-relaxed">
                Your facility SLP may bill dysphagia treatment time under{" "}
                <BillingPill>CPT 92526</BillingPill> in your EHR system. Facilities may also add BDD
                SLPs to your EHR to input <BillingPill>CPT 92612</BillingPill> minutes directly —
                ensuring FEES services are captured in your month-end billing and utilization
                reports.
              </p>
            </BillingCard>
          </div>
        )}

        {/* Facility Billing Panel */}
        {activeTab === "facility" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <BillingCard title="How to Bill Insurance for a FEES">
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  To bill insurance, the facility must add <BillingPill>CPT 92612</BillingPill> to
                  their:
                </p>
                <ul className="text-[0.92rem] text-text-primary leading-relaxed list-disc pl-4 mt-2 space-y-1">
                  <li>
                    <strong>UB-04</strong> Institutional Billing (paper form), or
                  </li>
                  <li>
                    <strong>837-I</strong> (electronic claims)
                  </li>
                </ul>
              </BillingCard>
              <BillingCard title="Supporting Diagnosis Code">
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  The supporting ICD-10 code for oropharyngeal dysphagia is:
                </p>
                <p className="mt-2">
                  <span className="inline-block bg-teal/10 text-teal rounded-full px-3 py-1 text-base font-bold tracking-wide font-mono">
                    R13.12
                  </span>
                </p>
                <p className="mt-2 text-[0.92rem] text-text-primary">Oropharyngeal Dysphagia</p>
              </BillingCard>
              <BillingCard title="Private Insurance">
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  FEES is typically treated the same as any rehab evaluation by private insurance
                  plans. If the plan requires pre-authorization for therapy evaluations, the
                  facility may need to request pre-auth for the FEES swallowing evaluation before
                  scheduling.
                </p>
              </BillingCard>
            </div>
            <div className="bg-white border border-[#dde5ef] rounded-lg p-5 shadow-[0_2px_8px_rgba(26,46,68,0.05)]">
              <p className="text-[0.92rem] text-text-light leading-relaxed">
                <strong className="text-navy">Reminder:</strong> Billing of a resident&apos;s
                insurance must be completed by the facility. BDD is not a third-party biller and
                does not submit claims to any payer on the resident&apos;s behalf.
              </p>
            </div>
          </div>
        )}

        {/* Insurance Panel */}
        {activeTab === "insurance" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <InsuranceCard badge="Consolidated Billing" badgeType="consolidated" title="Medicare Part A">
              <p className="text-[0.92rem] text-text-primary leading-relaxed">
                The cost of the procedure is subtracted from the resident&apos;s day rate. It is{" "}
                <strong>not reimbursed separately</strong> under Medicare Part A consolidated billing
                rules.
              </p>
            </InsuranceCard>
            <InsuranceCard badge="Billable Separately" badgeType="billable" title="Medicare Part B">
              <p className="text-[0.92rem] text-text-primary leading-relaxed">
                Therapy procedures including FEES are billable by CPT code. The 2025 Physician Fee
                Schedule averages <strong>$205 reimbursement</strong> for{" "}
                <BillingPill>CPT 92612</BillingPill> in New England.
              </p>
            </InsuranceCard>
            <InsuranceCard badge="Consolidated Billing" badgeType="consolidated" title="MCO / HMO">
              <p className="text-[0.92rem] text-text-primary leading-relaxed">
                The cost of the procedure is subtracted from the resident&apos;s day rate. It is{" "}
                <strong>not reimbursed separately</strong> under managed care consolidated billing
                arrangements.
              </p>
            </InsuranceCard>
            <InsuranceCard badge="Consolidated Billing" badgeType="consolidated" title="Medicaid">
              <p className="text-[0.92rem] text-text-primary leading-relaxed">
                The cost of the procedure is subtracted from the resident&apos;s day rate. It is{" "}
                <strong>not reimbursed separately</strong> under Medicaid consolidated billing rules.
              </p>
            </InsuranceCard>
            <InsuranceCard badge="Pre-Auth May Apply" badgeType="preauth" title="Private Insurance">
              <p className="text-[0.92rem] text-text-primary leading-relaxed">
                Treated the same as any rehab evaluation. If pre-authorization is required for
                therapy evaluations, request pre-auth for the FEES swallowing evaluation. Facility
                bills the resident&apos;s plan directly.
              </p>
            </InsuranceCard>
          </div>
        )}

        {/* CPT Panel */}
        {activeTab === "cpt" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <BillingCard title={<><BillingPill>CPT 92612</BillingPill> FEES Procedure</>}>
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  Fiberoptic endoscopic evaluation of swallowing by cine or video recording. This is
                  the primary procedure code for the FEES evaluation itself. Billed by the facility
                  on the UB-04 or 837-I.
                </p>
              </BillingCard>
              <BillingCard title={<><BillingPill>CPT 92526</BillingPill> Dysphagia Treatment</>}>
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  Treatment of swallowing dysfunction and/or oral function for feeding. The facility
                  SLP may bill this for dysphagia treatment time in your EHR system.
                </p>
              </BillingCard>
              <BillingCard title={<><BillingPill>CPT 92610</BillingPill> Swallow Evaluation</>}>
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  Evaluation of oral and pharyngeal swallowing function. If billed on the same day
                  as CPT 92612, <strong>Modifier *59</strong> is required on 92612 to identify it as
                  a separate and distinct procedure.
                </p>
              </BillingCard>
              <BillingCard title={<><BillingPill>ICD-10 R13.12</BillingPill> Diagnosis Code</>}>
                <p className="text-[0.92rem] text-text-primary leading-relaxed">
                  Oropharyngeal Dysphagia — the supporting diagnosis code used when billing
                  insurance for a FEES evaluation. Include on the UB-04 or electronic claim.
                </p>
              </BillingCard>
            </div>
            <div className="bg-[#fff8ee] border border-[#f0c97a] border-l-4 border-l-gold rounded-lg p-5 shadow-[0_2px_8px_rgba(26,46,68,0.05)]">
              <p className="text-[0.92rem] text-text-primary leading-relaxed">
                <strong className="text-navy">Same-Day Billing Tip:</strong> When CPT 92612 and CPT
                92610 are billed on the same date of service, append <strong>Modifier *59</strong>{" "}
                to CPT 92612 to indicate it is a separate and distinct procedure from the swallowing
                evaluation.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
