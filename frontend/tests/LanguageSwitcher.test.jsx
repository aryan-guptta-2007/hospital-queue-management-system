import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import i18n, { STORAGE_KEY } from '../src/locales/i18n'
import LanguageSwitcher from '../src/components/common/LanguageSwitcher'
import TokenForm from '../src/components/patient/TokenForm'
import { formatWaitTime } from '../src/utils/helpers'
import api from '../src/api/axios'

vi.mock('../src/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const renderPatientScreen = () =>
  render(
    <>
      <LanguageSwitcher />
      <TokenForm onSuccess={vi.fn()} />
    </>
  )

describe('language switching', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: { data: [{ _id: 'dept-opd-id', name: 'OPD' }] } })
  })

  afterEach(async () => {
    window.localStorage.removeItem(STORAGE_KEY)
    await i18n.changeLanguage('en')
  })

  it('starts in English', async () => {
    renderPatientScreen()

    expect(await screen.findByText('Select department')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get my token' })).toBeInTheDocument()
  })

  it('switches the patient screen to Hindi', async () => {
    renderPatientScreen()
    await screen.findByText('Select department')

    await userEvent.click(screen.getByRole('button', { name: 'हिन्दी' }))

    expect(screen.getByRole('button', { name: 'मेरा टोकन पाएँ' })).toBeInTheDocument()
    expect(screen.getByText('विभाग चुनें')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Get my token' })).not.toBeInTheDocument()
  })

  it('marks the active language and sets the document language', async () => {
    renderPatientScreen()
    await screen.findByText('Select department')

    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'हिन्दी' }))

    expect(screen.getByRole('button', { name: 'हिन्दी' })).toHaveAttribute('aria-pressed', 'true')
    // Screen readers and the browser need to know the page changed language
    expect(document.documentElement.lang).toBe('hi')
  })

  it('remembers the choice for the next visit', async () => {
    renderPatientScreen()
    await screen.findByText('Select department')

    await userEvent.click(screen.getByRole('button', { name: 'हिन्दी' }))

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('hi')
  })

  it('translates validation messages too', async () => {
    renderPatientScreen()
    await screen.findByText('Select department')

    await userEvent.click(screen.getByRole('button', { name: 'हिन्दी' }))
    await userEvent.click(screen.getByRole('button', { name: 'मेरा टोकन पाएँ' }))

    expect(await screen.findByText('कृपया अपना नाम दर्ज करें।')).toBeInTheDocument()
  })

  it('translates wait times only when a translator is passed', async () => {
    await i18n.changeLanguage('hi')
    const t = i18n.getFixedT('hi')

    expect(formatWaitTime({ min: 15, max: 25 }, t)).toBe('15–25 मिनट')
    expect(formatWaitTime(20, t)).toBe('~20 मिनट')
    expect(formatWaitTime(0, t)).toBe('जल्द ही')

    // The staff screens call it without one and stay in English
    expect(formatWaitTime({ min: 15, max: 25 })).toBe('15–25 min')
    expect(formatWaitTime(0)).toBe('Soon')
  })
})
