// src/pages/ClubAnalytics.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

/**
 * =====================================================
 * CLUB ANALYTICS
 * -----------------------------------------------------
 * Vista ejecutiva del club actual.
 *
 * Fuentes usadas:
 * - GET /clubs/:clubId/members
 * - GET /matches?limit=100
 *
 * 
 * =====================================================
 */
export default function ClubAnalytics() {
  const navigate = useNavigate();
  const { clubContext } = useAuth();

  const clubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";

  const isAdmin = role === "admin";
  const isCaptain = role === "captain";
  const isAdminOrCaptain = isAdmin || isCaptain;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [members, setMembers] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      if (!clubId) return;

      try {
        setLoading(true);
        setErr("");

        const [membersRes, matchesRes] = await Promise.all([
          api.get(`/clubs/${clubId}/members`),
          api.get("/matches", { params: { limit: 100 } }),
        ]);

        if (!alive) return;

        const mems = Array.isArray(membersRes.data?.members)
          ? membersRes.data.members
          : [];

        const allMatches = Array.isArray(matchesRes.data?.data)
          ? matchesRes.data.data
          : [];

        const clubMatches = allMatches.filter((match) => {
          const home = (match?.homeClub?._id || match?.homeClub || "").toString();
          const away = (match?.awayClub?._id || match?.awayClub || "").toString();
          return home === clubId || away === clubId;
        });

        clubMatches.sort((a, b) => {
          const da = a?.date ? new Date(a.date).getTime() : 0;
          const db = b?.date ? new Date(b.date).getTime() : 0;
          return db - da;
        });

        setMembers(mems);
        setMatches(clubMatches);
      } catch (e) {
        if (!alive) return;
        setErr(
          e?.response?.data?.message ||
            e.message ||
            "Error al cargar analítica del club"
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, [clubId]);

  const analytics = useMemo(() => {
    const memberRows = members.map((member) => {
      const userId = (member?.user?._id || member?.user || "").toString();
      const username = member?.user?.username || "—";
      const gamerTag = member?.user?.gamerTag || "—";
      const platform = member?.user?.platform || "—";
      const country = member?.user?.country || "—";
      const memberRole = member?.role || "member";

      let played = 0;
      let goals = 0;
      let assists = 0;
      const ratings = [];

      for (const match of matches) {
        const playerStats = Array.isArray(match?.playerStats) ? match.playerStats : [];

        const row = playerStats.find((ps) => {
          const uid = (ps?.user?._id || ps?.user || "").toString();
          return uid === userId;
        });

        if (!row) continue;

        played += 1;
        goals += Number(row?.goals || 0);
        assists += Number(row?.assists || 0);

        const rating = Number(row?.rating || 0);
        if (!Number.isNaN(rating) && rating > 0) {
          ratings.push(rating);
        }
      }

      const avgRating =
        ratings.length === 0
          ? 0
          : Number(
              (
                ratings.reduce((acc, current) => acc + current, 0) /
                ratings.length
              ).toFixed(2)
            );

      return {
        userId,
        username,
        gamerTag,
        platform,
        country,
        role: memberRole,
        played,
        goals,
        assists,
        contrib: goals + assists,
        avgRating,
      };
    });

    const totalMembers = memberRows.length;
    const adminCount = memberRows.filter((m) => m.role === "admin").length;
    const captainCount = memberRows.filter((m) => m.role === "captain").length;
    const memberCount = memberRows.filter((m) => m.role === "member").length;

    let playedMatches = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    const recentResults = [];
    const allClubMatches = [];

    for (const match of matches) {
      const homeId = (match?.homeClub?._id || match?.homeClub || "").toString();
      const awayId = (match?.awayClub?._id || match?.awayClub || "").toString();

      const homeName = match?.homeClub?.name || "Home";
      const awayName = match?.awayClub?.name || "Away";

      const isHome = homeId === clubId;
      const myClubName = isHome ? homeName : awayName;
      const rivalClubName = isHome ? awayName : homeName;

      const gf = isHome
        ? Number(match?.scoreHome || 0)
        : Number(match?.scoreAway || 0);

      const ga = isHome
        ? Number(match?.scoreAway || 0)
        : Number(match?.scoreHome || 0);

      let result = "D";
      if (gf > ga) result = "W";
      else if (gf < ga) result = "L";

      playedMatches += 1;
      goalsFor += gf;
      goalsAgainst += ga;

      if (result === "W") wins += 1;
      else if (result === "L") losses += 1;
      else draws += 1;

      recentResults.push(result);

      allClubMatches.push({
        matchId: match?._id,
        date: match?.date || null,
        competition: match?.competition || "League",
        status: match?.status || "played",
        myClubName,
        rivalClubName,
        gf,
        ga,
        result,
      });
    }

    const points = wins * 3 + draws;
    const goalDifference = goalsFor - goalsAgainst;

    const avgGoalsFor =
      playedMatches > 0 ? Number((goalsFor / playedMatches).toFixed(2)) : 0;

    const avgGoalsAgainst =
      playedMatches > 0 ? Number((goalsAgainst / playedMatches).toFixed(2)) : 0;

    const pointsPerMatch =
      playedMatches > 0 ? Number((points / playedMatches).toFixed(2)) : 0;

    const winRate =
      playedMatches > 0 ? Number(((wins / playedMatches) * 100).toFixed(1)) : 0;

    const recentFive = allClubMatches.slice(0, 5);
    const recentFiveResults = recentFive.map((m) => m.result);

    const computeStreak = (results) => {
      if (!results.length) return { label: "Sin racha", type: "neutral", count: 0 };

      const first = results[0];
      let count = 0;

      for (const item of results) {
        if (item === first) count += 1;
        else break;
      }

      if (first === "W") return { label: `${count} victoria(s) seguidas`, type: "win", count };
      if (first === "L") return { label: `${count} derrota(s) seguidas`, type: "loss", count };
      return { label: `${count} empate(s) seguidos`, type: "draw", count };
    };

    const streak = computeStreak(recentResults);

    const leaders = {
      scorer:
        [...memberRows].sort((a, b) => {
          if (b.goals !== a.goals) return b.goals - a.goals;
          if (b.assists !== a.assists) return b.assists - a.assists;
          return b.played - a.played;
        })[0] || null,

      assist:
        [...memberRows].sort((a, b) => {
          if (b.assists !== a.assists) return b.assists - a.assists;
          if (b.goals !== a.goals) return b.goals - a.goals;
          return b.played - a.played;
        })[0] || null,

      rating:
        [...memberRows]
          .filter((m) => Number(m.avgRating || 0) > 0)
          .sort((a, b) => {
            if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
            if (b.played !== a.played) return b.played - a.played;
            return b.contrib - a.contrib;
          })[0] || null,

      played:
        [...memberRows].sort((a, b) => {
          if (b.played !== a.played) return b.played - a.played;
          if (b.goals !== a.goals) return b.goals - a.goals;
          return b.assists - a.assists;
        })[0] || null,
    };

    const avgTeamRatingRows = memberRows.filter((m) => Number(m.avgRating || 0) > 0);
    const avgTeamRating =
      avgTeamRatingRows.length === 0
        ? 0
        : Number(
            (
              avgTeamRatingRows.reduce(
                (acc, row) => acc + Number(row.avgRating || 0),
                0
              ) / avgTeamRatingRows.length
            ).toFixed(2)
          );

    return {
      totalMembers,
      adminCount,
      captainCount,
      memberCount,
      playedMatches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
      avgGoalsFor,
      avgGoalsAgainst,
      avgTeamRating,
      pointsPerMatch,
      winRate,
      streak,
      leaders,
      recentResults,
      recentFiveResults,
      recentMatches: allClubMatches.slice(0, 8),
      recentFiveMatches: recentFive,
    };
  }, [members, matches, clubId]);

  if (!isAdminOrCaptain) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Club Analytics</h1>
          <p className="mt-3 text-sm text-slate-300">
            No autorizado. Solo admin o captain.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-slate-300">Cargando analítica del club...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* HEADER */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Vista ejecutiva
            </div>
            <h1 className="mt-2 text-2xl font-bold">Club Analytics</h1>
            <p className="mt-2 text-sm text-slate-300">
              Resumen global del rendimiento del club actual.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <InfoBadge label="Club ID" value={clubId} />
              <InfoBadge label="Rol actual" value={role} />
              <InfoBadge
                label="Permisos"
                value={isAdmin ? "Admin completo" : "Captain lectura"}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/home")}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            Volver a home
          </button>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}
      </div>

      {/* RESUMEN SUPERIOR */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Resumen superior
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <TopSummaryItem
              label="Puntos generados"
              value={analytics.points}
              tone="text-emerald-300"
            />
            <TopSummaryItem
              label="Diferencia de gol"
              value={analytics.goalDifference}
              tone={
                analytics.goalDifference >= 0
                  ? "text-sky-300"
                  : "text-red-300"
              }
            />
            <TopSummaryItem
              label="Rating medio plantel"
              value={analytics.avgTeamRating || "—"}
              tone="text-yellow-300"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickInfoCard label="PJ club" value={analytics.playedMatches} />
              <QuickInfoCard label="GF" value={analytics.goalsFor} />
              <QuickInfoCard label="GC" value={analytics.goalsAgainst} />
              <QuickInfoCard label="Prom. GF" value={analytics.avgGoalsFor} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Lectura competitiva
          </div>

          <div className="mt-4 space-y-3">
            <StatusRow label="Win rate" value={`${analytics.winRate}%`} good={analytics.winRate >= 50} />
            <StatusRow label="Puntos / partido" value={analytics.pointsPerMatch} good={analytics.pointsPerMatch >= 1.5} />
            <StatusRow
              label="Racha actual"
              value={analytics.streak.label}
              good={analytics.streak.type === "win"}
            />
            <StatusRow
              label="Prom. GC"
              value={analytics.avgGoalsAgainst}
              good={analytics.avgGoalsAgainst <= 1}
            />
          </div>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          label="Miembros"
          value={analytics.totalMembers}
          accent="from-sky-500/20 to-sky-700/10"
        />
        <KpiCard
          label="PJ"
          value={analytics.playedMatches}
          accent="from-emerald-500/20 to-emerald-700/10"
        />
        <KpiCard
          label="Victorias"
          value={analytics.wins}
          accent="from-green-500/20 to-green-700/10"
        />
        <KpiCard
          label="Empates"
          value={analytics.draws}
          accent="from-yellow-500/20 to-yellow-700/10"
        />
        <KpiCard
          label="Derrotas"
          value={analytics.losses}
          accent="from-red-500/20 to-red-700/10"
        />
        <KpiCard
          label="Puntos"
          value={analytics.points}
          accent="from-indigo-500/20 to-indigo-700/10"
        />
      </div>

      {/* FORMA RECIENTE */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Forma reciente del club</h2>
          <p className="mt-1 text-sm text-slate-400">
            Lectura rápida de los últimos 5 partidos del equipo.
          </p>
        </div>

        {analytics.recentFiveMatches.length === 0 ? (
          <EmptyState
            title="Sin forma reciente"
            text="El club aún no tiene partidos recientes registrados."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {analytics.recentFiveMatches.map((match) => (
              <ClubRecentMatchCard
                key={match.matchId}
                match={match}
                onOpen={() => navigate(`/matches/${match.matchId}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* LÍDERES */}
      <div className="grid gap-4 xl:grid-cols-4">
        <LeaderCard
          title="Máximo goleador"
          subtitle="Líder ofensivo"
          emoji="⚽"
          player={analytics.leaders.scorer}
          valueLabel="Goles"
          value={analytics.leaders.scorer?.goals || 0}
          accent="ring-yellow-500/20"
          onOpen={() =>
            analytics.leaders.scorer &&
            navigate(`/club/members-stats/${analytics.leaders.scorer.userId}`)
          }
        />

        <LeaderCard
          title="Máximo asistidor"
          subtitle="Generador principal"
          emoji="🎯"
          player={analytics.leaders.assist}
          valueLabel="Asist."
          value={analytics.leaders.assist?.assists || 0}
          accent="ring-sky-500/20"
          onOpen={() =>
            analytics.leaders.assist &&
            navigate(`/club/members-stats/${analytics.leaders.assist.userId}`)
          }
        />

        <LeaderCard
          title="Mejor rating"
          subtitle="Rendimiento medio más alto"
          emoji="⭐"
          player={analytics.leaders.rating}
          valueLabel="Rating"
          value={analytics.leaders.rating?.avgRating || "—"}
          accent="ring-indigo-500/20"
          onOpen={() =>
            analytics.leaders.rating &&
            navigate(`/club/members-stats/${analytics.leaders.rating.userId}`)
          }
        />

        <LeaderCard
          title="Más utilizado"
          subtitle="Jugador con más presencia"
          emoji="🛡️"
          player={analytics.leaders.played}
          valueLabel="PJ"
          value={analytics.leaders.played?.played || 0}
          accent="ring-emerald-500/20"
          onOpen={() =>
            analytics.leaders.played &&
            navigate(`/club/members-stats/${analytics.leaders.played.userId}`)
          }
        />
      </div>

      {/* ROLES */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Distribución del plantel</h2>
          <p className="mt-1 text-sm text-slate-400">
            Cómo se compone el club según roles actuales.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <RoleSummaryCard
            title="Admins"
            count={analytics.adminCount}
            colorClass="bg-sky-400"
            textClass="text-sky-300"
            max={analytics.totalMembers || 1}
          />
          <RoleSummaryCard
            title="Captains"
            count={analytics.captainCount}
            colorClass="bg-emerald-400"
            textClass="text-emerald-300"
            max={analytics.totalMembers || 1}
          />
          <RoleSummaryCard
            title="Members"
            count={analytics.memberCount}
            colorClass="bg-slate-400"
            textClass="text-slate-300"
            max={analytics.totalMembers || 1}
          />
        </div>
      </div>

      {/* ÚLTIMOS PARTIDOS */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Últimos partidos del club</h2>
            <p className="mt-1 text-sm text-slate-400">
              Resumen reciente del rendimiento competitivo del equipo.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
            Máximo mostrado: 8 partidos
          </div>
        </div>

        {analytics.recentMatches.length === 0 ? (
          <EmptyState
            title="Sin partidos todavía"
            text="El club aún no tiene partidos registrados."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-300">
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">Competición</th>
                  <th className="px-3 py-3">Partido</th>
                  <th className="px-3 py-3">GF</th>
                  <th className="px-3 py-3">GC</th>
                  <th className="px-3 py-3">Res.</th>
                  <th className="px-3 py-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {analytics.recentMatches.map((row) => (
                  <tr
                    key={row.matchId}
                    className="border-b border-white/5 align-top hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-4 text-slate-200">
                      {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-4 text-slate-200">{row.competition}</td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-slate-100">
                        {row.myClubName}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        vs {row.rivalClubName}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-emerald-300 font-semibold">
                      {row.gf}
                    </td>
                    <td className="px-3 py-4 text-red-300 font-semibold">
                      {row.ga}
                    </td>
                    <td className="px-3 py-4">
                      <ResultBadge result={row.result} />
                    </td>
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/matches/${row.matchId}`)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                      >
                        Ver partido
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* =====================================================
 * Helpers visuales
 * ===================================================== */

function InfoBadge({ label, value }) {
  return (
    <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-slate-300">
      <span className="text-slate-400">{label}:</span>{" "}
      <span className="text-slate-200">{value}</span>
    </div>
  );
}

function TopSummaryItem({ label, value, tone = "text-slate-100" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function QuickInfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function StatusRow({ label, value, good }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <div className="text-sm text-slate-300">{label}</div>
      <div
        className={`text-xs font-semibold ${
          good ? "text-emerald-300" : "text-yellow-300"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-5`}
    >
      <div className="text-sm text-slate-300">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function LeaderCard({
  title,
  subtitle,
  emoji,
  player,
  valueLabel,
  value,
  accent,
  onOpen,
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ${accent}`}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </div>
      <div className="mt-1 text-sm text-slate-300">{subtitle}</div>

      {!player ? (
        <div className="mt-5 text-sm text-slate-500">Sin datos todavía.</div>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/30 text-2xl">
              {emoji}
            </div>

            <div>
              <div className="font-semibold text-slate-100">
                {player.gamerTag || player.username}
              </div>
              <div className="text-xs text-slate-400">@{player.username}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniKpi label={valueLabel} value={value} />
            <MiniKpi label="Rol" value={player.role || "—"} />
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="mt-4 rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
          >
            Ver jugador
          </button>
        </>
      )}
    </div>
  );
}

function RoleSummaryCard({
  title,
  count,
  colorClass,
  textClass,
  max,
}) {
  const safeCount = Number(count || 0);
  const safeMax = Math.max(Number(max || 1), 1);
  const width = Math.max(0, Math.min(100, (safeCount / safeMax) * 100));

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-sm text-slate-300">{title}</div>
      <div className={`mt-2 text-3xl font-bold ${textClass}`}>{safeCount}</div>

      <div className="mt-3 h-2 w-full rounded-full bg-black/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MiniKpi({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function ResultBadge({ result }) {
  const map = {
    W: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    D: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    L: "border-red-500/20 bg-red-500/10 text-red-300",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
        map[result] || "border-white/10 bg-black/20 text-slate-300"
      }`}
    >
      {result || "—"}
    </span>
  );
}

function ClubRecentMatchCard({ match, onOpen }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          {match?.date ? new Date(match.date).toLocaleDateString() : "—"}
        </div>
        <ResultBadge result={match?.result} />
      </div>

      <div className="mt-3">
        <div className="font-semibold text-slate-100 truncate">
          {match?.myClubName}
        </div>
        <div className="text-xs text-slate-400 truncate">
          vs {match?.rivalClubName}
        </div>
      </div>

      <div className="mt-3 text-sm text-slate-300">
        {match?.gf} - {match?.ga}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniKpi label="GF" value={match?.gf ?? 0} />
        <MiniKpi label="GC" value={match?.ga ?? 0} />
        <MiniKpi label="Comp." value={match?.competition || "—"} />
        <MiniKpi label="Estado" value={match?.status || "—"} />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
      >
        Ver partido
      </button>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
      <div className="text-lg font-semibold text-slate-200">{title}</div>
      <div className="mt-2 text-sm text-slate-400">{text}</div>
    </div>
  );
}