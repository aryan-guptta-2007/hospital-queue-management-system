import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import api from '../src/api/axios'
import QueueStatus from '../src/components/patient/QueueStatus'
import { STATUS_CONFIG } from '../src/utils/helpers'
import en from '../src/locales/en.json'
import hi from '../src/locales/hi.json'
import '../src/locales/i18n'

vi.mock('../src/api/axios', () => ({
  default: { get: vi.fn() },
}))

vi.mock('../src/context/QueueContext', () => ({
  useQueueSocket: () => ({ connected: true, lastEvent: null, subscribe: vi.fn(() => vi.fn()) }),
}))

describe('Expired token frontend support', () => {
  it('STATUS_CONFIG contains expired definition', () => {
    expect(STATUS_CONFIG.expired).toBeDefined()
    expect(STATUS_CONFIG.expired.label).toBe('Expired')
    expect(STATUS_CONFIG.expired.color).toContain('bg-red-100')
  })

  it('locale files contain "Expired — please take a new token" translations', () => {
    expect(en.tokenStatus.expired).toBe('Expired — please take a new token')
    expect(en.status.expired).toBe('Expired — please take a new token')

    expect(hi.tokenStatus.expired).toBe('समाप्त — कृपया नया टोकन लें')
    expect(hi.status.expired).toBe('समाप्त — कृपया नया टोकन लें')
  })

  it('QueueStatus renders expired message and badge when token is expired', async () => {
    const EXPIRED_TOKEN = {
      _id: 'token-exp-1',
      tokenNumber: 'OPD-001',
      status: 'expired',
      priority: 1,
      patient: { name: 'Late Patient' },
      department: { id: 'dept-opd', name: 'Out Patient Department' },
    }

    api.get.mockResolvedValueOnce({ data: { success: true, data: EXPIRED_TOKEN } })

    render(<QueueStatus publicCode="EXP123" onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('OPD-001')).toBeInTheDocument()
    })

    // Both status badge and expired banner display the message
    const expiredElements = screen.getAllByText('Expired — please take a new token')
    expect(expiredElements.length).toBeGreaterThanOrEqual(1)
  })
})
