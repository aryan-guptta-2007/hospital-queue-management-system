// Format a number of minutes into a human-readable string.
// `t` is optional: the patient screens pass it, the staff screens do not and
// keep the English wording they have always had.
const formatMinutes = (minutes, t) => {
  if (minutes < 60) return t ? t('wait.minutes', { value: minutes }) : `${minutes} min`

  const h = Math.floor(minutes / 60)
  const m = minutes % 60

  if (m > 0) return t ? t('wait.hoursMinutes', { hours: h, minutes: m }) : `${h}h ${m}m`

  return t ? t('wait.hours', { hours: h }) : `${h}h`
}

/**
 * Formats a wait estimate. Accepts either a plain number of minutes or the
 * backend's { min, max } range, which reads as "15–25 min".
 */
export const formatWaitTime = (estimate, t) => {
  const soon = () => (t ? t('wait.soon') : 'Soon')
  const approx = (value) => (t ? t('wait.approx', { value }) : `~${value}`)

  if (estimate && typeof estimate === 'object') {
    const { min, max } = estimate
    if (!max || max <= 0) return soon()
    // A zero-width band (a very consistent department) reads as one number
    if (!min || min <= 0 || min === max) return approx(formatMinutes(max, t))
    // Only the larger figure carries the unit: "15–25 min"
    const low = max < 60 ? String(min) : formatMinutes(min, t)
    const high = formatMinutes(max, t)
    return t ? t('wait.range', { low, high }) : `${low}–${high}`
  }

  if (!estimate || estimate <= 0) return soon()
  return approx(formatMinutes(estimate, t))
}

// Priority badge config
export const PRIORITY_CONFIG = {
  3: { label: 'Emergency', color: 'bg-red-100 text-red-700 border-red-300' },
  2: { label: 'Senior Citizen', color: 'bg-violet-100 text-violet-700 border-violet-300' },
  1: { label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-300' },
}

// Token status display config
export const STATUS_CONFIG = {
  waiting: { label: 'Waiting', color: 'bg-blue-100 text-blue-700' },
  serving: { label: 'Now Serving', color: 'bg-teal-100 text-teal-700' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600'  },
  skipped: { label: 'Skipped', color: 'bg-yellow-100 text-yellow-700' },
}
