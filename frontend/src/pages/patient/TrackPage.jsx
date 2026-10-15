import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import QueueStatus from '../../components/patient/QueueStatus'
import LanguageSwitcher from '../../components/common/LanguageSwitcher'

/**
 * Standalone status page reached from the QR code on a patient's token,
 * so they can reopen their place in the queue from their own phone.
 */
const TrackPage = () => {
  const { t } = useTranslation()
  const { publicCode } = useParams()
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen bg-mesh-patient flex flex-col items-center justify-start py-10 px-4 overflow-hidden">
      <Link
        to="/"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 dark:border-cyan-400/30 bg-white/80 dark:bg-slate-950/80 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md transition-all hover:text-cyan-500 dark:hover:text-cyan-300 focus-visible:outline focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 sm:left-6 sm:top-5"
      >
        {t('common.home')}
      </Link>

      <LanguageSwitcher className="absolute right-4 top-4 z-20 shadow-sm sm:right-6 sm:top-5" />

      <header className="relative text-center mb-8 max-w-lg animate-fade-in-up">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card text-4xl ring-1 ring-white/60"
          role="img"
          aria-label="Hospital"
        >
          🏥
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          <span className="text-gradient">{t('status.pageTitle')}</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm font-medium">
          {t('status.pageCode')} <span className="font-mono font-bold tracking-widest">{publicCode}</span>
        </p>
      </header>

      <div
        className="relative w-full max-w-md glass-panel rounded-[1.75rem] p-8 shadow-card-hover border border-white/70
                   motion-safe:animate-fade-in-up motion-reduce:animate-none"
      >
        <QueueStatus publicCode={publicCode} onBack={() => navigate('/get-token')} />
      </div>
    </div>
  )
}

export default TrackPage
