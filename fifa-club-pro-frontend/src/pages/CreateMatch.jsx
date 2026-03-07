// src/pages/CreateMatch.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

/**
 * CreateMatch (versión segura)
 * - POST /matches  (crea match SIN stats)
 * - PATCH /matches/:id/player-stats (guarda stats)
 *
 * Roster REAL:
 * - GET /clubs/:clubId/members  => { club, members: [{ user, role }] }
 *
 * IMPORTANTÍSIMO:
 * - playerStats.club debe ser homeClub o awayClub (tu backend lo valida).
 * - NO usamos clubContext como club del stat.
 */

export default function CreateMatch() {
  const { clubContext } = useAuth();
  const clubContextId = clubContext?.clubId; // solo para fallback de UI, no para stats

  // clubs
  const [clubs, setClubs] = useState([]);
  const [clubsErr, setClubsErr] = useState("");

  // roster
  const [roster, setRoster] = useState([]); // [{ _id, username, gamerTag, defaultClub }]
  const [rosterErr, setRosterErr] = useState("");

  // form match
  const [homeClub, setHomeClub] = useState("");
  const [awayClub, setAwayClub] = useState("");
  const [date, setDate] = useState("");
  const [stadium, setStadium] = useState("");
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);

  // stats
  const [playerStats, setPlayerStats] = useState([]);

  // UI
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [createdId, setCreatedId] = useState("");

  // --- carga clubs ---
  useEffect(() => {
    let alive = true;

    async function loadClubs() {
      try {
        setClubsErr("");
        const res = await api.get("/clubs");
        if (!alive) return;
        setClubs(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!alive) return;
        setClubsErr(e?.response?.data?.message || e.message);
      }
    }

    loadClubs();
    return () => {
      alive = false;
    };
  }, []);

  // --- carga roster REAL basado en home/away ---
  useEffect(() => {
    let alive = true;

    async function fetchMembersAsPlayers(clubId) {
      const res = await api.get(`/clubs/${clubId}/members`);
      const members = Array.isArray(res.data?.members) ? res.data.members : [];

      // members: [{ user: { _id, username, gamerTag }, role }]
      return members
        .map((m) => {
          const u = m?.user;
          if (!u?._id) return null;
          return {
            _id: u._id,
            username: u.username || "unknown",
            gamerTag: u.gamerTag || "",
            defaultClub: clubId, // ✅ club correcto para stats
          };
        })
        .filter(Boolean);
    }

    async function loadRoster() {
      try {
        setRosterErr("");
        setRoster([]);
        setPlayerStats([]);

        if (!homeClub || !awayClub) return;
        if (homeClub === awayClub) {
          setRosterErr("Home y Away no pueden ser el mismo club.");
          return;
        }

        const [homePlayers, awayPlayers] = await Promise.all([
          fetchMembersAsPlayers(homeClub),
          fetchMembersAsPlayers(awayClub),
        ]);

        // unir (permitimos mismo usuario en ambos clubes, pero no es común)
        const combined = [...homePlayers, ...awayPlayers];

        if (!alive) return;
        setRoster(combined);

        // inicializa playerStats basado en roster (club correcto por defecto)
        setPlayerStats(
          combined.map((p) => ({
            user: p._id,
            club: p.defaultClub, // ✅ homeClub o awayClub
            goals: 0,
            assists: 0,
          }))
        );
      } catch (e) {
        if (!alive) return;
        setRosterErr(e?.response?.data?.message || e.message);
      }
    }

    loadRoster();
    return () => {
      alive = false;
    };
  }, [homeClub, awayClub]);

  // helpers
  const clubOptions = useMemo(
    () => clubs.map((c) => ({ id: c._id, name: c.name })),
    [clubs]
  );

  const canSubmit =
    homeClub &&
    awayClub &&
    homeClub !== awayClub &&
    date &&
    stadium &&
    Number.isFinite(Number(scoreHome)) &&
    Number.isFinite(Number(scoreAway));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setErr("");
    setCreatedId("");

    try {
      // 1) crear match
      const createRes = await api.post("/matches", {
        homeClub,
        awayClub,
        date,
        stadium,
        scoreHome: Number(scoreHome),
        scoreAway: Number(scoreAway),
        playerStats: [], // ✅ no mandamos stats en create
      });

      const matchId = createRes.data?._id;
      if (!matchId) throw new Error("No se recibió _id del match creado");

      // 2) guardar stats
      const cleanedStats = Array.isArray(playerStats)
        ? playerStats
            .filter((ps) => ps.user && ps.club)
            .map((ps) => ({
              user: ps.user,
              club: ps.club, // ✅ debe ser home o away
              goals: Number(ps.goals || 0),
              assists: Number(ps.assists || 0),
            }))
        : [];

      await api.patch(`/matches/${matchId}/player-stats`, {
        strictTotals: true,
        playerStats: cleanedStats,
      });

      setCreatedId(matchId);
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-glow p-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--fifa-text)]">
          Crear Partido
        </h1>
        <p className="mt-1 text-[var(--fifa-mute)]">
          Crea el match y registra goles/asistencias por jugador.
        </p>

        {clubsErr ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
            Error clubs: {clubsErr}
          </div>
        ) : null}

        {rosterErr ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
            Error roster: {rosterErr}
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-danger)]/40 p-3 text-sm text-[var(--fifa-danger)]">
            {err}
          </div>
        ) : null}

        {createdId ? (
          <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-[var(--fifa-neon)]/40 p-3 text-sm text-[var(--fifa-text)]">
            ✅ Match creado y stats guardados. ID:{" "}
            <span className="text-[var(--fifa-neon)] font-semibold">{createdId}</span>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl bg-[var(--fifa-card)] ring-1 ring-[var(--fifa-line)] shadow-glow p-6 space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Local (homeClub)">
            <select
              className="w-full rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-3 text-[var(--fifa-text)]"
              value={homeClub}
              onChange={(e) => setHomeClub(e.target.value)}
            >
              <option value="">Selecciona club</option>
              {clubOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Visita (awayClub)">
            <select
              className="w-full rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-3 text-[var(--fifa-text)]"
              value={awayClub}
              onChange={(e) => setAwayClub(e.target.value)}
            >
              <option value="">Selecciona club</option>
              {clubOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fecha">
            <input
              type="date"
              className="w-full rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-3 text-[var(--fifa-text)]"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <Field label="Estadio">
            <input
              type="text"
              className="w-full rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-3 text-[var(--fifa-text)]"
              value={stadium}
              onChange={(e) => setStadium(e.target.value)}
              placeholder="Estadio Nacional"
            />
          </Field>

          <Field label="Marcador Local">
            <input
              type="number"
              min="0"
              className="w-full rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-3 text-[var(--fifa-text)]"
              value={scoreHome}
              onChange={(e) => setScoreHome(e.target.value)}
            />
          </Field>

          <Field label="Marcador Visita">
            <input
              type="number"
              min="0"
              className="w-full rounded-xl bg-black/30 ring-1 ring-[var(--fifa-line)] p-3 text-[var(--fifa-text)]"
              value={scoreAway}
              onChange={(e) => setScoreAway(e.target.value)}
            />
          </Field>
        </div>

        <div className="rounded-2xl bg-black/20 ring-1 ring-[var(--fifa-line)] p-4">
          <div className="text-xs font-semibold tracking-widest text-[var(--fifa-cyan)]">
            PLAYER STATS
          </div>
          <div className="text-sm text-[var(--fifa-mute)] mt-1">
            Roster real cargado desde <b>/clubs/:id/members</b>.
          </div>

          <div className="mt-4">
            <PlayerStatsEditor
              roster={roster}
              homeClubId={homeClub}
              awayClubId={awayClub}
              clubFallbackId={clubContextId}
              value={playerStats}
              onChange={setPlayerStats}
            />
          </div>
        </div>

        <button
          disabled={!canSubmit || saving}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold bg-[var(--fifa-blue)] text-white hover:opacity-90 active:opacity-80 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Crear Partido + Guardar Stats"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--fifa-mute)] mb-2">{label}</div>
      {children}
    </label>
  );
}

function PlayerStatsEditor({ roster, homeClubId, awayClubId, clubFallbackId, value, onChange }) {
  const rows = Array.isArray(value) ? value : [];

  const setRow = (userId, patch) => {
    const next = rows.map((r) => (r.user === userId ? { ...r, ...patch } : r));
    onChange(next);
  };

  if (!roster || roster.length === 0) {
    return (
      <div className="text-[var(--fifa-mute)] text-sm">
        Selecciona home/away para cargar roster real.
      </div>
    );
  }

  const clubChoices = [
    { id: homeClubId, label: "Home" },
    { id: awayClubId, label: "Away" },
  ].filter((c) => !!c.id);

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
            const r = rows.find((x) => x.user === p._id) || {
              user: p._id,
              club: p.defaultClub || clubFallbackId || homeClubId || awayClubId,
              goals: 0,
              assists: 0,
            };

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