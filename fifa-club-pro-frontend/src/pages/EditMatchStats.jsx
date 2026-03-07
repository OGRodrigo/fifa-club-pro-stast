import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

/**
 * EditMatchStats
 * - Carga un partido
 * - Permite editar playerStats
 * - Guarda usando la ruta segura:
 *   PATCH /matches/:id/clubs/:clubId/player-stats
 */
export default function EditMatchStats() {
  const { id } = useParams();
  const { clubContext } = useAuth();

  const myClubId = clubContext?.clubId || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [match, setMatch] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);

  // -----------------------------
  // Cargar match
  // -----------------------------
  useEffect(() => {
    let alive = true;

    async function loadMatch() {
      try {
        setLoading(true);
        setErr("");
        setOk("");

        const res = await api.get(`/matches/${id}/full`);
        if (!alive) return;

        const matchData = res.data;
        setMatch(matchData);

        const initialStats = Array.isArray(matchData?.playerStats)
          ? matchData.playerStats.map((ps) => ({
              user: ps?.user?._id || ps?.user || "",
              username: ps?.user?.username || "",
              gamerTag: ps?.user?.gamerTag || "",
              club: ps?.club?._id || ps?.club || "",
              goals: Number(ps?.goals || 0),
              assists: Number(ps?.assists || 0),
            }))
          : [];

        setPlayerStats(initialStats);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (id) {
      loadMatch();
    }

    return () => {
      alive = false;
    };
  }, [id]);

  // -----------------------------
  // Helpers
  // -----------------------------
  const clubChoices = useMemo(() => {
    if (!match) return [];

    return [
      {
        id: match?.homeClub?._id || match?.homeClub || "",
        label: match?.homeClub?.name || "Home",
      },
      {
        id: match?.awayClub?._id || match?.awayClub || "",
        label: match?.awayClub?.name || "Away",
      },
    ].filter((c) => c.id);
  }, [match]);

  const scoreHome = Number(match?.scoreHome || 0);
  const scoreAway = Number(match?.scoreAway || 0);

  const totals = useMemo(() => {
    const homeId = match?.homeClub?._id || match?.homeClub || "";
    const awayId = match?.awayClub?._id || match?.awayClub || "";

    const homeGoals = playerStats
      .filter((ps) => String(ps.club) === String(homeId))
      .reduce((acc, ps) => acc + Number(ps.goals || 0), 0);

    const awayGoals = playerStats
      .filter((ps) => String(ps.club) === String(awayId))
      .reduce((acc, ps) => acc + Number(ps.goals || 0), 0);

    return {
      homeGoals,
      awayGoals,
    };
  }, [playerStats, match]);

  const validationMessage = useMemo(() => {
    if (!match) return "";

    if (!myClubId) {
      return "No tienes club activo en sesión.";
    }

    if (totals.homeGoals !== scoreHome) {
      return `Los goles del Home (${totals.homeGoals}) no coinciden con el marcador (${scoreHome}).`;
    }

    if (totals.awayGoals !== scoreAway) {
      return `Los goles del Away (${totals.awayGoals}) no coinciden con el marcador (${scoreAway}).`;
    }

    return "";
  }, [match, myClubId, totals, scoreHome, scoreAway]);

  const setRow = (index, patch) => {
    setPlayerStats((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  // -----------------------------
  // Guardar
  // -----------------------------
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!match) {
      setErr("No se pudo cargar el partido.");
      return;
    }

    if (!myClubId) {
      setErr("No tienes club activo en sesión.");
      return;
    }

    if (validationMessage) {
      setErr(validationMessage);
      return;
    }

    const payload = playerStats
      .filter((ps) => ps.user && ps.club)
      .map((ps) => ({
        user: ps.user,
        club: ps.club,
        goals: Number(ps.goals || 0),
        assists: Number(ps.assists || 0),
      }));

    try {
      setSaving(true);

      await api.patch(`/matches/${id}/clubs/${myClubId}/player-stats`, {
        strictTotals: true,
        playerStats: payload,
      });

      setOk("✅ playerStats actualizados correctamente.");
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message);
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  if (loading) {
    return <div className="p-4">Cargando partido...</div>;
  }

  if (!match) {
    return (
      <div className="p-4 text-red-400">
        No se pudo cargar la información del partido.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editar Player Stats</h1>
        <p className="text-sm opacity-80">
          Ajusta goles y asistencias del partido.
        </p>
      </div>

      <div className="rounded-2xl border p-4 space-y-2">
        <div>
          <strong>Partido:</strong>{" "}
          {match?.homeClub?.name || "Home"} vs {match?.awayClub?.name || "Away"}
        </div>
        <div>
          <strong>Marcador:</strong> {scoreHome} - {scoreAway}
        </div>
        <div>
          <strong>Fecha:</strong> {match?.date}
        </div>
        <div>
          <strong>Estadio:</strong> {match?.stadium}
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {err}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm">
          {ok}
        </div>
      ) : null}

      {!err && validationMessage ? (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
          {validationMessage}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="rounded-2xl border p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Jugador</th>
                <th className="p-2">Club</th>
                <th className="p-2">Goles</th>
                <th className="p-2">Asistencias</th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((ps, index) => (
                <tr key={`${ps.user}-${index}`} className="border-b">
                  <td className="p-2">
                    {ps.gamerTag || ps.username || "Jugador"}
                  </td>

                  <td className="p-2">
                    <select
                      value={ps.club}
                      onChange={(e) =>
                        setRow(index, { club: e.target.value })
                      }
                      className="rounded-lg border bg-transparent p-2"
                    >
                      <option value="">Selecciona club</option>
                      {clubChoices.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      value={ps.goals}
                      onChange={(e) =>
                        setRow(index, {
                          goals: Number(e.target.value || 0),
                        })
                      }
                      className="w-24 rounded-lg border bg-transparent p-2"
                    />
                  </td>

                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      value={ps.assists}
                      onChange={(e) =>
                        setRow(index, {
                          assists: Number(e.target.value || 0),
                        })
                      }
                      className="w-24 rounded-lg border bg-transparent p-2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || !!validationMessage}
            className="rounded-xl border px-4 py-2 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Player Stats"}
          </button>

          <div className="text-sm opacity-80">
            Totales actuales: Home {totals.homeGoals} / Away {totals.awayGoals}
          </div>
        </div>
      </form>
    </div>
  );
}