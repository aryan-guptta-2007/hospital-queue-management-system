import { useState } from 'react'

const ActionButtons = ({ selectedToken, servingToken, onAction, loading }) => {
  const [showEmergencyForm, setShowEmergencyForm] = useState(false)
  const [emergencyForm, setEmergencyForm] = useState({ name: '', phone: '', age: '', note: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleEmergencySubmit = async (e) => {
    e.preventDefault()
    if (!emergencyForm.name.trim()) return
    setSubmitting(true)
    await onAction('emergency', emergencyForm)
    setEmergencyForm({ name: '', phone: '', age: '', note: '' })
    setShowEmergencyForm(false)
    setSubmitting(false)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onAction('next')}
          disabled={loading}
          className="col-span-2 sm:col-span-1 btn-success flex items-center justify-center gap-2 text-base min-h-[52px]
                     hover:-translate-y-0.5 active:translate-y-0"
        >
          ▶ Call next
        </button>

        <button
          type="button"
          onClick={() => onAction('skip', selectedToken)}
          disabled={loading || !selectedToken}
          title={!selectedToken ? 'Select a patient in the queue first' : ''}
          className="btn-amber flex items-center justify-center gap-2 text-base min-h-[52px]
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 hover:-translate-y-0.5 active:translate-y-0"
        >
          ⏭ Skip
        </button>

        <button
          type="button"
          onClick={() => onAction('complete')}
          disabled={loading || !servingToken}
          title={
            !servingToken
              ? 'Nobody is being served right now'
              : 'Completes the token shown as now serving'
          }
          className="bg-gradient-to-br from-cyan-700 to-fuchsia-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md
                     hover:shadow-lg hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
                     transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0
                     focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-400/35 flex items-center justify-center gap-2 min-h-[52px]"
        >
          ✅ Complete
        </button>

        <button
          type="button"
          onClick={() => setShowEmergencyForm((v) => !v)}
          className={`btn-danger flex items-center justify-center gap-2 text-base min-h-[52px] transition-all
            ${showEmergencyForm ? 'ring-4 ring-red-400/40 -translate-y-0.5' : 'hover:-translate-y-0.5'}`}
        >
          🚨 Emergency
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-300 text-center font-medium">
        <strong className="text-fuchsia-600 dark:text-fuchsia-300">Complete</strong> always applies
        to the token shown as now serving.
        {!selectedToken && (
          <>
            {' '}
            Tap a row to select a patient for{' '}
            <strong className="text-cyan-600 dark:text-cyan-300">Skip</strong>.
          </>
        )}
      </p>

      {showEmergencyForm && (
        <form
          onSubmit={handleEmergencySubmit}
          className="rounded-2xl border-2 border-red-400/40 bg-gradient-to-br from-red-50/80 to-white dark:from-red-500/10 dark:to-slate-900 p-5 sm:p-6 space-y-4
                     shadow-lg shadow-red-500/20 animate-fade-in-up ring-1 ring-red-500/20"
        >
          <h3 className="font-display font-bold text-red-700 dark:text-red-300 text-lg flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300"
              aria-hidden
            >
              🚨
            </span>
            Emergency insert
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label htmlFor="emergency-name" className="sr-only">
              Patient name (required)
            </label>
            <input
              id="emergency-name"
              required
              placeholder="Patient name *"
              value={emergencyForm.name}
              onChange={(e) => setEmergencyForm({ ...emergencyForm, name: e.target.value })}
              className="input-field py-2.5 text-base"
            />
            <label htmlFor="emergency-phone" className="sr-only">
              Phone number (optional)
            </label>
            <input
              id="emergency-phone"
              placeholder="Phone (optional)"
              value={emergencyForm.phone}
              onChange={(e) => setEmergencyForm({ ...emergencyForm, phone: e.target.value })}
              className="input-field py-2.5 text-base"
            />
            <label htmlFor="emergency-age" className="sr-only">
              Age (optional)
            </label>
            <input
              id="emergency-age"
              type="number"
              placeholder="Age (optional)"
              value={emergencyForm.age}
              min="0"
              onChange={(e) => setEmergencyForm({ ...emergencyForm, age: e.target.value })}
              className="input-field py-2.5 text-base"
            />
            <label htmlFor="emergency-note" className="sr-only">
              Note, for example the reason for the emergency
            </label>
            <input
              id="emergency-note"
              placeholder="Note (e.g. chest pain)"
              value={emergencyForm.note}
              onChange={(e) => setEmergencyForm({ ...emergencyForm, note: e.target.value })}
              className="input-field py-2.5 text-base"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setShowEmergencyForm(false)}
              className="px-5 py-3 rounded-xl border-2 border-cyan-300/35 dark:border-cyan-500/25 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-danger flex-1 py-3 text-base sm:flex-[2]"
            >
              {submitting ? 'Inserting…' : 'Insert at front'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default ActionButtons
