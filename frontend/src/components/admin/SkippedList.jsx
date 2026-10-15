import { useState } from 'react'
import Badge from '../common/Badge'

/**
 * Today's skipped patients. Collapsed by default — it is a recovery tool, not
 * part of the normal flow. Requeue puts a patient back at the end of their
 * priority group.
 */
const SkippedList = ({ skipped = [], onRequeue, loading }) => {
  const [open, setOpen] = useState(false)

  return (
    <section className="card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-left rounded-xl px-1 py-1
                   transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/50
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
      >
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 text-sm" aria-hidden>
            ⏭
          </span>
          Skipped today
          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-extrabold text-amber-200 tabular-nums">
            {skipped.length}
          </span>
        </h2>
        <span
          className={`text-slate-500 dark:text-slate-300 text-sm font-bold transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-5 animate-fade-in-up">
          {skipped.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-300 font-medium text-center py-6">
              No patients were skipped today.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700/40 rounded-2xl border border-amber-300/35 dark:border-amber-500/20 bg-white/80 dark:bg-slate-900/50">
              {skipped.map((token) => (
                <li key={token._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-extrabold text-amber-300 text-base tabular-nums">
                        {token.tokenNumber}
                      </span>
                      <Badge priority={token.priority} />
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                      {token.patient?.name}
                    </p>
                    {token.skippedAt && (
                      <p className="text-xs text-slate-400 font-medium tabular-nums mt-0.5">
                        Skipped at{' '}
                        {new Date(token.skippedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRequeue(token._id)}
                    disabled={loading}
                    className="shrink-0 rounded-xl border-2 border-cyan-400/50 px-4 py-2 text-sm font-bold text-cyan-700 dark:text-cyan-200
                               transition-all duration-200 hover:bg-cyan-500/10 hover:border-cyan-300 active:scale-[0.98]
                               disabled:opacity-40 disabled:cursor-not-allowed
                               focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/30"
                  >
                    ↩ Requeue
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-300 text-center font-medium mt-4">
            A requeued patient rejoins at the end of their priority group.
          </p>
        </div>
      )}
    </section>
  )
}

export default SkippedList
