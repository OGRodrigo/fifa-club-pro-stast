// src/pages/Matches.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

/**
 * =====================================================
 * MATCHES V2
 * -----------------------------------------------------
 * Regla funcional de esta versión:
 * - datos base del partido: completos
 * - teamStats: se pueden cargar de ambos clubes
 * - lineups: solo del club que crea/edita
 * - playerStats: solo del club que crea/edita
 *
 * No se inventan:
 * - lineup rival
 * - stats individuales del rival
 * =====================================================
 */

/* =====================================================
 * Helpers de construcción de estado
 * ===================================================== */
const createEmptyTeamStats = () => ({
  possession: 0,

  shots: 0,
  shotsOnTarget: 0,
  shotAccuracy: 0,
  expectedGoals: 0,

  passes: 0,
  passesCompleted: 0,
  passAccuracy: 0,

  dribbleSuccess: 0,

  tackles: 0,
  tacklesWon: 0,
  tackleSuccess: 0,

  recoveries: 0,
  interceptions: 0,
  clearances: 0,
  blocks: 0,
  saves: 0,

  fouls: 0,
  offsides: 0,
  corners: 0,
  freeKicks: 0,
  penalties: 0,

  yellowCards: 0,
  redCards: 0,
});

const createEmptyLineupPlayer = () => ({
  user: "",
  position: "",
  shirtNumber: "",
  starter: true,
});

const createEmptyPlayerStat = (clubId = "") => ({
  user: "",
  club: clubId,

  position: "",
  rating: 0,
  minutesPlayed: 90,
  isMVP: false,

  goals: 0,
  assists: 0,

  shots: 0,
  shotsOnTarget: 0,
  shotAccuracy: 0,

  passes: 0,
  passesCompleted: 0,
  passAccuracy: 0,
  keyPasses: 0,

  dribbles: 0,
  dribblesWon: 0,
  dribbleSuccess: 0,

  tackles: 0,
  tacklesWon: 0,
  interceptions: 0,
  recoveries: 0,
  clearances: 0,
  blocks: 0,
  saves: 0,

  fouls: 0,
  yellowCards: 0,
  redCards: 0,
});

const createInitialCreateState = (clubId = "") => ({
  homeClub: clubId || "",
  awayClub: "",
  date: "",
  stadium: "",
  competition: "League",
  status: "played",
  scoreHome: 0,
  scoreAway: 0,

  teamStats: {
    home: createEmptyTeamStats(),
    away: createEmptyTeamStats(),
  },

  lineups: {
    home: {
      formation: "",
      players: [],
    },
    away: {
      formation: "",
      players: [],
    },
  },

  playerStats: [createEmptyPlayerStat(clubId || "")],
});

const initialEditBaseState = {
  open: false,
  saving: false,
  matchId: "",
  homeClub: "",
  awayClub: "",
  date: "",
  stadium: "",
  competition: "League",
  status: "played",
  scoreHome: 0,
  scoreAway: 0,
};

const initialEditTeamStatsState = {
  open: false,
  saving: false,
  matchId: "",
  teamStats: {
    home: createEmptyTeamStats(),
    away: createEmptyTeamStats(),
  },
};

const initialEditLineupsState = {
  open: false,
  saving: false,
  matchId: "",
  mySide: "",
  lineups: {
    home: {
      formation: "",
      players: [],
    },
    away: {
      formation: "",
      players: [],
    },
  },
};

const initialEditPlayerStatsState = {
  open: false,
  saving: false,
  matchId: "",
  mySide: "",
  strictTotals: false,
  playerStats: [],
};

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

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

function clubIdOf(club) {
  return club?._id || club || "";
}

function userIdOf(user) {
  return user?._id || user || "";
}

function clubLabel(club) {
  if (!club) return "Club";
  return `${club.name || "Club"}${club.country ? ` · ${club.country}` : ""}`;
}

function memberLabel(member) {
  if (!member) return "Jugador";
  return `${member.gamerTag || member.username || "Jugador"}${
    member.platform ? ` · ${member.platform}` : ""
  }`;
}

function sideOfMyClub(homeClubId, awayClubId, myClubId) {
  if (!myClubId) return "";
  if (String(homeClubId) === String(myClubId)) return "home";
  if (String(awayClubId) === String(myClubId)) return "away";
  return "";
}

/* =====================================================
 * Componente principal
 * ===================================================== */
