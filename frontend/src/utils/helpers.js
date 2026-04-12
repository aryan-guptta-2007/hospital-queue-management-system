// Format minutes into human-readable string
export const formatWaitTime = (minutes) => {
  if (!minutes || minutes <= 0) return 'Soon'
  if (minutes < 60) return `~${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`
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
