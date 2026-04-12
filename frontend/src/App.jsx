import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { QueueProvider } from './context/QueueContext'
import DisplayPage    from './pages/DisplayPage'
import LandingPage    from './pages/LandingPage'
import HomePage       from './pages/patient/HomePage'
import LoginPage      from './pages/admin/LoginPage'
import DashboardPage  from './pages/admin/DashboardPage'
import QueuePage      from './pages/admin/QueuePage'
import Loader         from './components/common/Loader'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <Loader text="Verifying session..." />
  return user ? children : <Navigate to="/admin/login" replace />
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

          {/* ── Admin Routes ────────────────────── */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/admin/queue" element={
            <ProtectedRoute><QueuePage /></ProtectedRoute>
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
