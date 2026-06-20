export default function ConfirmModal({ title, subtitle, children, confirmLabel = 'YES', cancelLabel = 'NO', onConfirm, onCancel }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#010110]/85 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-slate-900/70 backdrop-blur-md border border-fuchsia-500/30 rounded-xl px-10 py-12 text-center shadow-[0_0_40px_rgba(217,70,239,0.3)] animate-fade-up">
        <h3 className="font-display font-bold text-2xl uppercase tracking-[0.2em] text-fuchsia-400 neon-text mb-3 leading-relaxed">
          {title}
        </h3>
        {subtitle && (
          <p className="text-slate-400 text-sm tracking-[0.2em] uppercase mb-8 leading-relaxed">{subtitle}</p>
        )}
        {children && <div className="mb-8">{children}</div>}
        <div className="flex justify-center gap-5">
          <button onClick={onConfirm}
            className="px-10 py-4 rounded-lg border border-cyan-500/50 text-cyan-400 font-display text-base tracking-widest hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300">
            {confirmLabel}
          </button>
          <button onClick={onCancel}
            className="px-10 py-4 rounded-lg border border-slate-600 text-slate-400 font-display text-base tracking-widest hover:bg-white/10 hover:text-slate-200 transition-all duration-300">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
