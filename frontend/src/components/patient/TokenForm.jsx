import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/axios'
import Loader from '../common/Loader'

const TokenForm = ({ onSuccess }) => {
  const { t } = useTranslation()
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
      .catch(() => setError(t('form.errorDepartments')))
      .finally(() => setLoading(false))
  }, [t])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError(t('form.errorName'))
    if (!form.departmentId) return setError(t('form.errorDepartment'))

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
      setError(err.response?.data?.message || t('form.errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader text={t('form.loadingDepartments')} />

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="group">
        <label className="block text-base font-bold text-slate-200 mb-2" htmlFor="patient-name">
          {t('form.fullName')} <span className="text-red-500">*</span>
        </label>
        <input
          id="patient-name"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder={t('form.namePlaceholder')}
          className="input-field"
          autoComplete="name"
        />
      </div>

      <div>
        <label className="block text-base font-bold text-slate-200 mb-2" htmlFor="patient-dept">
          {t('form.department')} <span className="text-red-500">*</span>
        </label>
        <select
          id="patient-dept"
          name="departmentId"
          value={form.departmentId}
          onChange={handleChange}
          className="select-field"
        >
          <option value="">{t('form.selectDepartment')}</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-base font-bold text-slate-200 mb-2" htmlFor="patient-age">
          {t('form.age')}{' '}
          <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            {t('form.ageHint')}
          </span>
        </label>
        <input
          id="patient-age"
          type="number"
          name="age"
          value={form.age}
          onChange={handleChange}
          placeholder={t('form.agePlaceholder')}
          min="0"
          max="150"
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-base font-bold text-slate-200 mb-2" htmlFor="patient-phone">
          {t('form.mobile')}{' '}
          <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            {t('form.mobileHint')}
          </span>
        </label>
        <input
          id="patient-phone"
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder={t('form.mobilePlaceholder')}
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
            {t('form.submitting')}
          </span>
        ) : (
          t('form.submit')
        )}
      </button>
    </form>
  )
}

export default TokenForm
