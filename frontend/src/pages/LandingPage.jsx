import { useState, useEffect, useLayoutEffect, lazy, Suspense, Component } from 'react'
import { Link } from 'react-router-dom'
import LandingThemeToggle from '../components/landing/LandingThemeToggle'
import HospitalQueueIllustration from '../components/landing/HospitalQueueIllustration'
import Loader from '../components/common/Loader'

const HeroCanvas = lazy(() => import('../components/landing/HeroCanvas'))

class SceneErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error) {
    console.warn('3D Hero scene failed to render, falling back to 2D illustration:', error)
  }
  render() {
    if (this.state.hasError) {
      return <HospitalQueueIllustration isDark={this.props.isDark} reducedMotion={this.props.reducedMotion} />
    }
    return this.props.children
  }
}

const STORAGE_KEY = 'hq-landing-theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Keep <html> in sync for any global styles; landing UI uses `isDark` below, not `dark:` */
function useSyncDocumentTheme(theme) {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [theme])
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

const trustPoints = [
  { label: 'Wait times', text: 'Your place in line on phones and hall screens.' },
  { label: 'Accessibility', text: 'Big buttons and plain language for every patient.' },
  { label: 'Front desk', text: 'Staff call the next patient from one screen.' },
]

function QueueLineIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 48" fill="none" aria-hidden>
      <rect x="4" y="8" width="12" height="32" rx="3" fill="currentColor" opacity="0.2" />
      <rect x="22" y="14" width="12" height="20" rx="3" fill="currentColor" opacity="0.35" />
      <rect x="40" y="10" width="12" height="28" rx="3" fill="currentColor" opacity="0.55" />
      <path d="M56 24 L62 24 M59 21 L62 24 L59 27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const LandingPage = () => {
  const reducedMotion = useReducedMotion()
  const [theme, setTheme] = useState(() => getInitialTheme())
  const isDark = theme === 'dark'

  useSyncDocumentTheme(theme)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <div
      className={
        isDark
          ? 'relative min-h-screen overflow-x-hidden bg-[#070913] text-slate-100'
          : 'relative min-h-screen overflow-x-hidden bg-[#f5f8ff] text-slate-900'
      }
    >
      <div
        className={
          isDark
            ? 'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#0c1122_0%,#0a0f1e_45%,#070913_100%)]'
            : 'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_52%,#edf4ff_100%)]'
        }
        aria-hidden
      />
      <div
        className={
          isDark
            ? 'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(217,70,239,0.18)_0%,transparent_46%)]'
            : 'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_58%_at_50%_-8%,rgba(34,211,238,0.12)_0%,transparent_52%)]'
        }
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header
          className={
            isDark
              ? 'border-b border-cyan-400/15 bg-slate-950/55 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/35'
              : 'border-b border-cyan-200/80 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75'
          }
        >
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:gap-4 sm:px-8 sm:py-5">
            <Link
              to="/"
              className={
                isDark
                  ? 'flex items-center gap-3 rounded-xl outline-none ring-offset-2 ring-offset-slate-950 focus-visible:ring-2 focus-visible:ring-cyan-400'
                  : 'flex items-center gap-3 rounded-xl outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-fuchsia-400'
              }
            >
              <span
                className={
                  isDark
                    ? 'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/25 to-fuchsia-500/25 text-2xl shadow-inner-soft ring-1 ring-cyan-300/20'
                    : 'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-fuchsia-50 text-2xl shadow-inner-soft ring-1 ring-fuchsia-300/25'
                }
              >
                🏥
              </span>
              <div className="text-left leading-tight">
                <p
                  className={
                    isDark
                      ? 'font-display text-lg font-bold tracking-tight text-white sm:text-xl'
                      : 'font-display text-lg font-bold tracking-tight text-slate-900 sm:text-xl'
                  }
                >
                  District Hospital
                </p>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{`Outpatient · Patient queue`}</p>
              </div>
            </Link>

            <div className="order-3 flex w-full flex-1 items-center justify-center gap-2 sm:order-none sm:w-auto sm:flex-initial sm:justify-end sm:gap-3">
              <LandingThemeToggle mode={theme} onChange={setTheme} />

              <nav className="hidden items-center gap-1 sm:flex">
                <Link
                  to="/get-token"
                  className={
                    isDark
                      ? 'rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700'
                  }
                >
                  Get a token
                </Link>
                <Link
                  to="/display"
                  className={
                    isDark
                      ? 'rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-fuchsia-50 hover:text-fuchsia-700'
                  }
                >
                  Hall screen
                </Link>
                <Link
                  to="/admin/login"
                  className={
                    isDark
                      ? 'ml-1 inline-flex items-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-100 shadow-sm transition hover:bg-slate-700/80'
                      : 'ml-1 inline-flex items-center rounded-xl border border-fuchsia-300/40 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-fuchsia-50'
                  }
                >
                  Staff sign in
                </Link>
              </nav>

              <Link
                to="/admin/login"
                className={
                  isDark
                    ? 'rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-bold text-slate-100 sm:hidden'
                    : 'rounded-xl border border-fuchsia-300/40 bg-white px-3 py-2 text-sm font-bold text-slate-800 sm:hidden'
                }
              >
                Staff
              </Link>
            </div>
          </div>
        </header>

        <div
          className={
            isDark
              ? 'mx-auto flex w-full max-w-6xl gap-2 border-b border-cyan-400/20 bg-[#12182a] px-4 py-2 sm:hidden'
              : 'mx-auto flex w-full max-w-6xl gap-2 border-b border-cyan-200/80 bg-white px-4 py-2 sm:hidden'
          }
        >
          <Link
            to="/get-token"
            className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500 py-2.5 text-center text-xs font-bold text-white shadow-sm"
          >
            Get a token
          </Link>
          <Link
            to="/display"
            className={
              isDark
                ? 'flex-1 rounded-lg border border-cyan-500/25 bg-slate-900 py-2.5 text-center text-xs font-bold text-slate-100'
                : 'flex-1 rounded-lg border border-fuchsia-200 bg-fuchsia-50/60 py-2.5 text-center text-xs font-bold text-slate-800'
            }
          >
            Hall screen
          </Link>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div
            className={
              isDark
                ? 'overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#0b1122] to-[#0a0d18] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55),0_0_0_1px_rgba(34,211,238,0.09)]'
                : 'overflow-hidden rounded-3xl border border-fuchsia-200/40 bg-white/95 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.14),0_0_0_1px_rgba(217,70,239,0.06)]'
            }
          >
            <div className="grid lg:grid-cols-[1fr_min(44%,520px)]">
              <div className="order-2 flex flex-col justify-center p-8 sm:p-10 lg:order-1 lg:p-12 lg:pr-10">
                <div className="mb-6 flex flex-wrap items-center gap-4">
                  <QueueLineIcon
                    className={isDark ? 'h-14 w-20 shrink-0 text-cyan-300' : 'h-14 w-20 shrink-0 text-cyan-600'}
                  />
                  <p
                    className={
                      isDark
                        ? 'inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-200'
                        : 'inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-50/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-700'
                    }
                  >
                    <span className="h-2 w-2 rounded-full bg-cyan-500" aria-hidden />
                    Open today
                  </p>
                </div>

                <h1
                  className={
                    isDark
                      ? 'font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[2.75rem] lg:leading-[1.06]'
                      : 'font-display bg-gradient-to-br from-slate-900 via-cyan-700 to-fuchsia-700 bg-clip-text text-4xl font-extrabold leading-[1.08] tracking-tight text-transparent sm:text-5xl lg:text-[2.75rem] lg:leading-[1.06]'
                  }
                >
                  Waiting, made clear for everyone
                </h1>

                <p className={isDark ? 'mt-5 max-w-xl text-lg leading-relaxed text-slate-400' : 'mt-5 max-w-xl text-lg leading-relaxed text-slate-600'}>
                  Take a number on your phone, see when you&apos;re next on the waiting-hall display, and let staff move the queue from
                  one simple dashboard.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {trustPoints.map((item) => (
                    <div
                      key={item.label}
                      className={
                        isDark
                          ? 'rounded-2xl border border-cyan-400/20 bg-[#0b1220]/45 p-4'
                          : 'rounded-2xl border border-cyan-200/60 bg-white/80 p-4'
                      }
                    >
                      <p
                        className={
                          isDark
                            ? 'text-[10px] font-bold uppercase tracking-wider text-cyan-200'
                            : 'text-[10px] font-bold uppercase tracking-wider text-cyan-700'
                        }
                      >
                        {item.label}
                      </p>
                      <p className={isDark ? 'mt-2 text-sm font-medium leading-snug text-slate-300/90' : 'mt-2 text-sm font-medium leading-snug text-slate-600'}>
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    to="/get-token"
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-8 py-4 text-base font-bold text-white shadow-glow transition hover:brightness-110 active:scale-[0.99] sm:flex-none focus-visible:outline focus-visible:ring-4 focus-visible:ring-fuchsia-400/40"
                  >
                    Start — get your token
                  </Link>
                  <Link
                    to="/display"
                    className={
                      isDark
                        ? 'inline-flex flex-1 items-center justify-center rounded-2xl border-2 border-cyan-400/30 bg-[#2a2f36] px-8 py-4 text-base font-bold text-slate-100 shadow-sm transition hover:border-fuchsia-400/40 hover:bg-slate-800 sm:flex-none focus-visible:outline focus-visible:ring-4 focus-visible:ring-fuchsia-400/30'
                        : 'inline-flex flex-1 items-center justify-center rounded-2xl border-2 border-fuchsia-300/50 bg-white px-8 py-4 text-base font-bold text-slate-800 shadow-sm transition hover:border-fuchsia-400/60 hover:bg-fuchsia-50/40 sm:flex-none focus-visible:outline focus-visible:ring-4 focus-visible:ring-fuchsia-400/30'
                    }
                  >
                    Open hall display
                  </Link>
                </div>

                <p className="mt-6 text-sm text-slate-500/90">{`No fee for patients · Same queue patients see and staff manage`}</p>
              </div>

              <div
                className={
                  isDark
                    ? 'relative order-1 min-h-[300px] bg-gradient-to-b from-[#0a1022] to-[#0b1120] lg:order-2 lg:min-h-[560px]'
                    : 'relative order-1 min-h-[300px] bg-gradient-to-b from-[#eef7ff] via-[#f6f2ff] to-[#edf4ff] lg:order-2 lg:min-h-[560px]'
                }
              >
                <div
                  className={
                    isDark
                      ? 'absolute inset-0 bg-[radial-gradient(ellipse_78%_62%_at_50%_38%,rgba(59,130,246,0.2)_0%,transparent_58%)]'
                      : 'absolute inset-0 bg-[radial-gradient(ellipse_78%_62%_at_50%_38%,rgba(26,86,219,0.11)_0%,transparent_58%)]'
                  }
                  aria-hidden
                />
                <p
                  className={
                    isDark
                      ? 'absolute left-5 top-5 z-10 rounded-full border border-white/12 bg-slate-950/55 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-100 shadow-lg shadow-black/30 backdrop-blur-md'
                      : 'absolute left-5 top-5 z-10 rounded-full border border-cyan-300/40 bg-white/90 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-700 shadow-md backdrop-blur-md'
                  }
                >
                  Live queue preview
                </p>
                <div className="h-full min-h-[300px] w-full p-5 lg:min-h-[560px] lg:p-7">
                  <SceneErrorBoundary isDark={isDark} reducedMotion={reducedMotion}>
                    <Suspense fallback={<Loader />}>
                      <HeroCanvas reducedMotion={reducedMotion} colorMode={theme} className="h-full w-full rounded-2xl" />
                    </Suspense>
                  </SceneErrorBoundary>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer
          className={
            isDark
              ? 'border-t border-white/10 bg-slate-950/50 px-5 py-6 backdrop-blur-xl sm:px-8'
              : 'border-t border-slate-200/90 bg-white/80 px-5 py-6 backdrop-blur-xl sm:px-8'
          }
        >
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-xs font-medium text-slate-500">© District hospital · Outpatient queue system</p>
            <div className={isDark ? 'flex flex-wrap gap-6 text-xs font-bold text-slate-400' : 'flex flex-wrap gap-6 text-xs font-bold text-slate-600'}>
              <Link to="/get-token" className={isDark ? 'hover:text-cyan-300' : 'hover:text-cyan-700'}>
                Patient check-in →
              </Link>
              <Link to="/admin/login" className={isDark ? 'hover:text-fuchsia-300' : 'hover:text-fuchsia-700'}>
                Staff portal →
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default LandingPage
