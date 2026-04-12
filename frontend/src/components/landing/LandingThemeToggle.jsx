/** Light/dark control — styles use only `mode` so they work before/after <html class="dark"> updates. */
const LandingThemeToggle = ({ mode, onChange }) => {
  const isDark = mode === 'dark'

  return (
    <div
      className={`flex items-center rounded-full border p-0.5 shadow-sm backdrop-blur-sm
        ${isDark ? 'border-cyan-500/40 bg-slate-900/90' : 'border-fuchsia-300/50 bg-white/90'}`}
      role="group"
      aria-label="Colour theme"
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onChange('light')
        }}
        className={`flex min-h-[2.25rem] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all sm:min-h-0 sm:px-3.5 sm:py-2 sm:text-sm
          ${
            !isDark
              ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-md shadow-cyan-900/20'
              : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
          }`}
        aria-pressed={!isDark}
      >
        <SunIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onChange('dark')
        }}
        className={`flex min-h-[2.25rem] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all sm:min-h-0 sm:px-3.5 sm:py-2 sm:text-sm
          ${
            isDark
              ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-md shadow-black/20'
              : 'text-slate-500 hover:bg-fuchsia-50 hover:text-slate-800'
          }`}
        aria-pressed={isDark}
      >
        <MoonIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  )
}

function SunIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zm6.894 5.166l-1.591-1.59a.75.75 0 10-1.06 1.061l1.59 1.591a.75.75 0 101.06-1.06zM12 6.75a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5z" />
    </svg>
  )
}

function MoonIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
    </svg>
  )
}

export default LandingThemeToggle
