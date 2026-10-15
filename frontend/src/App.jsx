import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { QueueProvider } from './context/QueueContext'
import DisplayPage    from './pages/DisplayPage'
import LandingPage    from './pages/LandingPage'
import HomePage       from './pages/patient/HomePage'
import TrackPage      from './pages/patient/TrackPage'
import LoginPage      from './pages/admin/LoginPage'
import DashboardPage  from './pages/admin/DashboardPage'
import QueuePage      from './pages/admin/QueuePage'
import AnalyticsPage  from './pages/admin/AnalyticsPage'
import AuditLogPage   from './pages/admin/AuditLogPage'
import ChangePasswordPage from './pages/admin/ChangePasswordPage'
import Loader         from './components/common/Loader'

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
  <BrowserRouter>
    <AuthProvider>
      <QueueProvider>
        <Routes>
          {/* ── Public ─────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/get-token" element={<HomePage />} />
          <Route path="/display" element={<DisplayPage />} />
          <Route path="/track/:publicCode" element={<TrackPage />} />

          {/* ── Admin Routes ────────────────────── */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/change-password" element={
            <RequireAuth><ChangePasswordPage /></RequireAuth>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/admin/queue" element={
            <ProtectedRoute><QueuePage /></ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
          } />
          <Route path="/admin/audit" element={
            <ProtectedRoute><AuditLogPage /></ProtectedRoute>
          } />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </QueueProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
