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
      if (!id) {
        setMatch(null);
        setMvp(null);
        setErr("ID de partido inválido");
        setLoading(false);
        return;
      }

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
          setMvp(mvpRes.value?.data?.mvp ? mvpRes.value.data : null);
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

    const homeId = match?.homeClub?._id || match?.homeClub || "";
    const awayId = match?.awayClub?._id || match?.awayClub || "";

    const scoreHome = Number(match?.scoreHome ?? 0);
    const scoreAway = Number(match?.scoreAway ?? 0);

    const season = match?.season ?? "—";
    const competition = match?.competition || "League";
    const status = match?.status || "played";
    const stadium = match?.stadium || "Sin estadio";
    const date = match?.date ? new Date(match.date).toLocaleString() : "—";

    const playerStats = Array.isArray(match?.playerStats)
      ? match.playerStats
      : [];

    const teamStatsHome = match?.teamStats?.home || {};
    const teamStatsAway = match?.teamStats?.away || {};

    const lineupHome = Array.isArray(match?.lineups?.home?.players)
      ? match.lineups.home.players
      : [];
    const lineupAway = Array.isArray(match?.lineups?.away?.players)
      ? match.lineups.away.players
      : [];

    const lineupHomeFormation = match?.lineups?.home?.formation || "";
    const lineupAwayFormation = match?.lineups?.away?.formation || "";

    const playerStatsHome = playerStats.filter(
      (p) => String(p?.club?._id || p?.club || "") === String(homeId)
    );

    const playerStatsAway = playerStats.filter(
      (p) => String(p?.club?._id || p?.club || "") === String(awayId)
    );

    return {
      homeId,
      awayId,
      homeName,
      awayName,
      scoreHome,
      scoreAway,
      season,
      competition,
      status,
      stadium,
      date,
      playerStats,
      playerStatsHome,
      playerStatsAway,
      teamStatsHome,
      teamStatsAway,
      lineupHome,
      lineupAway,
      lineupHomeFormation,
      lineupAwayFormation,
    };
  }, [match]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-fifa-card p-6 shadow-glow ring-1 ring-[var(--fifa-line)]">
        <div className="text-sm text-[var(--fifa-mute)]">
          Cargando detalle del partido…
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-fifa-card p-6 shadow-glow ring-1 ring-[var(--fifa-line)]">
          <div className="text-sm text-[var(--fifa-danger)]">Error: {err}</div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/matches")}
          className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon"
        >
          Volver a partidos
        </button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-fifa-card p-6 shadow-glow ring-1 ring-[var(--fifa-line)]">
          <div className="text-sm text-[var(--fifa-mute)]">
            No se encontró el partido.
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/matches")}
          className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon"
        >
          Volver a partidos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-fifa-card p-6 shadow-glow ring-1 ring-[var(--fifa-line)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
              DETALLE DEL PARTIDO
            </div>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--fifa-text)]">
              {normalized.homeName}{" "}
              <span className="text-[var(--fifa-mute)]">vs</span>{" "}
              {normalized.awayName}
            </h1>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--fifa-mute)]">
              <span>
                Fecha:{" "}
                <span className="text-[var(--fifa-text)]">
                  {normalized.date}
                </span>
              </span>

              <span>
                Temporada:{" "}
                <span className="text-[var(--fifa-text)]">
                  {normalized.season}
                </span>
              </span>

              <span>
                Competición:{" "}
                <span className="text-[var(--fifa-text)]">
                  {normalized.competition}
                </span>
              </span>

              <span>
                Estado:{" "}
                <span className="text-[var(--fifa-text)]">
                  {normalized.status}
                </span>
              </span>

              <span>
                Estadio:{" "}
                <span className="text-[var(--fifa-text)]">
                  {normalized.stadium}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
              <div className="text-xs text-[var(--fifa-mute)]">
                Marcador final
              </div>
              <div className="mt-1 text-3xl font-extrabold text-[var(--fifa-text)]">
                {normalized.scoreHome}{" "}
                <span className="text-[var(--fifa-mute)]">-</span>{" "}
                {normalized.scoreAway}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/matches")}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] transition hover:ring-[var(--fifa-neon)]/30 hover:shadow-neon"
            >
              Ir a partidos
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={normalized.homeName} value={normalized.scoreHome} />
        <StatCard label={normalized.awayName} value={normalized.scoreAway} />
        <StatCard label="Player Stats" value={normalized.playerStats.length} />
        <StatCard label="Temporada" value={normalized.season} />
      </div>

      <div className="rounded-2xl bg-fifa-card p-5 shadow-glow ring-1 ring-[var(--fifa-line)]">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
          TEAM STATS
        </div>
        <div className="mt-1 text-sm text-[var(--fifa-mute)]">
          Comparativa del partido entre ambos clubes
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <TeamStat
            label="Posesión"
            home={normalized.teamStatsHome.possession}
            away={normalized.teamStatsAway.possession}
            suffix="%"
          />
          <TeamStat
            label="Tiros"
            home={normalized.teamStatsHome.shots}
            away={normalized.teamStatsAway.shots}
          />
          <TeamStat
            label="Tiros a puerta"
            home={normalized.teamStatsHome.shotsOnTarget}
            away={normalized.teamStatsAway.shotsOnTarget}
          />
          <TeamStat
            label="Precisión tiro"
            home={normalized.teamStatsHome.shotAccuracy}
            away={normalized.teamStatsAway.shotAccuracy}
            suffix="%"
          />
          <TeamStat
            label="xG"
            home={normalized.teamStatsHome.expectedGoals}
            away={normalized.teamStatsAway.expectedGoals}
          />
          <TeamStat
            label="Pases"
            home={normalized.teamStatsHome.passes}
            away={normalized.teamStatsAway.passes}
          />
          <TeamStat
            label="Pases comp."
            home={normalized.teamStatsHome.passesCompleted}
            away={normalized.teamStatsAway.passesCompleted}
          />
          <TeamStat
            label="Precisión pase"
            home={normalized.teamStatsHome.passAccuracy}
            away={normalized.teamStatsAway.passAccuracy}
            suffix="%"
          />
          <TeamStat
            label="Entradas"
            home={normalized.teamStatsHome.tackles}
            away={normalized.teamStatsAway.tackles}
          />
          <TeamStat
            label="Entradas ganadas"
            home={normalized.teamStatsHome.tacklesWon}
            away={normalized.teamStatsAway.tacklesWon}
          />
          <TeamStat
            label="Éxito entradas"
            home={normalized.teamStatsHome.tackleSuccess}
            away={normalized.teamStatsAway.tackleSuccess}
            suffix="%"
          />
          <TeamStat
            label="Recuperaciones"
            home={normalized.teamStatsHome.recoveries}
            away={normalized.teamStatsAway.recoveries}
          />
          <TeamStat
            label="Intercepciones"
            home={normalized.teamStatsHome.interceptions}
            away={normalized.teamStatsAway.interceptions}
          />
          <TeamStat
            label="Atajadas"
            home={normalized.teamStatsHome.saves}
            away={normalized.teamStatsAway.saves}
          />
          <TeamStat
            label="Faltas"
            home={normalized.teamStatsHome.fouls}
            away={normalized.teamStatsAway.fouls}
          />
          <TeamStat
            label="Offsides"
            home={normalized.teamStatsHome.offsides}
            away={normalized.teamStatsAway.offsides}
          />
          <TeamStat
            label="Corners"
            home={normalized.teamStatsHome.corners}
            away={normalized.teamStatsAway.corners}
          />
          <TeamStat
            label="Amarillas"
            home={normalized.teamStatsHome.yellowCards}
            away={normalized.teamStatsAway.yellowCards}
          />
          <TeamStat
            label="Rojas"
            home={normalized.teamStatsHome.redCards}
            away={normalized.teamStatsAway.redCards}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LineupCard
          title={normalized.homeName}
          formation={normalized.lineupHomeFormation}
          players={normalized.lineupHome}
        />

        <LineupCard
          title={normalized.awayName}
          formation={normalized.lineupAwayFormation}
          players={normalized.lineupAway}
        />
      </div>

      <div className="rounded-2xl bg-fifa-card p-5 shadow-glow ring-1 ring-[var(--fifa-line)]">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-neon)]">
          MVP DEL PARTIDO
        </div>

        {!mvp?.mvp ? (
          <div className="mt-3 text-sm text-[var(--fifa-mute)]">
            No hay MVP disponible para este partido.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl bg-gradient-to-br from-[rgba(0,255,194,0.08)] to-[rgba(0,0,0,0.10)] p-4 ring-1 ring-[var(--fifa-line)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400/30 to-yellow-600/20 text-xl ring-1 ring-yellow-400/40">
                  🏆
                </div>

                <div>
                  <div className="text-lg font-extrabold text-[var(--fifa-text)]">
                    {mvp?.mvp?.gamerTag || mvp?.mvp?.username || "—"}
                  </div>

                  <div className="text-sm text-[var(--fifa-mute)]">
                    @{mvp?.mvp?.username || "—"}
                  </div>

                  <div className="text-xs font-semibold text-yellow-400">
                    MVP DEL PARTIDO
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                label="Goles"
                value={mvp?.mvp?.goals ?? 0}
                accent="var(--fifa-neon)"
              />
              <MiniStat
                label="Asist."
                value={mvp?.mvp?.assists ?? 0}
                accent="var(--fifa-cyan)"
              />
              <MiniStat
                label="Rating"
                value={mvp?.mvp?.rating ?? 0}
                accent="gold"
              />
              <MiniStat
                label="Puntos"
                value={mvp?.mvp?.points ?? 0}
                accent="var(--fifa-mute)"
              />
            </div>
          </div>
        )}
      </div>

      <PlayerStatsTable
        title={`PLAYER STATS · ${normalized.homeName}`}
        subtitle="Detalle individual del club local"
        rows={normalized.playerStatsHome}
        fallbackClubName={normalized.homeName}
      />

      <PlayerStatsTable
        title={`PLAYER STATS · ${normalized.awayName}`}
        subtitle="Detalle individual del club visitante"
        rows={normalized.playerStatsAway}
        fallbackClubName={normalized.awayName}
      />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="truncate text-xs text-[var(--fifa-mute)]">{label}</div>
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

function TeamStat({ label, home = 0, away = 0, suffix = "" }) {
  const parsedHome = Number(home);
  const parsedAway = Number(away);

  const left = Number.isFinite(parsedHome) ? parsedHome : 0;
  const right = Number.isFinite(parsedAway) ? parsedAway : 0;

  const total = left + right;
  const homePercent = total > 0 ? (left / total) * 100 : 50;
  const awayPercent = total > 0 ? (right / total) * 100 : 50;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--fifa-mute)]">
        <span>{label}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-14 text-right font-bold text-[var(--fifa-neon)]">
          {left}
          {suffix}
        </div>

        <div className="h-2 flex-1 overflow-hidden rounded bg-black/40">
          <div
            className="h-full bg-[var(--fifa-neon)]"
            style={{ width: `${homePercent}%` }}
          />
        </div>

        <div className="h-2 flex-1 overflow-hidden rounded bg-black/40">
          <div
            className="h-full bg-[var(--fifa-cyan)]"
            style={{ width: `${awayPercent}%` }}
          />
        </div>

        <div className="w-14 text-left font-bold text-[var(--fifa-cyan)]">
          {right}
          {suffix}
        </div>
      </div>
    </div>
  );
}

