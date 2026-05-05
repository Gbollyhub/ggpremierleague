export function StatCard({ label, value, icon, color = '#3b82f6' }) {
  return (
    <div className="gpl-card p-5 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gpl">{value}</div>
        <div className="text-xs text-gpl-muted uppercase tracking-wider font-medium">{label}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-gpl-inset">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            active === t.id
              ? 'gpl-card-solid text-gpl shadow-sm'
              : 'text-gpl-muted hover:text-gpl-secondary'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, max = 99, color, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs uppercase w-20 text-gpl-muted font-medium">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-gpl-inset overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(value / max) * 100}%`,
            background: `linear-gradient(90deg, ${color}, ${color}bb)`,
          }}
        />
      </div>
      <span className="text-sm font-bold text-gpl w-8 text-right">{value}</span>
    </div>
  );
}
