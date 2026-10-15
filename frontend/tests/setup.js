import '@testing-library/jest-dom/vitest'
// Components call useTranslation; this initialises the default instance
import '../src/locales/i18n'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
