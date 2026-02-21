import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="text-6xl mb-6">&#9878;</div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Clean Slate Agent
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          A free AI assistant that helps you understand if you're eligible to clear your criminal record. Confidential, judgment-free, and available 24/7.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/chat"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors no-underline"
          >
            Check Your Eligibility
          </Link>
          <Link
            to="/employer"
            className="bg-white text-slate-700 px-8 py-3 rounded-lg font-semibold text-lg border border-slate-300 hover:bg-slate-50 transition-colors no-underline"
          >
            For Employers
          </Link>
        </div>
      </div>

      {/* The Problem — Statistics */}
      <div className="bg-slate-800 rounded-2xl p-10 mb-16 text-white">
        <h2 className="text-2xl font-bold text-center mb-2">The Scale of the Problem</h2>
        <p className="text-slate-400 text-center text-sm mb-8 max-w-xl mx-auto">
          Millions of Americans are locked out of jobs, housing, and opportunity by old records the law says can be cleared.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { stat: '70M+', label: 'Americans have a criminal record', sub: 'Nearly 1 in 3 adults' },
            { stat: '93%', label: 'of eligible people never get their records cleared', sub: 'Due to cost, complexity, or lack of awareness' },
            { stat: '$1K–$5K', label: 'typical cost to hire an expungement attorney', sub: 'Out of reach for most affected individuals' },
            { stat: '90%', label: 'of employers run background checks', sub: 'Old records block second chances' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-1">{item.stat}</div>
              <div className="text-sm text-slate-300 font-medium mb-1">{item.label}</div>
              <div className="text-xs text-slate-500">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {[
          {
            icon: '&#128172;',
            title: 'Have a Conversation',
            desc: 'Tell us about your situation in plain language. No legal jargon required.',
          },
          {
            icon: '&#128270;',
            title: 'Get an Assessment',
            desc: 'Our AI reviews your details against state-specific expungement laws across 10 states.',
          },
          {
            icon: '&#9989;',
            title: 'Know Your Options',
            desc: 'Receive clear guidance on eligibility and next steps toward clearing your record.',
          },
        ].map((step, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 text-center">
            <div className="text-3xl mb-3" dangerouslySetInnerHTML={{ __html: step.icon }} />
            <h3 className="font-semibold text-slate-800 mb-2">{step.title}</h3>
            <p className="text-slate-600 text-sm">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Privacy + Trust */}
      <div className="bg-blue-50 rounded-xl p-8 border border-blue-100">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 text-center">
          Built on Privacy & Trust
        </h2>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-700">
          <div className="flex gap-3">
            <span className="text-blue-600 mt-0.5">&#128274;</span>
            <div>
              <strong>Encrypted Case Files</strong>
              <p className="text-slate-500 mt-1">Your conversation is encrypted with AES-256 and stored securely. Only you can access your case details.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-600 mt-0.5">&#128737;</span>
            <div>
              <strong>Privacy-Preserving Credentials</strong>
              <p className="text-slate-500 mt-1">Powered by Canton Network, employers can verify eligibility without ever seeing your underlying record.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-600 mt-0.5">&#128176;</span>
            <div>
              <strong>Self-Sustaining Agent</strong>
              <p className="text-slate-500 mt-1">The agent operates its own wallet on Base, funded by employer assessments. Individual help is always free.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-600 mt-0.5">&#128101;</span>
            <div>
              <strong>Remembers Your Case</strong>
              <p className="text-slate-500 mt-1">Come back anytime and pick up where you left off. No starting from scratch.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-slate-400 mt-12">
        Clean Slate Agent provides general legal information, not legal advice. Always consult a qualified attorney for specific legal guidance.
      </p>
    </div>
  )
}
