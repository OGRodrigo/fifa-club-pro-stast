// src/pages/MemberStats.jsx
import { useEffect, useMemo, useState } from "react";
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

      // 1) Miembros del club
      const memRes = await api.get(`/clubs/${clubId}/members`);
      const mems = Array.isArray(memRes.data?.members) ? memRes.data.members : [];
      setMembers(mems);

      // 2) Partidos
      // Se mantiene el patrón que ya venías usando:
      // traer matches y filtrar los que incluyen al club actual.
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

      // 3) Estadísticas por miembro
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

      // Orden principal:
      // 1) goles
      // 2) asistencias
      // 3) partidos jugados
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
   * Ojo: el backend solo lo permite a admin.
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
   * Ojo: el backend solo lo permite a admin.
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
  const totalMembers = members.length;
  const totalPlayed = rows.reduce((acc, row) => acc + Number(row.played || 0), 0);
  const totalGoals = rows.reduce((acc, row) => acc + Number(row.goals || 0), 0);
  const totalAssists = rows.reduce(
    (acc, row) => acc + Number(row.assists || 0),
    0
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

  /**
   * -----------------------------------------------------
   * Guard de permisos
   * -----------------------------------------------------
   * Mantiene tu criterio actual:
   * member no entra a esta pantalla.
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
            <h1 className="text-2xl font-bold">Estadísticas de miembros</h1>
            <p className="mt-2 text-sm text-slate-300">
              Resumen del plantel y gestión de miembros del club.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Club: <span className="font-medium text-slate-200">{clubId}</span>{" "}
              · Rol actual:{" "}
              <span className="font-medium text-slate-200">{role}</span>
            </p>
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

      {/* KPIS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Miembros"
          value={totalMembers}
          accent="from-sky-500/20 to-sky-700/10"
        />
        <KpiCard
          label="Partidos jugados (sumados)"
          value={totalPlayed}
          accent="from-emerald-500/20 to-emerald-700/10"
        />
        <KpiCard
          label="Goles del plantel"
          value={totalGoals}
          accent="from-yellow-500/20 to-yellow-700/10"
        />
        <KpiCard
          label="Asistencias del plantel"
          value={totalAssists}
          accent="from-fuchsia-500/20 to-fuchsia-700/10"
        />
      </div>

      {/* DESTACADOS */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SpotlightCard
          title="Goleador"
          subtitle="Jugador con más goles"
          emoji="⚽"
          player={bestScorer}
          primaryLabel="Goles"
          primaryValue={bestScorer?.goals || 0}
          accent="ring-yellow-500/20"
        />

        <SpotlightCard
          title="Asistidor"
          subtitle="Jugador con más asistencias"
          emoji="🎯"
          player={bestAssist}
          primaryLabel="Asistencias"
          primaryValue={bestAssist?.assists || 0}
          accent="ring-sky-500/20"
        />

        <SpotlightCard
          title="Más utilizado"
          subtitle="Jugador con más partidos"
          emoji="🛡️"
          player={mostPlayed}
          primaryLabel="PJ"
          primaryValue={mostPlayed?.played || 0}
          accent="ring-emerald-500/20"
        />
      </div>

      {/* TABLA */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Plantel ({totalMembers})</h2>
          <p className="mt-1 text-sm text-slate-400">
            Rendimiento individual y administración de miembros.
          </p>
        </div>

        {rows.length === 0 && !loading ? (
          <EmptyState
            title="Sin datos todavía"
            text="Todavía no hay miembros o no se encontraron estadísticas para este club."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-300">
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Jugador</th>
                  <th className="px-3 py-3">Rol</th>
                  <th className="px-3 py-3">PJ</th>
                  <th className="px-3 py-3">G</th>
                  <th className="px-3 py-3">A</th>
                  <th className="px-3 py-3">Contrib.</th>
                  <th className="px-3 py-3">Rating</th>
                  <th className="px-3 py-3">Gestionar rol</th>
                  <th className="px-3 py-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, index) => {
                  const medal = getMedal(index);
                  const displayName = r.gamerTag || r.username || "Jugador";

                  const roleBusy = actionLoading === `role-${r.userId}`;
                  const removeBusy = actionLoading === `remove-${r.userId}`;
                  const rowBusy = roleBusy || removeBusy;

                  return (
                    <tr
                      key={r.userId}
                      className="border-b border-white/5 align-top"
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
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-slate-200">
                          {r.role}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-slate-200">{r.played}</td>
                      <td className="px-3 py-4 text-slate-200">{r.goals}</td>
                      <td className="px-3 py-4 text-slate-200">{r.assists}</td>
                      <td className="px-3 py-4 text-slate-200">{r.contrib}</td>
                      <td className="px-3 py-4 text-slate-200">
                        {r.avgRating ? r.avgRating : "—"}
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
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ${accent}`}>
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