import { useAuth } from '../../context/AuthContext'
import { useNavigate, NavLink } from 'react-router-dom'

const navLinkClass = ({ isActive }) =>
  `relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950
   ${
     isActive
      ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 text-cyan-700 dark:text-cyan-200 shadow-sm'
      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
   }`

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-300/30 dark:border-cyan-400/15 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-xl shadow-md shadow-cyan-500/30">
            🏥
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-slate-900 dark:text-white leading-tight truncate">Hospital Queue</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-700/80 dark:text-cyan-200/80">Admin</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-cyan-300/30 dark:border-cyan-400/20" aria-label="Main">
          <NavLink to="/admin/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/queue" className={navLinkClass}>
            Queue
          </NavLink>
          {user?.role === 'admin' && (
            <>
              <NavLink to="/admin/analytics" className={navLinkClass}>
                Analytics
              </NavLink>
              <NavLink to="/admin/audit" className={navLinkClass}>
                Audit
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">{user?.name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize font-medium">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-fuchsia-300/30 dark:border-fuchsia-500/20
                       transition-all duration-200 hover:bg-red-500/10 hover:text-red-300 hover:shadow-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar
