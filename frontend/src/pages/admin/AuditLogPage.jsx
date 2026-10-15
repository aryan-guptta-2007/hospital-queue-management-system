import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import Navbar from '../../components/common/Navbar'
import Loader from '../../components/common/Loader'

const PAGE_SIZE = 25

/** Action names come from the API, so the two can never drift apart */
const ACTION_LABELS = {
  call_next: 'Called next',
  skip: 'Skipped',
  complete: 'Completed',
  requeue: 'Requeued',
  recall: 'Recalled',
  emergency_insert: 'Emergency insert',
  department_create: 'Department created',
  department_update: 'Department updated',
}

const ACTION_TONE = {
  skip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30',
  emergency_insert: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-400/30',
  complete: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30',
  department_create:
    'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-400/30',
  department_update:
    'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-400/30',
}

const DEFAULT_TONE = 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 border-cyan-400/30'

const AuditLogPage = () => {
  const [filters, setFilters] = useState({
    action: '',
    departmentId: '',
    userId: '',
    from: '',
    to: '',
  })
  const [page, setPage] = useState(1)
  const [actions, setActions] = useState([])
  const [departments, setDepartments] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  /** Shown beside the "staff member" filter, since there is no user list API */
  const [filteredUser, setFilteredUser] = useState(null)

  useEffect(() => {
    api
      .get('/audit/actions')
      .then((res) => setActions(res.data.data || []))
      .catch(() => setActions([]))

    api
      .get('/departments')
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => setDepartments([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value)
    })

    try {
      const res = await api.get(`/audit?${query}`)
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the audit log.')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    load()
  }, [load])

  const update = (key, value) => {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const filterByUser = (user) => {
    setFilteredUser(user)
    update('userId', user._id)
  }

  const clearFilters = () => {
    setFilteredUser(null)
    setPage(1)
    setFilters({ action: '', departmentId: '', userId: '', from: '', to: '' })
  }

  const hasFilters = Object.values(filters).some(Boolean)
  const entries = result?.entries || []

  return (
    <div className="min-h-screen bg-mesh-admin">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Audit log
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 font-medium">
            Every staff action on the queue, newest first
            {result ? ` · ${result.total} recorded` : ''}
          </p>
        </div>

        <section className="card">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label
                htmlFor="audit-action"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1"
              >
                Action
              </label>
              <select
                id="audit-action"
                value={filters.action}
                onChange={(e) => update('action', e.target.value)}
                className="select-field py-2 text-sm font-semibold"
              >
                <option value="">All actions</option>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {ACTION_LABELS[action] || action}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="audit-department"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1"
              >
                Department
              </label>
              <select
                id="audit-department"
                value={filters.departmentId}
                onChange={(e) => update('departmentId', e.target.value)}
                className="select-field py-2 text-sm font-semibold"
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department._id} value={department._id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="audit-from"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1"
              >
                From
              </label>
              <input
                id="audit-from"
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => update('from', e.target.value)}
                className="input-field py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="audit-to"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1"
              >
                To
              </label>
              <input
                id="audit-to"
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => update('to', e.target.value)}
                className="input-field py-2 text-sm"
              />
            </div>

            {filters.userId && (
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Staff: {filteredUser?.name || 'selected member'}
              </p>
            )}

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border-2 border-cyan-300/30 dark:border-cyan-400/25 px-4 py-2 text-sm font-bold
                           text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="card text-red-700 dark:text-red-300 font-semibold" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <Loader text="Loading the log…" />
        ) : (
          <section className="card overflow-x-auto">
            {entries.length === 0 ? (
              <p className="py-16 text-center text-slate-500 dark:text-slate-400 font-medium">
                No actions match these filters.
              </p>
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Staff actions with the time, who acted, the action, department and token
                </caption>
                <thead>
                  <tr className="border-b border-cyan-300/30 dark:border-cyan-500/20">
                    {['When', 'Staff member', 'Action', 'Department', 'Token', 'Details'].map(
                      (heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/40">
                  {entries.map((entry) => (
                    <tr
                      key={entry._id}
                      className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {entry.user ? (
                          <button
                            type="button"
                            onClick={() => filterByUser(entry.user)}
                            title={`Show only ${entry.user.name}`}
                            className="font-semibold text-slate-800 dark:text-slate-100 underline decoration-dotted
                                       underline-offset-2 hover:text-cyan-600 dark:hover:text-cyan-300
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded"
                          >
                            {entry.user.name}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
                            ACTION_TONE[entry.action] || DEFAULT_TONE
                          }`}
                        >
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-200">
                        {entry.department?.code || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-700 dark:text-slate-200">
                        {entry.token?.tokenNumber || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                        {entry.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {result && result.pages > 1 && (
              <nav
                className="flex items-center justify-between gap-3 pt-5"
                aria-label="Audit log pages"
              >
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border-2 border-cyan-300/30 dark:border-cyan-400/25 px-4 py-2 text-sm font-bold
                             text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800
                             disabled:opacity-40 disabled:cursor-not-allowed
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                >
                  ← Newer
                </button>

                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                  Page {result.page} of {result.pages}
                </p>

                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(result.pages, current + 1))}
                  disabled={page >= result.pages}
                  className="rounded-xl border-2 border-cyan-300/30 dark:border-cyan-400/25 px-4 py-2 text-sm font-bold
                             text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800
                             disabled:opacity-40 disabled:cursor-not-allowed
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                >
                  Older →
                </button>
              </nav>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default AuditLogPage
