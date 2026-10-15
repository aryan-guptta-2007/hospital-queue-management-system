import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import hi from './hi.json'

export const SUPPORTED_LANGUAGES = ['en', 'hi']
export const STORAGE_KEY = 'hq-language'

/**
 * What the patient saw last, then what their device asks for, then English.
 * Storage can throw in a private window, so every read is guarded.
 */
const detectLanguage = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved
  } catch {
    /* storage unavailable — fall through to the browser's own preference */
  }

  const browser = window.navigator?.language?.slice(0, 2)

  return SUPPORTED_LANGUAGES.includes(browser) ? browser : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    // React escapes everything it renders already
    escapeValue: false,
  },
})

/** Switches language and remembers it for the next visit */
export const changeLanguage = (language) => {
  if (!SUPPORTED_LANGUAGES.includes(language)) return

  i18n.changeLanguage(language)
  document.documentElement.lang = language

  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    /* a patient on a shared kiosk simply gets the default next time */
  }
}

document.documentElement.lang = i18n.language

export default i18n
