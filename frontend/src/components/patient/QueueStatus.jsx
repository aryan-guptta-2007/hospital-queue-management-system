import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import Badge from '../common/Badge'
import Loader from '../common/Loader'
import { formatWaitTime, STATUS_CONFIG } from '../../utils/helpers'
import { useQueueSocket } from '../../context/QueueContext'
import { AnimatePresence, motion } from 'framer-motion'

const QueueStatus = ({ publicCode, onBack }) => {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const { lastEvent, connected, subscribe } = useQueueSocket()

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get(`/tokens/status/${publicCode}`)
      setData(res.data.data)
      setLastUpdated(new Date())
      setError('')
    } catch (err) {
      setError(t('status.error'))
    } finally {
      setLoading(false)
    }
    // t changes when the language does, so a visible error re-translates
  }, [publicCode, t])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Known only once the first fetch lands, then watched from there on
  const departmentId = data?.department?.id

  useEffect(() => subscribe(departmentId), [subscribe, departmentId])

  useEffect(() => {
    if (!lastEvent || !departmentId) return
    // Only this patient's own department can change their place in the queue
    if (String(lastEvent.departmentId) !== String(departmentId)) return

    const queueEvents = [
      'NEXT_TOKEN',
      'TOKEN_SKIPPED',
      'TOKEN_COMPLETED',
      'TOKEN_REQUEUED',
      'TOKEN_RECALLED',
      'EMERGENCY_INSERT',
      'NEW_TOKEN',
    ]
    if (queueEvents.includes(lastEvent.type)) {
      fetchStatus()
    }
  }, [lastEvent, fetchStatus, departmentId])

  useEffect(() => {
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  if (loading) return <Loader text={t('status.loading')} />

  if (error) {
    return (
      <div className="text-center space-y-5 animate-fade-in-up">
        <p className="text-red-600 dark:text-red-300 text-lg font-semibold">{error}</p>
        <button type="button" onClick={fetchStatus} className="btn-primary">
          {t('status.tryAgain')}
        </button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[data?.status] || STATUS_CONFIG.waiting
  const isServing = data?.status === 'serving'
  const isCompleted = data?.status === 'completed'
  const isExpired = data?.status === 'expired'
  const waitMins = Number(data?.estimatedWaitTime || 0)
  const waitProgress = waitMins > 0 ? Math.max(8, Math.min(100, (90 - waitMins) / 90 * 100)) : 100

  const headerClass = isServing
    ? 'from-cyan-700 to-fuchsia-700 ring-cyan-400/30'
    : isCompleted
      ? 'from-slate-600 to-slate-800 ring-slate-400/20'
      : isExpired
        ? 'from-rose-800 to-slate-900 ring-rose-500/20'
        : 'from-cyan-700 to-blue-700 ring-cyan-400/25'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <motion.div
        layout
        className={`relative overflow-hidden rounded-2xl p-6 text-center text-white shadow-card-hover bg-gradient-to-br ${headerClass} ring-4`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)',
          }}
          aria-hidden
        />
        <p className="relative text-white/80 text-xs font-bold uppercase tracking-[0.2em] mb-1">{t('status.token')}</p>
        <h1 className="relative font-display text-5xl font-black tracking-tight tabular-nums">{data?.tokenNumber}</h1>
        <p className="relative mt-2 text-white/90 font-medium">{data?.department?.name}</p>
      </motion.div>

      <div className="flex items-center justify-between rounded-xl bg-white/90 dark:bg-slate-900/80 border border-cyan-300/30 dark:border-cyan-500/20 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{t('status.updates')}</span>
        <div className="flex items-center gap-2">
          <span
            className={`relative flex h-2.5 w-2.5 rounded-full ${connected ? 'bg-cyan-400' : 'bg-slate-500'}`}
            title={connected ? t('status.liveTitle') : t('status.pollingTitle')}
          >
            {connected && (
              <span className="absolute inset-0 rounded-full bg-cyan-300 motion-safe:animate-ping opacity-60" aria-hidden />
            )}
          </span>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{connected ? t('common.live') : t('common.polling')}</span>
        </div>
      </div>

      <div className="card flex justify-between items-center">
        <span className="text-slate-700 dark:text-slate-200 font-bold">{t('status.statusLabel')}</span>
        <span className={`px-4 py-1.5 rounded-full text-sm font-extrabold shadow-sm ${statusConfig.color}`}>
          {isServing && '🔔 '}
          {t(`tokenStatus.${data?.status || 'waiting'}`)}
        </span>
      </div>

      {data?.status === 'waiting' && (
        <motion.div layout className="grid grid-cols-2 gap-4">
          <div className="card-interactive text-center py-4">
            <p className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">{t('status.yourPosition')}</p>
            <p className="font-display text-5xl font-extrabold text-cyan-300 tabular-nums">{data?.position ?? '—'}</p>
          </div>
          <div className="card-interactive text-center py-4">
            <p className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">{t('status.estimatedWait')}</p>
            <p className="font-display text-4xl font-extrabold text-fuchsia-300 tabular-nums">
              {formatWaitTime(data?.estimatedWaitRange ?? data?.estimatedWaitTime, t)}
            </p>
          </div>
        </motion.div>
      )}

      {data?.status === 'waiting' && (
        <div className="rounded-2xl border border-cyan-300/35 dark:border-cyan-500/25 bg-white/90 dark:bg-slate-900/70 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('status.progressLabel')}</p>
            <p className="text-xs font-bold text-cyan-700 dark:text-cyan-300 tabular-nums">{Math.round(waitProgress)}%</p>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
              initial={{ width: 0 }}
              animate={{ width: `${waitProgress}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isServing && (
          <motion.div
            key="serving-banner"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-2xl border-2 border-cyan-400/60 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 p-5 text-center shadow-lg shadow-cyan-500/10"
          >
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-cyan-300/60"
              animate={{ scale: [1, 1.05, 1], opacity: [0.7, 0.25, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-2xl border border-fuchsia-300/50"
              animate={{ scale: [1.02, 1.08, 1.02], opacity: [0.35, 0.05, 0.35] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}
              aria-hidden
            />
            <p className="relative text-cyan-200 text-2xl font-black">{t('status.yourTurn')}</p>
            <p className="relative text-fuchsia-200 mt-1 font-semibold">{t('status.proceed')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {isCompleted && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-5 text-center">
          <p className="text-slate-700 dark:text-slate-100 text-xl font-bold">{t('status.completedTitle')}</p>
          <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">{t('status.completedBody')}</p>
        </div>
      )}

      {isExpired && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-5 text-center">
          <p className="text-rose-700 dark:text-rose-300 text-xl font-bold">{t('tokenStatus.expired')}</p>
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex justify-between gap-3">
          <span className="text-slate-600 dark:text-slate-300 font-medium">{t('status.patient')}</span>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{data?.patient?.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-300 font-medium">{t('status.priority')}</span>
          <Badge priority={data?.priority} label={t(`priority.${data?.priority || 1}`)} />
        </div>
      </div>

      <p className="text-center text-slate-500 dark:text-slate-300 text-xs font-semibold tabular-nums">
        {t('status.lastUpdated', { time: lastUpdated?.toLocaleTimeString() ?? '' })}
      </p>

      <button
        type="button"
        onClick={fetchStatus}
        className="w-full border-2 border-cyan-400/60 text-cyan-700 dark:text-cyan-200 font-bold py-3.5 rounded-xl
                   hover:bg-cyan-500/10 hover:border-cyan-300 active:scale-[0.99] transition-all duration-200
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/30"
      >
        {t('status.refresh')}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-slate-600 dark:text-slate-300 py-2 text-sm font-semibold hover:text-slate-800 dark:hover:text-slate-100 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80"
      >
        {t('status.newToken')}
      </button>
    </motion.div>
  )
}

export default QueueStatus
