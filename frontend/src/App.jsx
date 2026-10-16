import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { QueueProvider } from './context/QueueContext'
import DisplayPage    from './pages/DisplayPage'
import LandingPage    from './pages/LandingPage'
import HomePage       from './pages/patient/HomePage'
import TrackPage      from './pages/patient/TrackPage'
import Loader         from './components/common/Loader'

const LoginPage          = lazy(() => import('./pages/admin/LoginPage'))
const DashboardPage      = lazy(() => import('./pages/admin/DashboardPage'))
const QueuePage          = lazy(() => import('./pages/admin/QueuePage'))
const AnalyticsPage      = lazy(() => import('./pages/admin/AnalyticsPage'))
const AuditLogPage       = lazy(() => import('./pages/admin/AuditLogPage'))
const ChangePasswordPage = lazy(() => import('./pages/admin/ChangePasswordPage'))

// Logged in, nothing else required
const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <Loader text="Verifying session..." />
  return user ? children : <Navigate to="/admin/login" replace />
}

// Logged in AND not sitting on a password that must be rotated
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  return (
    <RequireAuth>
      {user?.mustChangePassword ? (
        <Navigate to="/admin/change-password" replace />
      ) : (
        children
      )}
    </RequireAuth>
  )
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AuthProvider>
      <QueueProvider>
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* ── Public ─────────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/get-token" element={<HomePage />} />
            <Route path="/display" element={<DisplayPage />} />
            <Route path="/track/:publicCode" element={<TrackPage />} />

            {/* ── Admin Routes ────────────────────── */}
            <Route path="/admin/login" element={
              <Suspense fallback={<Loader />}><LoginPage /></Suspense>
            } />
            <Route path="/admin/change-password" element={
              <RequireAuth>
                <Suspense fallback={<Loader />}><ChangePasswordPage /></Suspense>
              </RequireAuth>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}><DashboardPage /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/queue" element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}><QueuePage /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}><AnalyticsPage /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/audit" element={
              <ProtectedRoute>
                <Suspense fallback={<Loader />}><AuditLogPage /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </QueueProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
