import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../src/api/axios'
import DashboardPage from '../src/pages/admin/DashboardPage'

vi.mock('../src/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

// The real provider would need a signed-in session
vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Hospital Admin', role: 'admin' }, logout: vi.fn() }),
  AuthProvider: ({ children }) => children,
}))

const SUMMARY = [
  {
    department: { id: 'dept-opd-id', name: 'Out Patient Department', code: 'OPD' },
    waitingCount: 4,
    currentToken: 'OPD-007',
    currentPatient: 'Rahul S.',
  },
  {
    department: { id: 'dept-card-id', name: 'Cardiology', code: 'CARD' },
    waitingCount: 0,
    currentToken: null,
    currentPatient: null,
  },
]

const renderPage = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardPage />
    </MemoryRouter>
  )

describe('DashboardPage', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: { data: SUMMARY } })
  })

  it('renders every department returned by the API', async () => {
    renderPage()

    expect(await screen.findByText('Out Patient Department')).toBeInTheDocument()
    expect(screen.getByText('Cardiology')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/queue/all')
  })

  it('totals the waiting counts and counts the active departments', async () => {
    renderPage()

    await screen.findByText('Out Patient Department')

    // 4 + 0 waiting, 1 department with anybody in it, 2 departments in all
    const stat = (label) =>
      screen.getByText(label).parentElement.querySelector('.font-display').textContent

    expect(stat('Total waiting')).toBe('4')
    expect(stat('Active depts')).toBe('1')
    expect(stat('Departments')).toBe('2')
  })

  it('links each card to that department’s queue', async () => {
    renderPage()

    await screen.findByText('Out Patient Department')

    const links = screen.getAllByRole('link', { name: /manage queue/i })
    expect(links[0]).toHaveAttribute('href', '/admin/queue?dept=dept-opd-id')
    expect(links[1]).toHaveAttribute('href', '/admin/queue?dept=dept-card-id')
  })

  it('survives an empty response instead of crashing', async () => {
    api.get.mockResolvedValue({ data: { data: [] } })

    renderPage()

    expect(await screen.findByText(/no active queues/i)).toBeInTheDocument()
  })

  it('reports a failed fetch without blowing up the page', async () => {
    api.get.mockRejectedValue(new Error('network down'))

    renderPage()

    await waitFor(() => expect(screen.getByText(/live dashboard/i)).toBeInTheDocument())
  })
})
