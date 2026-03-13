// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [seasons, setSeasons] = useState([]);
  const [season, setSeason] = useState("");

// cambio pequeño aquí
useEffect(() => {
  let alive = true;

  async function loadSeasons() {
    try {
      const res = await api.get("/league/seasons");
      if (!alive) return;

      const list = Array.isArray(res.data?.seasons) ? res.data.seasons : [];

      setSeasons(list);

      if (list.length > 0) {
        setSeason(String(list[0]));
      } else {
        setSeason("");
      }
    } catch {
      if (!alive) return;
      setSeasons([]);
      setSeason("");
    }
  }

  loadSeasons();

  return () => {
    alive = false;
  };
}, []);

useEffect(() => {
  let alive = true;

  async function loadDashboard() {
    try {
      setLoading(true);
      setErr("");

      const params = {};
      if (season) params.season = season;

      const res = await api.get("/league/dashboard", { params });
      if (!alive) return;

      setData(res.data);
    } catch (e) {
      if (!alive) return;
      setErr(e?.response?.data?.message || e.message || "Error al cargar dashboard");
    } finally {
      if (alive) setLoading(false);
    }
  }

  // evita request cuando seasons ya cargó pero season aún no se setea
  if (!season && seasons.length > 0) return;

  if (season || seasons.length === 0) {
    loadDashboard();
  }

  return () => {
    alive = false;
  };
}, [season, seasons.length]);

  const table = useMemo(() => {
    const raw = Array.isArray(data?.table) ? data.table : [];

    return raw.map((row) => ({
      clubId: row.clubId ?? row._id ?? null,
      clubName: row.clubName ?? "—",
      played: Number(row.played ?? 0),
      wins: Number(row.wins ?? 0),
      draws: Number(row.draws ?? 0),
      losses: Number(row.losses ?? 0),
      goalsFor: Number(row.goalsFor ?? 0),
      goalsAgainst: Number(row.goalsAgainst ?? 0),
      goalDifference: Number(
        row.goalDifference ??
          (Number(row.goalsFor ?? 0) - Number(row.goalsAgainst ?? 0))
      ),
      points: Number(row.points ?? 0),
    }));
  }, [data]);

  const leader = table.length > 0 ? table[0] : null;

  const leaderboards = data?.leaderboards ?? {};
  const extras = data?.extras ?? {};

  const topScorers = Array.isArray(leaderboards.topScorers)
    ? leaderboards.topScorers
    : [];

  const topAssists = Array.isArray(leaderboards.topAssists)
    ? leaderboards.topAssists
    : [];

  const mvp = leaderboards.mvp ?? null;

  const bestAttack = Array.isArray(extras.bestAttack) ? extras.bestAttack : [];
  const bestDefense = Array.isArray(extras.bestDefense) ? extras.bestDefense : [];
  const cleanSheets = Array.isArray(extras.cleanSheets) ? extras.cleanSheets : [];

  if (loading) {
    return (
      <div className="rounded-2xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-6 text-[var(--fifa-mute)]">
        Cargando liga...
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-2xl bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-6 text-[var(--fifa-danger)]">
        Error: {err}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6">
      {/* HEADER */}
      <section className="rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-glow p-5 md:p-6">
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
            <div className="text-xs text-[var(--fifa-mute)] mb-2">Temporada</div>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-3 text-[var(--fifa-text)]"
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

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Kpi label="Clubes" value={table.length} />
          <Kpi label="Líder" value={leader?.clubName ?? "—"} />
          <Kpi label="Temporada" value={season || "—"} />
        </div>
      </section>

      {/* MVP */}
      <section className="rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--fifa-line)]/70 bg-black/20">
          <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
            MVP DE LA TEMPORADA
          </div>
          <div className="text-sm text-[var(--fifa-mute)]">
            Mejor jugador según puntos acumulados
          </div>
        </div>

        <div className="p-5 md:p-6">
          {!mvp ? (
            <div className="text-[var(--fifa-mute)]">
              Aún no hay MVP para esta temporada.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] items-start">
              <div className="rounded-2xl bg-gradient-to-br from-[rgba(0,255,194,0.10)] to-[rgba(0,0,0,0.15)] ring-1 ring-[var(--fifa-neon)]/25 p-5">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-[rgba(0,255,194,0.10)] ring-1 ring-[var(--fifa-neon)]/30 flex items-center justify-center text-2xl">
                    🏆
                  </div>

                  <div>
                    <div className="text-xs tracking-widest text-[var(--fifa-mute)]">
                      JUGADOR DESTACADO
                    </div>
                    <div className="mt-1 text-3xl font-extrabold text-[var(--fifa-text)]">
                      {mvp.gamerTag || mvp.username || "—"}
                    </div>
                    <div className="mt-1 text-sm text-[var(--fifa-mute)]">
                      @{mvp.username || "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-[var(--fifa-mute)]">
                  Temporada <span className="text-[var(--fifa-text)] font-semibold">{season || "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Puntos" value={mvp.points ?? 0} accent="var(--fifa-cyan)" />
                <MiniStat label="PJ" value={mvp.played ?? 0} accent="var(--fifa-mute)" />
                <MiniStat label="Goles" value={mvp.goals ?? 0} accent="var(--fifa-neon)" />
                <MiniStat label="Asist." value={mvp.assists ?? 0} accent="var(--fifa-cyan)" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TABLA PRINCIPAL */}
      <section className="rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--fifa-line)]/70 bg-black/20">
          <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
            TABLA DE POSICIONES
          </div>
          <div className="text-sm text-[var(--fifa-mute)]">
            Ranking oficial de la temporada
          </div>
        </div>

        <div className="p-5 md:p-6">
          {table.length === 0 ? (
            <div className="text-[var(--fifa-mute)]">No hay datos en la tabla.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full table-fixed border-collapse text-sm text-[var(--fifa-text)]">
                <thead>
                  <tr className="bg-black text-[var(--fifa-text)]">
                    <th className="w-12 px-2 py-3 text-center font-extrabold">#</th>
                    <th className="w-[46%] px-3 py-3 text-left font-extrabold">CLUB</th>
                    <th className="w-10 px-1 py-3 text-center font-extrabold">PJ</th>
                    <th className="w-8 px-1 py-3 text-center font-extrabold">G</th>
                    <th className="w-8 px-1 py-3 text-center font-extrabold">E</th>
                    <th className="w-8 px-1 py-3 text-center font-extrabold">P</th>
                    <th className="w-10 px-1 py-3 text-center font-extrabold">GF</th>
                    <th className="w-10 px-1 py-3 text-center font-extrabold">GC</th>
                    <th className="w-10 px-1 py-3 text-center font-extrabold">DG</th>
                    <th className="w-12 px-1 py-3 text-center font-extrabold text-[var(--fifa-cyan)]">
                      PTS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {table.map((row, idx) => {
                    const isLeader = idx === 0;
                    const medal = getMedal(idx);

                    return (
                      <tr
                        key={row.clubId || `${row.clubName}-${idx}`}
                        className={`border-b border-[var(--fifa-line)]/40 ${
                          isLeader ? "bg-[rgba(0,255,194,0.06)]" : ""
                        }`}
                      >
                        <td className="px-2 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span>{idx + 1}</span>
                            {medal ? <span>{medal}</span> : null}
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div
                            className={`truncate font-extrabold ${
                              isLeader ? "text-[var(--fifa-neon)]" : ""
                            }`}
                            title={row.clubName}
                          >
                            {row.clubName}
                          </div>
                        </td>

                        <td className="px-1 py-3 text-center">{row.played}</td>
                        <td className="px-1 py-3 text-center">{row.wins}</td>
                        <td className="px-1 py-3 text-center">{row.draws}</td>
                        <td className="px-1 py-3 text-center">{row.losses}</td>
                        <td className="px-1 py-3 text-center">{row.goalsFor}</td>
                        <td className="px-1 py-3 text-center">{row.goalsAgainst}</td>
                        <td className="px-1 py-3 text-center">{row.goalDifference}</td>
                        <td className="px-1 py-3 text-center font-extrabold text-[var(--fifa-cyan)]">
                          {row.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* PREMIOS INDIVIDUALES */}
      <section className="grid gap-4 lg:grid-cols-2">
        <RankTable
          title="Goleadores"
          subtitle="Máximos anotadores de la temporada"
          metricLabel="G"
          rows={topScorers}
          valueGetter={(r) => r.goals ?? 0}
          nameGetter={(r) => r.gamerTag || r.username || "—"}
          accent="var(--fifa-neon)"
        />

        <RankTable
          title="Asistencias"
          subtitle="Máximos asistentes de la temporada"
          metricLabel="A"
          rows={topAssists}
          valueGetter={(r) => r.assists ?? 0}
          nameGetter={(r) => r.gamerTag || r.username || "—"}
          accent="var(--fifa-cyan)"
        />
      </section>

      {/* PREMIOS DE CLUBES */}
      <section className="grid gap-4 xl:grid-cols-3">
        <RankTable
          title="Mejor ataque"
          subtitle="Más goles a favor"
          metricLabel="GF"
          rows={bestAttack}
          valueGetter={(r) => r.goalsFor ?? 0}
          nameGetter={(r) => r.clubName || "—"}
          accent="var(--fifa-neon)"
        />

        <RankTable
          title="Mejor defensa"
          subtitle="Menos goles en contra"
          metricLabel="GC"
          rows={bestDefense}
          valueGetter={(r) => r.goalsAgainst ?? 0}
          nameGetter={(r) => r.clubName || "—"}
          accent="var(--fifa-cyan)"
        />

        <RankTable
          title="Vallas invictas"
          subtitle="Partidos sin recibir goles"
          metricLabel="CS"
          rows={cleanSheets}
          valueGetter={(r) => r.cleanSheets ?? 0}
          nameGetter={(r) => r.clubName || "—"}
          accent="var(--fifa-cyan)"
        />
      </section>
    </div>
  );
}

function getMedal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-4">
      <div className="text-xs text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-[var(--fifa-text)]">
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-3">
      <div className="text-xs text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function RankTable({
  title,
  subtitle,
  metricLabel,
  rows,
  valueGetter,
  nameGetter,
  accent,
}) {
  return (
    <div className="rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-glow overflow-hidden min-w-0">
      <div className="px-5 py-4 border-b border-[var(--fifa-line)]/70 bg-black/20">
        <div className="text-xs font-semibold tracking-widest" style={{ color: accent }}>
          {title.toUpperCase()}
        </div>
        <div className="text-sm text-[var(--fifa-mute)]">{subtitle}</div>
      </div>

      <div className="p-5">
        {rows.length === 0 ? (
          <div className="text-[var(--fifa-mute)]">Aún no hay datos para esta temporada.</div>
        ) : (
          <div className="w-full">
            <table className="w-full table-fixed border-collapse text-sm text-[var(--fifa-text)]">
              <thead>
                <tr className="bg-black">
                  <th className="w-12 px-2 py-3 text-center font-extrabold">#</th>
                  <th className="px-3 py-3 text-left font-extrabold">NOMBRE</th>
                  <th className="w-14 px-2 py-3 text-center font-extrabold">{metricLabel}</th>
                </tr>
              </thead>

              <tbody>
                {rows.slice(0, 5).map((row, idx) => {
                  const medal = getMedal(idx);

                  return (
                    <tr
                      key={row.userId || row.clubId || idx}
                      className={`border-b border-[var(--fifa-line)]/40 ${
                        idx === 0 ? "bg-[rgba(0,255,194,0.06)]" : ""
                      }`}
                    >
                      <td className="px-2 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>{idx + 1}</span>
                          {medal ? <span>{medal}</span> : null}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="truncate font-extrabold" title={nameGetter(row)}>
                          {nameGetter(row)}
                        </div>
                      </td>

                      <td
                        className="px-2 py-3 text-center font-extrabold"
                        style={{ color: accent }}
                      >
                        {valueGetter(row)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}