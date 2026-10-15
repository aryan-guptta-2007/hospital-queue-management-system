import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../src/api/axios'
import TokenForm from '../src/components/patient/TokenForm'

vi.mock('../src/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const DEPARTMENTS = [
  { _id: 'dept-opd-id', name: 'Out Patient Department' },
  { _id: 'dept-card-id', name: 'Cardiology' },
]

describe('TokenForm', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: { data: DEPARTMENTS } })
    api.post.mockResolvedValue({
      data: { data: { tokenNumber: 'OPD-001', publicCode: 'ABCD1234' } },
    })
  })

  it('offers the departments it loaded', async () => {
    render(<TokenForm onSuccess={vi.fn()} />)

    expect(await screen.findByText('Out Patient Department')).toBeInTheDocument()
    expect(screen.getByText('Cardiology')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/departments')
  })

  it('asks for a name before submitting', async () => {
    render(<TokenForm onSuccess={vi.fn()} />)
    await screen.findByText('Out Patient Department')

    await userEvent.click(screen.getByRole('button', { name: /get my token/i }))

    expect(await screen.findByText(/please enter your name/i)).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('asks for a department before submitting', async () => {
    render(<TokenForm onSuccess={vi.fn()} />)
    await screen.findByText('Out Patient Department')

    await userEvent.type(screen.getByLabelText(/full name/i), 'Arun Sharma')
    await userEvent.click(screen.getByRole('button', { name: /get my token/i }))

    expect(await screen.findByText(/please select a department/i)).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('submits trimmed details and hands the token back', async () => {
    const onSuccess = vi.fn()
    render(<TokenForm onSuccess={onSuccess} />)
    await screen.findByText('Out Patient Department')

    await userEvent.type(screen.getByLabelText(/full name/i), '  Arun Sharma  ')
    await userEvent.selectOptions(screen.getByLabelText(/department/i), 'dept-opd-id')
    await userEvent.type(screen.getByLabelText(/age/i), '34')
    await userEvent.type(screen.getByLabelText(/mobile/i), '9876543210')

    await userEvent.click(screen.getByRole('button', { name: /get my token/i }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/tokens/generate', {
        name: 'Arun Sharma',
        phone: '9876543210',
        age: 34,
        departmentId: 'dept-opd-id',
      })
    )
    expect(onSuccess).toHaveBeenCalledWith({ tokenNumber: 'OPD-001', publicCode: 'ABCD1234' })
  })

  it('surfaces the server’s own message when generation is refused', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'Too many tokens requested from this device.' } },
    })

    render(<TokenForm onSuccess={vi.fn()} />)
    await screen.findByText('Out Patient Department')

    await userEvent.type(screen.getByLabelText(/full name/i), 'Arun Sharma')
    await userEvent.selectOptions(screen.getByLabelText(/department/i), 'dept-opd-id')
    await userEvent.click(screen.getByRole('button', { name: /get my token/i }))

    expect(await screen.findByText(/too many tokens/i)).toBeInTheDocument()
  })
})
