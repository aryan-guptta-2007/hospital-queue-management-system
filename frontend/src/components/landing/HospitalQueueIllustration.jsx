import { useState, useEffect } from 'react'
import api from '../../api/axios'

const HospitalQueueIllustration = ({ isDark = false }) => {
  const [queue, setQueue] = useState([])
  const [, setLoading] = useState(true)

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await api.get('/queue/all')
        if (res.data.success) {
          setQueue(res.data?.data || [])
        }
      } catch (err) {
        console.error('API Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchQueue()
    const interval = setInterval(fetchQueue, 10000) // Polling every 10s
    return () => clearInterval(interval)
  }, [])

  const safeQueue = Array.isArray(queue) ? queue : []
  
  const displayQueue = safeQueue.map((dept) => ({
    token: dept.currentToken || `${dept?.department?.code || 'X'}-000`,
    type: dept?.department?.name || 'Unknown',
    waiting: dept.waitingCount || 0,
    dot: dept.waitingCount > 5 ? 'bg-red-500' : 'bg-blue-500',
  }))

  const servingToken = safeQueue.length > 0 ? safeQueue[0].currentToken || '—' : '—'
  const servingDept = safeQueue.length > 0 ? safeQueue[0]?.department?.name || 'Waiting...' : 'Waiting...'

  return (
    <div
      className={
        isDark
          ? 'relative h-full min-h-[300px] w-full overflow-hidden rounded-[2rem] border border-fuchsia-500/30 bg-gradient-to-b from-[#08060f] via-[#111126] to-[#0a1022] lg:min-h-[560px]'
          : 'relative h-full min-h-[300px] w-full overflow-hidden rounded-[2rem] border border-cyan-300/60 bg-gradient-to-b from-[#eff7ff] via-[#f7f1ff] to-[#eef9ff] lg:min-h-[560px]'
      }
      aria-hidden
    >
      <div
        className={
          isDark
            ? 'absolute -left-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-500/35 blur-3xl'
            : 'absolute -left-16 -top-16 h-56 w-56 rounded-full bg-cyan-300/45 blur-3xl'
        }
      />
      <div
        className={
          isDark
            ? 'absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-cyan-500/25 blur-3xl'
            : 'absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-violet-300/45 blur-3xl'
        }
      />

      <div className="absolute inset-0 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md space-y-4">
          <div
            className={
              isDark
                ? 'rounded-2xl border border-cyan-400/35 bg-[#131a31]/85 p-4 shadow-[0_0_35px_-15px_rgba(56,189,248,0.75)]'
                : 'rounded-2xl border border-fuchsia-300/40 bg-white/85 p-4 shadow-[0_0_30px_-15px_rgba(232,121,249,0.55)]'
            }
          >
            <p className={isDark ? 'text-[11px] font-bold uppercase tracking-[0.15em] text-cyan-200' : 'text-[11px] font-bold uppercase tracking-[0.15em] text-fuchsia-600'}>
              Now Serving
            </p>
            <div className="mt-2 flex items-center justify-between">
                <p className={isDark ? 'text-4xl font-black text-cyan-300 tabular-nums' : 'text-4xl font-black text-fuchsia-600 tabular-nums'}>
                  {servingToken}
                </p>
                <p className={isDark ? 'text-sm font-semibold text-slate-300' : 'text-sm font-semibold text-slate-600'}>
                  {servingDept}
                </p>
              <div className={isDark ? 'relative flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/15' : 'relative flex h-12 w-12 items-center justify-center rounded-full bg-fuchsia-300/15'}>
                <span className={isDark ? 'absolute h-full w-full rounded-full border border-cyan-300/60 animate-ping' : 'absolute h-full w-full rounded-full border border-fuchsia-400/50 animate-ping'} />
                <span className={isDark ? 'relative z-10 h-3.5 w-3.5 rounded-full bg-cyan-300' : 'relative z-10 h-3.5 w-3.5 rounded-full bg-fuchsia-500'} />
              </div>
            </div>
          </div>

          <div
            className={
              isDark
                ? 'rounded-2xl border border-cyan-400/20 bg-[#0e152b]/80 p-4'
                : 'rounded-2xl border border-violet-300/35 bg-white/80 p-4'
            }
          >
            <div className="mb-3 flex items-center justify-between">
              <p className={isDark ? 'text-xs font-bold uppercase tracking-wider text-cyan-200' : 'text-xs font-bold uppercase tracking-wider text-violet-600'}>
                Queue Flow
              </p>
              <p className={isDark ? 'text-xs font-semibold text-slate-400' : 'text-xs font-semibold text-slate-500'}>Live updates</p>
            </div>

            <div className="space-y-2.5">
              {displayQueue.map((item, idx) => (
                <div
                  key={idx}
                  className={
                    isDark
                      ? 'flex items-center justify-between rounded-xl border border-cyan-500/20 bg-slate-900/55 px-3 py-2'
                      : 'flex items-center justify-between rounded-xl border border-violet-300/30 bg-white/75 px-3 py-2'
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                    <span className={isDark ? 'font-bold text-slate-100' : 'font-bold text-slate-800'}>
                      {item.token}
                    </span>
                  </div>
                  <span className={isDark ? 'text-xs font-semibold text-slate-300' : 'text-xs font-semibold text-slate-600'}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center pt-1">
            <div className={isDark ? 'rounded-full border border-cyan-500/30 bg-slate-900/80 px-4 py-2 text-xs font-bold text-cyan-200' : 'rounded-full border border-fuchsia-300/40 bg-white/85 px-4 py-2 text-xs font-bold text-fuchsia-600'}>
              Hospital Queue • Clear • Calm • Accessible
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HospitalQueueIllustration
