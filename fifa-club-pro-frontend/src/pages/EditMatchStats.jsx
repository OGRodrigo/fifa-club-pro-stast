// src/pages/EditMatchStats.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useParams } from "react-router-dom";

/**
 * EditMatchStats
 * - GET /matches/:id/full (ya lo tienes en controller)
 * - PATCH /matches/:id/player-stats (nuevo)
 */
export default function EditMatchStats() {
  const { id } = useParams(); // route: /matches/:id/stats (ejemplo)
  const [match, setMatch] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr("");
        setOk("");

        const res = await api.get(`/matches/${id}/full`);
        if (!alive) return;

        setMatch(res.data);

        const ps = Array.isArray(res.data?.playerStats) ? res.data.playerStats : [];
        // normaliza a { user, club, goals, assists }
        setPlayerStats(
          ps.map((x) => ({
            user: x?.user?._id || x?.user,
            club: x?.club,
            goals: Number(x?.goals || 0),
            assists: Number(x?.assists || 0),
          }))
        );
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const homeClubId = match?.homeClub?._id;
  const awayClubId = match?.awayClub?._id;

  const roster = useMemo(() => {
    // En el match full, playerStats.user viene poblado si existía.
    // Pero si estaba vacío, no hay roster.
    // Por eso: roster = usuarios que aparezcan en playerStats (si no, queda vacío).
    const ps = Array.isArray(match?.playerStats) ? match.playerStats : [];
    const map = new Map();
    ps.forEach((x) => {
      const u = x?.user;
      const uid = u?._id || x?.user;
      if (!uid) return;
      if (!map.has(uid)) {
        map.set(uid, {
          _id: uid,
          username: u?.username || "unknown",
          gamerTag: u?.gamerTag || "",
        });
      }
    });
    return Array.from(map.values());
  }, [match]);

  const save = async () => {
    if (!match?._id) return;

    setSaving(true);
    setErr("");
    setOk("");

    try {
      const cleaned = Array.isArray(playerStats)
        ? playerStats
            .filter((ps) => ps.user && ps.club)
            .map((ps) => ({
              user: ps.user,
              club: ps.club,
              goals: Number(ps.goals || 0),
              assists: Number(ps.assists || 0),
            }))
        : [];

      await api.patch(`/matches/${match._id}/player-stats`, {
        strictTotals: true,
        playerStats: cleaned,
      });

      setOk("✅ Stats guardados correctamente.");
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-6 text-[var(--fifa-mute)]">
        Cargando match...
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
    <div className="space-y-6">
      <div className="rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-glow p-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--fifa-text)]">
          Editar Stats del Partido
        </h1>
        <p className="mt-1 text-[var(--fifa-mute)]">
          {match?.homeClub?.name} vs {match?.awayClub?.name} — {match?.scoreHome}-{match?.scoreAway}
        </p>

        {ok ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-neon)]/40 p-3 text-sm text-[var(--fifa-text)]">
            {ok}
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
            {err}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-glow p-6">
        <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">PLAYER STATS</div>
        <div className="text-sm text-[var(--fifa-mute)] mt-1">
          Se valida contra el marcador del partido.
        </div>

        <div className="mt-4">
          <StatsTable
            roster={roster}
            homeClubId={homeClubId}
            awayClubId={awayClubId}
            value={playerStats}
            onChange={setPlayerStats}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold bg-[var(--fifa-blue)] text-white hover:opacity-90 active:opacity-80 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar Stats"}
        </button>
      </div>
    </div>
  );
}

function StatsTable({ roster, homeClubId, awayClubId, value, onChange }) {
  const rows = Array.isArray(value) ? value : [];

  const setRow = (userId, patch) => {
    const exists = rows.some((r) => r.user === userId);
    const next = exists
      ? rows.map((r) => (r.user === userId ? { ...r, ...patch } : r))
      : [...rows, { user: userId, club: homeClubId || awayClubId, goals: 0, assists: 0, ...patch }];

    onChange(next);
  };

  const clubChoices = [
    { id: homeClubId, label: "Home" },
    { id: awayClubId, label: "Away" },
  ].filter((c) => !!c.id);

  if (!roster || roster.length === 0) {
    return (
      <div className="text-[var(--fifa-mute)] text-sm">
        Este match no tiene jugadores en playerStats todavía.
        <br />
        Para editar aquí, primero debes haber guardado al menos 1 fila en playerStats (o usar CreateMatch con roster conectado).
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl ring-1 ring-[var(--fifa-line)]">
      <table className="min-w-full text-sm fifa-table">
        <thead>
          <tr>
            <th>Jugador</th>
            <th className="num">Club</th>
            <th className="num">Goles</th>
            <th className="num">Asist</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((p) => {
            const r = rows.find((x) => x.user === p._id) || { user: p._id, club: homeClubId || awayClubId, goals: 0, assists: 0 };
            return (
              <tr key={p._id}>
                <td style={{ fontWeight: 700 }}>{p.gamerTag || p.username}</td>
                <td className="num">
                  <select
                    className="rounded-lg bg-black/30 ring-1 ring-[var(--fifa-line)] px-2 py-1 text-[var(--fifa-text)]"
                    value={r.club || ""}
                    onChange={(e) => setRow(p._id, { club: e.target.value })}
                  >
                    <option value="">—</option>
                    {clubChoices.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="num">
                  <input
                    type="number"
                    min="0"
                    className="w-20 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-line)] px-2 py-1 text-right text-[var(--fifa-text)]"
                    value={r.goals}
                    onChange={(e) => setRow(p._id, { goals: Number(e.target.value || 0) })}
                  />
                </td>
                <td className="num">
                  <input
                    type="number"
                    min="0"
                    className="w-20 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-line)] px-2 py-1 text-right text-[var(--fifa-text)]"
                    value={r.assists}
                    onChange={(e) => setRow(p._id, { assists: Number(e.target.value || 0) })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}