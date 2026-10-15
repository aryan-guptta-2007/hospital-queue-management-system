import { useVizPalette } from '../../utils/vizPalette'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// A government OPD is not a 24-hour operation; showing midnight to midnight
// would spend most of the grid on empty cells
const FIRST_HOUR = 6
const LAST_HOUR = 21

const hourLabel = (hour) => {
  const suffix = hour < 12 ? 'am' : 'pm'
  const display = hour % 12 === 0 ? 12 : hour % 12

  return `${display}${suffix}`
}

/**
 * Weekday × hour grid of token volume, in IST.
 *
 * A grid rather than a recharts component: this is a sequential magnitude over
 * two discrete axes, which no cartesian chart type renders well. One hue,
 * light to dark, with the count written into the busier cells so the reading
 * never depends on colour alone.
 */
const PeakHoursHeatmap = ({ rows = [], busiest }) => {
  const { heat, isDark } = useVizPalette()

  const counts = new Map(rows.map((row) => [`${row.weekday}-${row.hour}`, row.tokens]))
  const busiestCount = Math.max(1, ...rows.map((row) => row.tokens))

  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i)

  /** Index into the ramp — step 0 means "nothing happened here" */
  const stepFor = (tokens) => {
    if (!tokens) return 0
    return Math.min(heat.length - 1, Math.ceil((tokens / busiestCount) * (heat.length - 1)))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-xs">
        <caption className="sr-only">
          Tokens issued by weekday and hour of the day, India Standard Time
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Weekday
            </th>
            {hours.map((hour) => (
              <th
                key={hour}
                scope="col"
                className="px-0 pb-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums"
              >
                {hour % 3 === 0 ? hourLabel(hour) : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((day, dayIndex) => (
            <tr key={day}>
              <th
                scope="row"
                className="pr-2 text-right text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap"
              >
                {day}
              </th>
              {hours.map((hour) => {
                const tokens = counts.get(`${dayIndex + 1}-${hour}`) || 0
                const step = stepFor(tokens)
                const isBusiest =
                  busiest && busiest.weekday === dayIndex + 1 && busiest.hour === hour

                return (
                  <td
                    key={hour}
                    title={`${day} ${hourLabel(hour)} — ${tokens} token${tokens === 1 ? '' : 's'}`}
                    className={`h-8 min-w-[24px] rounded text-center align-middle font-bold tabular-nums
                      ${isBusiest ? 'ring-2 ring-fuchsia-400 dark:ring-fuchsia-300' : ''}`}
                    style={{
                      backgroundColor: heat[step],
                      // The number only appears where there is room for it to
                      // be legible, so colour is never the only channel
                      color:
                        step >= heat.length - 2 ? (isDark ? '#0b1220' : '#ffffff') : 'transparent',
                    }}
                  >
                    {tokens > 0 ? tokens : ''}
                    <span className="sr-only">
                      {day} {hourLabel(hour)}: {tokens} tokens
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-end gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span>Quiet</span>
        {heat.map((colour) => (
          <span
            key={colour}
            className="h-3 w-6 rounded-sm"
            style={{ backgroundColor: colour }}
            aria-hidden
          />
        ))}
        <span>Busy</span>
      </div>
    </div>
  )
}

export default PeakHoursHeatmap
