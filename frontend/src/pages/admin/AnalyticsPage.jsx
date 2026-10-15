import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../../api/axios'
import Navbar from '../../components/common/Navbar'
import Loader from '../../components/common/Loader'
import PeakHoursHeatmap from '../../components/admin/PeakHoursHeatmap'
import { useVizPalette, seriesColour } from '../../utils/vizPalette'

const DAY_MS = 86400000

/** YYYY-MM-DD, the same shape the API stores service dates in */
const isoDate = (date) => date.toISOString().slice(0, 10)

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

const rangeForDays = (days) => ({
  from: isoDate(new Date(Date.now() - (days - 1) * DAY_MS)),
  to: isoDate(new Date()),
})

const StatTile = ({ label, value, unit, hint }) => (
  <div className="card text-center py-5">
    <p className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
      {label}
    </p>
    <p className="font-display text-4xl font-extrabold mt-2 text-slate-900 dark:text-slate-100">
      {value}
      {unit && (
        <span className="text-xl font-bold text-slate-500 dark:text-slate-400"> {unit}</span>
      )}
    </p>
    {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{hint}</p>}
  </div>
)

const AnalyticsPage = () => {
  const { series, chrome } = useVizPalette()

  const [range, setRange] = useState(() => rangeForDays(7))
  const [departments, setDepartments] = useState([])
  const [departmentId, setDepartmentId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/departments')
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => setDepartments([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const query = new URLSearchParams({ from: range.from, to: range.to })
    if (departmentId) query.set('departmentId', departmentId)

    try {
      const [overview, perDay, peak, byDepartment] = await Promise.all([
        api.get(`/analytics/overview?${query}`),
        api.get(`/analytics/tokens-per-day?${query}`),
        api.get(`/analytics/peak-hours?${query}`),
        api.get(`/analytics/departments?${query}`),
      ])

      setData({
        overview: overview.data.data,
        perDay: perDay.data.data,
        peak: peak.data.data,
        byDepartment: byDepartment.data.data,
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load analytics.')
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to, departmentId])

  useEffect(() => {
    load()
  }, [load])

  /** Rows arrive one per department per day; the chart wants one row per day */
  const { trend, departmentCodes } = useMemo(() => {
    const rows = data?.perDay?.rows || []
    const byDate = new Map()
    const codes = []

    for (const row of rows) {
      const code = row.departmentCode || 'Unknown'
      if (!codes.includes(code)) codes.push(code)

      const day = byDate.get(row.date) || { date: row.date }
      day[code] = (day[code] || 0) + row.tokens
      byDate.set(row.date, day)
    }

    return {
      trend: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
      // Fixed order, so a department keeps its colour across reloads
      departmentCodes: codes.sort(),
    }
  }, [data])

  /**
   * A department keeps its colour everywhere: the stacked bars, the skip-rate
   * bars and the table dot. Slots are assigned from the full department list
   * in a fixed order, so sorting by volume or filtering never repaints anyone.
   */
  const colourFor = useMemo(() => {
    const codes = [
      ...new Set([...departments.map((d) => d.code), ...departmentCodes]),
    ].sort()
    const slots = new Map(codes.map((code, index) => [code, seriesColour(series, index)]))

    return (code) => slots.get(code) || series[0]
  }, [departments, departmentCodes, series])

  const skipRates = (data?.byDepartment?.rows || []).map((row) => ({
    code: row.departmentCode || '—',
    skipRate: row.skipRate ?? 0,
  }))

  const tooltipStyle = {
    backgroundColor: chrome.surface,
    border: `1px solid ${chrome.grid}`,
    borderRadius: 12,
    color: chrome.muted,
    fontSize: 12,
  }

  const axisProps = {
    tick: { fill: chrome.muted, fontSize: 12 },
    axisLine: { stroke: chrome.axis },
    tickLine: false,
  }

  return (
    <div className="min-h-screen bg-mesh-admin">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              Analytics
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 font-medium">
              {data?.overview?.range
                ? `${data.overview.range.from} to ${data.overview.range.to}`
                : 'Choose a period'}
            </p>
          </div>
        </div>

        {/* Filters sit in one row above everything they affect */}
        <section className="card">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const presetRange = rangeForDays(preset.days)
                const active = range.from === presetRange.from && range.to === presetRange.to

                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setRange(presetRange)}
                    aria-pressed={active}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50
                      ${
                        active
                          ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-sm'
                          : 'border-2 border-cyan-300/30 dark:border-cyan-400/25 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-end gap-2">
              <div>
                <label
                  htmlFor="analytics-from"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1"
                >
                  From
                </label>
                <input
                  id="analytics-from"
                  type="date"
                  value={range.from}
                  max={range.to}
                  onChange={(e) => setRange((current) => ({ ...current, from: e.target.value }))}
                  className="input-field py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="analytics-to"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1"
                >
                  To
                </label>
                <input
                  id="analytics-to"
                  type="date"
                  value={range.to}
                  min={range.from}
                  onChange={(e) => setRange((current) => ({ ...current, to: e.target.value }))}
                  className="input-field py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="analytics-department"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1"
              >
                Department
              </label>
              <select
                id="analytics-department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
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
          </div>
        </section>

        {error && (
          <div
            className="card border-red-300/60 text-red-700 dark:text-red-300 font-semibold"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading ? (
          <Loader text="Crunching the numbers…" />
        ) : (
          data && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile
                  label="Tokens issued"
                  value={data.overview.tokens}
                  hint={`${data.overview.completed} seen · ${data.overview.skipped} skipped`}
                />
                <StatTile label="Skip rate" value={data.overview.skipRate ?? 0} unit="%" />
                <StatTile
                  label="Average wait"
                  value={data.overview.avgWaitMinutes ?? '—'}
                  unit={data.overview.avgWaitMinutes == null ? '' : 'min'}
                  hint="Registered until called"
                />
                <StatTile
                  label="Average consultation"
                  value={data.overview.avgConsultationMinutes ?? '—'}
                  unit={data.overview.avgConsultationMinutes == null ? '' : 'min'}
                  hint="Called until completed"
                />
              </div>

              <section className="card">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Tokens per day
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Stacked by department
                </p>

                {trend.length === 0 ? (
                  <p className="py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No tokens were issued in this period.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid stroke={chrome.grid} vertical={false} />
                      <XAxis dataKey="date" {...axisProps} />
                      <YAxis allowDecimals={false} {...axisProps} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: chrome.grid, opacity: 0.25 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: chrome.muted }} />
                      {departmentCodes.map((code, index) => (
                        <Bar
                          key={code}
                          dataKey={code}
                          stackId="tokens"
                          fill={colourFor(code)}
                          // A 2px stroke in the surface colour is the gap
                          // between stacked segments
                          stroke={chrome.surface}
                          strokeWidth={2}
                          radius={index === departmentCodes.length - 1 ? [4, 4, 0, 0] : 0}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </section>

              <section className="card">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Peak hours
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  When tokens are taken, by weekday and hour (IST)
                  {data.peak.busiest &&
                    ` · busiest: ${data.peak.busiest.tokens} tokens in one hour`}
                </p>
                <PeakHoursHeatmap rows={data.peak.rows} busiest={data.peak.busiest} />
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section className="card">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Skip rate by department
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                    Share of tokens that were skipped
                  </p>

                  {skipRates.length === 0 ? (
                    <p className="py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                      Nothing to show yet.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(200, skipRates.length * 44)}>
                      <BarChart
                        data={skipRates}
                        layout="vertical"
                        margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
                      >
                        <CartesianGrid stroke={chrome.grid} horizontal={false} />
                        <XAxis type="number" unit="%" {...axisProps} />
                        <YAxis type="category" dataKey="code" width={64} {...axisProps} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          cursor={{ fill: chrome.grid, opacity: 0.25 }}
                          formatter={(value) => [`${value}%`, 'Skip rate']}
                        />
                        <Bar dataKey="skipRate" radius={[0, 4, 4, 0]} barSize={18}>
                          {skipRates.map((row) => (
                            <Cell key={row.code} fill={colourFor(row.code)} />
                          ))}
                          <LabelList
                            dataKey="skipRate"
                            position="right"
                            formatter={(value) => `${value}%`}
                            style={{ fill: chrome.muted, fontSize: 12, fontWeight: 700 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </section>

                {/* The table is also the relief for colour-contrast: every
                    number on the charts is readable here in plain text */}
                <section className="card overflow-x-auto">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-5">
                    By department
                  </h2>

                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Tokens, average wait, average consultation time and skip rate per department
                    </caption>
                    <thead>
                      <tr className="border-b border-cyan-300/30 dark:border-cyan-500/20">
                        {['Department', 'Tokens', 'Avg wait', 'Avg consult', 'Skipped'].map(
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
                      {(data.byDepartment.rows || []).map((row, index) => (
                        <tr key={row.departmentId || index}>
                          <th
                            scope="row"
                            className="px-3 py-2.5 text-left font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap"
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full mr-2 align-middle"
                              style={{ backgroundColor: colourFor(row.departmentCode) }}
                              aria-hidden
                            />
                            {row.departmentName || '—'}
                          </th>
                          <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">
                            {row.tokens}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">
                            {row.avgWaitMinutes ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">
                            {row.avgConsultationMinutes ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200">
                            {row.skipped} ({row.skipRate ?? 0}%)
                          </td>
                        </tr>
                      ))}
                      {(data.byDepartment.rows || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-10 text-center text-slate-500 dark:text-slate-400 font-medium"
                          >
                            No tokens in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>
              </div>
            </>
          )
        )}
      </main>
    </div>
  )
}

export default AnalyticsPage
