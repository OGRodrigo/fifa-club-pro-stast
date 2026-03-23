// src/components/league/LeagueMiniStat.jsx
export default function LeagueMiniStat({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-black/30 p-3 ring-1 ring-[var(--fifa-line)]">
      <div className="text-xs text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}