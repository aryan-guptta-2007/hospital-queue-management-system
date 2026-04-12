import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/common/Navbar'
import Loader from '../../components/common/Loader'

const DashboardPage = () => {
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/queue/all')
      setSummary(res.data.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard fetch error:', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    const interval = setInterval(fetchSummary, 15000)
    return () => clearInterval(interval)
  }, [fetchSummary])

  const handleManualRefresh = () => {
    setRefreshing(true)
    fetchSummary()
  }

  const totalWaiting = summary.reduce((sum, d) => sum + d.waitingCount, 0)
  const activeDepts = summary.filter((d) => d.waitingCount > 0).length

  return (
    <div className="min-h-screen bg-mesh-admin">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4 animate-fade-in-up">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              Live dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 font-medium">
              All departments · Auto-updates every 15s
              {lastUpdated && (
                <span className="text-slate-400">
                  {' '}
                  · Last sync {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 self-start rounded-xl border-2 border-cyan-300/30 dark:border-cyan-400/30 bg-white/90 dark:bg-slate-900/90 px-4 py-2.5 text-sm font-semibold
                       text-slate-700 dark:text-slate-200 shadow-sm transition-all duration-200
                       hover:border-fuchsia-400/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:-translate-y-0.5
                       active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <span
              className={`text-base ${refreshing ? 'inline-block animate-spin' : ''}`}
              aria-hidden
            >
              🔄
            </span>
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total waiting', value: totalWaiting, accent: 'text-cyan-300', delay: '' },
            { label: 'Active depts', value: activeDepts, accent: 'text-fuchsia-300', delay: 'stagger-1' },
            {
              label: 'Departments',
              value: summary.length,
              accent: 'text-slate-200',
              delay: 'stagger-2',
              span: 'col-span-2 sm:col-span-1',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`card-interactive text-center py-6 motion-safe:animate-fade-in-up motion-reduce:animate-none ${stat.delay} ${stat.span || ''}`}
            >
              <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
              <p
                className={`font-display text-5xl font-extrabold mt-2 tabular-nums transition-transform duration-300 hover:scale-105 ${stat.accent}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {loading ? (
          <Loader text="Loading department data…" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {summary.map((dept, i) => (
              <article
                key={dept.department.id}
                className={`group relative overflow-hidden rounded-2xl border bg-slate-900/80 backdrop-blur-sm p-5 shadow-card
                  transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 motion-safe:animate-fade-in-up motion-reduce:animate-none
                  ${i === 0 ? '' : i === 1 ? 'stagger-1' : i === 2 ? 'stagger-2' : 'stagger-3'}
                  ${
                    dept.waitingCount === 0
                      ? 'border-l-4 border-l-slate-200'
                      : dept.waitingCount > 10
                        ? 'border-l-4 border-l-red-400'
                        : 'border-l-4 border-l-hospital-blue'
                  }`}
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-cyan-500/20 to-transparent opacity-0
                             transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden
                />

                <div className="flex justify-between items-start mb-4 relative">
                  <div>
                    <h3 className="font-display font-bold text-slate-100 text-lg pr-2">{dept.department.name}</h3>
                    <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded-lg mt-2 inline-block">
                      {dept.department.code}
                    </span>
                  </div>
                  <div
                    className={`mt-1 h-3 w-3 rounded-full shrink-0 ring-4 ring-offset-2 ring-offset-white transition-transform group-hover:scale-110
                      ${
                        dept.waitingCount === 0
                          ? 'bg-slate-500 ring-slate-700'
                          : dept.waitingCount > 10
                            ? 'bg-red-400 ring-red-100 animate-pulse'
                            : 'bg-emerald-400 ring-emerald-100 animate-pulse'
                      }`}
                    title={dept.waitingCount > 10 ? 'High load' : dept.waitingCount > 0 ? 'Active' : 'Idle'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 relative">
                  <div className="rounded-xl bg-slate-900/90 p-3 text-center border border-cyan-500/20 transition-colors group-hover:bg-cyan-500/10">
                    <p className="font-display text-3xl font-extrabold text-cyan-300 tabular-nums">
                      {dept.waitingCount}
                    </p>
                    <p className="text-xs text-slate-300 font-semibold mt-1">waiting</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/90 p-3 text-center border border-fuchsia-500/20 transition-colors group-hover:bg-fuchsia-500/10">
                    <p className="text-lg font-bold text-fuchsia-300 truncate">{dept.currentToken || '—'}</p>
                    <p className="text-xs text-slate-300 font-semibold mt-1">serving</p>
                  </div>
                </div>

                {dept.currentPatient && (
                  <p className="text-sm text-slate-300 mt-3 truncate font-medium relative">
                    <span className="text-slate-400 font-normal">Patient ·</span> {dept.currentPatient}
                  </p>
                )}

                <Link
                  to="/admin/queue"
                  className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-cyan-200
                             bg-cyan-500/10 hover:bg-cyan-500/20 py-3 rounded-xl transition-all duration-200
                             group-hover:shadow-md border border-cyan-500/30 hover:border-cyan-400/40"
                >
                  Manage queue
                  <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default DashboardPage
