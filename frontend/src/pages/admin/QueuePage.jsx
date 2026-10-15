import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/axios'
import Navbar from '../../components/common/Navbar'
import Loader from '../../components/common/Loader'
import CurrentToken from '../../components/admin/CurrentToken'
import ActionButtons from '../../components/admin/ActionButtons'
import QueueTable from '../../components/admin/QueueTable'
import DepartmentFilter from '../../components/admin/DepartmentFilter'
import SkippedList from '../../components/admin/SkippedList'
import { useQueueSocket } from '../../context/QueueContext'

const QueuePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [departments, setDepartments] = useState([])
  const [queueData, setQueueData] = useState({
    serving: null,
    waiting: [],
    waitingCount: 0,
    skipped: [],
  })
  const [selectedTokenId, setSelectedTokenId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [toastVisible, setToastVisible] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setToastVisible(true)
    window.setTimeout(() => setToastVisible(false), 2800)
    window.setTimeout(() => setToast(null), 3200)
  }

  const { lastEvent, subscribe } = useQueueSocket()

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data.data || []))
  }, [])

  // ?dept=<id> (from the dashboard) wins, otherwise the first department
  const activeDeptId = useMemo(() => {
    if (departments.length === 0) return ''
    const requested = departments.find((d) => d._id === searchParams.get('dept'))
    return requested?._id || departments[0]._id
  }, [departments, searchParams])

  // The URL is the single source of truth for which queue is on screen
  const handleDepartmentChange = (departmentId) =>
    setSearchParams({ dept: departmentId }, { replace: true })

  // Lets a slow answer for a department the user has already left be dropped
  const activeDeptRef = useRef('')
  activeDeptRef.current = activeDeptId
  const requestSeq = useRef(0)

  const fetchQueue = useCallback(async () => {
    if (!activeDeptId) return

    const seq = requestSeq.current + 1
    requestSeq.current = seq
    const requestedDept = activeDeptId

    try {
      const res = await api.get(`/queue/${activeDeptId}`)

      // A newer request, or a department switch, has superseded this answer
      if (seq !== requestSeq.current || requestedDept !== activeDeptRef.current) return

      setQueueData(res.data.data)
      setLastUpdated(new Date())
    } catch (err) {
      if (seq !== requestSeq.current) return
      console.error('Queue fetch error:', err.message)
    } finally {
      if (seq === requestSeq.current) setLoading(false)
    }
  }, [activeDeptId])

  // Watch only this department's feed
  useEffect(() => subscribe(activeDeptId), [subscribe, activeDeptId])

  useEffect(() => {
    setLoading(true)
    setSelectedTokenId(null)
    fetchQueue()
    const interval = setInterval(fetchQueue, 8000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  useEffect(() => {
    if (!lastEvent || !activeDeptId) return
    // Another department's event is none of this screen's business
    if (String(lastEvent.departmentId) !== String(activeDeptId)) return

    const queueEvents = [
      'NEXT_TOKEN',
      'TOKEN_SKIPPED',
      'TOKEN_COMPLETED',
      'TOKEN_REQUEUED',
      'TOKEN_RECALLED',
      'EMERGENCY_INSERT',
      'NEW_TOKEN',
    ]
    if (queueEvents.includes(lastEvent.type)) fetchQueue()
  }, [lastEvent, fetchQueue, activeDeptId])

  const handleAction = async (action, payload = null) => {
    setActionLoading(true)
    try {
      switch (action) {
        case 'next':
          // Send the serving token this screen shows, so a stale screen cannot
          // end a consultation somebody else already moved on
          await api.post(`/queue/${activeDeptId}/next`, {
            currentServingId: queueData.serving?._id ?? null,
          })
          showToast('Next patient called', 'success')
          setSelectedTokenId(null)
          break

        case 'skip':
          if (!payload) return showToast('Select a patient first', 'error')
          await api.post(`/queue/token/${payload}/skip`)
          showToast('Patient skipped', 'success')
          setSelectedTokenId(null)
          break

        case 'complete':
          // Always the token on screen as now serving, never a selected row
          if (!queueData.serving?._id) return showToast('Nobody is being served right now', 'error')
          await api.post(`/queue/token/${queueData.serving._id}/complete`)
          showToast('Consultation completed', 'success')
          setSelectedTokenId(null)
          break

        case 'requeue':
          await api.post(`/queue/token/${payload}/requeue`)
          showToast('Patient moved back into the queue', 'success')
          break

        case 'recall':
          await api.post(`/queue/${activeDeptId}/recall`)
          showToast('Token announced again', 'success')
          break

        case 'emergency':
          await api.post(`/queue/${activeDeptId}/emergency`, payload)
          showToast('Emergency patient added to front', 'success')
          break

        default:
          break
      }
      await fetchQueue()
    } catch (err) {
      // 409 = the queue moved on under us; resync before telling the user
      if (err.response?.status === 409) await fetchQueue()
      showToast(err.response?.data?.message || 'Action failed. Try again.', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-mesh-admin">
      <Navbar />

      {toast && (
        <div
          className={`fixed top-20 left-1/2 z-[100] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl
            transition-all duration-300 ease-spring
            ${toastVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-3 opacity-0 scale-95 pointer-events-none'}
            ${
              toast.type === 'error'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white ring-2 ring-red-400/40'
                : 'bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white ring-2 ring-cyan-400/40'
            }`}
          role="status"
        >
          <span className="text-lg" aria-hidden>
            {toast.type === 'error' ? '✕' : '✓'}
          </span>
          <span className="font-semibold text-sm sm:text-base">{toast.msg}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Queue management</h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 font-medium">
              Auto-refreshes every 8s
              {lastUpdated && ` · Last sync ${lastUpdated.toLocaleTimeString()}`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <DepartmentFilter
              departments={departments}
              selected={activeDeptId}
              onChange={handleDepartmentChange}
            />
            <button
              type="button"
              onClick={fetchQueue}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-cyan-300/30 dark:border-cyan-400/30 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200
                         shadow-sm hover:border-fuchsia-400/35 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              title="Refresh now"
            >
              <span className="text-base" aria-hidden>
                🔄
              </span>
              Sync
            </button>
          </div>
        </div>

        {loading ? (
          <Loader text="Loading queue…" />
        ) : (
          <>
            <CurrentToken
              token={queueData.serving}
              waitingCount={queueData.waitingCount}
              onRecall={() => handleAction('recall')}
              loading={actionLoading}
            />

            <section className="card">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/20 text-fuchsia-300 text-sm">
                  ⚡
                </span>
                Actions
              </h2>
              <ActionButtons
                selectedToken={selectedTokenId}
                servingToken={queueData.serving?._id || null}
                onAction={handleAction}
                loading={actionLoading}
              />
            </section>

            <section className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                  Waiting queue
                  <span className="inline-flex items-center rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-extrabold text-cyan-200 tabular-nums">
                    {queueData.waitingCount}
                  </span>
                </h2>
                {selectedTokenId && (
                  <button
                    type="button"
                    onClick={() => setSelectedTokenId(null)}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors self-start sm:self-auto
                               rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <QueueTable queue={queueData.waiting} selectedId={selectedTokenId} onSelect={setSelectedTokenId} />
            </section>

            <SkippedList
              skipped={queueData.skipped}
              onRequeue={(tokenId) => handleAction('requeue', tokenId)}
              loading={actionLoading}
            />
          </>
        )}
      </main>
    </div>
  )
}

export default QueuePage
