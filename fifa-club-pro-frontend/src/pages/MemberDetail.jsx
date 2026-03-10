// src/pages/MemberDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

/**
 * =====================================================
 * MEMBER DETAIL
 * -----------------------------------------------------
 * Ficha individual del miembro dentro del club actual.
 *
 * Fuentes usadas:
 * - GET /clubs/:clubId/members
 * - GET /matches?limit=100
 *
 * No requiere backend nuevo.
 * =====================================================
 */
export default function MemberDetail() {
  const navigate = useNavigate();
  const { memberId } = useParams();
  const { clubContext } = useAuth();

  const clubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";

  const isAdmin = role === "admin";
  const isCaptain = role === "captain";
  const isAdminOrCaptain = isAdmin || isCaptain;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [member, setMember] = useState(null);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      if (!clubId || !memberId) return;

      try {
        setLoading(true);
        setErr("");

        const [membersRes, matchesRes] = await Promise.all([
          api.get(`/clubs/${clubId}/members`),
          api.get("/matches", { params: { limit: 100 } }),
        ]);

        if (!alive) return;

        const members = Array.isArray(membersRes.data?.members)
          ? membersRes.data.members
          : [];

        const selectedMember =
          members.find((m) => {
            const uid = (m?.user?._id || m?.user || "").toString();
            return uid === String(memberId);
          }) || null;

        if (!selectedMember) {
          setMember(null);
          setMatches([]);
          setErr("No se encontró el miembro en este club.");
          return;
        }

        const allMatches = Array.isArray(matchesRes.data?.data)
          ? matchesRes.data.data
          : [];

        const clubMatches = allMatches.filter((match) => {
          const home = (match?.homeClub?._id || match?.homeClub || "").toString();
          const away = (match?.awayClub?._id || match?.awayClub || "").toString();
          return home === clubId || away === clubId;
        });

        setMember(selectedMember);
        setMatches(clubMatches);
      } catch (e) {
        if (!alive) return;
        setErr(
          e?.response?.data?.message ||
            e.message ||
            "Error al cargar detalle del miembro"
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, [clubId, memberId]);

  const detail = useMemo(() => {
    if (!member) {
      return {
        userId: "",
        username: "—",
        gamerTag: "—",
        platform: "—",
        country: "—",
        role: "member",
        played: 0,
        goals: 0,
        assists: 0,
        contrib: 0,
        avgRating: 0,
        bestRating: 0,
        goalsPerMatch: 0,
        assistsPerMatch: 0,
        contribPerMatch: 0,
        recentAvgRating: 0,
        lastMatches: [],
      };
    }

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

    const playerMatches = [];

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

      const homeId = (match?.homeClub?._id || match?.homeClub || "").toString();
      const awayId = (match?.awayClub?._id || match?.awayClub || "").toString();

      const homeName = match?.homeClub?.name || "Home";
      const awayName = match?.awayClub?.name || "Away";

      const mySide =
        String(row?.club?._id || row?.club || "") === homeId
          ? "home"
          : String(row?.club?._id || row?.club || "") === awayId
          ? "away"
          : "";

      const myClubName =
        mySide === "home" ? homeName : mySide === "away" ? awayName : "Club";

      const rivalClubName =
        mySide === "home" ? awayName : mySide === "away" ? homeName : "Rival";

      playerMatches.push({
        matchId: match?._id,
        date: match?.date || null,
        competition: match?.competition || "League",
        status: match?.status || "played",
        myClubName,
        rivalClubName,
        scoreHome: Number(match?.scoreHome ?? 0),
        scoreAway: Number(match?.scoreAway ?? 0),
        goals: Number(row?.goals || 0),
        assists: Number(row?.assists || 0),
        rating: Number(row?.rating || 0),
        minutesPlayed: Number(row?.minutesPlayed || 0),
        isMVP: Boolean(row?.isMVP),
      });
    }

    const avgRating =
      ratings.length === 0
        ? 0
        : Number(
            (ratings.reduce((acc, current) => acc + current, 0) / ratings.length).toFixed(2)
          );

    const bestRating = ratings.length === 0 ? 0 : Math.max(...ratings);

    playerMatches.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    const recentMatches = playerMatches.slice(0, 5);
    const recentRatings = recentMatches
      .map((m) => Number(m.rating || 0))
      .filter((r) => r > 0);

    const recentAvgRating =
      recentRatings.length === 0
        ? 0
        : Number(
            (
              recentRatings.reduce((acc, current) => acc + current, 0) /
              recentRatings.length
            ).toFixed(2)
          );

    const contrib = goals + assists;

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
      contrib,
      avgRating,
      bestRating,
      goalsPerMatch: played > 0 ? Number((goals / played).toFixed(2)) : 0,
      assistsPerMatch: played > 0 ? Number((assists / played).toFixed(2)) : 0,
      contribPerMatch: played > 0 ? Number((contrib / played).toFixed(2)) : 0,
      recentAvgRating,
      lastMatches: playerMatches.slice(0, 8),
    };
  }, [member, matches]);

  if (!isAdminOrCaptain) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Detalle del miembro</h1>
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
          <div className="text-sm text-slate-300">Cargando detalle del miembro...</div>
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
              Ficha individual
            </div>

            <h1 className="mt-2 text-2xl font-bold">
              {detail.gamerTag || detail.username}
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Perfil estadístico del miembro dentro del club actual.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <InfoBadge label="Username" value={`@${detail.username}`} />
              <InfoBadge label="Plataforma" value={detail.platform} />
              <InfoBadge label="País" value={detail.country} />
              <InfoBadge label="Rol" value={detail.role} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/club/members-stats")}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
          >
            Volver a miembros
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
              label="Contribución total"
              value={detail.contrib}
              tone="text-emerald-300"
            />
            <TopSummaryItem
              label="Rating promedio"
              value={detail.avgRating || "—"}
              tone="text-sky-300"
            />
            <TopSummaryItem
              label="Forma reciente"
              value={detail.recentAvgRating || "—"}
              tone="text-yellow-300"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickInfoCard label="PJ" value={detail.played} />
              <QuickInfoCard label="Goles" value={detail.goals} />
              <QuickInfoCard label="Asistencias" value={detail.assists} />
              <QuickInfoCard label="Best RTG" value={detail.bestRating || "—"} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Eficiencia
          </div>

          <div className="mt-4 space-y-3">
            <StatusRow
              label="Goles / partido"
              value={detail.goalsPerMatch}
              good={detail.goalsPerMatch > 0}
            />
            <StatusRow
              label="Asist. / partido"
              value={detail.assistsPerMatch}
              good={detail.assistsPerMatch > 0}
            />
            <StatusRow
              label="Contrib. / partido"
              value={detail.contribPerMatch}
              good={detail.contribPerMatch > 0}
            />
            <StatusRow
              label="Partidos recientes"
              value={detail.lastMatches.length}
              good={detail.lastMatches.length > 0}
            />
          </div>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Partidos jugados"
          value={detail.played}
          accent="from-sky-500/20 to-sky-700/10"
        />
        <KpiCard
          label="Goles"
          value={detail.goals}
          accent="from-yellow-500/20 to-yellow-700/10"
        />
        <KpiCard
          label="Asistencias"
          value={detail.assists}
          accent="from-fuchsia-500/20 to-fuchsia-700/10"
        />
        <KpiCard
          label="Contribución"
          value={detail.contrib}
          accent="from-emerald-500/20 to-emerald-700/10"
        />
        <KpiCard
          label="Rating medio"
          value={detail.avgRating || "—"}
          accent="from-indigo-500/20 to-indigo-700/10"
        />
      </div>

      {/* DESTACADOS PERSONALES */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SpotlightCard
          title="Perfil ofensivo"
          subtitle="Peso directo en el marcador"
          emoji="⚽"
          player={{
            gamerTag: detail.gamerTag,
            username: detail.username,
            avgRating: detail.avgRating,
          }}
          primaryLabel="Contrib."
          primaryValue={detail.contrib}
          accent="ring-yellow-500/20"
        />

        <SpotlightCard
          title="Producción"
          subtitle="Balance goles y asistencias"
          emoji="🎯"
          player={{
            gamerTag: detail.gamerTag,
            username: detail.username,
            avgRating: detail.avgRating,
          }}
          primaryLabel="G+A"
          primaryValue={`${detail.goals} + ${detail.assists}`}
          accent="ring-sky-500/20"
        />

        <SpotlightCard
          title="Consistencia"
          subtitle="Rendimiento medio del jugador"
          emoji="⭐"
          player={{
            gamerTag: detail.gamerTag,
            username: detail.username,
            avgRating: detail.avgRating,
          }}
          primaryLabel="Best"
          primaryValue={detail.bestRating || "—"}
          accent="ring-indigo-500/20"
        />
      </div>

      {/* ÚLTIMOS PARTIDOS */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Últimos partidos</h2>
            <p className="mt-1 text-sm text-slate-400">
              Historial reciente del jugador dentro del club.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
            Máximo mostrado: 8 partidos
          </div>
        </div>

        {detail.lastMatches.length === 0 ? (
          <EmptyState
            title="Sin partidos todavía"
            text="Este miembro aún no tiene partidos registrados con stats en el club actual."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-300">
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">Competición</th>
                  <th className="px-3 py-3">Partido</th>
                  <th className="px-3 py-3">Marcador</th>
                  <th className="px-3 py-3">G</th>
                  <th className="px-3 py-3">A</th>
                  <th className="px-3 py-3">Rating</th>
                  <th className="px-3 py-3">Min</th>
                  <th className="px-3 py-3">MVP</th>
                  <th className="px-3 py-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {detail.lastMatches.map((row) => {
                  const dateLabel = row.date
                    ? new Date(row.date).toLocaleDateString()
                    : "—";

                  return (
                    <tr
                      key={row.matchId}
                      className="border-b border-white/5 align-top hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-4 text-slate-200">{dateLabel}</td>
                      <td className="px-3 py-4 text-slate-200">{row.competition}</td>
                      <td className="px-3 py-4">
                        <div className="font-medium text-slate-100">
                          {row.myClubName}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          vs {row.rivalClubName}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-slate-200">
                        {row.scoreHome} - {row.scoreAway}
                      </td>
                      <td className="px-3 py-4 text-yellow-300 font-semibold">
                        {row.goals}
                      </td>
                      <td className="px-3 py-4 text-sky-300 font-semibold">
                        {row.assists}
                      </td>
                      <td className="px-3 py-4 text-slate-200">
                        {row.rating || "—"}
                      </td>
                      <td className="px-3 py-4 text-slate-200">
                        {row.minutesPlayed}
                      </td>
                      <td className="px-3 py-4 text-slate-200">
                        {row.isMVP ? "🏆" : "—"}
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
                  );
                })}
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

function SpotlightCard({
  title,
  subtitle,
  emoji,
  player,
  primaryLabel,
  primaryValue,
  accent,
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
            <MiniKpi label={primaryLabel} value={primaryValue} />
            <MiniKpi label="Rating" value={player.avgRating || "—"} />
          </div>
        </>
      )}
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

function EmptyState({ title, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
      <div className="text-lg font-semibold text-slate-200">{title}</div>
      <div className="mt-2 text-sm text-slate-400">{text}</div>
    </div>
  );
}