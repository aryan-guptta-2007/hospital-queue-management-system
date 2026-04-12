import { PRIORITY_CONFIG } from '../../utils/helpers'

const Badge = ({ priority }) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[1]
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-full border transition-transform duration-200 hover:scale-105 ${config.color}`}
    >
      {priority === 3 && <span aria-hidden>🚨</span>}
      {priority === 2 && <span aria-hidden>👴</span>}
      {config.label}
    </span>
  )
}

export default Badge
