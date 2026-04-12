import Badge from '../common/Badge'
import { formatWaitTime, STATUS_CONFIG } from '../../utils/helpers'
import { motion } from 'framer-motion'

const QueueTable = ({ queue, selectedId, onSelect }) => {
  if (!queue || queue.length === 0) {
    return (
      <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-cyan-300/40 dark:border-cyan-500/25 bg-white/60 dark:bg-slate-900/40 animate-fade-in">
        <div className="text-5xl mb-4 motion-safe:animate-float" aria-hidden>
          🎉
        </div>
        <p className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">Queue is empty</p>
        <p className="text-sm text-slate-500 dark:text-slate-300 mt-2 font-medium">No patients waiting in this department.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-cyan-300/35 dark:border-cyan-500/20 bg-white/80 dark:bg-slate-900/50 shadow-inner-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-slate-50 to-cyan-50/50 dark:from-slate-900 dark:to-slate-800/80 border-b border-cyan-300/30 dark:border-cyan-500/20">
            {['#', 'Token', 'Patient', 'Priority', 'Status', 'Est. wait', 'Registered'].map((h) => (
              <th
                key={h}
                className="px-4 py-3.5 text-left text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <motion.tbody layout className="divide-y divide-slate-200 dark:divide-slate-700/40">
          {queue.map((token, idx) => {
            const isSelected = token._id === selectedId
            const isEmergency = token.priority === 3
            const statusCfg = STATUS_CONFIG[token.status] || STATUS_CONFIG.waiting

            return (
              <motion.tr
                layout
                key={token._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => onSelect(isSelected ? null : token._id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(isSelected ? null : token._id)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                className={`cursor-pointer transition-all duration-200 outline-none
                  focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/50
                  ${isSelected ? 'bg-cyan-100/60 dark:bg-cyan-500/10 shadow-[inset_4px_0_0_0_#22d3ee]' : ''}
                  ${isEmergency && !isSelected ? 'bg-red-500/10 hover:bg-red-500/15' : ''}
                  ${!isSelected && !isEmergency ? 'hover:bg-slate-100 dark:hover:bg-slate-800/70' : ''}`}
              >
                <td className="px-4 py-3.5 font-bold text-slate-400 tabular-nums">{token.position ?? idx + 1}</td>

                <td className="px-4 py-3.5">
                  <span className="font-display font-extrabold text-cyan-300 text-base tabular-nums">
                    {token.tokenNumber}
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{token.patient?.name}</p>
                  {token.patient?.age && <p className="text-xs text-slate-400 font-medium mt-0.5">Age {token.patient.age}</p>}
                </td>

                <td className="px-4 py-3.5">
                  <Badge priority={token.priority} />
                </td>

                <td className="px-4 py-3.5">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </td>

                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-semibold tabular-nums">
                  {token.status === 'waiting' ? formatWaitTime(token.estimatedWaitTime) : '—'}
                </td>

                <td className="px-4 py-3.5 text-slate-400 font-medium tabular-nums">
                  {new Date(token.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </motion.tr>
            )
          })}
        </motion.tbody>
      </table>
    </div>
  )
}

export default QueueTable
