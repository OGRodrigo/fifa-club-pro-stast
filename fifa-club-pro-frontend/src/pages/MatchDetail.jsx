// src/pages/MatchDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [mvp, setMvp] = useState(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadMatch() {
      if (!id) return;

      try {
        setLoading(true);
        setErr("");

        const [matchRes, mvpRes] = await Promise.allSettled([
          api.get(`/matches/${id}/full`),
          api.get(`/matches/${id}/mvp`),
        ]);

        if (!alive) return;

        if (matchRes.status === "fulfilled") {
          setMatch(matchRes.value?.data || null);
        } else {
          const message =
            matchRes.reason?.response?.data?.message ||
            matchRes.reason?.message ||
            "Error al cargar detalle del partido";
          setErr(message);
          setMatch(null);
        }

        if (mvpRes.status === "fulfilled") {
          setMvp(mvpRes.value?.data || null);
        } else {
          setMvp(null);
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e.message || "Error");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadMatch();

    return () => {
      alive = false;
    };
  }, [id]);

  const normalized = useMemo(() => {
    const homeName = match?.homeClub?.name || match?.homeClubName || "Home";
    const awayName = match?.awayClub?.name || match?.awayClubName || "Away";

    const scoreHome = Number(match?.scoreHome ?? 0);
    const scoreAway = Number(match?.scoreAway ?? 0);

    const season = match?.season ?? "—";
    const stadium = match?.stadium || "Sin estadio";
    const date = match?.date ? new Date(match.date).toLocaleDateString() : "—";

    const playerStats = Array.isArray(match?.playerStats) ? match.playerStats : [];

    return {
      homeName,
      awayName,
      scoreHome,
      scoreAway,
      season,
      stadium,
      date,
      playerStats,
    };
  }, [match]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-6">
        <div className="text-sm text-[var(--fifa-mute)]">Cargando detalle del partido…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-6">
          <div className="text-sm text-[var(--fifa-danger)]">Error: {err}</div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/home")}
          className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon transition"
        >
          Volver a home
        </button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-6">
          <div className="text-sm text-[var(--fifa-mute)]">No se encontró el partido.</div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/matches")}
          className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon transition"
        >
          Volver a matches
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
              DETALLE DEL PARTIDO
            </div>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--fifa-text)]">
              {normalized.homeName} <span className="text-[var(--fifa-mute)]">vs</span> {normalized.awayName}
            </h1>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--fifa-mute)]">
              <span>Fecha: <span className="text-[var(--fifa-text)]">{normalized.date}</span></span>
              <span>Temporada: <span className="text-[var(--fifa-text)]">{normalized.season}</span></span>
              <span>Estadio: <span className="text-[var(--fifa-text)]">{normalized.stadium}</span></span>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3">
            <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
              <div className="text-xs text-[var(--fifa-mute)]">Marcador final</div>
              <div className="mt-1 text-3xl font-extrabold text-[var(--fifa-text)]">
                {normalized.scoreHome} <span className="text-[var(--fifa-mute)]">-</span> {normalized.scoreAway}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/home")}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon transition"
            >
              Volver a home
            </button>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={normalized.homeName} value={normalized.scoreHome} />
        <StatCard label={normalized.awayName} value={normalized.scoreAway} />
        <StatCard label="Player Stats" value={normalized.playerStats.length} />
        <StatCard label="Temporada" value={normalized.season} />
      </div>

      {/* MVP */}
      <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-5">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-neon)]">
          MVP DEL PARTIDO
        </div>

        {!mvp ? (
          <div className="mt-3 text-sm text-[var(--fifa-mute)]">
            No hay MVP disponible para este partido.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-[rgba(0,255,194,0.08)] to-[rgba(0,0,0,0.10)] ring-1 ring-[var(--fifa-line)] p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-black/25 ring-1 ring-[var(--fifa-line)] flex items-center justify-center text-xl">
                  🏆
                </div>

                <div>
                  <div className="text-lg font-extrabold text-[var(--fifa-text)]">
                    {mvp?.gamerTag || mvp?.username || mvp?.user?.gamerTag || mvp?.user?.username || "—"}
                  </div>
                  <div className="text-sm text-[var(--fifa-mute)]">
                    @{mvp?.username || mvp?.user?.username || "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Goles" value={mvp?.goals ?? 0} accent="var(--fifa-neon)" />
              <MiniStat label="Asist." value={mvp?.assists ?? 0} accent="var(--fifa-cyan)" />
              <MiniStat label="Puntos" value={mvp?.points ?? 0} accent="var(--fifa-cyan)" />
              <MiniStat label="PJ" value={mvp?.played ?? 1} accent="var(--fifa-mute)" />
            </div>
          </div>
        )}
      </div>

      {/* PLAYER STATS */}
      <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--fifa-line)]/70 bg-black/20">
          <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
            PLAYER STATS
          </div>
          <div className="text-sm text-[var(--fifa-mute)]">
            Goles y asistencias registradas en este partido
          </div>
        </div>

        <div className="p-5">
          {normalized.playerStats.length === 0 ? (
            <div className="text-sm text-[var(--fifa-mute)]">
              Este partido no tiene estadísticas individuales cargadas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm text-[var(--fifa-text)]">
                <thead>
                  <tr className="bg-black">
                    <th className="w-12 px-2 py-3 text-center font-extrabold">#</th>
                    <th className="px-3 py-3 text-left font-extrabold">JUGADOR</th>
                    <th className="w-[26%] px-3 py-3 text-left font-extrabold">CLUB</th>
                    <th className="w-20 px-2 py-3 text-center font-extrabold">GOLES</th>
                    <th className="w-20 px-2 py-3 text-center font-extrabold">ASIST.</th>
                  </tr>
                </thead>

                <tbody>
                  {normalized.playerStats.map((ps, idx) => {
                    const username =
                      ps?.user?.gamerTag ||
                      ps?.user?.username ||
                      ps?.username ||
                      "—";

                    const clubName =
                      ps?.club?.name ||
                      (String(ps?.club) === String(match?.homeClub?._id || match?.homeClub)
                        ? normalized.homeName
                        : String(ps?.club) === String(match?.awayClub?._id || match?.awayClub)
                        ? normalized.awayName
                        : "—");

                    return (
                      <tr
                        key={`${ps?.user?._id || ps?.user || "row"}-${idx}`}
                        className="border-b border-[var(--fifa-line)]/40"
                      >
                        <td className="px-2 py-3 text-center">{idx + 1}</td>
                        <td className="px-3 py-3">
                          <div className="truncate font-extrabold" title={username}>
                            {username}
                          </div>
                          <div className="text-xs text-[var(--fifa-mute)]">
                            @{ps?.user?.username || ps?.username || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="truncate" title={clubName}>
                            {clubName}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center font-extrabold text-[var(--fifa-neon)]">
                          {Number(ps?.goals ?? 0)}
                        </td>
                        <td className="px-2 py-3 text-center font-extrabold text-[var(--fifa-cyan)]">
                          {Number(ps?.assists ?? 0)}
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
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="text-xs text-[var(--fifa-mute)] truncate">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-[var(--fifa-text)]">
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-black/25 p-3 ring-1 ring-[var(--fifa-line)]">
      <div className="text-xs text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}