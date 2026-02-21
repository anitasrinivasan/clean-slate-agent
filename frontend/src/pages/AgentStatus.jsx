import { useState, useEffect } from 'react'

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

function AddressDisplay({ label, address }) {
  const [copied, setCopied] = useState(false)
  const short = address && address.length > 20
    ? `${address.slice(0, 8)}...${address.slice(-6)}`
    : address || 'Not configured'

  function copy() {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="font-mono text-sm text-slate-800">{short}</div>
      </div>
      {address && address !== 'Not configured' && address !== 'Not deployed' && (
        <button
          onClick={copy}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
    </div>
  )
}

export default function AgentStatus() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agent/status')
      .then((r) => r.json())
      .then((data) => {
        setStatus(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading agent status...
      </div>
    )
  }

  if (!status) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center text-slate-500">
        Unable to connect to the agent server.
      </div>
    )
  }

  const { agent, blockchain, metrics, cantonCredentials, canton, x402 } = status

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-3xl">&#9878;</span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{agent.name}</h1>
          <p className="text-sm text-slate-500">{agent.type} &middot; v{agent.version}</p>
        </div>
        <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
          blockchain.connected
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {blockchain.connected ? 'On-Chain' : 'Off-Chain'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="&#128101;"
          label="Individuals Helped"
          value={metrics.individualsHelped}
          sub="Free service"
        />
        <StatCard
          icon="&#127970;"
          label="Employer Assessments"
          value={metrics.employerAssessments}
          sub="Paid via x402"
        />
        <StatCard
          icon="&#128176;"
          label="Wallet Balance"
          value={`${blockchain.walletBalance || '0'} ETH`}
          sub="Base Sepolia"
        />
        <StatCard
          icon="&#128274;"
          label="Canton Credentials"
          value={cantonCredentials}
          sub="Privacy-preserving"
        />
      </div>

      {/* Blockchain Identity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Blockchain Identity</h2>
        <div className="space-y-3">
          <AddressDisplay label="Smart Contract (Base Sepolia)" address={blockchain.contractAddress} />
          <AddressDisplay label="Agent Wallet" address={blockchain.walletAddress} />
          <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
            <div>
              <div className="text-xs text-slate-500">Network</div>
              <div className="text-sm text-slate-800">{blockchain.network} (Chain ID: {blockchain.chainId})</div>
            </div>
          </div>
        </div>
      </div>

      {/* Canton Network Status */}
      {canton && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Canton Network (Privacy Layer)</h2>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              canton.connected
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {canton.connected ? 'Live on Canton' : 'Simulation Mode'}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
              <div>
                <div className="text-xs text-slate-500">Ledger</div>
                <div className="text-sm text-slate-800">{canton.ledger}</div>
              </div>
            </div>
            {canton.connected && canton.packageId && (
              <AddressDisplay label="Daml Package ID" address={canton.packageId} />
            )}
            {canton.connected && canton.parties && (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(canton.parties).map(([role, partyId]) => (
                  <div key={role} className="bg-slate-50 rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-500 capitalize">{role}</div>
                    <div className="font-mono text-xs text-slate-700 truncate" title={partyId}>
                      {partyId.split('::')[0]}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
              <strong>Sub-Transaction Privacy:</strong> When a credential is verified, Canton&apos;s privacy model ensures the employer/verifier only sees the eligibility status &mdash; never the underlying offense details. The record data is cryptographically invisible to observers.
            </div>
          </div>
        </div>
      )}

      {/* Economic Model */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Economic Model</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-3">Revenue (Employer Assessments)</h3>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">
                {blockchain.totalRevenue || '0'} ETH
              </div>
              <div className="text-xs text-green-600 mt-1">
                Via x402 protocol payments
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-3">Expenses (API Costs)</h3>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-700">
                ${metrics.totalEstimatedCost.toFixed(4)}
              </div>
              <div className="text-xs text-red-600 mt-1">
                Estimated Claude API costs
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
          <strong>Self-Sustaining Model:</strong> Employers pay for background assessments via x402. Revenue covers the agent's Claude API costs. Individual users always get free help.
        </div>
      </div>

      {/* Architecture */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Architecture</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          {[
            { label: 'AI Brain', value: 'Claude claude-sonnet-4-20250514', color: 'purple' },
            { label: 'Blockchain', value: 'Base Sepolia (ERC-4337)', color: 'blue' },
            { label: 'Privacy Layer', value: 'Canton Network (Daml)', color: 'green' },
            { label: 'Payments', value: 'x402 Protocol (USDC)', color: 'amber' },
            { label: 'Memory', value: 'SQLite + AES-256-GCM', color: 'slate' },
            { label: 'States Covered', value: agent.states.join(', '), color: 'slate' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
              <span className="text-slate-600">{item.label}</span>
              <span className="font-medium text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {metrics.recentEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {metrics.recentEvents.slice(0, 10).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <span>{event.event_type === 'chat' ? '&#128172;' : '&#127970;'}</span>
                  <span className="text-slate-700">
                    {event.event_type === 'chat' ? 'Individual Chat' : 'Employer Assessment'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>~${event.estimated_cost.toFixed(4)}</span>
                  <span>{new Date(event.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
