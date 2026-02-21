import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import Chat from './pages/Chat'
import Employer from './pages/Employer'
import AgentStatus from './pages/AgentStatus'
import FAQ from './pages/FAQ'

function Nav() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 no-underline">
        <span className="text-2xl">&#9878;</span>
        <span className="font-semibold text-slate-800 text-lg">Clean Slate Agent</span>
      </Link>
      <div className="flex gap-1">
        {[
          ['/', 'Home'],
          ['/chat', 'Get Help'],
          ['/employer', 'Employers'],
          ['/faq', 'FAQ'],
          ['/agent-status', 'Agent Status'],
        ].map(([path, label]) => (
          <Link
            key={path}
            to={path}
            className={`px-3 py-1.5 rounded-md text-sm font-medium no-underline transition-colors ${
              isActive(path)
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/employer" element={<Employer />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/agent-status" element={<AgentStatus />} />
      </Routes>
    </div>
  )
}
