import { useState } from 'react'

function PaymentFlowStep({ number, label, detail, isActive, isComplete }) {
  return (
    <div className="text-center flex-shrink-0">
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2 transition-all ${
          isComplete
            ? 'bg-green-500 text-white'
            : isActive
            ? 'bg-blue-600 text-white animate-pulse'
            : 'bg-slate-200 text-slate-400'
        }`}
      >
        {isComplete ? '\u2713' : number}
      </div>
      <div className={`text-xs font-medium ${isActive ? 'text-blue-700' : isComplete ? 'text-green-700' : 'text-slate-500'}`}>
        {label}
      </div>
      <div className="text-[10px] text-slate-400 mt-0.5 max-w-[100px]">{detail}</div>
    </div>
  )
}

function X402PaymentFlow({ paymentInfo, flowStep }) {
  if (flowStep === 0) return null

  const steps = [
    { n: 1, label: 'Request Sent', detail: 'POST /api/employer/verify' },
    { n: 2, label: 'HTTP 402', detail: 'Payment requirements' },
    { n: 3, label: 'Wallet Signs', detail: 'EIP-3009 USDC auth' },
    { n: 4, label: 'Retry + Pay', detail: 'PAYMENT-SIGNATURE' },
    { n: 5, label: 'Verified', detail: 'Result delivered' },
  ]

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 mb-6 animate-fade-in">
      <div className="text-center mb-5">
        <h2 className="text-lg font-bold text-slate-800">x402 Protocol Payment Flow</h2>
        <p className="text-xs text-slate-500">HTTP-native micropayment for privacy-preserving verification</p>
      </div>

      {/* Step timeline */}
      <div className="flex items-start justify-between mb-6 px-2">
        {steps.map((step, i) => (
          <div key={step.n} className="flex items-start flex-1">
            <PaymentFlowStep
              number={step.n}
              label={step.label}
              detail={step.detail}
              isActive={flowStep === step.n}
              isComplete={flowStep > step.n}
            />
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mt-5 mx-1 rounded ${flowStep > step.n ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Decoded 402 header */}
      {paymentInfo && flowStep >= 2 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-amber-700 mb-2">HTTP 402 Payment Required &mdash; Decoded Header</div>
          <div className="bg-slate-900 text-green-400 text-xs rounded-lg p-4 font-mono overflow-auto">
            <div><span className="text-slate-500">{'{'}</span></div>
            <div className="ml-4"><span className="text-blue-400">&quot;x402Version&quot;</span>: <span className="text-amber-300">{paymentInfo.x402Version}</span>,</div>
            <div className="ml-4"><span className="text-blue-400">&quot;scheme&quot;</span>: <span className="text-amber-300">&quot;{paymentInfo.scheme}&quot;</span>,</div>
            <div className="ml-4"><span className="text-blue-400">&quot;network&quot;</span>: <span className="text-amber-300">&quot;{paymentInfo.network}&quot;</span>,</div>
            <div className="ml-4"><span className="text-blue-400">&quot;amount&quot;</span>: <span className="text-amber-300">{paymentInfo.amount}</span> <span className="text-slate-500">// $0.001 USDC</span></div>
            <div className="ml-4"><span className="text-blue-400">&quot;payTo&quot;</span>: <span className="text-amber-300">&quot;{paymentInfo.payTo}&quot;</span> <span className="text-slate-500">// Agent wallet</span></div>
            <div><span className="text-slate-500">{'}'}</span></div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Protocol', value: `x402 v${paymentInfo.x402Version || '1'}` },
              { label: 'Network', value: 'Base Sepolia' },
              { label: 'Asset', value: 'USDC' },
              { label: 'Amount', value: '$0.001' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-lg p-2">
                <div className="text-[10px] text-slate-500">{item.label}</div>
                <div className="text-xs font-semibold text-slate-800">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wallet signing simulation */}
      {flowStep === 3 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center animate-pulse">
          <div className="text-sm font-medium text-amber-800">Simulating Wallet Signature...</div>
          <div className="text-[10px] text-amber-600 mt-1">In production, MetaMask would prompt for EIP-3009 USDC authorization</div>
        </div>
      )}

      {flowStep === 4 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center animate-pulse">
          <div className="text-sm font-medium text-blue-800">Verifying credential on Canton Network...</div>
          <div className="text-[10px] text-blue-600 mt-1">Exercising VerifyEligibility choice via sub-transaction privacy</div>
        </div>
      )}
    </div>
  )
}

function CantonPrivacyInspector({ credentialId }) {
  const [demoData, setDemoData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function loadDemo() {
    setLoading(true)
    try {
      const res = await fetch(`/api/privacy-demo/${encodeURIComponent(credentialId)}`)
      const data = await res.json()
      setDemoData(data)
    } catch (e) {
      console.error('Privacy demo failed:', e)
    }
    setLoading(false)
  }

  if (!demoData) {
    return (
      <div className="text-center mt-6">
        <button
          onClick={loadDemo}
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading Privacy Inspector...' : 'Show Canton Privacy Inspector'}
        </button>
        <p className="text-[10px] text-slate-400 mt-2">See exactly what each party can see on the Canton ledger</p>
      </div>
    )
  }

  return (
    <div className="mt-6 animate-fade-in">
      <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Canton Privacy Inspector</h3>
      <p className="text-xs text-slate-500 text-center mb-4">{demoData.explanation}</p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Agent/Individual View — sees everything */}
        <div className="border-2 border-blue-300 rounded-xl overflow-hidden">
          <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
            <h4 className="font-semibold text-blue-800 text-sm">{demoData.agentView.label}</h4>
            <div className="text-[10px] text-blue-600">{demoData.agentView.partyRole}</div>
          </div>
          <div className="p-3">
            <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-4 overflow-auto font-mono leading-relaxed">
{JSON.stringify(demoData.agentView.data, null, 2)}
            </pre>
          </div>
        </div>

        {/* Employer View — only eligibility */}
        <div className="border-2 border-red-300 rounded-xl overflow-hidden">
          <div className="bg-red-50 px-4 py-2 border-b border-red-200">
            <h4 className="font-semibold text-red-800 text-sm">{demoData.employerView.label}</h4>
            <div className="text-[10px] text-red-600">{demoData.employerView.partyRole}</div>
          </div>
          <div className="p-3">
            <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-4 overflow-auto font-mono leading-relaxed">
{JSON.stringify(demoData.employerView.data, null, 2)}
            </pre>
            <div className="mt-3 space-y-1.5">
              {(demoData.redactedFields || []).map((field) => (
                <div key={field} className="flex items-center gap-2 text-xs">
                  <span className="text-red-400 font-mono">{field}:</span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-medium">REDACTED by Canton</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-700 text-center">
        <strong>This is real.</strong> The employer&apos;s JWT token only has <code className="bg-indigo-100 px-1 rounded">actAs: [Employer]</code> permissions.
        Canton&apos;s ledger never transmits the private fields to observer parties.
      </div>
    </div>
  )
}

export default function Employer() {
  const [credentialId, setCredentialId] = useState('')
  const [jobType, setJobType] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [flowStep, setFlowStep] = useState(0)
  const [paymentInfo, setPaymentInfo] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!credentialId.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)
    setFlowStep(1)

    try {
      // Step 1: Send request to x402-protected endpoint
      const res = await fetch('/api/employer/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId: credentialId.trim(), jobType }),
      })

      if (res.status === 402) {
        // Step 2: Got 402 — extract payment info
        setFlowStep(2)
        const payHeader = res.headers.get('x-payment') || res.headers.get('PAYMENT-REQUIRED')
        let pInfo = {}
        if (payHeader) {
          try {
            const decoded = JSON.parse(atob(payHeader))
            const accept = decoded.accepts?.[0] || {}
            pInfo = {
              x402Version: decoded.x402Version || 1,
              scheme: accept.scheme || 'exact',
              network: accept.network || 'eip155:84532',
              amount: accept.maxAmountRequired || accept.amount || '1000',
              payTo: accept.payTo || 'Agent wallet',
              asset: accept.asset || 'USDC',
            }
          } catch {
            pInfo = { x402Version: 1, scheme: 'exact', network: 'eip155:84532', amount: '1000', payTo: 'Agent', asset: 'USDC' }
          }
        } else {
          pInfo = { x402Version: 1, scheme: 'exact', network: 'eip155:84532', amount: '1000', payTo: 'Agent', asset: 'USDC' }
        }
        setPaymentInfo(pInfo)

        // Step 3: Simulate wallet signing
        await new Promise((r) => setTimeout(r, 2000))
        setFlowStep(3)

        await new Promise((r) => setTimeout(r, 1500))
        setFlowStep(4)

        // Step 4: Call demo endpoint (bypasses x402)
        const demoRes = await fetch('/api/employer/verify-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentialId: credentialId.trim(), jobType }),
        })
        const demoData = await demoRes.json()

        if (demoData.error) {
          setError(demoData.error)
          setFlowStep(0)
        } else {
          await new Promise((r) => setTimeout(r, 500))
          setFlowStep(5)
          setResult(demoData)
        }
      } else if (res.ok) {
        // x402 not enabled — direct result
        const data = await res.json()
        setFlowStep(5)
        setResult(data)
      } else {
        const errData = await res.json()
        setError(errData.error || 'Verification failed')
        setFlowStep(0)
      }
    } catch (err) {
      setError('Failed to connect to server')
      setFlowStep(0)
    }
    setLoading(false)
  }

  function reset() {
    setResult(null)
    setFlowStep(0)
    setPaymentInfo(null)
    setError(null)
    setCredentialId('')
    setJobType('')
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">&#128274;</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Verify Candidate Eligibility</h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Enter the Credential ID shared by the candidate. You will see <strong>only</strong> whether they are eligible &mdash; never the underlying record details.
        </p>
      </div>

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Credential ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              placeholder="Paste the credential ID shared by the candidate..."
              required
              disabled={loading}
              className="w-full font-mono text-sm border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 placeholder:text-slate-400"
            />
            <p className="text-[10px] text-slate-400 mt-1">The candidate receives this ID after their eligibility is assessed</p>
          </div>
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Type <span className="text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              placeholder="e.g., Warehouse associate, Office admin..."
              disabled={loading}
              className="w-full text-sm border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !credentialId.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify Eligibility ($0.001 USDC)'}
          </button>
        </form>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* x402 Payment Flow — CENTER STAGE */}
      <X402PaymentFlow paymentInfo={paymentInfo} flowStep={flowStep} />

      {/* Result */}
      {result && (
        <div className="animate-fade-in">
          <div className={`rounded-xl p-6 mb-4 text-center ${result.eligible ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <div className="text-4xl mb-3">{result.eligible ? '\u2705' : '\u274C'}</div>
            <h3 className={`text-xl font-bold mb-2 ${result.eligible ? 'text-green-800' : 'text-red-800'}`}>
              {result.eligible ? 'Eligible for Employment Consideration' : 'Not Currently Eligible'}
            </h3>
            <p className={`text-sm ${result.eligible ? 'text-green-700' : 'text-red-700'}`}>
              {result.message}
            </p>
          </div>

          {/* Privacy notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">&#128274;</span>
              <div className="text-xs text-slate-600">
                <strong className="text-slate-800">Privacy Protected:</strong> {result.privacyNote || 'No record details were revealed during this verification.'}
                {result.ledger && (
                  <span className="ml-1 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">
                    via {result.ledger === 'canton' ? 'Canton Network' : 'Simulation'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Canton Privacy Inspector */}
          <CantonPrivacyInspector credentialId={credentialId.trim()} />

          {/* Reset */}
          <div className="text-center mt-8">
            <button
              onClick={reset}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Verify another candidate
            </button>
          </div>
        </div>
      )}

      {/* How it works */}
      {!result && flowStep === 0 && (
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">How Privacy-Preserving Verification Works</h3>
          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
              <div><strong>Candidate completes assessment</strong> via Clean Slate Agent chat and receives a Credential ID</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
              <div><strong>Candidate shares Credential ID</strong> with you (the employer)</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
              <div><strong>You pay $0.001 USDC</strong> via x402 protocol for the verification</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
              <div><strong>Canton Network verifies</strong> the credential &mdash; you see only &ldquo;eligible&rdquo; or &ldquo;not eligible.&rdquo; No record details are ever exposed.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
