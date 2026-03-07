import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

/**
 * CreateMatch (versión alineada con backend seguro)
 * - POST   /matches/clubs/:clubId
 * - PATCH  /matches/:id/clubs/:clubId/player-stats
 *
 * Roster real:
 * - GET /clubs/:clubId/members
 *
 * Reglas importantes:
 * - playerStats.club debe ser homeClub o awayClub
 * - el club autenticado debe venir en la ruta segura
 */
export default function CreateMatch() {
  const { clubContext } = useAuth();
  const clubContextId = clubContext?.clubId || "";

  // Clubs
  const [clubs, setClubs] = useState([]);
  const [clubsErr, setClubsErr] = useState("");

  // Roster
  const [roster, setRoster] = useState([]);
  const [rosterErr, setRosterErr] = useState("");

  // Form match
  const [homeClub, setHomeClub] = useState("");
  const [awayClub, setAwayClub] = useState("");
  const [date, setDate] = useState("");
  const [stadium, setStadium] = useState("");
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);

  // Stats
  const [playerStats, setPlayerStats] = useState([]);

  // UI
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [createdId, setCreatedId] = useState("");

  // ------------------------------
  // Cargar clubs
  // ------------------------------
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

  // ------------------------------
  // Cargar roster real desde members
  // ------------------------------
  useEffect(() => {
    let alive = true;

    async function fetchMembersAsPlayers(clubId) {
      const res = await api.get(`/clubs/${clubId}/members`);
      const members = Array.isArray(res.data?.members) ? res.data.members : [];

      return members
        .map((m) => {
          const u = m?.user;
          if (!u?._id) return null;

          return {
            _id: u._id,
            username: u.username || "unknown",
            gamerTag: u.gamerTag || "",
            defaultClub: clubId,
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

        const combined = [...homePlayers, ...awayPlayers];

        if (!alive) return;

        setRoster(combined);

        setPlayerStats(
          combined.map((p) => ({
            user: p._id,
            club: p.defaultClub,
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

  // ------------------------------
  // Helpers
  // ------------------------------
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

  // ------------------------------
  // Submit
  // ------------------------------
  const onSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit) return;

    if (!clubContextId) {
      setErr("No tienes club activo en sesión.");
      return;
    }

    setSaving(true);
    setErr("");
    setCreatedId("");

    try {
      // 1) Crear match por ruta segura
      const createRes = await api.post(`/matches/clubs/${clubContextId}`, {
        homeClub,
        awayClub,
        date,
        stadium,
        scoreHome: Number(scoreHome),
        scoreAway: Number(scoreAway),
        playerStats: [],
      });

      const matchId = createRes.data?._id;
      if (!matchId) {
        throw new Error("No se recibió _id del match creado");
      }

      // 2) Guardar stats por ruta segura
      const cleanedStats = Array.isArray(playerStats)
        ? playerStats
            .filter((ps) => ps.user && ps.club)
            .map((ps) => ({
              user: ps.user,
              club: ps.club,
              goals: Number(ps.goals || 0),
              assists: Number(ps.assists || 0),
            }))
        : [];

      await api.patch(`/matches/${matchId}/clubs/${clubContextId}/player-stats`, {
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
      <div>
        <h1 className="text-2xl font-bold">Crear Partido</h1>
        <p className="text-sm opacity-80">
          Crea el match y registra goles/asistencias por jugador.
        </p>
      </div>

      {clubsErr ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          Error clubs: {clubsErr}
        </div>
      ) : null}

      {rosterErr ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          Error roster: {rosterErr}
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {err}
        </div>
      ) : null}

      {createdId ? (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm">
          ✅ Match creado y stats guardados. ID: {createdId}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Home Club">
            <select
              value={homeClub}
              onChange={(e) => setHomeClub(e.target.value)}
              className="w-full rounded-xl border bg-transparent p-2"
            >
              <option value="">Selecciona club</option>
              {clubOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Away Club">
            <select
              value={awayClub}
              onChange={(e) => setAwayClub(e.target.value)}
              className="w-full rounded-xl border bg-transparent p-2"
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
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border bg-transparent p-2"
            />
          </Field>

          <Field label="Estadio">
            <input
              value={stadium}
              onChange={(e) => setStadium(e.target.value)}
              placeholder="Estadio Nacional"
              className="w-full rounded-xl border bg-transparent p-2"
            />
          </Field>

          <Field label="Score Home">
            <input
              type="number"
              min="0"
              value={scoreHome}
              onChange={(e) => setScoreHome(e.target.value)}
              className="w-full rounded-xl border bg-transparent p-2"
            />
          </Field>

          <Field label="Score Away">
            <input
              type="number"
              min="0"
              value={scoreAway}
              onChange={(e) => setScoreAway(e.target.value)}
              className="w-full rounded-xl border bg-transparent p-2"
            />
          </Field>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">PLAYER STATS</h2>
          <p className="text-sm opacity-80">
            Roster real cargado desde /clubs/:id/members.
          </p>

          <PlayerStatsEditor
            roster={roster}
            homeClubId={homeClub}
            awayClubId={awayClub}
            clubFallbackId={clubContextId}
            value={playerStats}
            onChange={setPlayerStats}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="rounded-xl border px-4 py-2 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Crear Partido + Guardar Stats"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </label>
  );
}

function PlayerStatsEditor({
  roster,
  homeClubId,
  awayClubId,
  clubFallbackId,
  value,
  onChange,
}) {
  const rows = Array.isArray(value) ? value : [];

  const setRow = (userId, patch) => {
    const next = rows.map((r) => (r.user === userId ? { ...r, ...patch } : r));
    onChange(next);
  };

  if (!roster || roster.length === 0) {
    return (
      <div className="rounded-xl border p-3 text-sm opacity-80">
        Selecciona home/away para cargar roster real.
      </div>
    );
  }

  const clubChoices = [
    { id: homeClubId, label: "Home" },
    { id: awayClubId, label: "Away" },
  ].filter((c) => !!c.id);

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Jugador</th>
            <th className="p-2">Club</th>
            <th className="p-2">Goles</th>
            <th className="p-2">Asist</th>
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
              <tr key={p._id} className="border-b">
                <td className="p-2">{p.gamerTag || p.username}</td>
                <td className="p-2">
                  <select
                    value={r.club}
                    onChange={(e) => setRow(p._id, { club: e.target.value })}
                    className="rounded-lg border bg-transparent p-2"
                  >
                    <option value="">—</option>
                    {clubChoices.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    value={r.goals}
                    onChange={(e) =>
                      setRow(p._id, { goals: Number(e.target.value || 0) })
                    }
                    className="w-24 rounded-lg border bg-transparent p-2"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    value={r.assists}
                    onChange={(e) =>
                      setRow(p._id, { assists: Number(e.target.value || 0) })
                    }
                    className="w-24 rounded-lg border bg-transparent p-2"
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