function LineupCard({ title, formation, players }) {
  const starters = players.filter((p) => p?.starter !== false);
  const bench = players.filter((p) => p?.starter === false);

  return (
    <div className="rounded-2xl bg-fifa-card p-4 shadow-glow ring-1 ring-[var(--fifa-line)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-neon)]">
          {title}
        </div>

        <div className="text-xs text-[var(--fifa-mute)]">
          {formation || "Formación desconocida"}
        </div>
      </div>

      {players.length === 0 && (
        <div className="text-sm text-[var(--fifa-mute)]">
          Sin alineación registrada
        </div>
      )}

      {starters.length > 0 && (
        <div className="space-y-1">
          <div className="mb-1 text-xs text-[var(--fifa-mute)]">TITULARES</div>

          {starters.map((p, i) => {
            const name = p?.user?.gamerTag || p?.user?.username || "Jugador";

            return (
              <div
                key={`starter-${p?.user?._id || p?.user || "player"}-${i}`}
                className="flex justify-between rounded bg-black/20 px-3 py-1 text-sm"
              >
                <span className="font-semibold">{name}</span>

                <span className="text-[var(--fifa-mute)]">
                  {p?.shirtNumber ? `#${p.shirtNumber} · ` : ""}
                  {p?.position || "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {bench.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="mb-1 text-xs text-[var(--fifa-mute)]">SUPLENTES</div>

          {bench.map((p, i) => {
            const name = p?.user?.gamerTag || p?.user?.username || "Jugador";

            return (
              <div
                key={`bench-${p?.user?._id || p?.user || "player"}-${i}`}
                className="flex justify-between rounded bg-black/10 px-3 py-1 text-sm"
              >
                <span>{name}</span>

                <span className="text-[var(--fifa-mute)]">
                  {p?.shirtNumber ? `#${p.shirtNumber} · ` : ""}
                  {p?.position || "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayerStatsTable({ title, subtitle, rows, fallbackClubName }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-fifa-card shadow-glow ring-1 ring-[var(--fifa-line)]">
      <div className="border-b border-[var(--fifa-line)]/70 bg-black/20 px-5 py-4">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
          {title}
        </div>
        <div className="text-sm text-[var(--fifa-mute)]">{subtitle}</div>
      </div>

      <div className="p-5">
        {rows.length === 0 ? (
          <div className="text-sm text-[var(--fifa-mute)]">
            Este club no tiene estadísticas individuales cargadas en este
            partido.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-sm text-[var(--fifa-text)]">
              <thead>
                <tr className="bg-black">
                  <th className="w-12 px-2 py-3 text-center font-extrabold">#</th>
                  <th className="px-3 py-3 text-left font-extrabold">JUGADOR</th>
                  <th className="w-[16%] px-3 py-3 text-left font-extrabold">
                    CLUB
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    POS
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    RTG
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    MIN
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    G
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    A
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    TIR
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    T. ARCO
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    PASES
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    P. COMP
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    REG
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    REG G
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    TACK
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    TACK G
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    INT
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    REC
                  </th>
                  <th className="w-16 px-2 py-3 text-center font-extrabold">
                    MVP
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((ps, idx) => {
                  const gamerTag =
                    ps?.user?.gamerTag ||
                    ps?.user?.username ||
                    ps?.username ||
                    "—";

                  const username = ps?.user?.username || ps?.username || "—";
                  const clubName = ps?.club?.name || fallbackClubName || "—";

                  return (
                    <tr
                      key={`${ps?.user?._id || ps?.user || "row"}-${idx}`}
                      className="border-b border-[var(--fifa-line)]/40"
                    >
                      <td className="px-2 py-3 text-center">{idx + 1}</td>

                      <td className="px-3 py-3">
                        <div className="truncate font-extrabold" title={gamerTag}>
                          {gamerTag}
                        </div>
                        <div className="text-xs text-[var(--fifa-mute)]">
                          @{username}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="truncate" title={clubName}>
                          {clubName}
                        </div>
                      </td>

                      <td className="px-2 py-3 text-center">
                        {ps?.position || "—"}
                      </td>

                      <td className="px-2 py-3 text-center font-bold text-yellow-400">
                        {Number(ps?.rating ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.minutesPlayed ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center font-extrabold text-[var(--fifa-neon)]">
                        {Number(ps?.goals ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center font-extrabold text-[var(--fifa-cyan)]">
                        {Number(ps?.assists ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.shots ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.shotsOnTarget ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.passes ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.passesCompleted ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.dribbles ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.dribblesWon ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.tackles ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.tacklesWon ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.interceptions ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {Number(ps?.recoveries ?? 0)}
                      </td>

                      <td className="px-2 py-3 text-center">
                        {ps?.isMVP ? (
                          <span className="text-lg text-yellow-400">🏆</span>
                        ) : (
                          "—"
                        )}
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