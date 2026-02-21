import { useState, useEffect, useRef } from 'react'

function getSessionId() {
  let id = localStorage.getItem('cleanslate_session')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('cleanslate_session', id)
  }
  return id
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
      <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
      <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
    </div>
  )
}

function ProgressTracker({ caseDetails }) {
  if (!caseDetails || !caseDetails.progressStep) return null
  const steps = [
    'Getting started',
    'State identified',
    'Offense details',
    'Sentence status',
    'Eligibility assessed',
    'Next steps provided',
  ]
  const current = caseDetails.progressStep || 0

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
      <div className="text-xs font-medium text-blue-700 mb-2">Your Progress</div>
      <div className="flex gap-1">
        {steps.map((step, i) => (
          <div key={i} className="flex-1">
            <div
              className={`h-1.5 rounded-full mb-1 ${
                i <= current ? 'bg-blue-500' : 'bg-blue-200'
              }`}
            />
            <div className={`text-[10px] ${i <= current ? 'text-blue-700' : 'text-blue-300'}`}>
              {step}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [caseDetails, setCaseDetails] = useState(null)
  const [hasCredential, setHasCredential] = useState(false)
  const [credentialId, setCredentialId] = useState(null)
  const [copied, setCopied] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const sessionId = getSessionId()

  // Check if returning user
  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.exists) {
          setIsReturning(true)
          setCaseDetails(data.caseDetails)
          setHasCredential(data.hasCredential)
          if (data.credential?.contractId) setCredentialId(data.credential.contractId)
        }
      })
      .catch(() => {})
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setFilePreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  function removeFile() {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if ((!text && !selectedFile) || loading) return

    const displayText = text || 'Uploaded RAP sheet for analysis'
    const preview = filePreview
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: displayText, filePreview: preview }])
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setLoading(true)

    try {
      let res
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('message', text)
        formData.append('sessionId', sessionId)
        res = await fetch('/api/chat', {
          method: 'POST',
          body: formData,
        })
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId }),
        })
      }
      const data = await res.json()

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error}` },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response },
        ])
        if (data.caseDetails) setCaseDetails(data.caseDetails)
        if (data.credentialExists) setHasCredential(true)
        if (data.credentialId) setCredentialId(data.credentialId)
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' },
      ])
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-57px)] flex flex-col">
      {/* Returning user banner */}
      {isReturning && messages.length === 0 && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-2 text-sm text-green-800">
          <span>&#128075;</span>
          <span>
            <strong>Welcome back!</strong> I remember your case
            {caseDetails?.state ? ` in ${caseDetails.state}` : ''}. Pick up where you left off.
          </span>
        </div>
      )}

      {credentialId && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600 text-lg">&#9989;</span>
            <span className="font-semibold text-green-800 text-sm">Eligibility Credential Created</span>
            <span className="ml-auto text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Canton Network</span>
          </div>
          <p className="text-xs text-slate-600 mb-2">
            Share this Credential ID with potential employers. They can verify your eligibility without seeing any details of your record.
          </p>
          <div className="flex items-center gap-2 bg-white border border-green-300 rounded-lg px-3 py-2">
            <code className="flex-1 text-xs font-mono text-slate-700 break-all select-all">{credentialId}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(credentialId)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="shrink-0 bg-green-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-green-700"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {hasCredential && !credentialId && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 flex items-center gap-2 text-xs text-blue-700">
          <span>&#9989;</span> Privacy credential active on Canton Network
        </div>
      )}

      {/* Progress tracker */}
      <div className="px-6 pt-4">
        <ProgressTracker caseDetails={caseDetails} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-4">&#9878;</div>
            <p className="text-lg font-medium text-slate-600 mb-2">
              {isReturning ? "Welcome back. I'm ready to continue." : "Hi, I'm the Clean Slate Agent."}
            </p>
            <p className="text-sm max-w-md mx-auto">
              {isReturning
                ? 'Ask me anything about your case or where we left off.'
                : "I help people understand their eligibility for criminal record expungement. Tell me your situation and I'll guide you through it."}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {[
                'Am I eligible for expungement in Colorado?',
                'I have a misdemeanor from 5 years ago in Texas',
                'How does record sealing work in New York?',
                'Can I clear my record in Michigan?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q)
                    inputRef.current?.focus()
                  }}
                  className="text-xs bg-white border border-slate-200 rounded-full px-4 py-2 text-slate-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`animate-fade-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
              }`}
            >
              {msg.filePreview && (
                <img src={msg.filePreview} alt="Uploaded document" className="max-w-full max-h-48 rounded-lg mb-2 border border-white/20" />
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-6 py-4">
        {/* File preview */}
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-10 h-10 object-cover rounded" />
            ) : (
              <span className="text-blue-600">&#128196;</span>
            )}
            <span className="text-xs text-slate-700 flex-1 truncate">{selectedFile.name}</span>
            <button onClick={removeFile} className="text-slate-400 hover:text-red-500 text-sm font-bold">&times;</button>
          </div>
        )}
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="text-slate-400 hover:text-blue-600 px-2 py-3 disabled:opacity-50 transition-colors"
            title="Upload RAP sheet image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedFile ? 'Add a message about your RAP sheet...' : 'Type your message...'}
            disabled={loading}
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !selectedFile)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          This is general legal information, not legal advice. Upload a RAP sheet image or type your question.
        </p>
      </div>
    </div>
  )
}
