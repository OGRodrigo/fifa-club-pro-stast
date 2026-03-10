// src/pages/MemberStats.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

/**
 * =====================================================
 * MEMBER STATS
 * -----------------------------------------------------
 * Vista de estadísticas del plantel + gestión de miembros
 *
 * Reglas de backend ya existentes:
 * - admin: puede ver, cambiar rol y eliminar miembro
 * - captain: puede ver estadísticas, pero NO cambiar rol ni eliminar
 * - member: no autorizado para esta vista
 *
 * Rutas usadas:
 * - GET    /clubs/:clubId/members
 * - GET    /matches?limit=100
 * - PUT    /clubs/:clubId/members/:userId/role
 * - DELETE /clubs/:clubId/members/:userId
 * =====================================================
 */
export default function MemberStats() {
  const navigate = useNavigate();
  const { clubContext } = useAuth();

  const clubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";

  const isAdmin = role === "admin";
  const isCaptain = role === "captain";
  const isAdminOrCaptain = useMemo(
    () => isAdmin || isCaptain,
    [isAdmin, isCaptain]
  );

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [members, setMembers] = useState([]);
  const [rows, setRows] = useState([]);

  /**
   * actionLoading guarda una acción puntual:
   * - role-<userId>
   * - remove-<userId>
   * así evitamos bloquear toda la tabla.
   */
  const [actionLoading, setActionLoading] = useState("");

  /**
   * UI state para búsqueda / filtro / orden
   */
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("goals");

  /**
   * -----------------------------------------------------
   * Carga:
   * 1) miembros del club
   * 2) partidos
   * 3) calcula stats por jugador del club
   * -----------------------------------------------------
   */
  const loadData = async () => {
    if (!clubId) {
      setMembers([]);
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      setErr("");

      const memRes = await api.get(`/clubs/${clubId}/members`);
      const mems = Array.isArray(memRes.data?.members) ? memRes.data.members : [];
      setMembers(mems);

      const matchesRes = await api.get("/matches", {
        params: { limit: 100 },
      });

      const matches = Array.isArray(matchesRes.data?.data)
        ? matchesRes.data.data
        : [];

      const clubMatches = matches.filter((match) => {
        const home = (match?.homeClub?._id || match?.homeClub || "").toString();
        const away = (match?.awayClub?._id || match?.awayClub || "").toString();
        return home === clubId || away === clubId;
      });

      const computed = mems.map((member) => {
        const userId = (member?.user?._id || member?.user || "").toString();

        const username = member?.user?.username || "—";
        const gamerTag = member?.user?.gamerTag || "";
        const platform = member?.user?.platform || "—";
        const country = member?.user?.country || "—";
        const memberRole = member?.role || "member";

        let played = 0;
        let goals = 0;
        let assists = 0;
        const ratings = [];

        for (const match of clubMatches) {
          const ps = Array.isArray(match?.playerStats) ? match.playerStats : [];

          const playerRow = ps.find((row) => {
            const uid = (row?.user?._id || row?.user || "").toString();
            return uid === userId;
          });

          if (!playerRow) continue;

          played += 1;
          goals += Number(playerRow?.goals || 0);
          assists += Number(playerRow?.assists || 0);

          const rating = Number(playerRow?.rating || 0);
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
        };
      });

      computed.sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        return b.played - a.played;
      });

      setRows(computed);
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e.message ||
          "Error al cargar estadísticas"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clubId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  /**
   * -----------------------------------------------------
   * Cambiar rol
   * -----------------------------------------------------
   */
  const handleRoleChange = async (userId, newRole) => {
    if (!clubId || !userId) return;

    try {
      setErr("");
      setActionLoading(`role-${userId}`);

      await api.put(`/clubs/${clubId}/members/${userId}/role`, {
        role: newRole,
      });

      await loadData();
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e.message ||
          "Error al actualizar rol"
      );
    } finally {
      setActionLoading("");
    }
  };

  /**
   * -----------------------------------------------------
   * Eliminar miembro
   * -----------------------------------------------------
   */
  const handleRemoveMember = async (userId, displayName) => {
    if (!clubId || !userId) return;

    const ok = window.confirm(
      `¿De verdad deseas eliminar miembro "${displayName}" del club?`
    );
    if (!ok) return;

    try {
      setErr("");
      setActionLoading(`remove-${userId}`);

      await api.delete(`/clubs/${clubId}/members/${userId}`);

      await loadData();
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e.message ||
          "Error al eliminar miembro"
      );
    } finally {
      setActionLoading("");
    }
  };

  /**
   * -----------------------------------------------------
   * KPIs y destacados
   * -----------------------------------------------------
   */
  const stats = useMemo(() => {
    const totalMembers = members.length;
    const totalPlayed = rows.reduce(
      (acc, row) => acc + Number(row.played || 0),
      0
    );
    const totalGoals = rows.reduce(
      (acc, row) => acc + Number(row.goals || 0),
      0
    );
    const totalAssists = rows.reduce(
      (acc, row) => acc + Number(row.assists || 0),
      0
    );

    const avgTeamRatingRows = rows.filter((r) => Number(r.avgRating || 0) > 0);
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

    const bestScorer = rows.length > 0 ? rows[0] : null;

    const bestAssist =
      [...rows].sort((a, b) => {
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (b.goals !== a.goals) return b.goals - a.goals;
        return b.played - a.played;
      })[0] || null;

    const mostPlayed =
      [...rows].sort((a, b) => {
        if (b.played !== a.played) return b.played - a.played;
        if (b.goals !== a.goals) return b.goals - a.goals;
        return b.assists - a.assists;
      })[0] || null;

    const bestRated =
      [...rows]
        .filter((r) => Number(r.avgRating || 0) > 0)
        .sort((a, b) => {
          if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
          if (b.played !== a.played) return b.played - a.played;
          return b.contrib - a.contrib;
        })[0] || null;

    const maxContrib = rows.reduce(
      (acc, row) => Math.max(acc, Number(row.contrib || 0)),
      0
    );

    return {
      totalMembers,
      totalPlayed,
      totalGoals,
      totalAssists,
      avgTeamRating,
      bestScorer,
      bestAssist,
      mostPlayed,
      bestRated,
      maxContrib,
    };
  }, [members.length, rows]);

  /**
   * -----------------------------------------------------
   * Filtrado y orden dinámico
   * -----------------------------------------------------
   */
  const filteredRows = useMemo(() => {
    const searchNormalized = search.trim().toLowerCase();

    let result = [...rows];

    if (roleFilter !== "all") {
      result = result.filter((row) => row.role === roleFilter);
    }

    if (searchNormalized) {
      result = result.filter((row) => {
        const haystack = [
          row.gamerTag,
          row.username,
          row.platform,
          row.country,
          row.role,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchNormalized);
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name": {
          const aName = (a.gamerTag || a.username || "").toLowerCase();
          const bName = (b.gamerTag || b.username || "").toLowerCase();
          return aName.localeCompare(bName);
        }

        case "assists":
          if (b.assists !== a.assists) return b.assists - a.assists;
          if (b.goals !== a.goals) return b.goals - a.goals;
          return b.played - a.played;

        case "played":
          if (b.played !== a.played) return b.played - a.played;
          if (b.goals !== a.goals) return b.goals - a.goals;
          return b.assists - a.assists;

        case "contrib":
          if (b.contrib !== a.contrib) return b.contrib - a.contrib;
          if (b.goals !== a.goals) return b.goals - a.goals;
          return b.assists - a.assists;

        case "rating":
          if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
          if (b.played !== a.played) return b.played - a.played;
          return b.contrib - a.contrib;

        case "goals":
        default:
          if (b.goals !== a.goals) return b.goals - a.goals;
          if (b.assists !== a.assists) return b.assists - a.assists;
          return b.played - a.played;
      }
    });

    return result;
  }, [rows, search, roleFilter, sortBy]);

  /**
   * -----------------------------------------------------
   * Guard de permisos
   * -----------------------------------------------------
   */
  if (!isAdminOrCaptain) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Stats miembros</h1>
          <p className="mt-3 text-sm text-slate-300">
            No autorizado. Solo admin o captain.
          </p>
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
              Panel de plantel
            </div>

            <h1 className="mt-2 text-2xl font-bold">
              Estadísticas de miembros
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Resumen del rendimiento del plantel y gestión de miembros del club.
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
            onClick={loadData}
            disabled={loading}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Refrescar"}
          </button>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}
      </div>

      {/* RESUMEN SUPERIOR */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Resumen superior
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <TopSummaryItem
              label="Jugador referencia"
              value={
                stats.bestScorer
                  ? stats.bestScorer.gamerTag || stats.bestScorer.username
                  : "—"
              }
              tone="text-yellow-300"
            />

            <TopSummaryItem
              label="Más partidos"
              value={
                stats.mostPlayed
                  ? stats.mostPlayed.gamerTag || stats.mostPlayed.username
                  : "—"
              }
              tone="text-emerald-300"
            />

            <TopSummaryItem
              label="Mejor rating"
              value={
                stats.bestRated
                  ? stats.bestRated.gamerTag || stats.bestRated.username
                  : "—"
              }
              tone="text-sky-300"
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickInfoCard label="Miembros" value={stats.totalMembers} />
            <QuickInfoCard label="PJ sumados" value={stats.totalPlayed} />
            <QuickInfoCard
              label="Contrib. total"
              value={stats.totalGoals + stats.totalAssists}
            />
            <QuickInfoCard
              label="Rating medio"
              value={stats.avgTeamRating || "—"}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Estado de gestión
          </div>

          <div className="mt-4 space-y-3">
            <StatusRow
              label="Cambio de rol"
              value={isAdmin ? "Disponible" : "Solo admin"}
              good={isAdmin}
            />
            <StatusRow
              label="Eliminar miembro"
              value={isAdmin ? "Disponible" : "Solo admin"}
              good={isAdmin}
            />
            <StatusRow
              label="Acceso a estadísticas"
              value="Disponible"
              good={true}
            />
            <StatusRow
              label="Carga actual"
              value={loading ? "Actualizando..." : "Lista"}
              good={!loading}
            />
          </div>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Miembros"
          value={stats.totalMembers}
          accent="from-sky-500/20 to-sky-700/10"
        />
        <KpiCard
          label="Partidos jugados (sumados)"
          value={stats.totalPlayed}
          accent="from-emerald-500/20 to-emerald-700/10"
        />
        <KpiCard
          label="Goles del plantel"
          value={stats.totalGoals}
          accent="from-yellow-500/20 to-yellow-700/10"
        />
        <KpiCard
          label="Asistencias del plantel"
          value={stats.totalAssists}
          accent="from-fuchsia-500/20 to-fuchsia-700/10"
        />
        <KpiCard
          label="Rating medio"
          value={stats.avgTeamRating || "—"}
          accent="from-indigo-500/20 to-indigo-700/10"
        />
      </div>

      {/* DESTACADOS */}
      <div className="grid gap-4 xl:grid-cols-4">
        <SpotlightCard
          title="Goleador"
          subtitle="Jugador con más goles"
          emoji="⚽"
          player={stats.bestScorer}
          primaryLabel="Goles"
          primaryValue={stats.bestScorer?.goals || 0}
          accent="ring-yellow-500/20"
        />

        <SpotlightCard
          title="Asistidor"
          subtitle="Jugador con más asistencias"
          emoji="🎯"
          player={stats.bestAssist}
          primaryLabel="Asistencias"
          primaryValue={stats.bestAssist?.assists || 0}
          accent="ring-sky-500/20"
        />

        <SpotlightCard
          title="Más utilizado"
          subtitle="Jugador con más partidos"
          emoji="🛡️"
          player={stats.mostPlayed}
          primaryLabel="PJ"
          primaryValue={stats.mostPlayed?.played || 0}
          accent="ring-emerald-500/20"
        />

        <SpotlightCard
          title="Mejor rating"
          subtitle="Promedio más alto"
          emoji="⭐"
          player={stats.bestRated}
          primaryLabel="Rating"
          primaryValue={stats.bestRated?.avgRating || "—"}
          accent="ring-indigo-500/20"
        />
      </div>

      {/* FILTROS */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Búsqueda y filtros
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Buscar</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="gamerTag, username, plataforma, país..."
              className="w-full rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Filtrar por rol</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10 text-slate-100"
            >
              <option value="all">all</option>
              <option value="admin">admin</option>
              <option value="captain">captain</option>
              <option value="member">member</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Ordenar por</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10 text-slate-100"
            >
              <option value="goals">goles</option>
              <option value="assists">asistencias</option>
              <option value="played">partidos</option>
              <option value="contrib">contribución</option>
              <option value="rating">rating</option>
              <option value="name">nombre</option>
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-sm text-slate-300">Resultados</span>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-slate-200">
              {filteredRows.length}
            </div>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              Plantel filtrado ({filteredRows.length})
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Rendimiento individual y administración de miembros.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
            Orden activo: {sortBy}
          </div>
        </div>

        {filteredRows.length === 0 && !loading ? (
          <EmptyState
            title="Sin resultados"
            text="No hay miembros que coincidan con la búsqueda o los filtros seleccionados."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1440px] w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-300">
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Jugador</th>
                  <th className="px-3 py-3">Rol</th>
                  <th className="px-3 py-3">PJ</th>
                  <th className="px-3 py-3">G</th>
                  <th className="px-3 py-3">A</th>
                  <th className="px-3 py-3">Contrib.</th>
                  <th className="px-3 py-3">Barra contrib.</th>
                  <th className="px-3 py-3">Rating</th>
                  <th className="px-3 py-3">Barra rating</th>
                  <th className="px-3 py-3">Gestionar rol</th>
                  <th className="px-3 py-3">Detalle</th>
                  <th className="px-3 py-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((r, index) => {
                  const medal = getMedal(index);
                  const displayName = r.gamerTag || r.username || "Jugador";

                  const roleBusy = actionLoading === `role-${r.userId}`;
                  const removeBusy = actionLoading === `remove-${r.userId}`;
                  const rowBusy = roleBusy || removeBusy;

                  return (
                    <tr
                      key={r.userId}
                      className="border-b border-white/5 align-top hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-4 text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>{index + 1}</span>
                          {medal ? <span>{medal}</span> : null}
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <div className="font-medium text-slate-100">
                          {displayName}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          @{r.username} · {r.platform} · {r.country}
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <RolePill role={r.role} />
                      </td>

                      <td className="px-3 py-4 text-slate-200">{r.played}</td>

                      <td className="px-3 py-4">
                        <span className="font-semibold text-yellow-300">
                          {r.goals}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <span className="font-semibold text-sky-300">
                          {r.assists}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <span className="font-semibold text-emerald-300">
                          {r.contrib}
                        </span>
                      </td>

                      <td className="px-3 py-4 min-w-[170px]">
                        <ProgressBar
                          value={r.contrib}
                          max={stats.maxContrib || 1}
                          colorClass="bg-emerald-400"
                          textColorClass="text-emerald-300"
                        />
                      </td>

                      <td className="px-3 py-4 text-slate-200">
                        {r.avgRating ? r.avgRating : "—"}
                      </td>

                      <td className="px-3 py-4 min-w-[170px]">
                        <RatingBar value={r.avgRating} />
                      </td>

                      <td className="px-3 py-4">
                        {isAdmin ? (
                          <select
                            value={r.role}
                            disabled={rowBusy}
                            onChange={(e) =>
                              handleRoleChange(r.userId, e.target.value)
                            }
                            className="w-full rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10 text-slate-100 disabled:opacity-50"
                          >
                            <option value="member">member</option>
                            <option value="captain">captain</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                            Solo admin
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/club/members-stats/${r.userId}`)
                          }
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                        >
                          Ver detalle
                        </button>
                      </td>

                      <td className="px-3 py-4">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveMember(r.userId, displayName)
                            }
                            disabled={rowBusy}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/30 text-base font-extrabold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                            title={`Eliminar a ${displayName}`}
                          >
                            {removeBusy ? "…" : "✕"}
                          </button>
                        ) : (
                          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                            Solo admin
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isAdmin ? (
          <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            Como captain puedes revisar estadísticas, pero el cambio de roles y
            la eliminación de miembros quedan reservados para admin.
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * =====================================================
 * Helpers visuales
 * =====================================================
 */

function getMedal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
}

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

function RolePill({ role }) {
  const styles = {
    admin: "border-sky-500/20 bg-sky-500/10 text-sky-200",
    captain: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    member: "border-white/10 bg-black/20 text-slate-200",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs capitalize border ${
        styles[role] || styles.member
      }`}
    >
      {role}
    </span>
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

function ProgressBar({
  value = 0,
  max = 1,
  colorClass = "bg-emerald-400",
  textColorClass = "text-slate-200",
}) {
  const safeValue = Number(value || 0);
  const safeMax = Math.max(Number(max || 1), 1);
  const width = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));

  return (
    <div className="space-y-1">
      <div className={`text-xs font-semibold ${textColorClass}`}>
        {safeValue}
      </div>
      <div className="h-2 w-full rounded-full bg-black/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function RatingBar({ value = 0 }) {
  const safeValue = Number(value || 0);
  const width = Math.max(0, Math.min(100, (safeValue / 10) * 100));

  let colorClass = "bg-slate-500";
  let textColorClass = "text-slate-300";

  if (safeValue >= 8) {
    colorClass = "bg-emerald-400";
    textColorClass = "text-emerald-300";
  } else if (safeValue >= 6.5) {
    colorClass = "bg-sky-400";
    textColorClass = "text-sky-300";
  } else if (safeValue > 0) {
    colorClass = "bg-yellow-400";
    textColorClass = "text-yellow-300";
  }

  return (
    <div className="space-y-1">
      <div className={`text-xs font-semibold ${textColorClass}`}>
        {safeValue || "—"}
      </div>
      <div className="h-2 w-full rounded-full bg-black/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
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