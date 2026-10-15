import { motion } from 'framer-motion'

const CurrentToken = ({ token, waitingCount, onRecall, loading }) => (
  <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-card-hover bg-gradient-to-br from-cyan-700 via-blue-700 to-fuchsia-800">
    <div
      className="pointer-events-none absolute inset-0 opacity-30"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.35) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(255,255,255,0.12) 0%, transparent 35%)',
      }}
      aria-hidden
    />
    <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
      <div className="text-center lg:text-left w-full">
        <p className="text-cyan-100/90 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] mb-2">Now serving</p>
        {token ? (
          <motion.div
            key={token._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="relative inline-block motion-safe:animate-fade-in-up"
          >
            <motion.span
              className="pointer-events-none absolute -inset-3 rounded-2xl border border-white/50"
              animate={{ scale: [1, 1.06, 1], opacity: [0.65, 0.2, 0.65] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <h2 className="font-display text-5xl sm:text-6xl font-black tracking-tight drop-shadow-md">
              {token.tokenNumber}
            </h2>
            <p className="text-cyan-100 mt-2 text-lg sm:text-xl font-semibold truncate max-w-full">{token.patient?.name}</p>
            <button
              type="button"
              onClick={onRecall}
              disabled={loading}
              title="Announce this token again"
              className="relative mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-white/50 bg-white/15 px-4 py-2
                         text-sm font-bold text-white backdrop-blur-md transition-all duration-200
                         hover:bg-white/25 hover:-translate-y-0.5 active:translate-y-0
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0
                         focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            >
              <span aria-hidden>🔔</span>
              Recall
            </button>
          </motion.div>
        ) : (
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-cyan-100/80">No active token</h2>
        )}
      </div>

      <div
        className="text-center rounded-2xl bg-white/40 dark:bg-white/15 backdrop-blur-md px-8 py-5 min-w-[140px] border border-cyan-200/60 dark:border-white/20
                   shadow-inner-soft transition-transform duration-300 hover:scale-105 cursor-default"
      >
        <p className="text-cyan-100 text-xs font-bold uppercase tracking-wider">In queue</p>
        <p className="font-display text-5xl font-black tabular-nums leading-none mt-1">{waitingCount ?? 0}</p>
        <p className="text-cyan-100/80 text-xs font-semibold mt-2">waiting</p>
      </div>
    </div>
  </div>
)

export default CurrentToken
