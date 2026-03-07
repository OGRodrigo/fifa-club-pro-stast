// src/pages/MemberStats.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

export default function MemberStats() {
  const { clubContext } = useAuth();

  const clubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";

  const isAdminOrCaptain = useMemo(
    () => role === "admin" || role === "captain",
    [role]
  );

  const isAdmin = role === "admin";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [members, setMembers] = useState([]);
  const [rows, setRows] = useState([]);

  const [actionLoading, setActionLoading] = useState("");

  const loadData = async () => {
    if (!clubId) return;

    setLoading(true);
    setErr("");

    try {
      const memRes = await api.get(`/clubs/${clubId}/members`);
      const mems = Array.isArray(memRes.data?.members) ? memRes.data.members : [];
      setMembers(mems);

      const matchesRes = await api.get("/matches", { params: { limit: 100 } });
      const matches = Array.isArray(matchesRes.data?.data) ? matchesRes.data.data : [];

      const clubMatches = matches.filter((m) => {
        const home = (m.homeClub?._id || m.homeClub || "").toString();
        const away = (m.awayClub?._id || m.awayClub || "").toString();
        return home === clubId || away === clubId;
      });

      const computed = mems.map((m) => {
        const userId = (m.user?._id || m.user || "").toString();
        const username = m.user?.username || "—";
        const gamerTag = m.user?.gamerTag || "";
        const platform = m.user?.platform || "—";
        const country = m.user?.country || "—";
        const memberRole = m.role || "member";

        let played = 0;
        let goals = 0;
        let assists = 0;
        const ratings = [];

        for (const match of clubMatches) {
          const ps = Array.isArray(match.playerStats) ? match.playerStats : [];

          const row = ps.find((x) => {
            const uid = (x.user?._id || x.user || "").toString();
            return uid === userId;
          });

          if (!row) continue;

          played += 1;
          goals += Number(row.goals || 0);
          assists += Number(row.assists || 0);

          const rating = Number(row.rating || 0);
          if (!Number.isNaN(rating) && rating > 0) {
            ratings.push(rating);
          }
        }

        const avgRating =
          ratings.length === 0
            ? 0
            : Number(
                (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
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
      setErr(e?.response?.data?.message || e.message || "Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clubId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

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
      setErr(e?.response?.data?.message || e.message || "Error al actualizar rol");
    } finally {
      setActionLoading("");
    }
  };

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
      setErr(e?.response?.data?.message || e.message || "Error al eliminar miembro");
    } finally {
      setActionLoading("");
    }
  };

  const totalMembers = members.length;
  const totalPlayed = rows.reduce((acc, r) => acc + Number(r.played || 0), 0);
  const totalGoals = rows.reduce((acc, r) => acc + Number(r.goals || 0), 0);
  const totalAssists = rows.reduce((acc, r) => acc + Number(r.assists || 0), 0);

  const bestScorer = rows.length > 0 ? rows[0] : null;
  const bestAssist =
    [...rows].sort((a, b) => b.assists - a.assists || b.goals - a.goals)[0] || null;
  const mostPlayed =
    [...rows].sort((a, b) => b.played - a.played || b.goals - a.goals)[0] || null;

  if (!isAdminOrCaptain) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--fifa-text)]">
            Stats miembros
          </h1>
          <p className="mt-2 text-[var(--fifa-mute)]">
            No autorizado. Solo <span className="text-[var(--fifa-text)] font-semibold">admin</span> o{" "}
            <span className="text-[var(--fifa-text)] font-semibold">captain</span>.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--fifa-text)]">
              Estadísticas de miembros
            </h1>
            <p className="mt-2 text-[var(--fifa-mute)]">
              Resumen del plantel y gestión de miembros del club.
            </p>

            <div className="mt-3 text-sm text-[var(--fifa-mute)]">
              Club: <span className="font-semibold text-[var(--fifa-text)]">{clubId}</span>
              {" "}· Rol actual: <span className="font-semibold text-[var(--fifa-text)]">{role}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl bg-white/5 px-4 py-3 font-semibold text-[var(--fifa-text)] ring-1 ring-[var(--fifa-line)] hover:ring-[var(--fifa-cyan)]/30 hover:shadow-neon transition disabled:opacity-60"
          >
            {loading ? "Cargando..." : "Refrescar"}
          </button>
        </div>

        {err ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
            {err}
          </div>
        ) : null}
      </section>

      {/* KPIS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Miembros" value={totalMembers} accent="var(--fifa-cyan)" />
        <KpiCard label="PJ acumulados" value={totalPlayed} accent="var(--fifa-mute)" />
        <KpiCard label="Goles" value={totalGoals} accent="var(--fifa-neon)" />
        <KpiCard label="Asistencias" value={totalAssists} accent="var(--fifa-cyan)" />
      </section>

      {/* DESTACADOS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SpotlightCard
          title="Top goleador"
          subtitle="Máximo anotador actual"
          emoji="⚽"
          player={bestScorer}
          primaryLabel="Goles"
          primaryValue={bestScorer?.goals ?? 0}
          accent="var(--fifa-neon)"
        />

        <SpotlightCard
          title="Top asistencias"
          subtitle="Mayor generación ofensiva"
          emoji="🎯"
          player={bestAssist}
          primaryLabel="Asist."
          primaryValue={bestAssist?.assists ?? 0}
          accent="var(--fifa-cyan)"
        />

        <SpotlightCard
          title="Más participaciones"
          subtitle="Mayor presencia en cancha"
          emoji="🛡️"
          player={mostPlayed}
          primaryLabel="PJ"
          primaryValue={mostPlayed?.played ?? 0}
          accent="var(--fifa-mute)"
        />
      </section>

      {/* TABLA */}
      <section className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--fifa-line)]/70 bg-black/20">
          <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
            PLANTEL ({totalMembers})
          </div>
          <div className="text-sm text-[var(--fifa-mute)]">
            Rendimiento individual y administración de miembros
          </div>
        </div>

        <div className="p-5">
          {rows.length === 0 && !loading ? (
            <EmptyState
              title="Aún no hay estadísticas disponibles"
              text="Esto suele pasar cuando todavía no existen partidos con playerStats cargados para el club."
            />
          ) : (
            <div className="w-full">
              <table className="w-full table-fixed text-sm">
                <thead className="text-[var(--fifa-mute)]">
                  <tr className="border-b border-[var(--fifa-line)]/70">
                    <th className="w-[60px] py-3 pr-2 text-left">#</th>
                    <th className="w-[260px] py-3 pr-3 text-left">Jugador</th>
                    <th className="w-[120px] py-3 pr-3 text-left">Rol</th>
                    <th className="w-[70px] py-3 pr-2 text-right">PJ</th>
                    <th className="w-[70px] py-3 pr-2 text-right">G</th>
                    <th className="w-[70px] py-3 pr-2 text-right">A</th>
                    <th className="w-[90px] py-3 pr-2 text-right">Contrib.</th>
                    <th className="w-[180px] py-3 pr-3 text-left">Gestionar rol</th>
                    <th className="w-[70px] py-3 text-center">Acción</th>
                  </tr>
                </thead>

                <tbody className="text-[var(--fifa-text)]">
                  {rows.map((r, index) => {
                    const medal = getMedal(index);
                    const displayName = r.gamerTag || r.username || "Jugador";
                    const rowBusy =
                      actionLoading === `role-${r.userId}` ||
                      actionLoading === `remove-${r.userId}`;

                    return (
                      <tr
                        key={r.userId}
                        className={`border-b border-[var(--fifa-line)]/40 ${
                          index === 0 ? "bg-[rgba(0,255,194,0.05)]" : ""
                        }`}
                      >
                        <td className="py-4 pr-2">
                          <div className="flex items-center gap-1">
                            <span>{index + 1}</span>
                            {medal ? <span>{medal}</span> : null}
                          </div>
                        </td>

                        <td className="py-4 pr-3">
                          <div className="font-semibold truncate">{displayName}</div>
                          <div className="text-xs text-[var(--fifa-mute)] truncate">
                            @{r.username} · {r.platform} · Rating:{" "}
                            {r.avgRating ? r.avgRating : "—"}
                          </div>
                        </td>

                        <td className="py-4 pr-3 text-[var(--fifa-mute)]">{r.role}</td>
                        <td className="py-4 pr-2 text-right">{r.played}</td>
                        <td className="py-4 pr-2 text-right font-semibold text-[var(--fifa-neon)]">
                          {r.goals}
                        </td>
                        <td className="py-4 pr-2 text-right font-semibold text-[var(--fifa-cyan)]">
                          {r.assists}
                        </td>
                        <td className="py-4 pr-2 text-right">{r.contrib}</td>

                        <td className="py-4 pr-3">
                          <select
                            value={r.role}
                            disabled={!isAdmin || rowBusy}
                            onChange={(e) => handleRoleChange(r.userId, e.target.value)}
                            className="w-full rounded-xl bg-black/30 px-3 py-2 ring-1 ring-[var(--fifa-line)] text-[var(--fifa-text)] disabled:opacity-50"
                          >
                            <option value="member">member</option>
                            <option value="captain">captain</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>

                        <td className="py-4 text-center">
                          <button
                            type="button"
                            title="Eliminar miembro"
                            disabled={rowBusy}
                            onClick={() => handleRemoveMember(r.userId, displayName)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/20 text-base font-extrabold text-[var(--fifa-danger)] ring-1 ring-[var(--fifa-line)] hover:bg-[rgba(255,77,109,0.10)] hover:ring-[var(--fifa-danger)]/30 transition disabled:opacity-50"
                          >
                            {actionLoading === `remove-${r.userId}` ? "…" : "✕"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!isAdmin ? (
                <div className="mt-4 rounded-xl bg-black/20 ring-1 ring-[var(--fifa-line)] p-4 text-sm text-[var(--fifa-mute)]">
                  Como <span className="font-semibold text-[var(--fifa-text)]">captain</span> puedes revisar
                  estadísticas, pero el cambio de roles queda reservado para{" "}
                  <span className="font-semibold text-[var(--fifa-text)]">admin</span>.
                </div>
              ) : null}
            </div>
          )}
        </div>
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

function KpiCard({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-black/25 p-4 ring-1 ring-[var(--fifa-line)]">
      <div className="text-xs text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color: accent }}>
        {value}
      </div>
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
    <div className="rounded-2xl bg-fifa-card ring-1 ring-[var(--fifa-line)] shadow-glow p-5">
      <div className="text-xs font-semibold tracking-widest text-[var(--fifa-mute)]">
        {title.toUpperCase()}
      </div>
      <div className="mt-2 text-xs text-[var(--fifa-mute)]">{subtitle}</div>

      {!player ? (
        <div className="mt-4 text-sm text-[var(--fifa-mute)]">Sin datos todavía.</div>
      ) : (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-[rgba(0,255,194,0.08)] to-[rgba(0,0,0,0.10)] ring-1 ring-[var(--fifa-line)] p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-black/25 ring-1 ring-[var(--fifa-line)] flex items-center justify-center text-xl">
              {emoji}
            </div>

            <div className="min-w-0">
              <div className="truncate text-lg font-extrabold text-[var(--fifa-text)]">
                {player.gamerTag || player.username}
              </div>
              <div className="text-sm text-[var(--fifa-mute)]">@{player.username}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniKpi label={primaryLabel} value={primaryValue} accent={accent} />
            <MiniKpi label="PJ" value={player.played ?? 0} accent="var(--fifa-mute)" />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniKpi({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-black/25 p-3 ring-1 ring-[var(--fifa-line)]">
      <div className="text-[10px] tracking-widest text-[var(--fifa-mute)]">{label}</div>
      <div className="mt-1 text-lg font-extrabold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-2xl bg-black/20 ring-1 ring-[var(--fifa-line)] p-6">
      <div className="text-lg font-extrabold text-[var(--fifa-text)]">{title}</div>
      <div className="mt-2 text-sm text-[var(--fifa-mute)]">{text}</div>
    </div>
  );
}