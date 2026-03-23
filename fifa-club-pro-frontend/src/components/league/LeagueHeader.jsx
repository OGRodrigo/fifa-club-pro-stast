// src/components/league/LeagueHeader.jsx
import LeagueKpi from "./LeagueKpi";

export default function LeagueHeader({
  season,
  seasons,
  onSeasonChange,
  clubCount,
  leaderName,
}) {
  return (
    <section className="rounded-2xl bg-[var(--fifa-card)] p-5 shadow-glow ring-1 ring-[var(--fifa-line)] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--fifa-text)]">
            Liga
          </h1>
          <p className="mt-1 text-[var(--fifa-mute)]">
            Tabla, premios y resumen competitivo por temporada
          </p>
        </div>

        <div className="w-full lg:w-[220px]">
          <div className="mb-2 text-xs text-[var(--fifa-mute)]">Temporada</div>
          <select
            value={season}
            onChange={(e) => onSeasonChange(e.target.value)}
            className="w-full rounded-xl bg-black/30 p-3 text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)]"
          >
            {seasons.length === 0 ? (
              <option value="">Sin temporadas</option>
            ) : (
              seasons.map((s) => (
                <option key={s} value={String(s)}>
                  {s}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LeagueKpi label="Clubes" value={clubCount} />
        <LeagueKpi label="Líder" value={leaderName} />
        <LeagueKpi label="Temporada" value={season || "—"} />
      </div>
    </section>
  );
}