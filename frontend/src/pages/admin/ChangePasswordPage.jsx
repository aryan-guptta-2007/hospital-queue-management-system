import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const ChangePasswordPage = () => {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('The two new passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.patch('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      await refreshUser()
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="relative min-h-screen bg-mesh-admin flex items-center justify-center px-4 py-12 overflow-hidden">
      <div
        className="relative w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 shadow-card-hover border border-white/70
                   motion-safe:animate-fade-in-up motion-reduce:animate-none"
      >
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-fuchsia-500
                       text-3xl text-white shadow-lg shadow-cyan-500/30 ring-4 ring-cyan-500/10"
          >
            🔑
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Change your password
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 font-medium">
            {user?.mustChangePassword
              ? 'Your account still uses the default password. Set a new one to continue.'
              : 'Set a new password for your account.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="current-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className="input-field py-3.5"
              placeholder="••••••••"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="input-field py-3.5"
              placeholder="At least 6 characters"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="input-field py-3.5"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </div>

          {error && (
            <div
              className="bg-red-50 border border-red-200/80 text-red-700 rounded-xl p-4 text-sm font-medium
                         animate-bounce-in shadow-sm flex gap-2 items-start"
              role="alert"
            >
              <span aria-hidden>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3.5 rounded-xl">
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              'Update password'
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 w-full text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors"
        >
          Sign out instead
        </button>
      </div>
    </div>
  )
}

export default ChangePasswordPage
