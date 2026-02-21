import { useState } from 'react'

const faqs = [
  {
    category: 'For Individuals',
    questions: [
      {
        q: 'What is expungement or record sealing?',
        a: 'Expungement and record sealing are legal processes that remove or hide a criminal record from public view. The terminology varies by state — Colorado calls it "sealing," California calls it "dismissal," Texas calls it "expunction." The effect is similar: once your record is cleared, it generally won\'t appear on background checks, and in most cases you can legally say you were not convicted.',
      },
      {
        q: 'Is this service free?',
        a: 'Yes, always. Clean Slate Agent is free for individuals. The service is funded by small micropayments from employers who use the verification feature. You will never be charged for an eligibility assessment, a credential, or any other service.',
      },
      {
        q: 'What states do you cover?',
        a: 'We currently cover 10 states: Colorado, California, Texas, New York, Florida, Illinois, Pennsylvania, Ohio, Michigan, and Georgia. Each state has different eligibility rules, waiting periods, and terminology, and the agent understands all of them.',
      },
      {
        q: 'Is my information private?',
        a: 'Yes. Your conversation is encrypted with AES-256 and stored securely. When a credential is created, it uses Canton Network\'s sub-transaction privacy — this means employers can verify your eligibility without ever seeing your offense, conviction date, or any detail of your record. The privacy is cryptographic, not just access control.',
      },
      {
        q: 'What happens after I\'m found eligible?',
        a: 'When the agent determines you\'re eligible for expungement, it creates a privacy-preserving credential on the Canton Network. You receive a Credential ID that you can share with potential employers. They can verify that you\'re eligible for employment consideration without seeing any details of your underlying record.',
      },
      {
        q: 'Can I upload my RAP sheet?',
        a: 'Yes. You can take a photo of your criminal history record (RAP sheet) and upload it directly in the chat. The AI will read and extract the relevant details — state, offense type, date, sentence — and use them to assess your eligibility. This is often faster and more accurate than describing your situation from memory.',
      },
      {
        q: 'Is this legal advice?',
        a: 'No. Clean Slate Agent provides general legal information based on publicly available state statutes, not legal advice. It does not create an attorney-client relationship. The assessment is a starting point — we always recommend consulting a qualified attorney or legal aid organization for guidance specific to your situation.',
      },
      {
        q: 'Can I come back later and continue?',
        a: 'Yes. Your session is saved and encrypted. When you return, the agent remembers your case details and can pick up right where you left off. You don\'t need to re-enter your information.',
      },
    ],
  },
  {
    category: 'For Employers',
    questions: [
      {
        q: 'How do I verify a candidate\'s eligibility?',
        a: 'A candidate who has been assessed by Clean Slate Agent will share a Credential ID with you. Enter that ID on the Employer Verification page. You\'ll receive a simple result: "eligible for employment consideration" or "not eligible." No record details are transmitted at any point.',
      },
      {
        q: 'What information do I see during verification?',
        a: 'Only one thing: whether the candidate is eligible for employment consideration. You do not see the offense type, conviction date, jurisdiction, sentence details, or any other information about the underlying record. This is by design — Canton Network\'s sub-transaction privacy ensures that the data is cryptographically invisible to your party.',
      },
      {
        q: 'How much does verification cost?',
        a: 'Verification costs $0.10 USDC, paid via the x402 protocol on Base Sepolia. This is handled automatically — your client signs a payment authorization, attaches it to the verification request, and receives the result in a single flow. This small fee funds the agent\'s operating costs, keeping the service free for individuals.',
      },
      {
        q: 'What technology ensures the privacy guarantees?',
        a: 'The credential is stored on the Canton Network, a privacy-first blockchain built with Daml smart contracts. Canton\'s sub-transaction privacy model means that different parties to the same contract literally see different data — it\'s not permissions or access control, it\'s a property of the ledger itself. The employer\'s node cannot see redacted fields even if they try.',
      },
    ],
  },
]

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-4 px-1 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors rounded-lg"
      >
        <span className="font-medium text-slate-800 text-sm">{question}</span>
        <span className="text-slate-400 text-xl shrink-0 w-6 text-center leading-none">
          {open ? '\u2212' : '+'}
        </span>
      </button>
      {open && (
        <div className="pb-4 px-1 text-sm text-slate-600 leading-relaxed animate-fade-in">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Frequently Asked Questions</h1>
        <p className="text-slate-500 text-sm max-w-lg mx-auto">
          Everything you need to know about Clean Slate Agent, how it works, and how your privacy is protected.
        </p>
      </div>

      {faqs.map((section) => (
        <div key={section.category} className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span className="text-blue-600">
              {section.category === 'For Individuals' ? '\u2696' : '\uD83C\uDFE2'}
            </span>
            {section.category}
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 px-5">
            {section.questions.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      ))}

      <div className="text-center mt-10">
        <p className="text-sm text-slate-500 mb-4">Still have questions?</p>
        <a
          href="/chat"
          className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors no-underline"
        >
          Talk to the Agent
        </a>
      </div>
    </div>
  )
}
