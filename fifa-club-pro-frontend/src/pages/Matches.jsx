// src/pages/Matches.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

/**
 * Crea una fila vacía de playerStats.
 * El club se completa con el lado seleccionado de MI club.
 */
const createEmptyPlayerStat = (clubId = "") => ({
  user: "",
  club: clubId,
  goals: 0,
  assists: 0,
});

/**
 * Estado inicial de edición de partido.
 */
const initialEditMatchState = {
  open: false,
  saving: false,
  matchId: "",
  homeClub: "",
  awayClub: "",
  date: "",
  stadium: "",
  scoreHome: 0,
  scoreAway: 0,
};

/**
 * Estado inicial de edición de estadísticas.
 */
const initialEditStatsState = {
  open: false,
  saving: false,
  matchId: "",
  myClubSideId: "",
  playerStats: [],
};

function formatDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

function formatDateView(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function normalizeClubLabel(club) {
  if (!club) return "Club";
  return `${club.name || "Club"}${club.country ? ` · ${club.country}` : ""}`;
}

function normalizeMemberLabel(member) {
  if (!member) return "Jugador";
  return `${member.gamerTag || member.username || "Jugador"}${
    member.platform ? ` · ${member.platform}` : ""
  }`;
}

export default function Matches() {
  const { clubContext } = useAuth();

  const myClubId = clubContext?.clubId || "";
  const myRole = clubContext?.role || "";
  const isAdmin = myRole === "admin";
  const isAdminOrCaptain = myRole === "admin" || myRole === "captain";

  // =========================
  // Base data
  // =========================
  const [clubs, setClubs] = useState([]);
  const [myMembers, setMyMembers] = useState([]);

  const [loadingBase, setLoadingBase] = useState(true);
  const [baseErr, setBaseErr] = useState("");

  // =========================
  // Matches list
  // =========================
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesErr, setMatchesErr] = useState("");

  // =========================
  // Create form
  // =========================
  const [homeClub, setHomeClub] = useState("");
  const [awayClub, setAwayClub] = useState("");
  const [date, setDate] = useState("");
  const [stadium, setStadium] = useState("");
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);
  const [playerStats, setPlayerStats] = useState([createEmptyPlayerStat("")]);

  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [formOk, setFormOk] = useState("");

  // =========================
  // Edit match
  // =========================
  const [editMatch, setEditMatch] = useState(initialEditMatchState);
  const [editMatchErr, setEditMatchErr] = useState("");
  const [editMatchOk, setEditMatchOk] = useState("");

  // =========================
  // Edit stats
  // =========================
  const [editStats, setEditStats] = useState(initialEditStatsState);
  const [editStatsErr, setEditStatsErr] = useState("");
  const [editStatsOk, setEditStatsOk] = useState("");

  // =========================
  // Derived maps
  // =========================
  const clubOptions = useMemo(() => {
    return clubs.map((club) => ({
      id: club._id,
      name: club.name || "",
      country: club.country || "",
      label: normalizeClubLabel(club),
    }));
  }, [clubs]);

  const clubMap = useMemo(() => {
    return clubOptions.reduce((acc, club) => {
      acc[club.id] = club;
      return acc;
    }, {});
  }, [clubOptions]);

  const memberOptions = useMemo(() => {
    return myMembers.map((member) => ({
      id: member.id,
      username: member.username || "",
      gamerTag: member.gamerTag || "",
      platform: member.platform || "",
      label: normalizeMemberLabel(member),
    }));
  }, [myMembers]);

  const memberMap = useMemo(() => {
    return memberOptions.reduce((acc, member) => {
      acc[member.id] = member;
      return acc;
    }, {});
  }, [memberOptions]);

  const myClubIsHome = Boolean(homeClub && myClubId && homeClub === myClubId);
  const myClubIsAway = Boolean(awayClub && myClubId && awayClub === myClubId);

  const myClubSelectedSideId = myClubIsHome
    ? homeClub
    : myClubIsAway
    ? awayClub
    : "";

  const matchIncludesMyClub =
    Boolean(myClubId) && (homeClub === myClubId || awayClub === myClubId);

  const canSubmit =
    isAdminOrCaptain &&
    Boolean(homeClub) &&
    Boolean(awayClub) &&
    homeClub !== awayClub &&
    Boolean(date) &&
    Boolean(stadium.trim()) &&
    Number(scoreHome) >= 0 &&
    Number(scoreAway) >= 0 &&
    matchIncludesMyClub &&
    !saving &&
    !loadingBase;

  // =========================
  // Base load
  // =========================
  useEffect(() => {
    let active = true;

    async function loadBase() {
      try {
        setLoadingBase(true);
        setBaseErr("");

        const requests = [api.get("/clubs")];

        if (myClubId) {
          requests.push(api.get(`/clubs/${myClubId}/members`));
        }

        const responses = await Promise.all(requests);

        if (!active) return;

        const clubsRes = responses[0];
        const membersRes = responses[1];

        setClubs(Array.isArray(clubsRes.data) ? clubsRes.data : []);

        if (membersRes) {
          const members = Array.isArray(membersRes.data?.members)
            ? membersRes.data.members
            : [];

          const normalizedMembers = members
            .map((m) => {
              const u = m?.user;
              if (!u?._id) return null;

              return {
                id: u._id,
                username: u.username || "",
                gamerTag: u.gamerTag || "",
                platform: u.platform || "",
              };
            })
            .filter(Boolean);

          setMyMembers(normalizedMembers);
        } else {
          setMyMembers([]);
        }
      } catch (error) {
        if (!active) return;
        setBaseErr(error?.response?.data?.message || error.message || "Error cargando datos base");
      } finally {
        if (active) setLoadingBase(false);
      }
    }

    loadBase();

    return () => {
      active = false;
    };
  }, [myClubId]);

  // =========================
  // Matches load
  // =========================
  async function loadMyMatches() {
    if (!myClubId) {
      setMatches([]);
      return;
    }

    try {
      setMatchesLoading(true);
      setMatchesErr("");

      const res = await api.get("/matches", {
        params: {
          club: myClubId,
          page: 1,
          limit: 50,
        },
      });

      setMatches(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      setMatchesErr(error?.response?.data?.message || error.message || "No se pudieron cargar los partidos");
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }

  useEffect(() => {
    loadMyMatches();
  }, [myClubId]);

  // =========================
  // Form sync with my club
  // =========================
  useEffect(() => {
    if (!myClubId) return;

    setHomeClub((prev) => prev || myClubId);
    setPlayerStats((prev) =>
      prev.length > 0
        ? prev.map((row) => ({ ...row, club: myClubId }))
        : [createEmptyPlayerStat(myClubId)]
    );
  }, [myClubId]);

  useEffect(() => {
    if (!myClubSelectedSideId) return;

    setPlayerStats((prev) =>
      prev.map((row) => ({
        ...row,
        club: myClubSelectedSideId,
      }))
    );
  }, [myClubSelectedSideId]);

  // =========================
  // Create helpers
  // =========================
  function addPlayerStatRow() {
    setPlayerStats((prev) => [
      ...prev,
      createEmptyPlayerStat(myClubSelectedSideId || myClubId || ""),
    ]);
  }

  function removePlayerStatRow(index) {
    setPlayerStats((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePlayerStatRow(index, patch) {
    setPlayerStats((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function clearCreateForm() {
    setHomeClub(myClubId || "");
    setAwayClub("");
    setDate("");
    setStadium("");
    setScoreHome(0);
    setScoreAway(0);
    setPlayerStats([createEmptyPlayerStat(myClubId || "")]);
    setFormErr("");
    setFormOk("");
  }

  function validateCreateForm() {
    if (!myClubId) return "No tienes club activo.";
    if (!isAdminOrCaptain) return "Solo admin o captain pueden crear partidos.";
    if (!homeClub || !awayClub) return "Debes seleccionar club local y visitante.";
    if (homeClub === awayClub) return "Local y visitante no pueden ser el mismo club.";
    if (!date) return "Debes indicar fecha y hora.";
    if (!stadium.trim()) return "Debes indicar estadio.";
    if (!matchIncludesMyClub) return "Tu club debe participar en el partido.";
    if (Number(scoreHome) < 0 || Number(scoreAway) < 0) {
      return "Los goles no pueden ser negativos.";
    }

    for (let i = 0; i < playerStats.length; i += 1) {
      const row = playerStats[i];

      if (!row.user) {
        return `Falta seleccionar jugador en la fila ${i + 1}.`;
      }

      if (row.goals < 0 || row.assists < 0) {
        return `Goals/assists no pueden ser negativos en la fila ${i + 1}.`;
      }
    }

    return "";
  }

  async function handleCreateMatch(e) {
    e.preventDefault();

    const validationError = validateCreateForm();
    if (validationError) {
      setFormErr(validationError);
      setFormOk("");
      return;
    }

    try {
      setSaving(true);
      setFormErr("");
      setFormOk("");

      const payload = {
        homeClub,
        awayClub,
        date,
        stadium: stadium.trim(),
        scoreHome: Number(scoreHome),
        scoreAway: Number(scoreAway),
        playerStats: playerStats.map((row) => ({
          user: row.user,
          club: myClubSelectedSideId || myClubId,
          goals: Number(row.goals || 0),
          assists: Number(row.assists || 0),
        })),
      };

      await api.post(`/matches/clubs/${myClubId}`, payload);

      setFormOk("Partido creado correctamente.");
      clearCreateForm();
      await loadMyMatches();
    } catch (error) {
      setFormErr(error?.response?.data?.message || error.message || "No se pudo crear el partido.");
      setFormOk("");
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // Edit match
  // =========================
  function openEditMatch(match) {
    setEditMatchErr("");
    setEditMatchOk("");

    setEditMatch({
      open: true,
      saving: false,
      matchId: match?._id || "",
      homeClub: match?.homeClub?._id || match?.homeClub || "",
      awayClub: match?.awayClub?._id || match?.awayClub || "",
      date: formatDateInput(match?.date),
      stadium: match?.stadium || "",
      scoreHome: Number(match?.scoreHome || 0),
      scoreAway: Number(match?.scoreAway || 0),
    });
  }

  function closeEditMatch() {
    setEditMatch(initialEditMatchState);
    setEditMatchErr("");
    setEditMatchOk("");
  }

  async function handleSaveEditMatch(e) {
    e.preventDefault();

    if (!isAdminOrCaptain) {
      setEditMatchErr("Solo admin o captain pueden editar partidos.");
      return;
    }

    if (!editMatch.matchId) {
      setEditMatchErr("No se encontró el partido a editar.");
      return;
    }

    if (!editMatch.homeClub || !editMatch.awayClub) {
      setEditMatchErr("Debes seleccionar club local y visitante.");
      return;
    }

    if (editMatch.homeClub === editMatch.awayClub) {
      setEditMatchErr("Local y visitante no pueden ser el mismo club.");
      return;
    }

    try {
      setEditMatch((prev) => ({ ...prev, saving: true }));
      setEditMatchErr("");
      setEditMatchOk("");

      const payload = {
        homeClub: editMatch.homeClub,
        awayClub: editMatch.awayClub,
        date: editMatch.date,
        stadium: editMatch.stadium.trim(),
        scoreHome: Number(editMatch.scoreHome),
        scoreAway: Number(editMatch.scoreAway),
      };

      await api.put(`/matches/${editMatch.matchId}/clubs/${myClubId}`, payload);

      setEditMatchOk("Partido actualizado correctamente.");
      await loadMyMatches();
      closeEditMatch();
    } catch (error) {
      setEditMatchErr(error?.response?.data?.message || error.message || "No se pudo actualizar el partido.");
    } finally {
      setEditMatch((prev) => ({ ...prev, saving: false }));
    }
  }

  // =========================
  // Delete match
  // =========================
  async function handleDeleteMatch(matchId) {
    if (!isAdmin) {
      setMatchesErr("Solo admin puede eliminar partidos.");
      return;
    }

    const confirmed = window.confirm("¿Seguro que quieres eliminar este partido?");
    if (!confirmed) return;

    try {
      setMatchesErr("");
      await api.delete(`/matches/${matchId}/clubs/${myClubId}`);
      await loadMyMatches();
    } catch (error) {
      setMatchesErr(error?.response?.data?.message || error.message || "No se pudo eliminar el partido.");
    }
  }

  // =========================
  // Edit player stats
  // =========================
  function openEditStats(match) {
    const rawPlayerStats = Array.isArray(match?.playerStats) ? match.playerStats : [];

    const normalized = rawPlayerStats
      .map((row) => {
        const userId =
          row?.user?._id ||
          row?.user ||
          "";

        const clubId =
          row?.club?._id ||
          row?.club ||
          "";

        return {
          user: userId,
          club: clubId,
          goals: Number(row?.goals || 0),
          assists: Number(row?.assists || 0),
        };
      })
      .filter((row) => row.user);

    setEditStatsErr("");
    setEditStatsOk("");

    setEditStats({
      open: true,
      saving: false,
      matchId: match?._id || "",
      myClubSideId:
        match?.homeClub?._id === myClubId || match?.homeClub === myClubId
          ? (match?.homeClub?._id || match?.homeClub || "")
          : (match?.awayClub?._id || match?.awayClub || ""),
      playerStats: normalized.filter((row) => row.club === myClubId || row.club === (match?.homeClub?._id === myClubId ? match?.homeClub?._id : match?.awayClub?._id)),
    });
  }

  function closeEditStats() {
    setEditStats(initialEditStatsState);
    setEditStatsErr("");
    setEditStatsOk("");
  }

  function addEditStatsRow() {
    setEditStats((prev) => ({
      ...prev,
      playerStats: [
        ...prev.playerStats,
        createEmptyPlayerStat(prev.myClubSideId || myClubId || ""),
      ],
    }));
  }

  function removeEditStatsRow(index) {
    setEditStats((prev) => ({
      ...prev,
      playerStats: prev.playerStats.filter((_, i) => i !== index),
    }));
  }

  function updateEditStatsRow(index, patch) {
    setEditStats((prev) => ({
      ...prev,
      playerStats: prev.playerStats.map((row, i) =>
        i === index ? { ...row, ...patch } : row
      ),
    }));
  }

  async function handleSavePlayerStats(e) {
    e.preventDefault();

    if (!editStats.matchId) {
      setEditStatsErr("No se encontró el partido.");
      return;
    }

    for (let i = 0; i < editStats.playerStats.length; i += 1) {
      const row = editStats.playerStats[i];

      if (!row.user) {
        setEditStatsErr(`Falta seleccionar jugador en la fila ${i + 1}.`);
        return;
      }

      if (Number(row.goals) < 0 || Number(row.assists) < 0) {
        setEditStatsErr(`Goals/assists no pueden ser negativos en la fila ${i + 1}.`);
        return;
      }
    }

    try {
      setEditStats((prev) => ({ ...prev, saving: true }));
      setEditStatsErr("");
      setEditStatsOk("");

      const payload = {
        playerStats: editStats.playerStats.map((row) => ({
          user: row.user,
          club: row.club || editStats.myClubSideId || myClubId,
          goals: Number(row.goals || 0),
          assists: Number(row.assists || 0),
        })),
      };

      await api.patch(`/matches/${editStats.matchId}/player-stats`, payload);

      setEditStatsOk("Player stats actualizados correctamente.");
      await loadMyMatches();
      closeEditStats();
    } catch (error) {
      setEditStatsErr(error?.response?.data?.message || error.message || "No se pudieron actualizar los player stats.");
    } finally {
      setEditStats((prev) => ({ ...prev, saving: false }));
    }
  }

  // =========================
  // Render guards
  // =========================
  if (!myClubId) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Matches</h1>
          <p className="mt-3 text-sm text-slate-300">
            No tienes un club activo. Selecciona o ingresa a un club para gestionar partidos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Matches</h1>
        <p className="mt-2 text-sm text-slate-300">
          Crea partidos, edítalos y gestiona player stats de tu club.
        </p>

        {baseErr ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {baseErr}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Crear partido</h2>

        {!isAdminOrCaptain ? (
          <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            Solo admin o captain pueden crear partidos.
          </div>
        ) : null}

        {formErr ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {formErr}
          </div>
        ) : null}

        {formOk ? (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {formOk}
          </div>
        ) : null}

        <form onSubmit={handleCreateMatch} className="mt-4 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Club local</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                value={homeClub}
                onChange={(e) => setHomeClub(e.target.value)}
                disabled={!isAdminOrCaptain || loadingBase}
              >
                <option value="">Selecciona club</option>
                {clubOptions.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Club visitante</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                value={awayClub}
                onChange={(e) => setAwayClub(e.target.value)}
                disabled={!isAdminOrCaptain || loadingBase}
              >
                <option value="">Selecciona club</option>
                {clubOptions.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Fecha y hora</span>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!isAdminOrCaptain}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Estadio</span>
              <input
                type="text"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                value={stadium}
                onChange={(e) => setStadium(e.target.value)}
                placeholder="Nombre del estadio"
                disabled={!isAdminOrCaptain}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Goles local</span>
              <input
                type="number"
                min="0"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                value={scoreHome}
                onChange={(e) => setScoreHome(e.target.value)}
                disabled={!isAdminOrCaptain}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Goles visitante</span>
              <input
                type="number"
                min="0"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                value={scoreAway}
                onChange={(e) => setScoreAway(e.target.value)}
                disabled={!isAdminOrCaptain}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Player stats de tu club</h3>
                <p className="text-sm text-slate-400">
                  Solo se registran estadísticas para tu club activo.
                </p>
              </div>

              <button
                type="button"
                onClick={addPlayerStatRow}
                disabled={!isAdminOrCaptain}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                Agregar jugador
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {playerStats.map((row, index) => (
                <div
                  key={`create-ps-${index}`}
                  className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4 md:grid-cols-4"
                >
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-slate-300">Jugador</span>
                    <select
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                      value={row.user}
                      onChange={(e) =>
                        updatePlayerStatRow(index, { user: e.target.value })
                      }
                      disabled={!isAdminOrCaptain}
                    >
                      <option value="">Selecciona jugador</option>
                      {memberOptions.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Goals</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                      value={row.goals}
                      onChange={(e) =>
                        updatePlayerStatRow(index, { goals: e.target.value })
                      }
                      disabled={!isAdminOrCaptain}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Assists</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                      value={row.assists}
                      onChange={(e) =>
                        updatePlayerStatRow(index, { assists: e.target.value })
                      }
                      disabled={!isAdminOrCaptain}
                    />
                  </label>

                  <div className="md:col-span-4">
                    <button
                      type="button"
                      onClick={() => removePlayerStatRow(index)}
                      disabled={!isAdminOrCaptain || playerStats.length === 1}
                      className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Quitar fila
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Crear partido"}
            </button>

            <button
              type="button"
              onClick={clearCreateForm}
              disabled={saving}
              className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/10 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Partidos de mi club</h2>

          <button
            type="button"
            onClick={loadMyMatches}
            disabled={matchesLoading}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            {matchesLoading ? "Actualizando..." : "Recargar"}
          </button>
        </div>

        {matchesErr ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {matchesErr}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-300">
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Local</th>
                <th className="px-3 py-3">Visitante</th>
                <th className="px-3 py-3">Marcador</th>
                <th className="px-3 py-3">Estadio</th>
                <th className="px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {matchesLoading ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-slate-400">
                    Cargando partidos...
                  </td>
                </tr>
              ) : matches.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-slate-400">
                    No hay partidos cargados para tu club.
                  </td>
                </tr>
              ) : (
                matches.map((match) => {
                  const homeId = match?.homeClub?._id || match?.homeClub || "";
                  const awayId = match?.awayClub?._id || match?.awayClub || "";

                  return (
                    <tr key={match._id} className="border-b border-white/5">
                      <td className="px-3 py-3">{formatDateView(match.date)}</td>
                      <td className="px-3 py-3">
                        {clubMap[homeId]?.name || match?.homeClub?.name || "Club local"}
                      </td>
                      <td className="px-3 py-3">
                        {clubMap[awayId]?.name || match?.awayClub?.name || "Club visitante"}
                      </td>
                      <td className="px-3 py-3">
                        {Number(match?.scoreHome || 0)} - {Number(match?.scoreAway || 0)}
                      </td>
                      <td className="px-3 py-3">{match?.stadium || "-"}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {isAdminOrCaptain ? (
                            <button
                              type="button"
                              onClick={() => openEditMatch(match)}
                              className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/10"
                            >
                              Editar
                            </button>
                          ) : null}

                          {isAdminOrCaptain ? (
                            <button
                              type="button"
                              onClick={() => openEditStats(match)}
                              className="rounded-lg border border-sky-500/30 px-3 py-1.5 text-sky-200 hover:bg-sky-500/10"
                            >
                              PlayerStats
                            </button>
                          ) : null}

                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteMatch(match._id)}
                              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-red-300 hover:bg-red-500/10"
                            >
                              Eliminar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editMatch.open ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Editar partido</h2>

          {editMatchErr ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {editMatchErr}
            </div>
          ) : null}

          {editMatchOk ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {editMatchOk}
            </div>
          ) : null}

          <form onSubmit={handleSaveEditMatch} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Club local</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                  value={editMatch.homeClub}
                  onChange={(e) =>
                    setEditMatch((prev) => ({ ...prev, homeClub: e.target.value }))
                  }
                >
                  <option value="">Selecciona club</option>
                  {clubOptions.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Club visitante</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                  value={editMatch.awayClub}
                  onChange={(e) =>
                    setEditMatch((prev) => ({ ...prev, awayClub: e.target.value }))
                  }
                >
                  <option value="">Selecciona club</option>
                  {clubOptions.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Fecha y hora</span>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                  value={editMatch.date}
                  onChange={(e) =>
                    setEditMatch((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Estadio</span>
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                  value={editMatch.stadium}
                  onChange={(e) =>
                    setEditMatch((prev) => ({ ...prev, stadium: e.target.value }))
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Goles local</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                  value={editMatch.scoreHome}
                  onChange={(e) =>
                    setEditMatch((prev) => ({ ...prev, scoreHome: e.target.value }))
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Goles visitante</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                  value={editMatch.scoreAway}
                  onChange={(e) =>
                    setEditMatch((prev) => ({ ...prev, scoreAway: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={editMatch.saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {editMatch.saving ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={closeEditMatch}
                className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editStats.open ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Editar player stats</h2>

            <button
              type="button"
              onClick={addEditStatsRow}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            >
              Agregar fila
            </button>
          </div>

          {editStatsErr ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {editStatsErr}
            </div>
          ) : null}

          {editStatsOk ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {editStatsOk}
            </div>
          ) : null}

          <form onSubmit={handleSavePlayerStats} className="mt-4 space-y-4">
            {editStats.playerStats.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                Este partido aún no tiene player stats para tu club. Puedes agregarlos ahora.
              </div>
            ) : null}

            {editStats.playerStats.map((row, index) => (
              <div
                key={`edit-ps-${index}`}
                className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4 md:grid-cols-4"
              >
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-slate-300">Jugador</span>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                    value={row.user}
                    onChange={(e) =>
                      updateEditStatsRow(index, { user: e.target.value })
                    }
                  >
                    <option value="">Selecciona jugador</option>
                    {memberOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Goals</span>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                    value={row.goals}
                    onChange={(e) =>
                      updateEditStatsRow(index, { goals: e.target.value })
                    }
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Assists</span>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                    value={row.assists}
                    onChange={(e) =>
                      updateEditStatsRow(index, { assists: e.target.value })
                    }
                  />
                </label>

                <div className="md:col-span-4">
                  <button
                    type="button"
                    onClick={() => removeEditStatsRow(index)}
                    className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
                  >
                    Quitar fila
                  </button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={editStats.saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {editStats.saving ? "Guardando..." : "Guardar player stats"}
              </button>

              <button
                type="button"
                onClick={closeEditStats}
                className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}