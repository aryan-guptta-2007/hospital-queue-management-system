import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../src/api/axios'
import QueuePage from '../src/pages/admin/QueuePage'

vi.mock('../src/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Hospital Admin', role: 'admin' }, logout: vi.fn() }),
  AuthProvider: ({ children }) => children,
}))

// jsdom has no WebSocket, and these tests are not about the live feed
const subscribe = vi.fn(() => vi.fn())
vi.mock('../src/context/QueueContext', () => ({
  useQueueSocket: () => ({ connected: true, lastEvent: null, subscribe }),
  QueueProvider: ({ children }) => children,
}))

const DEPARTMENTS = [
  { _id: 'dept-opd-id', name: 'Out Patient Department', code: 'OPD' },
  { _id: 'dept-card-id', name: 'Cardiology', code: 'CARD' },
]

const QUEUE = {
  serving: { _id: 'token-serving', tokenNumber: 'OPD-007', patient: { name: 'Rahul Sharma' } },
  waiting: [
    {
      _id: 'token-1',
      tokenNumber: 'OPD-008',
      status: 'waiting',
      priority: 2,
      position: 1,
      estimatedWaitTime: 10,
      estimatedWaitRange: { min: 7, max: 13 },
      patient: { name: 'Kamla Devi', age: 72 },
      createdAt: new Date('2026-10-15T09:00:00Z').toISOString(),
    },
    {
      _id: 'token-2',
      tokenNumber: 'OPD-009',
      status: 'waiting',
      priority: 1,
      position: 2,
      estimatedWaitTime: 20,
      estimatedWaitRange: { min: 15, max: 25 },
      patient: { name: 'Arun Sharma', age: 34 },
      createdAt: new Date('2026-10-15T09:05:00Z').toISOString(),
    },
  ],
  waitingCount: 2,
  skipped: [
    {
      _id: 'token-skipped',
      tokenNumber: 'OPD-005',
      priority: 1,
      patient: { name: 'Priya Singh' },
      skippedAt: new Date('2026-10-15T08:50:00Z').toISOString(),
    },
  ],
  skippedCount: 1,
}

const renderPage = (path = '/admin/queue') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <QueuePage />
    </MemoryRouter>
  )

describe('QueuePage', () => {
  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url === '/departments') return Promise.resolve({ data: { data: DEPARTMENTS } })
      return Promise.resolve({ data: { data: QUEUE } })
    })
    api.post.mockResolvedValue({ data: { success: true } })
  })

  it('shows the serving token, the waiting queue and the wait range', async () => {
    renderPage()

    expect(await screen.findByText('OPD-007')).toBeInTheDocument()
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
    expect(screen.getByText('OPD-008')).toBeInTheDocument()
    expect(screen.getByText('Kamla Devi')).toBeInTheDocument()
    expect(screen.getByText('15–25 min')).toBeInTheDocument()
  })

  it('opens the department named in ?dept=', async () => {
    renderPage('/admin/queue?dept=dept-card-id')

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/queue/dept-card-id'))
    expect(screen.getByRole('combobox')).toHaveValue('dept-card-id')
  })

  it('falls back to the first department when ?dept= is missing', async () => {
    renderPage()

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/queue/dept-opd-id'))
  })

  it('subscribes to the department it is showing', async () => {
    renderPage('/admin/queue?dept=dept-card-id')

    await waitFor(() => expect(subscribe).toHaveBeenCalledWith('dept-card-id'))
  })

  it('sends the serving token it has on screen when calling next', async () => {
    renderPage()

    await screen.findByText('OPD-007')
    await userEvent.click(screen.getByRole('button', { name: /call next/i }))

    expect(api.post).toHaveBeenCalledWith('/queue/dept-opd-id/next', {
      currentServingId: 'token-serving',
    })
  })

  it('completes the serving token, not a selected row', async () => {
    renderPage()

    await screen.findByText('OPD-007')
    await userEvent.click(screen.getByRole('button', { name: /complete/i }))

    expect(api.post).toHaveBeenCalledWith('/queue/token/token-serving/complete')
  })

  it('lists today’s skipped patients and can requeue one', async () => {
    renderPage()

    await screen.findByText('OPD-007')
    await userEvent.click(screen.getByRole('button', { name: /skipped today/i }))

    expect(screen.getByText('OPD-005')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /requeue/i }))

    expect(api.post).toHaveBeenCalledWith('/queue/token/token-skipped/requeue')
  })

  it('shows a toast and refetches when the queue has moved on', async () => {
    api.post.mockRejectedValue({
      response: { status: 409, data: { message: 'Queue changed, please refresh' } },
    })

    renderPage()
    await screen.findByText('OPD-007')

    const callsBefore = api.get.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: /call next/i }))

    expect(await screen.findByText('Queue changed, please refresh')).toBeInTheDocument()
    expect(api.get.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})
