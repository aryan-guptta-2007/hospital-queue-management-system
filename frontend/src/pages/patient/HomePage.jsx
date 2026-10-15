import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import TokenForm from '../../components/patient/TokenForm'
import TokenCard from '../../components/patient/TokenCard'
import QueueStatus from '../../components/patient/QueueStatus'
import { AnimatePresence, motion } from 'framer-motion'
import LanguageSwitcher from '../../components/common/LanguageSwitcher'

const steps = [
  { id: 'form', labelKey: 'home.stepRegister' },
  { id: 'token', labelKey: 'home.stepToken' },
  { id: 'track', labelKey: 'home.stepTrack' },
]

const HomePage = () => {
  const { t } = useTranslation()
  const [stage, setStage] = useState('form')
  const [tokenData, setTokenData] = useState(null)

  const handleTokenGenerated = (data) => {
    setTokenData(data)
    setStage('token')
  }

  const handleReset = () => {
    setTokenData(null)
    setStage('form')
  }

  const currentIndex = steps.findIndex((s) => s.id === stage)
  const stageTransition = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -14 },
    transition: { duration: 0.34, ease: 'easeOut' },
  }

  return (
    <div className="relative min-h-screen bg-mesh-patient flex flex-col items-center justify-start py-10 px-4 overflow-hidden">
      <Link
        to="/"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 dark:border-cyan-400/30 bg-white/80 dark:bg-slate-950/80 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md transition-all hover:text-cyan-500 dark:hover:text-cyan-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 sm:left-6 sm:top-5"
      >
        {t('common.home')}
      </Link>

      <LanguageSwitcher className="absolute right-4 top-4 z-20 shadow-sm sm:right-6 sm:top-5" />
      {/* Ambient orbs */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl animate-float"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl animate-float motion-reduce:animate-none"
        style={{ animationDelay: '1s' }}
        aria-hidden
      />

      <header className="relative text-center mb-10 max-w-lg animate-fade-in-up">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card text-4xl
                     ring-1 ring-white/60 transition-transform duration-300 hover:scale-105 hover:shadow-card-hover cursor-default"
          role="img"
          aria-label="Hospital"
        >
          🏥
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          <span className="text-gradient">{t('home.hospital')}</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2 text-base font-medium">
          {t('home.subtitle')}
        </p>
      </header>

      <div
        className="relative w-full max-w-md glass-panel rounded-[1.75rem] p-8 shadow-card-hover border border-white/70
                   motion-safe:animate-fade-in-up motion-reduce:animate-none"
      >
        <nav className="flex items-center justify-between gap-1 mb-8" aria-label="Progress">
          {steps.map((s, i) => {
            const done = i < currentIndex
            const active = i === currentIndex
            return (
              <div key={s.id} className="flex flex-1 items-center min-w-0">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div
                    className={`relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full text-sm font-bold
                      transition-all duration-300 ease-spring
                      ${active ? 'bg-gradient-to-br from-hospital-blue to-indigo-600 text-white shadow-glow scale-110 ring-4 ring-blue-400/25' : ''}
                      ${done && !active ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30' : ''}
                      ${!done && !active ? 'bg-slate-200 text-slate-600' : ''}`}
                  >
                    {done ? (
                      <span
                        className="text-lg motion-reduce:animate-none animate-scale-in"
                        aria-hidden
                      >
                        ✓
                      </span>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                    {active && (
                      <span
                        className="absolute inset-0 rounded-full border-2 border-white/40 motion-reduce:animate-none animate-pulse-glow"
                        aria-hidden
                      />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate max-w-full
                      ${active ? 'text-cyan-700 dark:text-cyan-300' : done ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    {t(s.labelKey)}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-full max-w-[2rem] sm:max-w-[3rem] mx-1 rounded-full transition-colors duration-500 shrink
                      ${done ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-400' : 'bg-slate-700'}`}
                    aria-hidden
                  />
                )}
              </div>
            )
          })}
        </nav>

        <div className="min-h-[280px]">
          <AnimatePresence mode="wait">
            {stage === 'form' && (
              <motion.div key="stage-form" {...stageTransition} className="space-y-2">
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 text-center">
                  {t('home.registerHeading')}
                </h2>
                <p className="text-center text-sm text-slate-600 dark:text-slate-300 mb-5">
                  {t('home.registerHint')}
                </p>
                <TokenForm onSuccess={handleTokenGenerated} />
              </motion.div>
            )}

            {stage === 'token' && tokenData && (
              <motion.div key="stage-token" {...stageTransition}>
                <TokenCard tokenData={tokenData} onCheckStatus={() => setStage('track')} />
              </motion.div>
            )}

            {stage === 'track' && tokenData && (
              <motion.div key="stage-track" {...stageTransition}>
                <QueueStatus publicCode={tokenData.publicCode} onBack={handleReset} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="relative mt-10 text-center text-slate-600 dark:text-slate-300 text-sm max-w-sm motion-safe:animate-fade-in motion-reduce:animate-none">
        {t('home.helpText')}
      </p>
    </div>
  )
}

export default HomePage
