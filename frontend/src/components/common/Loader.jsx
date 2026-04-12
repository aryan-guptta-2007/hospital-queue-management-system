const Loader = ({ text = 'Loading...' }) => (
  <div
    className="flex flex-col items-center justify-center min-h-[200px] gap-5 animate-fade-in"
    role="status"
    aria-live="polite"
  >
    <div className="relative w-14 h-14">
      <div
        className="absolute inset-0 rounded-full border-[3px] border-slate-700"
        aria-hidden
      />
      <div
        className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-cyan-400 border-r-fuchsia-400 animate-spin"
        aria-hidden
      />
      <div
        className="absolute inset-2 rounded-full border-2 border-transparent border-b-cyan-300/50 animate-spin-slow motion-reduce:animate-none opacity-70"
        style={{ animationDirection: 'reverse' }}
        aria-hidden
      />
    </div>
    <p className="text-slate-300 text-lg font-medium tracking-tight">{text}</p>
  </div>
)

export default Loader
