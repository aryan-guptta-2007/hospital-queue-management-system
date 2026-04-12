import Badge from '../common/Badge'
import { formatWaitTime } from '../../utils/helpers'
import { motion } from 'framer-motion'

const TokenCard = ({ tokenData, onCheckStatus }) => {
  const { tokenNumber, department, patient, position, estimatedWaitTime } = tokenData

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="rounded-2xl border border-cyan-300/40 dark:border-cyan-400/30 bg-gradient-to-r from-cyan-100/70 to-fuchsia-100/60 dark:from-cyan-500/15 dark:to-fuchsia-500/15 p-4 shadow-sm"
      >
        <p className="text-cyan-700 dark:text-cyan-200 font-bold text-base flex items-center justify-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-white text-sm shadow-md motion-safe:animate-scale-in"
            aria-hidden
          >
            ✓
          </span>
          Token generated
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600 via-blue-600 to-fuchsia-600 dark:from-cyan-700 dark:via-blue-700 dark:to-fuchsia-800 p-8 text-white shadow-glow"
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <p className="relative text-cyan-100/90 text-sm font-bold uppercase tracking-[0.2em] mb-2">Your token</p>
        <h1 className="relative font-display text-6xl sm:text-7xl font-black tracking-tight drop-shadow-lg tabular-nums">
          {tokenNumber}
        </h1>
        <p className="relative text-cyan-100 mt-3 text-lg font-semibold">{department?.name}</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card-interactive text-center py-4">
          <p className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Position</p>
          <p className="font-display text-4xl font-extrabold text-cyan-300 tabular-nums">{position ?? '—'}</p>
          <p className="text-slate-400 text-sm font-medium">in queue</p>
        </div>
        <div className="card-interactive text-center py-4">
          <p className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Est. wait</p>
          <p className="font-display text-4xl font-extrabold text-fuchsia-300 tabular-nums">
            {formatWaitTime(estimatedWaitTime)}
          </p>
          <p className="text-slate-400 text-sm font-medium">approx.</p>
        </div>
      </div>

      <div className="card text-left space-y-3">
        <div className="flex justify-between items-center gap-3">
          <span className="text-slate-600 dark:text-slate-300 font-medium">Patient</span>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{patient?.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-300 font-medium">Priority</span>
          <Badge priority={patient?.priority} />
        </div>
        <div className="flex justify-between items-center gap-3">
          <span className="text-slate-600 dark:text-slate-300 font-medium">Department</span>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{department?.name}</span>
        </div>
      </div>

      <div className="rounded-xl border border-fuchsia-300/40 dark:border-fuchsia-400/30 bg-fuchsia-100/70 dark:bg-fuchsia-500/10 p-4 text-fuchsia-700 dark:text-fuchsia-200 text-sm font-medium text-left flex gap-3">
        <span className="text-xl shrink-0" aria-hidden>
          📢
        </span>
        <span>Please stay in the waiting area. Your token will be called on the display.</span>
      </div>

      <button type="button" onClick={onCheckStatus} className="btn-primary w-full">
        Track live queue status
      </button>
    </motion.div>
  )
}

export default TokenCard
