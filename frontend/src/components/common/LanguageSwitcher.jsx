import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, changeLanguage } from '../../locales/i18n'

const LABELS = { en: 'English', hi: 'हिन्दी' }

/**
 * Two buttons rather than a dropdown: a patient should be able to switch with
 * one tap, and see their own language written in its own script.
 */
const LanguageSwitcher = ({ className = '' }) => {
  const { t, i18n } = useTranslation()

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-cyan-300/40 dark:border-cyan-400/25
                  bg-white/85 dark:bg-slate-900/80 p-1 backdrop-blur-md ${className}`}
      role="group"
      aria-label={t('language.label')}
    >
      {SUPPORTED_LANGUAGES.map((language) => {
        const active = i18n.language === language

        return (
          <button
            key={language}
            type="button"
            lang={language}
            onClick={() => changeLanguage(language)}
            aria-pressed={active}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50
              ${
                active
                  ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            {LABELS[language]}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSwitcher
