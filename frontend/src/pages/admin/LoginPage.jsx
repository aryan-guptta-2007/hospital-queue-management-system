import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const LoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.email, form.password)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-mesh-admin flex items-center justify-center px-4 py-12 overflow-hidden">
      <div
        className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 rounded-full bg-fuchsia-500/15 blur-3xl"
        aria-hidden
      />

      <div
        className="relative w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 shadow-card-hover border border-white/70
                   motion-safe:animate-fade-in-up motion-reduce:animate-none"
      >
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-fuchsia-500
                       text-3xl text-white shadow-lg shadow-cyan-500/30 ring-4 ring-cyan-500/10 transition-transform hover:scale-105"
          >
            🏥
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Staff portal</h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 font-medium">Sign in to manage queues</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5 group">
            <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className="input-field py-3.5"
              placeholder="admin@hospital.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="input-field py-3.5"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-slate-300 mt-8 font-medium">
          Demo · admin@hospital.com / admin123
        </p>
      </div>
    </div>
  )
}

export default LoginPage
