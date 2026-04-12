import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/axios'

const REFRESH_INTERVAL = 3000

const DisplayPage = () => {
  const [departments, setDepartments] = useState([])
  const [selectedDept, setSelectedDept] = useState(null)
  const [display, setDisplay] = useState({ serving: null, next: [] })
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)
  const [tokenBump, setTokenBump] = useState(0)
  const prevServingRef = useRef(null)

  useEffect(() => {
    api
      .get('/departments')
      .then((res) => {
        const depts = res.data.data || []
        setDepartments(depts)
        if (depts.length > 0) setSelectedDept(depts[0]._id)
      })
      .catch(() => setError('Failed to load departments'))
  }, [])

  const fetchDisplay = useCallback(() => {
    if (!selectedDept) return
    api
      .get(`/queue/public/${selectedDept}`)
      .then((res) => {
        setDisplay(res.data.data)
        setLastUpdated(new Date())
        setError(null)
      })
      .catch(() => setError('Connection error – retrying…'))
  }, [selectedDept])

  useEffect(() => {
    fetchDisplay()
    const id = setInterval(fetchDisplay, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [fetchDisplay])

  const servingId = display.serving?.tokenNumber ?? display.serving?._id ?? null
  useEffect(() => {
    if (servingId != null && servingId !== prevServingRef.current) {
      setTokenBump((k) => k + 1)
    }
    prevServingRef.current = servingId
  }, [servingId])

  const deptName = departments.find((d) => d._id === selectedDept)?.name || ''

  return (
    <div className="min-h-screen bg-[#f4f8ff] dark:bg-[#070913] text-slate-900 dark:text-white flex flex-col select-none font-display">
      <header className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 lg:px-10 py-5
                         bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl border-b border-cyan-300/30 dark:border-cyan-400/15 shadow-lg shadow-black/20">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-fuchsia-600/20
                       text-4xl ring-1 ring-white/10 shadow-inner-soft"
          >
            🏥
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Queue Display
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-medium">Government District Hospital</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:items-end">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-300/90">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            </span>
            Live
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Department</label>
            <select
              value={selectedDept || ''}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white dark:bg-slate-800/90 border border-cyan-300/30 dark:border-white/15 text-slate-900 dark:text-white text-lg font-semibold
                         rounded-xl px-4 py-2.5 pr-10 min-w-[220px]
                         focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-400/50
                         transition-shadow hover:border-cyan-300/60 dark:hover:border-white/25 cursor-pointer
                         appearance-none bg-[length:1.25rem] bg-[right_0.65rem_center] bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              }}
            >
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
            {lastUpdated && (
              <span className="text-slate-500 text-xs font-medium tabular-nums">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div
          className="bg-red-950/90 border-b border-red-500/30 text-red-100 text-center py-3 text-base font-medium
                     animate-fade-in-down backdrop-blur-sm"
        >
          <span className="inline-flex items-center gap-2">
            <span className="text-red-300" aria-hidden>
              ⚠
            </span>
            {error}
          </span>
        </div>
      )}

      <main className="flex flex-1 flex-col lg:flex-row gap-0 overflow-hidden">
        <section
          className="relative flex flex-1 flex-col items-center justify-center min-h-[45vh] lg:min-h-0
                     bg-gradient-to-br from-[#0a1228] via-[#161033] to-[#120a24]
                     border-b lg:border-b-0 lg:border-r border-cyan-300/30 dark:border-white/10 px-6 py-12 lg:py-16 overflow-hidden"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 20%, rgba(34,211,238,0.3) 0%, transparent 45%), radial-gradient(circle at 70% 80%, rgba(217,70,239,0.22) 0%, transparent 40%)',
            }}
            aria-hidden
          />
          <p className="relative text-sm sm:text-base font-bold tracking-[0.35em] uppercase text-cyan-300/90 mb-6">
            Now serving
          </p>

          {display.serving ? (
            <>
              <div
                key={tokenBump}
                className="relative text-[clamp(4.5rem,15vw,10rem)] leading-none font-black tracking-tight text-white
                           drop-shadow-[0_8px_40px_rgba(34,211,238,0.45)] motion-reduce:animate-none animate-token-flash"
              >
                {display.serving.tokenNumber}
              </div>
              <p className="relative mt-6 text-2xl sm:text-4xl font-semibold text-cyan-100/95 text-center max-w-[90vw]">
                {display.serving.patient?.name}
              </p>
              <p className="relative mt-2 text-lg sm:text-xl text-fuchsia-300/80 font-medium">{deptName}</p>
            </>
          ) : (
            <div className="relative text-5xl sm:text-6xl font-bold text-slate-500 dark:text-slate-600 tracking-widest">—</div>
          )}
        </section>

        <section className="flex flex-col w-full lg:w-[420px] shrink-0 bg-white/90 dark:bg-slate-900/95 px-6 py-8 lg:py-10 border-t lg:border-t-0 lg:border-l border-cyan-300/30 dark:border-white/5">
          <p className="text-lg sm:text-xl font-bold tracking-[0.25em] uppercase text-slate-600 dark:text-slate-500 mb-6">Up next</p>

          {display.next.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
              <div className="text-5xl mb-4 opacity-80 motion-reduce:animate-none animate-float">✨</div>
              <p className="text-xl font-semibold text-slate-600 dark:text-slate-500">No patients waiting</p>
              <p className="text-slate-500 dark:text-slate-600 text-sm mt-2">Queue is clear</p>
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {display.next.map((token, idx) => (
                <li
                  key={token._id}
                  className={`group flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300
                    motion-reduce:transition-none
                    ${idx === 0
                      ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-2 border-amber-400/50 shadow-lg shadow-amber-500/10 scale-[1.02]'
                      : 'bg-slate-100 dark:bg-slate-800/80 border border-cyan-200/70 dark:border-white/10 hover:border-cyan-300 dark:hover:border-white/20 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <span
                    className={`text-xl font-black w-8 text-center tabular-nums transition-colors
                      ${idx === 0 ? 'text-amber-300' : 'text-slate-600 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-400'}`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`text-3xl sm:text-4xl font-black tracking-tight flex-1 tabular-nums transition-transform duration-300
                      ${idx === 0 ? 'text-amber-200' : 'text-slate-900 dark:text-white group-hover:translate-x-0.5'}`}
                  >
                    {token.tokenNumber}
                  </span>
                  <span className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium truncate max-w-[38%] text-right">
                    {token.patient?.name}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-cyan-300/30 dark:border-white/10 py-3 px-4 text-center text-slate-600 dark:text-slate-500 text-xs sm:text-sm tracking-wide">
        Refreshes every {REFRESH_INTERVAL / 1000}s · Please wait for your token to be called
      </footer>
    </div>
  )
}

export default DisplayPage