export default function Matches() {
  const { clubContext } = useAuth();
  const navigate = useNavigate();

  const myClubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";

  const isAdmin = role === "admin";
  const isCaptain = role === "captain";
  const isAdminOrCaptain = isAdmin || isCaptain;

  const [clubs, setClubs] = useState([]);
  const [myMembers, setMyMembers] = useState([]);

  const [loadingBase, setLoadingBase] = useState(true);
  const [baseErr, setBaseErr] = useState("");

  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchesErr, setMatchesErr] = useState("");

  const [createState, setCreateState] = useState(createInitialCreateState(""));
  const [createSaving, setCreateSaving] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [createOk, setCreateOk] = useState("");

  const [editBase, setEditBase] = useState(initialEditBaseState);
  const [editBaseErr, setEditBaseErr] = useState("");
  const [editBaseOk, setEditBaseOk] = useState("");

  const [editTeamStats, setEditTeamStats] = useState(initialEditTeamStatsState);
  const [editTeamStatsErr, setEditTeamStatsErr] = useState("");
  const [editTeamStatsOk, setEditTeamStatsOk] = useState("");

  const [editLineups, setEditLineups] = useState(initialEditLineupsState);
  const [editLineupsErr, setEditLineupsErr] = useState("");
  const [editLineupsOk, setEditLineupsOk] = useState("");

  const [editPlayerStats, setEditPlayerStats] = useState(initialEditPlayerStatsState);
  const [editPlayerStatsErr, setEditPlayerStatsErr] = useState("");
  const [editPlayerStatsOk, setEditPlayerStatsOk] = useState("");

  const clubOptions = useMemo(() => {
    return clubs.map((club) => ({
      id: club._id,
      name: club.name || "",
      country: club.country || "",
      label: clubLabel(club),
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
      label: memberLabel(member),
    }));
  }, [myMembers]);

  const myClubIsHome = createState.homeClub === myClubId;
  const myClubIsAway = createState.awayClub === myClubId;
  const myClubSideId = myClubIsHome
    ? createState.homeClub
    : myClubIsAway
    ? createState.awayClub
    : "";
  const myCreateSide = myClubIsHome ? "home" : myClubIsAway ? "away" : "";

  /* =====================================================
   * Carga base: clubs + members del club activo
   * ===================================================== */
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

        const [clubsRes, membersRes] = await Promise.all(requests);

        if (!active) return;

        setClubs(Array.isArray(clubsRes.data) ? clubsRes.data : []);

        if (membersRes) {
          const members = Array.isArray(membersRes.data?.members)
            ? membersRes.data.members
            : [];

          const normalized = members
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

          setMyMembers(normalized);
        } else {
          setMyMembers([]);
        }
      } catch (error) {
        if (!active) return;
        setBaseErr(
          error?.response?.data?.message ||
            error.message ||
            "Error cargando datos base"
        );
      } finally {
        if (active) setLoadingBase(false);
      }
    }

    loadBase();

    return () => {
      active = false;
    };
  }, [myClubId]);

  /* =====================================================
   * Carga de partidos
   * ===================================================== */
  async function loadMatches() {
    if (!myClubId) {
      setMatches([]);
      return;
    }

    try {
      setLoadingMatches(true);
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
      setMatchesErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudieron cargar los partidos"
      );
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, [myClubId]);

  /* =====================================================
   * Sincronización createState
   * ===================================================== */
  useEffect(() => {
    if (!myClubId) return;

    setCreateState((prev) => ({
      ...prev,
      homeClub: prev.homeClub || myClubId,
      playerStats:
        prev.playerStats.length > 0
          ? prev.playerStats.map((ps) => ({
              ...ps,
              club: myClubId,
            }))
          : [createEmptyPlayerStat(myClubId)],
    }));
  }, [myClubId]);

  useEffect(() => {
    if (!myClubId) return;

    setCreateState((prev) => ({
      ...prev,
      playerStats: prev.playerStats.map((ps) => ({
        ...ps,
        club: myClubId,
      })),
    }));
  }, [myClubSideId, myClubId]);

  /* =====================================================
   * Helpers de create
   * ===================================================== */
  function resetCreateForm() {
    setCreateState(createInitialCreateState(myClubId || ""));
    setCreateErr("");
    setCreateOk("");
  }

  function validateCreateForm() {
    if (!myClubId) return "No tienes club activo.";
    if (!isAdminOrCaptain) return "Solo admin o captain pueden crear partidos.";
    if (!createState.homeClub || !createState.awayClub) {
      return "Debes seleccionar homeClub y awayClub.";
    }
    if (createState.homeClub === createState.awayClub) {
      return "homeClub y awayClub no pueden ser el mismo.";
    }
    if (
      createState.homeClub !== myClubId &&
      createState.awayClub !== myClubId
    ) {
      return "Tu club debe participar en el partido.";
    }
    if (!createState.date) return "Debes indicar fecha.";
    if (!createState.stadium.trim()) return "Debes indicar estadio.";

    return "";
  }

  async function handleCreateMatch(e) {
    e.preventDefault();

    const validationError = validateCreateForm();
    if (validationError) {
      setCreateErr(validationError);
      setCreateOk("");
      return;
    }

    // ✅ CORRECTO:
    // la validación del create debe usar createState.playerStats
    // y no editPlayerStats.playerStats
    const playerStatsError = validatePlayerStatsRows(createState.playerStats);
    if (playerStatsError) {
      setCreateErr(playerStatsError);
      setCreateOk("");
      return;
    }

    try {
      setCreateSaving(true);
      setCreateErr("");
      setCreateOk("");

      const payload = {
        homeClub: createState.homeClub,
        awayClub: createState.awayClub,
        date: createState.date,
        stadium: createState.stadium.trim(),
        competition: createState.competition.trim() || "League",
        status: createState.status || "played",
        scoreHome: normalizeNumber(createState.scoreHome),
        scoreAway: normalizeNumber(createState.scoreAway),

        teamStats: {
          home: normalizeTeamStatsForPayload(createState.teamStats.home),
          away: normalizeTeamStatsForPayload(createState.teamStats.away),
        },

        lineups: {
          home:
            myCreateSide === "home"
              ? normalizeLineupForPayload(createState.lineups.home)
              : { formation: "", players: [] },
          away:
            myCreateSide === "away"
              ? normalizeLineupForPayload(createState.lineups.away)
              : { formation: "", players: [] },
        },

        playerStats: createState.playerStats.map((ps) =>
          normalizePlayerStatForPayload({ ...ps, club: myClubId }, myClubId)
        ),

        strictTotals: false,
      };

      await api.post(`/matches/clubs/${myClubId}`, payload);

      setCreateOk("Partido creado correctamente.");
      resetCreateForm();
      await loadMatches();
    } catch (error) {
      setCreateErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudo crear el partido."
      );
      setCreateOk("");
    } finally {
      setCreateSaving(false);
    }
  }

  /* =====================================================
   * Apertura edición base
   * ===================================================== */
  function openEditBase(match) {
    setEditBaseErr("");
    setEditBaseOk("");

    setEditBase({
      open: true,
      saving: false,
      matchId: match._id,
      homeClub: clubIdOf(match.homeClub),
      awayClub: clubIdOf(match.awayClub),
      date: formatDateInput(match.date),
      stadium: match.stadium || "",
      competition: match.competition || "League",
      status: match.status || "played",
      scoreHome: normalizeNumber(match.scoreHome),
      scoreAway: normalizeNumber(match.scoreAway),
    });
  }

  function closeEditBase() {
    setEditBase(initialEditBaseState);
    setEditBaseErr("");
    setEditBaseOk("");
  }

  async function handleSaveEditBase(e) {
    e.preventDefault();

    if (!editBase.matchId) {
      setEditBaseErr("No se encontró el partido.");
      return;
    }

    try {
      setEditBase((prev) => ({ ...prev, saving: true }));
      setEditBaseErr("");
      setEditBaseOk("");

      await api.put(`/matches/${editBase.matchId}/clubs/${myClubId}`, {
        homeClub: editBase.homeClub,
        awayClub: editBase.awayClub,
        date: editBase.date,
        stadium: editBase.stadium.trim(),
        competition: editBase.competition.trim() || "League",
        status: editBase.status || "played",
        scoreHome: normalizeNumber(editBase.scoreHome),
        scoreAway: normalizeNumber(editBase.scoreAway),
      });

      setEditBaseOk("Datos base actualizados.");
      await loadMatches();
      closeEditBase();
    } catch (error) {
      setEditBaseErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudo actualizar el partido."
      );
    } finally {
      setEditBase((prev) => ({ ...prev, saving: false }));
    }
  }

  /* =====================================================
   * Team stats
   * ===================================================== */
  async function openEditTeamStats(matchId) {
    try {
      setEditTeamStatsErr("");
      setEditTeamStatsOk("");

      const res = await api.get(`/matches/${matchId}/full`);
      const match = res.data;

      setEditTeamStats({
        open: true,
        saving: false,
        matchId,
        teamStats: {
          home: {
            ...createEmptyTeamStats(),
            ...(match?.teamStats?.home || {}),
          },
          away: {
            ...createEmptyTeamStats(),
            ...(match?.teamStats?.away || {}),
          },
        },
      });
    } catch (error) {
      setEditTeamStatsErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudo abrir teamStats."
      );
    }
  }

  function closeEditTeamStats() {
    setEditTeamStats(initialEditTeamStatsState);
    setEditTeamStatsErr("");
    setEditTeamStatsOk("");
  }

  function updateEditTeamStats(side, field, value) {
    setEditTeamStats((prev) => ({
      ...prev,
      teamStats: {
        ...prev.teamStats,
        [side]: withCalculatedTeamPercents({
          ...prev.teamStats[side],
          [field]: value,
        }),
      },
    }));
  }

  async function handleSaveTeamStats(e) {
    e.preventDefault();

    try {
      setEditTeamStats((prev) => ({ ...prev, saving: true }));
      setEditTeamStatsErr("");
      setEditTeamStatsOk("");

      await api.patch(
        `/matches/${editTeamStats.matchId}/clubs/${myClubId}/team-stats`,
        {
          teamStats: {
            home: normalizeTeamStatsForPayload(editTeamStats.teamStats.home),
            away: normalizeTeamStatsForPayload(editTeamStats.teamStats.away),
          },
        }
      );

      setEditTeamStatsOk("Team stats actualizados.");
      await loadMatches();
      closeEditTeamStats();
    } catch (error) {
      setEditTeamStatsErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudieron actualizar teamStats."
      );
    } finally {
      setEditTeamStats((prev) => ({ ...prev, saving: false }));
    }
  }

  /* =====================================================
   * Lineups
   * ===================================================== */
  async function openEditLineups(matchId) {
    try {
      setEditLineupsErr("");
      setEditLineupsOk("");

      const res = await api.get(`/matches/${matchId}/full`);
      const match = res.data;

      const mySide = sideOfMyClub(
        clubIdOf(match?.homeClub),
        clubIdOf(match?.awayClub),
        myClubId
      );

      setEditLineups({
        open: true,
        saving: false,
        matchId,
        mySide,
        lineups: {
          home: {
            formation: match?.lineups?.home?.formation || "",
            players: Array.isArray(match?.lineups?.home?.players)
              ? match.lineups.home.players.map((p) => ({
                  user: userIdOf(p.user),
                  position: p.position || "",
                  shirtNumber: p.shirtNumber ?? "",
                  starter: p.starter ?? true,
                }))
              : [],
          },
          away: {
            formation: match?.lineups?.away?.formation || "",
            players: Array.isArray(match?.lineups?.away?.players)
              ? match.lineups.away.players.map((p) => ({
                  user: userIdOf(p.user),
                  position: p.position || "",
                  shirtNumber: p.shirtNumber ?? "",
                  starter: p.starter ?? true,
                }))
              : [],
          },
        },
      });
    } catch (error) {
      setEditLineupsErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudieron abrir las lineups."
      );
    }
  }

  function closeEditLineups() {
    setEditLineups(initialEditLineupsState);
    setEditLineupsErr("");
    setEditLineupsOk("");
  }

  function updateLineupFormation(side, value) {
    setEditLineups((prev) => ({
      ...prev,
      lineups: {
        ...prev.lineups,
        [side]: {
          ...prev.lineups[side],
          formation: value,
        },
      },
    }));
  }

  function addLineupPlayer(side) {
    setEditLineups((prev) => ({
      ...prev,
      lineups: {
        ...prev.lineups,
        [side]: {
          ...prev.lineups[side],
          players: [...prev.lineups[side].players, createEmptyLineupPlayer()],
        },
      },
    }));
  }

  function removeLineupPlayer(side, index) {
    setEditLineups((prev) => ({
      ...prev,
      lineups: {
        ...prev.lineups,
        [side]: {
          ...prev.lineups[side],
          players: prev.lineups[side].players.filter((_, i) => i !== index),
        },
      },
    }));
  }

  function updateLineupPlayer(side, index, patch) {
    setEditLineups((prev) => ({
      ...prev,
      lineups: {
        ...prev.lineups,
        [side]: {
          ...prev.lineups[side],
          players: prev.lineups[side].players.map((p, i) =>
            i === index ? { ...p, ...patch } : p
          ),
        },
      },
    }));
  }

  async function handleSaveLineups(e) {
    e.preventDefault();

    try {
      setEditLineups((prev) => ({ ...prev, saving: true }));
      setEditLineupsErr("");
      setEditLineupsOk("");

      await api.patch(`/matches/${editLineups.matchId}/clubs/${myClubId}/lineups`, {
        lineups: {
          home: normalizeLineupForPayload(editLineups.lineups.home),
          away: normalizeLineupForPayload(editLineups.lineups.away),
        },
      });

      setEditLineupsOk("Lineups actualizadas.");
      await loadMatches();
      closeEditLineups();
    } catch (error) {
      setEditLineupsErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudieron actualizar las lineups."
      );
    } finally {
      setEditLineups((prev) => ({ ...prev, saving: false }));
    }
  }

  /* =====================================================
   * Player stats
   * ===================================================== */
  async function openEditPlayerStats(matchId) {
    try {
      setEditPlayerStatsErr("");
      setEditPlayerStatsOk("");

      const res = await api.get(`/matches/${matchId}/full`);
      const match = res.data;

      const playerStats = Array.isArray(match?.playerStats)
        ? match.playerStats
            .filter((ps) => String(clubIdOf(ps.club)) === String(myClubId))
            .map((ps) => ({
              user: userIdOf(ps.user),
              club: myClubId,
              position: ps.position || "",
              rating: normalizeNumber(ps.rating),
              minutesPlayed: normalizeNumber(ps.minutesPlayed, 90),
              isMVP: Boolean(ps.isMVP),

              goals: normalizeNumber(ps.goals),
              assists: normalizeNumber(ps.assists),

              shots: normalizeNumber(ps.shots),
              shotsOnTarget: normalizeNumber(ps.shotsOnTarget),
              shotAccuracy: normalizeNumber(ps.shotAccuracy),

              passes: normalizeNumber(ps.passes),
              passesCompleted: normalizeNumber(ps.passesCompleted),
              passAccuracy: normalizeNumber(ps.passAccuracy),
              keyPasses: normalizeNumber(ps.keyPasses),

              dribbles: normalizeNumber(ps.dribbles),
              dribblesWon: normalizeNumber(ps.dribblesWon),
              dribbleSuccess: normalizeNumber(ps.dribbleSuccess),

              tackles: normalizeNumber(ps.tackles),
              tacklesWon: normalizeNumber(ps.tacklesWon),
              interceptions: normalizeNumber(ps.interceptions),
              recoveries: normalizeNumber(ps.recoveries),
              clearances: normalizeNumber(ps.clearances),
              blocks: normalizeNumber(ps.blocks),
              saves: normalizeNumber(ps.saves),

              fouls: normalizeNumber(ps.fouls),
              yellowCards: normalizeNumber(ps.yellowCards),
              redCards: normalizeNumber(ps.redCards),
            }))
        : [];

      setEditPlayerStats({
        open: true,
        saving: false,
        matchId,
        mySide: sideOfMyClub(
          clubIdOf(match?.homeClub),
          clubIdOf(match?.awayClub),
          myClubId
        ),
        strictTotals: false,
        playerStats,
      });
    } catch (error) {
      setEditPlayerStatsErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudieron abrir playerStats."
      );
    }
  }

  function closeEditPlayerStats() {
    setEditPlayerStats(initialEditPlayerStatsState);
    setEditPlayerStatsErr("");
    setEditPlayerStatsOk("");
  }

  function addPlayerStatRow() {
    setEditPlayerStats((prev) => ({
      ...prev,
      playerStats: [...prev.playerStats, createEmptyPlayerStat(myClubId)],
    }));
  }

  function removePlayerStatRow(index) {
    setEditPlayerStats((prev) => ({
      ...prev,
      playerStats: prev.playerStats.filter((_, i) => i !== index),
    }));
  }

  function updatePlayerStatRow(index, patch) {
    setEditPlayerStats((prev) => ({
      ...prev,
      playerStats: prev.playerStats.map((ps, i) =>
        i === index ? withCalculatedPlayerPercents({ ...ps, ...patch }) : ps
      ),
    }));
  }

  async function handleSavePlayerStats(e) {
    e.preventDefault();

    try {
      setEditPlayerStats((prev) => ({ ...prev, saving: true }));
      setEditPlayerStatsErr("");
      setEditPlayerStatsOk("");

      await api.patch(
        `/matches/${editPlayerStats.matchId}/clubs/${myClubId}/player-stats`,
        {
          strictTotals: false,
          playerStats: editPlayerStats.playerStats.map((ps) =>
            normalizePlayerStatForPayload({ ...ps, club: myClubId }, myClubId)
          ),
        }
      );

      setEditPlayerStatsOk("Player stats actualizados.");
      await loadMatches();
      closeEditPlayerStats();
    } catch (error) {
      setEditPlayerStatsErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudieron actualizar playerStats."
      );
    } finally {
      setEditPlayerStats((prev) => ({ ...prev, saving: false }));
    }
  }

  /* =====================================================
   * Eliminar
   * ===================================================== */
  async function handleDeleteMatch(matchId) {
    if (!isAdmin) {
      setMatchesErr("Solo admin puede eliminar partidos.");
      return;
    }

    const ok = window.confirm("¿Seguro que quieres eliminar este partido?");
    if (!ok) return;

    try {
      setMatchesErr("");
      await api.delete(`/matches/${matchId}/clubs/${myClubId}`);
      await loadMatches();
    } catch (error) {
      setMatchesErr(
        error?.response?.data?.message ||
          error.message ||
          "No se pudo eliminar el partido."
      );
    }
  }

  /* =====================================================
   * Guard visual
   * ===================================================== */
  if (!myClubId) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Matches</h1>
          <p className="mt-3 text-sm text-slate-300">
            No tienes club activo. Selecciona o únete a un club para gestionar
            partidos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Matches v2</h1>
        <p className="mt-2 text-sm text-slate-300">
          Datos base completos, teamStats comparativas, lineup y playerStats
          solo de tu club.
        </p>

        {baseErr ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {baseErr}
          </div>
        ) : null}
      </div>

      {/* Crear partido */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Crear partido</h2>

        {!isAdminOrCaptain ? (
          <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            Solo admin o captain pueden crear partidos.
          </div>
        ) : null}

        {createErr ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {createErr}
          </div>
        ) : null}

        {createOk ? (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {createOk}
          </div>
        ) : null}

        <form onSubmit={handleCreateMatch} className="mt-4 space-y-6">
          {/* Datos base */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-semibold">1. Datos base</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FieldSelect
                label="Home club"
                value={createState.homeClub}
                onChange={(value) =>
                  setCreateState((prev) => ({ ...prev, homeClub: value }))
                }
                options={clubOptions}
                disabled={!isAdminOrCaptain}
              />

              <FieldSelect
                label="Away club"
                value={createState.awayClub}
                onChange={(value) =>
                  setCreateState((prev) => ({ ...prev, awayClub: value }))
                }
                options={clubOptions}
                disabled={!isAdminOrCaptain}
              />

              <FieldInput
                label="Fecha y hora"
                type="datetime-local"
                value={createState.date}
                onChange={(value) =>
                  setCreateState((prev) => ({ ...prev, date: value }))
                }
                disabled={!isAdminOrCaptain}
              />

              <FieldInput
                label="Estadio"
                value={createState.stadium}
                onChange={(value) =>
                  setCreateState((prev) => ({ ...prev, stadium: value }))
                }
                disabled={!isAdminOrCaptain}
              />

              <FieldInput
                label="Competición"
                value={createState.competition}
                onChange={(value) =>
                  setCreateState((prev) => ({ ...prev, competition: value }))
                }
                disabled={!isAdminOrCaptain}
              />

              <FieldSelectSimple
                label="Estado"
                value={createState.status}
                onChange={(value) =>
                  setCreateState((prev) => ({ ...prev, status: value }))
                }
                options={[
                  { value: "played", label: "played" },
                  { value: "scheduled", label: "scheduled" },
                  { value: "cancelled", label: "cancelled" },
                ]}
                disabled={!isAdminOrCaptain}
              />

              <FieldInput
                label="Score home"
                type="number"
                value={createState.scoreHome}
                onChange={(value) =>
                  setCreateState((prev) => ({ ...prev, scoreHome: value }))
                }
                disabled={!isAdminOrCaptain}
              />

              <FieldInput
                label="Score away"
                type="number"
                value={createState.scoreAway}
                onChange={(value) =>
                  setCreateState((prev) => ({ ...prev, scoreAway: value }))
                }
                disabled={!isAdminOrCaptain}
              />
            </div>
          </div>

          {/* Team stats */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-semibold">2. Team stats</h3>
            <p className="mt-1 text-sm text-slate-400">
              Aquí sí puedes cargar stats de ambos clubes si la captura las
              muestra.
            </p>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <TeamStatsEditor
                title="Home"
                stats={createState.teamStats.home}
                onChange={(field, value) =>
                  setCreateState((prev) => ({
                    ...prev,
                    teamStats: {
                      ...prev.teamStats,
                      home: withCalculatedTeamPercents({
                        ...prev.teamStats.home,
                        [field]: value,
                      }),
                    },
                  }))
                }
              />

              <TeamStatsEditor
                title="Away"
                stats={createState.teamStats.away}
                onChange={(field, value) =>
                  setCreateState((prev) => ({
                    ...prev,
                    teamStats: {
                      ...prev.teamStats,
                      away: withCalculatedTeamPercents({
                        ...prev.teamStats.away,
                        [field]: value,
                      }),
                    },
                  }))
                }
              />
            </div>
          </div>

          {/* Lineups */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="font-semibold">3. Lineup de mi club</h3>

            <div className="mt-4">
              {!myCreateSide ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
                  Selecciona primero si tu club será home o away para cargar la
                  alineación.
                </div>
              ) : (
                <LineupEditor
                  title={`Lineup de mi club (${
                    myCreateSide === "home" ? "home" : "away"
                  })`}
                  lineup={createState.lineups[myCreateSide]}
                  memberOptions={memberOptions}
                  onFormationChange={(value) =>
                    setCreateState((prev) => ({
                      ...prev,
                      lineups: {
                        ...prev.lineups,
                        [myCreateSide]: {
                          ...prev.lineups[myCreateSide],
                          formation: value,
                        },
                      },
                    }))
                  }
                  onAdd={() =>
                    setCreateState((prev) => ({
                      ...prev,
                      lineups: {
                        ...prev.lineups,
                        [myCreateSide]: {
                          ...prev.lineups[myCreateSide],
                          players: [
                            ...prev.lineups[myCreateSide].players,
                            createEmptyLineupPlayer(),
                          ],
                        },
                      },
                    }))
                  }
                  onRemove={(index) =>
                    setCreateState((prev) => ({
                      ...prev,
                      lineups: {
                        ...prev.lineups,
                        [myCreateSide]: {
                          ...prev.lineups[myCreateSide],
                          players: prev.lineups[myCreateSide].players.filter(
                            (_, i) => i !== index
                          ),
                        },
                      },
                    }))
                  }
                  onPlayerChange={(index, patch) =>
                    setCreateState((prev) => ({
                      ...prev,
                      lineups: {
                        ...prev.lineups,
                        [myCreateSide]: {
                          ...prev.lineups[myCreateSide],
                          players: prev.lineups[myCreateSide].players.map(
                            (p, i) => (i === index ? { ...p, ...patch } : p)
                          ),
                        },
                      },
                    }))
                  }
                />
              )}
            </div>
          </div>

          {/* Player stats */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">4. Player stats de mi club</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Aquí solo se cargan jugadores de tu club.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateState((prev) => ({
                    ...prev,
                    playerStats: [
                      ...prev.playerStats,
                      createEmptyPlayerStat(myClubId),
                    ],
                  }))
                }
                className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                disabled={!isAdminOrCaptain}
              >
                Agregar jugador
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {createState.playerStats.map((ps, index) => (
                <PlayerStatEditor
                  key={`create-ps-${index}`}
                  title={`Jugador ${index + 1}`}
                  row={ps}
                  memberOptions={memberOptions}
                  onChange={(patch) =>
                    setCreateState((prev) => ({
                      ...prev,
                      playerStats: prev.playerStats.map((item, i) =>
                        i === index
                          ? withCalculatedPlayerPercents({
                              ...item,
                              ...patch,
                              club: myClubId,
                            })
                          : item
                      ),
                    }))
                  }
                  onRemove={() =>
                    setCreateState((prev) => ({
                      ...prev,
                      playerStats: prev.playerStats.filter((_, i) => i !== index),
                    }))
                  }
                  removable={createState.playerStats.length > 1}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!isAdminOrCaptain || createSaving || loadingBase}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {createSaving ? "Guardando..." : "Crear partido"}
            </button>

            <button
              type="button"
              onClick={resetCreateForm}
              disabled={createSaving}
              className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/10 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Partidos del club</h2>
            <p className="mt-1 text-sm text-slate-400">
              Admin y captain pueden editar. Solo admin puede eliminar.
            </p>
          </div>

          <button
            type="button"
            onClick={loadMatches}
            disabled={loadingMatches}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            {loadingMatches ? "Actualizando..." : "Recargar"}
          </button>
        </div>

        {matchesErr ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {matchesErr}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-300">
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Home</th>
                <th className="px-3 py-3">Away</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Competición</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingMatches ? (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-slate-400">
                    Cargando partidos...
                  </td>
                </tr>
              ) : matches.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-slate-400">
                    No hay partidos para tu club.
                  </td>
                </tr>
              ) : (
                matches.map((match) => {
                  const homeId = clubIdOf(match.homeClub);
                  const awayId = clubIdOf(match.awayClub);

                  return (
                    <tr key={match._id} className="border-b border-white/5">
                      <td className="px-3 py-3">{formatDateView(match.date)}</td>
                      <td className="px-3 py-3">
                        {clubMap[homeId]?.name || match?.homeClub?.name || "Home"}
                      </td>
                      <td className="px-3 py-3">
                        {clubMap[awayId]?.name || match?.awayClub?.name || "Away"}
                      </td>
                      <td className="px-3 py-3">
                        {normalizeNumber(match.scoreHome)} -{" "}
                        {normalizeNumber(match.scoreAway)}
                      </td>
                      <td className="px-3 py-3">
                        {match.competition || "League"}
                      </td>
                      <td className="px-3 py-3">{match.status || "played"}</td>

                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {/* ✅ NUEVO:
                              botón directo a MatchDetail desde la lista principal */}
                          <button
                            type="button"
                            onClick={() => navigate(`/matches/${match._id}`)}
                            className="rounded-lg border border-cyan-500/30 px-3 py-1.5 text-cyan-200 hover:bg-cyan-500/10"
                          >
                            Ver detalle
                          </button>

                          {isAdminOrCaptain ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditBase(match)}
                                className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/10"
                              >
                                Base
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditTeamStats(match._id)}
                                className="rounded-lg border border-sky-500/30 px-3 py-1.5 text-sky-200 hover:bg-sky-500/10"
                              >
                                TeamStats
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditLineups(match._id)}
                                className="rounded-lg border border-fuchsia-500/30 px-3 py-1.5 text-fuchsia-200 hover:bg-fuchsia-500/10"
                              >
                                Lineup
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditPlayerStats(match._id)}
                                className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-emerald-200 hover:bg-emerald-500/10"
                              >
                                PlayerStats
                              </button>
                            </>
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

      {/* Panel edit base */}
      {editBase.open ? (
        <Panel title="Editar datos base" onClose={closeEditBase}>
          {editBaseErr ? <ErrorBox text={editBaseErr} /> : null}
          {editBaseOk ? <SuccessBox text={editBaseOk} /> : null}

          <form onSubmit={handleSaveEditBase} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldSelect
                label="Home club"
                value={editBase.homeClub}
                onChange={(value) =>
                  setEditBase((prev) => ({ ...prev, homeClub: value }))
                }
                options={clubOptions}
              />

              <FieldSelect
                label="Away club"
                value={editBase.awayClub}
                onChange={(value) =>
                  setEditBase((prev) => ({ ...prev, awayClub: value }))
                }
                options={clubOptions}
              />

              <FieldInput
                label="Fecha y hora"
                type="datetime-local"
                value={editBase.date}
                onChange={(value) =>
                  setEditBase((prev) => ({ ...prev, date: value }))
                }
              />

              <FieldInput
                label="Estadio"
                value={editBase.stadium}
                onChange={(value) =>
                  setEditBase((prev) => ({ ...prev, stadium: value }))
                }
              />

              <FieldInput
                label="Competición"
                value={editBase.competition}
                onChange={(value) =>
                  setEditBase((prev) => ({ ...prev, competition: value }))
                }
              />

              <FieldSelectSimple
                label="Estado"
                value={editBase.status}
                onChange={(value) =>
                  setEditBase((prev) => ({ ...prev, status: value }))
                }
                options={[
                  { value: "played", label: "played" },
                  { value: "scheduled", label: "scheduled" },
                  { value: "cancelled", label: "cancelled" },
                ]}
              />

              <FieldInput
                label="Score home"
                type="number"
                value={editBase.scoreHome}
                onChange={(value) =>
                  setEditBase((prev) => ({ ...prev, scoreHome: value }))
                }
              />

              <FieldInput
                label="Score away"
                type="number"
                value={editBase.scoreAway}
                onChange={(value) =>
                  setEditBase((prev) => ({ ...prev, scoreAway: value }))
                }
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={editBase.saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {editBase.saving ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={closeEditBase}
                className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {/* Panel team stats */}
      {editTeamStats.open ? (
        <Panel title="Editar team stats" onClose={closeEditTeamStats}>
          {editTeamStatsErr ? <ErrorBox text={editTeamStatsErr} /> : null}
          {editTeamStatsOk ? <SuccessBox text={editTeamStatsOk} /> : null}

          <form onSubmit={handleSaveTeamStats} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <TeamStatsEditor
                title="Home"
                stats={editTeamStats.teamStats.home}
                onChange={(field, value) =>
                  updateEditTeamStats("home", field, value)
                }
              />

              <TeamStatsEditor
                title="Away"
                stats={editTeamStats.teamStats.away}
                onChange={(field, value) =>
                  updateEditTeamStats("away", field, value)
                }
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={editTeamStats.saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {editTeamStats.saving ? "Guardando..." : "Guardar team stats"}
              </button>

              <button
                type="button"
                onClick={closeEditTeamStats}
                className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {/* Panel lineups */}
      {editLineups.open ? (
        <Panel title="Editar lineup de mi club" onClose={closeEditLineups}>
          {editLineupsErr ? <ErrorBox text={editLineupsErr} /> : null}
          {editLineupsOk ? <SuccessBox text={editLineupsOk} /> : null}

          <form onSubmit={handleSaveLineups} className="space-y-6">
            <div>
              {!editLineups.mySide ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
                  No se pudo determinar si tu club es home o away en este
                  partido.
                </div>
              ) : (
                <LineupEditor
                  title={`Lineup de mi club (${
                    editLineups.mySide === "home" ? "home" : "away"
                  })`}
                  lineup={editLineups.lineups[editLineups.mySide]}
                  memberOptions={memberOptions}
                  onFormationChange={(value) =>
                    updateLineupFormation(editLineups.mySide, value)
                  }
                  onAdd={() => addLineupPlayer(editLineups.mySide)}
                  onRemove={(index) =>
                    removeLineupPlayer(editLineups.mySide, index)
                  }
                  onPlayerChange={(index, patch) =>
                    updateLineupPlayer(editLineups.mySide, index, patch)
                  }
                />
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={editLineups.saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {editLineups.saving ? "Guardando..." : "Guardar lineup"}
              </button>

              <button
                type="button"
                onClick={closeEditLineups}
                className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {/* Panel player stats */}
      {editPlayerStats.open ? (
        <Panel
          title="Editar player stats de mi club"
          onClose={closeEditPlayerStats}
        >
          {editPlayerStatsErr ? <ErrorBox text={editPlayerStatsErr} /> : null}
          {editPlayerStatsOk ? <SuccessBox text={editPlayerStatsOk} /> : null}

          <form onSubmit={handleSavePlayerStats} className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
              Las estadísticas individuales se guardan solo para tu club. No se
              valida el total global del rival.
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={addPlayerStatRow}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
              >
                Agregar jugador
              </button>
            </div>

            <div className="space-y-4">
              {editPlayerStats.playerStats.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                  Este partido no tiene playerStats de tu club aún. Puedes
                  agregarlos.
                </div>
              ) : null}

              {editPlayerStats.playerStats.map((ps, index) => (
                <PlayerStatEditor
                  key={`edit-ps-${index}`}
                  title={`Jugador ${index + 1}`}
                  row={ps}
                  memberOptions={memberOptions}
                  onChange={(patch) => updatePlayerStatRow(index, patch)}
                  onRemove={() => removePlayerStatRow(index)}
                  removable={true}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={editPlayerStats.saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {editPlayerStats.saving
                  ? "Guardando..."
                  : "Guardar player stats"}
              </button>

              <button
                type="button"
                onClick={closeEditPlayerStats}
                className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Panel>
      ) : null}
    </section>
  );
}

/* =====================================================
 * Normalizadores de payload
 * ===================================================== */
function normalizeTeamStatsForPayload(stats) {
  const calculated = withCalculatedTeamPercents(stats);

  return {
    possession: normalizeNumber(calculated.possession),
    shots: normalizeNumber(calculated.shots),
    shotsOnTarget: normalizeNumber(calculated.shotsOnTarget),
    shotAccuracy: normalizeNumber(calculated.shotAccuracy),
    expectedGoals: normalizeNumber(calculated.expectedGoals),

    passes: normalizeNumber(calculated.passes),
    passesCompleted: normalizeNumber(calculated.passesCompleted),
    passAccuracy: normalizeNumber(calculated.passAccuracy),

    dribbleSuccess: normalizeNumber(calculated.dribbleSuccess),

    tackles: normalizeNumber(calculated.tackles),
    tacklesWon: normalizeNumber(calculated.tacklesWon),
    tackleSuccess: normalizeNumber(calculated.tackleSuccess),

    recoveries: normalizeNumber(calculated.recoveries),
    interceptions: normalizeNumber(calculated.interceptions),
    clearances: normalizeNumber(calculated.clearances),
    blocks: normalizeNumber(calculated.blocks),
    saves: normalizeNumber(calculated.saves),

    fouls: normalizeNumber(calculated.fouls),
    offsides: normalizeNumber(calculated.offsides),
    corners: normalizeNumber(calculated.corners),
    freeKicks: normalizeNumber(calculated.freeKicks),
    penalties: normalizeNumber(calculated.penalties),

    yellowCards: normalizeNumber(calculated.yellowCards),
    redCards: normalizeNumber(calculated.redCards),
  };
}

function normalizeLineupForPayload(lineup) {
  return {
    formation: String(lineup?.formation || "").trim(),
    players: Array.isArray(lineup?.players)
      ? lineup.players
          .filter((p) => p.user && p.position)
          .map((p) => ({
            user: p.user,
            position: String(p.position || "").trim().toUpperCase(),
            shirtNumber:
              p.shirtNumber === "" ||
              p.shirtNumber === null ||
              p.shirtNumber === undefined
                ? undefined
                : normalizeNumber(p.shirtNumber),
            starter: Boolean(p.starter),
          }))
      : [],
  };
}

function normalizePlayerStatForPayload(ps, fallbackClubId = "") {
  const calculated = withCalculatedPlayerPercents(ps);

  return {
    user: calculated.user,
    club: calculated.club || fallbackClubId,

    position: String(calculated.position || "").trim().toUpperCase(),
    rating: normalizeNumber(calculated.rating),
    minutesPlayed: normalizeNumber(calculated.minutesPlayed, 90),
    isMVP: Boolean(calculated.isMVP),

    goals: normalizeNumber(calculated.goals),
    assists: normalizeNumber(calculated.assists),

    shots: normalizeNumber(calculated.shots),
    shotsOnTarget: normalizeNumber(calculated.shotsOnTarget),
    shotAccuracy: normalizeNumber(calculated.shotAccuracy),

    passes: normalizeNumber(calculated.passes),
    passesCompleted: normalizeNumber(calculated.passesCompleted),
    passAccuracy: normalizeNumber(calculated.passAccuracy),
    keyPasses: normalizeNumber(calculated.keyPasses),

    dribbles: normalizeNumber(calculated.dribbles),
    dribblesWon: normalizeNumber(calculated.dribblesWon),
    dribbleSuccess: normalizeNumber(calculated.dribbleSuccess),

    tackles: normalizeNumber(calculated.tackles),
    tacklesWon: normalizeNumber(calculated.tacklesWon),
    interceptions: normalizeNumber(calculated.interceptions),
    recoveries: normalizeNumber(calculated.recoveries),
    clearances: normalizeNumber(calculated.clearances),
    blocks: normalizeNumber(calculated.blocks),
    saves: normalizeNumber(calculated.saves),

    fouls: normalizeNumber(calculated.fouls),
    yellowCards: normalizeNumber(calculated.yellowCards),
    redCards: normalizeNumber(calculated.redCards),
  };
}

function validateSinglePlayerStatRow(row, index) {
  const rowNumber = index + 1;

  if (!row.user) {
    return `Jugador ${rowNumber}: debes seleccionar un jugador.`;
  }

  const shots = normalizeNumber(row.shots);
  const shotsOnTarget = normalizeNumber(row.shotsOnTarget);
  const passes = normalizeNumber(row.passes);
  const passesCompleted = normalizeNumber(row.passesCompleted);
  const dribbles = normalizeNumber(row.dribbles);
  const dribblesWon = normalizeNumber(row.dribblesWon);
  const tackles = normalizeNumber(row.tackles);
  const tacklesWon = normalizeNumber(row.tacklesWon);

  if (shotsOnTarget > shots) {
    return `Jugador ${rowNumber}: tiros al arco no puede exceder tiros.`;
  }

  if (passesCompleted > passes) {
    return `Jugador ${rowNumber}: pases completados no puede exceder pases.`;
  }

  if (dribblesWon > dribbles) {
    return `Jugador ${rowNumber}: regates ganados no puede exceder regates.`;
  }

  if (tacklesWon > tackles) {
    return `Jugador ${rowNumber}: entradas ganadas no puede exceder entradas.`;
  }

  return "";
}

function validatePlayerStatsRows(rows) {
  if (!Array.isArray(rows)) {
    return "playerStats debe ser un array.";
  }

  const seenUsers = new Set();

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];

    const rowError = validateSinglePlayerStatRow(row, i);
    if (rowError) return rowError;

    const userKey = String(row.user || "");
    if (userKey) {
      if (seenUsers.has(userKey)) {
        return `Jugador ${i + 1}: no puedes repetir el mismo jugador en playerStats.`;
      }
      seenUsers.add(userKey);
    }
  }

  return "";
}

function calcPercent(part, total) {
  const safePart = normalizeNumber(part);
  const safeTotal = normalizeNumber(total);

  if (safeTotal <= 0) return 0;
  return Math.round((safePart / safeTotal) * 100);
}

function withCalculatedPlayerPercents(row) {
  const shots = normalizeNumber(row.shots);
  const shotsOnTarget = normalizeNumber(row.shotsOnTarget);

  const passes = normalizeNumber(row.passes);
  const passesCompleted = normalizeNumber(row.passesCompleted);

  const dribbles = normalizeNumber(row.dribbles);
  const dribblesWon = normalizeNumber(row.dribblesWon);

  return {
    ...row,
    shotAccuracy: calcPercent(shotsOnTarget, shots),
    passAccuracy: calcPercent(passesCompleted, passes),
    dribbleSuccess: calcPercent(dribblesWon, dribbles),
  };
}

function withCalculatedTeamPercents(stats) {
  const shots = normalizeNumber(stats.shots);
  const shotsOnTarget = normalizeNumber(stats.shotsOnTarget);

  const passes = normalizeNumber(stats.passes);
  const passesCompleted = normalizeNumber(stats.passesCompleted);

  const tackles = normalizeNumber(stats.tackles);
  const tacklesWon = normalizeNumber(stats.tacklesWon);

  return {
    ...stats,
    shotAccuracy: calcPercent(shotsOnTarget, shots),
    passAccuracy: calcPercent(passesCompleted, passes),
    tackleSuccess: calcPercent(tacklesWon, tackles),
  };
}

/* =====================================================
 * UI Reusable components
 * ===================================================== */
function Panel({ title, onClose, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
        >
          Cerrar
        </button>
      </div>
      {children}
    </div>
  );
}

function ErrorBox({ text }) {
  return (
    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
      {text}
    </div>
  );
}

function SuccessBox({ text }) {
  return (
    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
      {text}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  readOnly = false,
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full rounded-xl border px-3 py-2 ${
          readOnly
            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
            : "border-white/10 bg-slate-900"
        }`}
      />
    </label>
  );
}

function FieldSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
      >
        <option value="">Selecciona</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldSelectSimple({ label, value, onChange, options, disabled = false }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TeamStatsEditor({ title, stats, onChange }) {
  const fields = [
    { key: "possession", label: "Posesión %", readOnly: false },
    { key: "shots", label: "Tiros", readOnly: false },
    { key: "shotsOnTarget", label: "Tiros al arco", readOnly: false },
    { key: "shotAccuracy", label: "Precisión de tiro %", readOnly: true },
    { key: "expectedGoals", label: "xG", readOnly: false },

    { key: "passes", label: "Pases", readOnly: false },
    { key: "passesCompleted", label: "Pases completados", readOnly: false },
    { key: "passAccuracy", label: "Precisión de pases %", readOnly: true },

    { key: "dribbleSuccess", label: "Regates exitosos %", readOnly: false },

    { key: "tackles", label: "Entradas", readOnly: false },
    { key: "tacklesWon", label: "Entradas ganadas", readOnly: false },
    { key: "tackleSuccess", label: "Éxito entradas %", readOnly: true },

    { key: "recoveries", label: "Recuperaciones", readOnly: false },
    { key: "interceptions", label: "Intercepciones", readOnly: false },
    { key: "clearances", label: "Despejes", readOnly: false },
    { key: "blocks", label: "Bloqueos", readOnly: false },
    { key: "saves", label: "Atajadas", readOnly: false },

    { key: "fouls", label: "Faltas", readOnly: false },
    { key: "offsides", label: "Offsides", readOnly: false },
    { key: "corners", label: "Corners", readOnly: false },
    { key: "freeKicks", label: "Tiros libres", readOnly: false },
    { key: "penalties", label: "Penales", readOnly: false },

    { key: "yellowCards", label: "Amarillas", readOnly: false },
    { key: "redCards", label: "Rojas", readOnly: false },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <h4 className="font-semibold">{title}</h4>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <FieldInput
            key={`${title}-${field.key}`}
            label={field.label}
            type="number"
            value={stats[field.key]}
            readOnly={field.readOnly}
            onChange={
              field.readOnly ? undefined : (value) => onChange(field.key, value)
            }
          />
        ))}
      </div>
    </div>
  );
}

function LineupEditor({
  title,
  lineup,
  memberOptions,
  onFormationChange,
  onAdd,
  onRemove,
  onPlayerChange,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold">{title}</h4>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
        >
          Agregar jugador
        </button>
      </div>

      <div className="mt-4">
        <FieldInput
          label="Formación"
          value={lineup.formation}
          onChange={onFormationChange}
        />
      </div>

      <div className="mt-4 space-y-3">
        {lineup.players.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
            Sin jugadores cargados.
          </div>
        ) : null}

        {lineup.players.map((player, index) => (
          <div
            key={`${title}-player-${index}`}
            className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-4"
          >
            <FieldSelect
              label="Jugador"
              value={player.user}
              onChange={(value) => onPlayerChange(index, { user: value })}
              options={memberOptions.map((m) => ({
                id: m.id,
                label: m.label,
              }))}
            />

            <FieldInput
              label="Posición"
              value={player.position}
              onChange={(value) => onPlayerChange(index, { position: value })}
            />

            <FieldInput
              label="Dorsal"
              type="number"
              value={player.shirtNumber}
              onChange={(value) =>
                onPlayerChange(index, { shirtNumber: value })
              }
            />

            <label className="flex items-end gap-3 pb-2">
              <input
                type="checkbox"
                checked={Boolean(player.starter)}
                onChange={(e) =>
                  onPlayerChange(index, { starter: e.target.checked })
                }
              />
              <span className="text-sm text-slate-300">Titular</span>
            </label>

            <div className="md:col-span-4">
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerStatEditor({
  title,
  row,
  memberOptions,
  onChange,
  onRemove,
  removable,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold">{title}</h4>

        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
          >
            Quitar
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FieldSelect
          label="Jugador"
          value={row.user}
          onChange={(value) => onChange({ user: value })}
          options={memberOptions.map((m) => ({ id: m.id, label: m.label }))}
        />

        <FieldInput
          label="Posición"
          value={row.position}
          onChange={(value) => onChange({ position: value })}
        />

        <label className="flex items-end gap-3 pb-2">
          <input
            type="checkbox"
            checked={Boolean(row.isMVP)}
            onChange={(e) => onChange({ isMVP: e.target.checked })}
          />
          <span className="text-sm text-slate-300">MVP</span>
        </label>

        <div />

        <FieldInput
          label="Rating"
          type="number"
          value={row.rating}
          onChange={(value) => onChange({ rating: value })}
        />
        <FieldInput
          label="Minutos"
          type="number"
          value={row.minutesPlayed}
          onChange={(value) => onChange({ minutesPlayed: value })}
        />

        <FieldInput
          label="Goles"
          type="number"
          value={row.goals}
          onChange={(value) => onChange({ goals: value })}
        />
        <FieldInput
          label="Asistencias"
          type="number"
          value={row.assists}
          onChange={(value) => onChange({ assists: value })}
        />

        <FieldInput
          label="Tiros"
          type="number"
          value={row.shots}
          onChange={(value) => onChange({ shots: value })}
        />
        <FieldInput
          label="Tiros al arco"
          type="number"
          value={row.shotsOnTarget}
          onChange={(value) => onChange({ shotsOnTarget: value })}
        />
        <FieldInput
          label="Precisión tiro %"
          type="number"
          value={row.shotAccuracy}
          readOnly={true}
        />

        <FieldInput
          label="Pases"
          type="number"
          value={row.passes}
          onChange={(value) => onChange({ passes: value })}
        />
        <FieldInput
          label="Pases completados"
          type="number"
          value={row.passesCompleted}
          onChange={(value) => onChange({ passesCompleted: value })}
        />
        <FieldInput
          label="Éxito regates %"
          type="number"
          value={row.dribbleSuccess}
          readOnly={true}
        />
        <FieldInput
          label="Key passes"
          type="number"
          value={row.keyPasses}
          onChange={(value) => onChange({ keyPasses: value })}
        />

        <FieldInput
          label="Regates"
          type="number"
          value={row.dribbles}
          onChange={(value) => onChange({ dribbles: value })}
        />
        <FieldInput
          label="Regates ganados"
          type="number"
          value={row.dribblesWon}
          onChange={(value) => onChange({ dribblesWon: value })}
        />

        <FieldInput
          label="Entradas"
          type="number"
          value={row.tackles}
          onChange={(value) => onChange({ tackles: value })}
        />
        <FieldInput
          label="Entradas ganadas"
          type="number"
          value={row.tacklesWon}
          onChange={(value) => onChange({ tacklesWon: value })}
        />
        <FieldInput
          label="Intercepciones"
          type="number"
          value={row.interceptions}
          onChange={(value) => onChange({ interceptions: value })}
        />
        <FieldInput
          label="Recuperaciones"
          type="number"
          value={row.recoveries}
          onChange={(value) => onChange({ recoveries: value })}
        />
        <FieldInput
          label="Despejes"
          type="number"
          value={row.clearances}
          onChange={(value) => onChange({ clearances: value })}
        />
        <FieldInput
          label="Bloqueos"
          type="number"
          value={row.blocks}
          onChange={(value) => onChange({ blocks: value })}
        />
        <FieldInput
          label="Atajadas"
          type="number"
          value={row.saves}
          onChange={(value) => onChange({ saves: value })}
        />

        <FieldInput
          label="Faltas"
          type="number"
          value={row.fouls}
          onChange={(value) => onChange({ fouls: value })}
        />
        <FieldInput
          label="Amarillas"
          type="number"
          value={row.yellowCards}
          onChange={(value) => onChange({ yellowCards: value })}
        />
        <FieldInput
          label="Rojas"
          type="number"
          value={row.redCards}
          onChange={(value) => onChange({ redCards: value })}
        />
      </div>
    </div>
  );
}