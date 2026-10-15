import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/axios'
import LanguageSwitcher from '../components/common/LanguageSwitcher'
import { useQueueSocket } from '../context/QueueContext'
import {
  announceToken,
  cancelAnnouncements,
  hasHindiVoice,
  isSpeechSupported,
  primeSpeech,
} from '../utils/announce'

const REFRESH_INTERVAL = 3000

// A wall-mounted board is read from across a room, and the staff setting it up
// should be able to make it bigger without touching the browser's own zoom.
const TEXT_SCALE_KEY = 'hq-display-text-scale'
const TEXT_SCALES = [
  { label: 'A', value: 1, title: 'Normal text size' },
  { label: 'A+', value: 1.25, title: 'Larger text' },
  { label: 'A++', value: 1.5, title: 'Largest text' },
]

const DisplayPage = () => {
  const { t } = useTranslation()
  const [departments, setDepartments] = useState([])
  const [selectedDept, setSelectedDept] = useState(null)
  const [display, setDisplay] = useState({ serving: null, next: [] })
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)
  const [tokenBump, setTokenBump] = useState(0)
  const prevServingRef = useRef(null)
  const { lastEvent, connected, subscribe } = useQueueSocket()

  // Audio cannot start until somebody presses the button, so the board opens
  // silent and stays that way until then
  const [audioStarted, setAudioStarted] = useState(false)
  const [muted, setMuted] = useState(false)
  const [hindiVoiceMissing, setHindiVoiceMissing] = useState(false)
  const [textScale, setTextScale] = useState(() => {
    try {
      return Number(window.localStorage.getItem(TEXT_SCALE_KEY)) || 1
    } catch {
      return 1
    }
  })
  const audioContextRef = useRef(null)
  const lastAnnouncedRef = useRef(null)
  const speechSupported = isSpeechSupported()

  useEffect(() => {
    api
      .get('/departments')
      .then((res) => {
        const depts = res.data.data || []
        setDepartments(depts)
        if (depts.length > 0) setSelectedDept(depts[0]._id)
      })
      .catch(() => setError(t('display.errorDepartments')))
  }, [t])

  const fetchDisplay = useCallback(() => {
    if (!selectedDept) return
    api
      .get(`/queue/public/${selectedDept}`)
      .then((res) => {
        setDisplay(res.data.data)
        setLastUpdated(new Date())
        setError(null)
      })
      .catch(() => setError(t('display.errorConnection')))
  }, [selectedDept, t])

  useEffect(() => subscribe(selectedDept), [subscribe, selectedDept])

  useEffect(() => {
    fetchDisplay()

    // The socket pushes every change, so polling is only a fallback for when
    // it is down — a wall-mounted board must never go stale silently.
    if (connected) return undefined

    const id = setInterval(fetchDisplay, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [fetchDisplay, connected])

  useEffect(() => {
    if (!lastEvent || !selectedDept) return
    if (String(lastEvent.departmentId) !== String(selectedDept)) return
    fetchDisplay()
  }, [lastEvent, selectedDept, fetchDisplay])

  const servingId = display.serving?.tokenNumber ?? null
  useEffect(() => {
    if (servingId != null && servingId !== prevServingRef.current) {
      setTokenBump((k) => k + 1)
    }
    prevServingRef.current = servingId
  }, [servingId])

  const deptName = departments.find((d) => d._id === selectedDept)?.name || ''

  /**
   * Unlocks audio. Browsers only allow sound to start from inside a real user
   * gesture, which is what this button is for.
   */
  const handleStartDisplay = async () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext

      if (AudioContextClass && !audioContextRef.current) {
        audioContextRef.current = new AudioContextClass()
      }

      await audioContextRef.current?.resume()
      primeSpeech()
    } catch (err) {
      // The board itself still works; only the sound is unavailable
      console.warn('Could not start audio:', err?.message)
    }

    // Whatever is on screen right now counts as already announced
    lastAnnouncedRef.current = servingId
    setHindiVoiceMissing(speechSupported && !hasHindiVoice())
    setAudioStarted(true)
  }

  // Announce each new serving token: chime, English, then Hindi
  useEffect(() => {
    if (!audioStarted) return
    if (!servingId || servingId === lastAnnouncedRef.current) return

    // Marked as seen even while muted, so unmuting never replays an old token
    lastAnnouncedRef.current = servingId
    if (muted) return

    let abandoned = false

    // A newer token supersedes anything still being read out
    cancelAnnouncements()

    announceToken({
      tokenNumber: servingId,
      departmentName: deptName,
      audioContext: audioContextRef.current,
    })
      .then(({ spokenHindi }) => {
        if (!abandoned) setHindiVoiceMissing(!spokenHindi)
      })
      .catch(() => {})

    return () => {
      abandoned = true
    }
  }, [audioStarted, muted, servingId, deptName])

  // Every size on this page is in rem, so scaling the root font size scales
  // the whole board at once. Restored on the way out, because the admin
  // screens share the same document.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.fontSize

    root.style.fontSize = `${16 * textScale}px`

    try {
      window.localStorage.setItem(TEXT_SCALE_KEY, String(textScale))
    } catch {
      /* a kiosk with storage disabled simply starts at normal size */
    }

    return () => {
      root.style.fontSize = previous
    }
  }, [textScale])

  // Leaving the page must not leave a voice talking to an empty room
  useEffect(
    () => () => {
      cancelAnnouncements()
      audioContextRef.current?.close().catch(() => {})
    },
    []
  )

  return (
    <div className="min-h-screen bg-[#f4f8ff] dark:bg-[#070913] text-slate-900 dark:text-white flex flex-col select-none font-display">
      <header
        className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 lg:px-10 py-5
                         bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl border-b border-cyan-300/30 dark:border-cyan-400/15 shadow-lg shadow-black/20"
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-fuchsia-600/20
                       text-4xl ring-1 ring-white/10 shadow-inner-soft"
          >
            🏥
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t('display.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-medium">
              {t('display.hospital')}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:items-end">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-300/90">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            </span>
            {connected ? t('common.live') : t('common.polling')}
          </div>

          {!audioStarted ? (
            <button
              type="button"
              onClick={handleStartDisplay}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-cyan-400/50 bg-white/90 dark:bg-slate-800/90 px-4 py-2
                         text-sm font-bold text-slate-800 dark:text-white shadow-sm transition-all duration-200
                         hover:border-cyan-300 hover:bg-white dark:hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0
                         focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/30"
              title={t('display.startDisplayTitle')}
            >
              <span aria-hidden>🔊</span>
              {t('display.startDisplay')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-pressed={muted}
              className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-bold shadow-sm
                          transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0
                          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/30
                ${
                  muted
                    ? 'border-slate-400/50 bg-slate-200/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300'
                    : 'border-cyan-400/50 bg-white/90 text-slate-800 dark:bg-slate-800/90 dark:text-white'
                }`}
              title={muted ? t('display.mutedTitle') : t('display.announcingTitle')}
            >
              <span aria-hidden>{muted ? '🔇' : '🔊'}</span>
              {muted ? t('display.muted') : t('display.announcing')}
            </button>
          )}

          <div
            className="inline-flex items-center gap-1 rounded-xl border border-cyan-300/40 dark:border-cyan-400/25
                       bg-white/85 dark:bg-slate-900/80 p-1"
            role="group"
            aria-label="Text size"
          >
            {TEXT_SCALES.map((scale) => (
              <button
                key={scale.value}
                type="button"
                onClick={() => setTextScale(scale.value)}
                aria-pressed={textScale === scale.value}
                title={scale.title}
                className={`rounded-lg px-2.5 py-1.5 font-bold leading-none transition-all duration-200
                  ${scale.value === 1 ? 'text-xs' : scale.value === 1.25 ? 'text-sm' : 'text-base'}
                  ${
                    textScale === scale.value
                      ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                {scale.label}
              </button>
            ))}
          </div>

          <LanguageSwitcher />

          <div className="flex flex-col gap-1">
            <label
              htmlFor="display-department"
              className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider"
            >
              {t('display.department')}
            </label>
            <select
              id="display-department"
              value={selectedDept || ''}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white dark:bg-slate-800/90 border border-cyan-300/30 dark:border-white/15 text-slate-900 dark:text-white text-lg font-semibold
                         rounded-xl px-4 py-2.5 pr-10 min-w-[220px]
                         focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-400/50
                         transition-shadow hover:border-cyan-300/60 dark:hover:border-white/25 cursor-pointer
                         appearance-none bg-[length:1.25rem] bg-[right_0.65rem_center] bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              }}
            >
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
            {lastUpdated && (
              <span className="text-slate-600 dark:text-slate-400 text-xs font-medium tabular-nums">
                {t('display.updated', { time: lastUpdated.toLocaleTimeString() })}
              </span>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div
          className="bg-red-950/90 border-b border-red-500/30 text-red-100 text-center py-3 text-base font-medium
                     animate-fade-in-down backdrop-blur-sm"
        >
          <span className="inline-flex items-center gap-2">
            <span className="text-red-300" aria-hidden>
              ⚠
            </span>
            {error}
          </span>
        </div>
      )}

      <main className="flex flex-1 flex-col lg:flex-row gap-0 overflow-hidden">
        <section
          className="relative flex flex-1 flex-col items-center justify-center min-h-[45vh] lg:min-h-0
                     bg-gradient-to-br from-[#0a1228] via-[#161033] to-[#120a24]
                     border-b lg:border-b-0 lg:border-r border-cyan-300/30 dark:border-white/10 px-6 py-12 lg:py-16 overflow-hidden"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 20%, rgba(34,211,238,0.3) 0%, transparent 45%), radial-gradient(circle at 70% 80%, rgba(217,70,239,0.22) 0%, transparent 40%)',
            }}
            aria-hidden
          />
          <p className="relative text-sm sm:text-base font-bold tracking-[0.35em] uppercase text-cyan-300/90 mb-6">
            {t('display.nowServing')}
          </p>

          {display.serving ? (
            <>
              <div
                key={tokenBump}
                className="relative text-[clamp(4.5rem,15vw,10rem)] leading-none font-black tracking-tight text-white
                           drop-shadow-[0_8px_40px_rgba(34,211,238,0.45)] motion-reduce:animate-none animate-token-flash"
              >
                {display.serving.tokenNumber}
              </div>
              <p className="relative mt-6 text-2xl sm:text-4xl font-semibold text-cyan-100/95 text-center max-w-[90vw]">
                {display.serving.patient?.name}
              </p>
              <p className="relative mt-2 text-lg sm:text-xl text-fuchsia-300/80 font-medium">
                {deptName}
              </p>
            </>
          ) : (
            <div className="relative text-5xl sm:text-6xl font-bold text-slate-300 tracking-widest">
              —
            </div>
          )}
        </section>

        <section className="flex flex-col w-full lg:w-[420px] shrink-0 bg-white/90 dark:bg-slate-900/95 px-6 py-8 lg:py-10 border-t lg:border-t-0 lg:border-l border-cyan-300/30 dark:border-white/5">
          <p className="text-lg sm:text-xl font-bold tracking-[0.25em] uppercase text-slate-600 dark:text-slate-500 mb-6">
            {t('display.upNext')}
          </p>

          {display.next.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
              <div className="text-5xl mb-4 opacity-80 motion-reduce:animate-none animate-float">
                ✨
              </div>
              <p className="text-xl font-semibold text-slate-600 dark:text-slate-300">
                {t('display.noPatients')}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                {t('display.queueClear')}
              </p>
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {display.next.map((token, idx) => (
                <li
                  key={token.tokenNumber}
                  className={`group flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300
                    motion-reduce:transition-none
                    ${
                      idx === 0
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-2 border-amber-400/50 shadow-lg shadow-amber-500/10 scale-[1.02]'
                        : 'bg-slate-100 dark:bg-slate-800/80 border border-cyan-200/70 dark:border-white/10 hover:border-cyan-300 dark:hover:border-white/20 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <span
                    className={`text-xl font-black w-8 text-center tabular-nums transition-colors
                      ${idx === 0 ? 'text-amber-300' : 'text-slate-600 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-400'}`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`text-3xl sm:text-4xl font-black tracking-tight flex-1 tabular-nums transition-transform duration-300
                      ${idx === 0 ? 'text-amber-200' : 'text-slate-900 dark:text-white group-hover:translate-x-0.5'}`}
                  >
                    {token.tokenNumber}
                  </span>
                  <span className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium truncate max-w-[38%] text-right">
                    {token.patient?.name}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-cyan-300/30 dark:border-white/10 py-3 px-4 text-center text-slate-600 dark:text-slate-500 text-xs sm:text-sm tracking-wide">
        {connected
          ? t('display.footerLive')
          : t('display.footerPolling', { seconds: REFRESH_INTERVAL / 1000 })}{' '}
        · {t('display.footerWait')}
        {!speechSupported && ` · ${t('display.noSpeech')}`}
        {speechSupported && !audioStarted && ` · ${t('display.pressStart')}`}
        {audioStarted && !muted && hindiVoiceMissing && ` · ${t('display.noHindiVoice')}`}
      </footer>
    </div>
  )
}

export default DisplayPage
