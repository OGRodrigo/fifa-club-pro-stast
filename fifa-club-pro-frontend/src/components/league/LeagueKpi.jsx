// src/components/league/LeagueKpi.jsx
export default function LeagueKpi({ label, value }) {
  return (
    <div className="rounded-xl bg-black/30 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="text-xs text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-[var(--fifa-text)]">
        {value}
      </div>
    </div>
  );
}