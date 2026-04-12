import { useState, useEffect } from 'react'
import api from '../../api/axios'
import Loader from '../common/Loader'

const TokenForm = ({ onSuccess }) => {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    phone: '',
    age: '',
    departmentId: '',
  })

  useEffect(() => {
    api
      .get('/departments')
      .then((res) => setDepartments(res.data.data))
      .catch((err) => setError(err.message || 'Could not load departments. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Please enter your name.')
    if (!form.departmentId) return setError('Please select a department.')

    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/tokens/generate', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        age: form.age ? parseInt(form.age) : null,
        departmentId: form.departmentId,
      })
      onSuccess(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader text="Loading departments…" />

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="group">
        <label className="block text-base font-bold text-slate-200 mb-2" htmlFor="patient-name">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          id="patient-name"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Enter your full name"
          className="input-field"
          autoComplete="name"
        />
      </div>

      <div>
        <label className="block text-base font-bold text-slate-200 mb-2" htmlFor="patient-dept">
          Department <span className="text-red-500">*</span>
        </label>
        <select id="patient-dept" name="departmentId" value={form.departmentId} onChange={handleChange} className="select-field">
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-base font-bold text-slate-200 mb-2" htmlFor="patient-age">
          Age{' '}
          <span className="text-slate-400 font-medium text-sm">(optional — seniors prioritised)</span>
        </label>
        <input
          id="patient-age"
          type="number"
          name="age"
          value={form.age}
          onChange={handleChange}
          placeholder="e.g. 65"
          min="0"
          max="150"
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-base font-bold text-slate-200 mb-2" htmlFor="patient-phone">
          Mobile <span className="text-slate-400 font-medium text-sm">(optional)</span>
        </label>
        <input
          id="patient-phone"
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="e.g. 9876543210"
          className="input-field"
          autoComplete="tel"
        />
      </div>

      {error && (
        <div
          className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl p-4 text-base font-semibold flex gap-2 items-start animate-bounce-in"
          role="alert"
        >
          <span aria-hidden>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
        {submitting ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating…
          </span>
        ) : (
          'Get my token'
        )}
      </button>
    </form>
  )
}

export default TokenForm
