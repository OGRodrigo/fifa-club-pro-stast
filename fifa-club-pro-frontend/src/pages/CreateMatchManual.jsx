import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function cardClass() {
  return "rounded-2xl border border-white/10 bg-white/5 p-6";
}

function inputClass() {
  return "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/40";
}

function primaryButtonClass(color = "emerald") {
  if (color === "sky") {
    return "rounded-xl bg-sky-600 px-5 py-2.5 font-semibold text-white hover:bg-sky-500 disabled:opacity-50";
  }

  return "rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50";
}

function secondaryButtonClass() {
  return "rounded-xl border border-white/10 px-5 py-2.5 font-semibold text-white hover:bg-white/10 disabled:opacity-50";
}

function errorBoxClass() {
  return "rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200";
}

function successBoxClass() {
  return "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100";
}

function warningBoxClass() {
  return "rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100";
}

function sectionClass() {
  return "rounded-2xl border border-white/10 bg-black/20 p-5";
}

function createEmptyTeamStats() {
  return {
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
  };
}

function createEmptyPlayerStat(clubId = "") {
  return {
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
  };
}

function createInitialCreateState(clubId = "") {
  return {
    mySide: "home",
    opponentClub: "",

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
      home: { formation: "", players: [] },
      away: { formation: "", players: [] },
    },

    playerStats: [createEmptyPlayerStat(clubId || "")],
  };
}

function normalizeTeamStatsForPayload(stats = {}) {
  return {
    possession: normalizeNumber(stats.possession),
    shots: normalizeNumber(stats.shots),
    shotsOnTarget: normalizeNumber(stats.shotsOnTarget),
    shotAccuracy: normalizeNumber(stats.shotAccuracy),
    expectedGoals: normalizeNumber(stats.expectedGoals),
    passes: normalizeNumber(stats.passes),
    passesCompleted: normalizeNumber(stats.passesCompleted),
    passAccuracy: normalizeNumber(stats.passAccuracy),
    dribbleSuccess: normalizeNumber(stats.dribbleSuccess),
    tackles: normalizeNumber(stats.tackles),
    tacklesWon: normalizeNumber(stats.tacklesWon),
    tackleSuccess: normalizeNumber(stats.tackleSuccess),
    recoveries: normalizeNumber(stats.recoveries),
    interceptions: normalizeNumber(stats.interceptions),
    clearances: normalizeNumber(stats.clearances),
    blocks: normalizeNumber(stats.blocks),
    saves: normalizeNumber(stats.saves),
    fouls: normalizeNumber(stats.fouls),
    offsides: normalizeNumber(stats.offsides),
    corners: normalizeNumber(stats.corners),
    freeKicks: normalizeNumber(stats.freeKicks),
    penalties: normalizeNumber(stats.penalties),
    yellowCards: normalizeNumber(stats.yellowCards),
    redCards: normalizeNumber(stats.redCards),
  };
}

function normalizePlayerStatsForPayload(rows = [], myClubId = "") {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row.user)
    .map((row) => ({
      user: row.user || "",
      club: myClubId,
      position: row.position || "",
      rating: normalizeNumber(row.rating),
      minutesPlayed: normalizeNumber(row.minutesPlayed, 90),
      isMVP: Boolean(row.isMVP),

      goals: normalizeNumber(row.goals),
      assists: normalizeNumber(row.assists),

      shots: normalizeNumber(row.shots),
      shotsOnTarget: normalizeNumber(row.shotsOnTarget),
      shotAccuracy: normalizeNumber(row.shotAccuracy),

      passes: normalizeNumber(row.passes),
      passesCompleted: normalizeNumber(row.passesCompleted),
      passAccuracy: normalizeNumber(row.passAccuracy),
      keyPasses: normalizeNumber(row.keyPasses),

      dribbles: normalizeNumber(row.dribbles),
      dribblesWon: normalizeNumber(row.dribblesWon),
      dribbleSuccess: normalizeNumber(row.dribbleSuccess),

      tackles: normalizeNumber(row.tackles),
      tacklesWon: normalizeNumber(row.tacklesWon),
      interceptions: normalizeNumber(row.interceptions),
      recoveries: normalizeNumber(row.recoveries),
      clearances: normalizeNumber(row.clearances),
      blocks: normalizeNumber(row.blocks),
      saves: normalizeNumber(row.saves),

      fouls: normalizeNumber(row.fouls),
      yellowCards: normalizeNumber(row.yellowCards),
      redCards: normalizeNumber(row.redCards),
    }));
}

function StatInput({ label, value, onChange }) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass()}
      />
    </label>
  );
}

export default function CreateMatchManual() {
  const navigate = useNavigate();
  const { clubContext } = useAuth();

  const myClubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";
  const isAllowed = role === "admin" || role === "captain";

  const [clubs, setClubs] = useState([]);
  const [myMembers, setMyMembers] = useState([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [baseError, setBaseError] = useState("");

  const [createState, setCreateState] = useState(
    createInitialCreateState(myClubId || "")
  );
  const [createSaving, setCreateSaving] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [createOk, setCreateOk] = useState("");

  const [competitionType, setCompetitionType] = useState("league");
  const [competitionId, setCompetitionId] = useState("");

  useEffect(() => {
    async function loadBase() {
      try {
        setLoadingBase(true);
        setBaseError("");

        const [clubsRes, membersRes] = await Promise.all([
          api.get("/clubs"),
          api.get(`/clubs/${myClubId}/members`),
        ]);

        const clubsList = Array.isArray(clubsRes.data)
          ? clubsRes.data
          : Array.isArray(clubsRes.data?.clubs)
          ? clubsRes.data.clubs
          : [];

        const membersList = Array.isArray(membersRes.data)
          ? membersRes.data
          : Array.isArray(membersRes.data?.members)
          ? membersRes.data.members
          : [];

        setClubs(clubsList);
        setMyMembers(membersList);
      } catch (err) {
        console.error(err);
        setBaseError("No se pudieron cargar los datos base.");
      } finally {
        setLoadingBase(false);
      }
    }

    if (myClubId) {
      loadBase();
    } else {
      setLoadingBase(false);
    }
  }, [myClubId]);

  useEffect(() => {
    if (!myClubId) return;

    setCreateState((prev) => ({
      ...prev,
      homeClub: prev.mySide === "away" ? prev.opponentClub || "" : myClubId,
      awayClub: prev.mySide === "away" ? myClubId : prev.opponentClub || "",
      playerStats:
        prev.playerStats.length > 0
          ? prev.playerStats.map((ps) => ({
              ...ps,
              club: myClubId,
            }))
          : [createEmptyPlayerStat(myClubId)],
    }));
  }, [myClubId, createState.mySide, createState.opponentClub]);

  const clubOptions = useMemo(() => {
    return clubs.map((club) => ({
      id: club._id,
      label: `${club.name || "Club"}${club.country ? ` · ${club.country}` : ""}`,
    }));
  }, [clubs]);

  const myClubLabel = useMemo(() => {
    const found = clubOptions.find((club) => club.id === myClubId);
    return found?.label || "Mi club";
  }, [clubOptions, myClubId]);

  const opponentLabel = useMemo(() => {
    const found = clubOptions.find((club) => club.id === createState.opponentClub);
    return found?.label || "—";
  }, [clubOptions, createState.opponentClub]);

  const memberOptions = useMemo(() => {
    return myMembers.map((member) => {
      const user = member.user || member;
      return {
        id: user?._id || member._id || "",
        label:
          user?.gamerTag ||
          user?.username ||
          user?.email ||
          "Jugador",
      };
    });
  }, [myMembers]);

  function resetCreateForm() {
    setCreateState(createInitialCreateState(myClubId || ""));
    setCreateErr("");
    setCreateOk("");
    setCompetitionType("league");
    setCompetitionId("");
  }

  function updateCreateField(field, value) {
    setCreateState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateCreateTeamStats(side, field, value) {
    setCreateState((prev) => ({
      ...prev,
      teamStats: {
        ...prev.teamStats,
        [side]: {
          ...prev.teamStats[side],
          [field]: value,
        },
      },
    }));
  }

  function addPlayerStatRow() {
    setCreateState((prev) => ({
      ...prev,
      playerStats: [...prev.playerStats, createEmptyPlayerStat(myClubId)],
    }));
  }

  function removePlayerStatRow(index) {
    setCreateState((prev) => ({
      ...prev,
      playerStats:
        prev.playerStats.length === 1
          ? prev.playerStats
          : prev.playerStats.filter((_, i) => i !== index),
    }));
  }

  function updatePlayerStatRow(index, patch) {
    setCreateState((prev) => ({
      ...prev,
      playerStats: prev.playerStats.map((row, i) =>
        i === index ? { ...row, ...patch } : row
      ),
    }));
  }

  function validateCreateForm() {
    if (!myClubId) return "No tienes club activo.";
    if (!isAllowed) return "Solo admin o captain pueden crear partidos.";

    if (!createState.opponentClub) {
      return "Debes seleccionar el club rival.";
    }

    if (!createState.homeClub || !createState.awayClub) {
      return "No se pudo resolver homeClub y awayClub.";
    }

    if (createState.homeClub === createState.awayClub) {
      return "Home y away no pueden ser el mismo club.";
    }

    if (!createState.date) return "Debes indicar fecha y hora.";
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
          home: { formation: "", players: [] },
          away: { formation: "", players: [] },
        },

        playerStats: normalizePlayerStatsForPayload(
          createState.playerStats,
          myClubId
        ),

        strictTotals: false,
      };

      await api.post(`/matches/clubs/${myClubId}`, payload);

      setCreateOk("Partido manual creado correctamente.");
      setTimeout(() => navigate("/matches"), 900);
    } catch (err) {
      console.error(err);
      setCreateErr(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo crear el partido."
      );
      setCreateOk("");
    } finally {
      setCreateSaving(false);
    }
  }

  if (!myClubId) {
    return (
      <section className="space-y-6">
        <div className={cardClass()}>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Crear partido manual
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            No tienes club activo. Debes tener un club seleccionado para usar este flujo.
          </p>
        </div>
      </section>
    );
  }

  if (!isAllowed) {
    return (
      <section className="space-y-6">
        <div className={cardClass()}>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Crear partido manual
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            Solo admin o captain pueden crear partidos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className={cardClass()}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Crear partido manual
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              Flujo manual completo con stats del club y stats de jugadores.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/matches/create")}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Volver
            </button>

            <button
              type="button"
              onClick={() => navigate("/matches")}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ir a partidos
            </button>
          </div>
        </div>
      </div>

      <div className={cardClass()}>
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5">
  <div className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
    Base manual restaurada correctamente
  </div>

  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
    Esta pantalla vuelve a quedar alineada con el proyecto: contexto del
    partido, marcador, team stats y player stats del club.
  </p>
</div>

        {baseError ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {baseError}
          </div>
        ) : null}

        {createErr ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {createErr}
          </div>
        ) : null}

        {createOk ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {createOk}
          </div>
        ) : null}

        <form onSubmit={handleCreateMatch} className="mt-6 space-y-6">
          <div className={sectionClass()}>
            <h2 className="text-lg font-bold text-white">1. Contexto del partido</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Tipo de competición</span>
                <select
                  value={competitionType}
                  onChange={(e) => setCompetitionType(e.target.value)}
                  className={inputClass()}
                >
                  <option value="league">Liga</option>
                  <option value="tournament">Torneo</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">
                  Liga o torneo creado previamente
                </span>
                <select
                  value={competitionId}
                  onChange={(e) => setCompetitionId(e.target.value)}
                  className={inputClass()}
                >
                  <option value="">Selecciona una opción</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Mi club fue</span>
                <select
                  value={createState.mySide}
                  onChange={(e) => updateCreateField("mySide", e.target.value)}
                  className={inputClass()}
                >
                  <option value="home">Local</option>
                  <option value="away">Visita</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Club rival</span>
                <select
                  value={createState.opponentClub}
                  onChange={(e) => updateCreateField("opponentClub", e.target.value)}
                  disabled={loadingBase}
                  className={`${inputClass()} disabled:opacity-50`}
                >
                  <option value="">
                    {loadingBase ? "Cargando clubes..." : "Selecciona un rival"}
                  </option>

                  {clubOptions
                    .filter((club) => club.id !== myClubId)
                    .map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.label}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-100">
              <div>
                <span className="font-semibold">Home club:</span>{" "}
                {createState.mySide === "home" ? myClubLabel : opponentLabel}
              </div>
              <div className="mt-1">
                <span className="font-semibold">Away club:</span>{" "}
                {createState.mySide === "home" ? opponentLabel : myClubLabel}
              </div>
            </div>
          </div>

          <div className={sectionClass()}>
            <h2 className="text-lg font-bold text-white">2. Datos base</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Fecha y hora</span>
                <input
                  type="datetime-local"
                  value={createState.date}
                  onChange={(e) => updateCreateField("date", e.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Estadio</span>
                <input
                  value={createState.stadium}
                  onChange={(e) => updateCreateField("stadium", e.target.value)}
                  className={inputClass()}
                  placeholder="Ej. Estadio Nacional"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Competición</span>
                <input
                  value={createState.competition}
                  onChange={(e) => updateCreateField("competition", e.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Estado</span>
                <select
                  value={createState.status}
                  onChange={(e) => updateCreateField("status", e.target.value)}
                  className={inputClass()}
                >
                  <option value="played">played</option>
                  <option value="scheduled">scheduled</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>

              <StatInput
                label="Score home"
                value={createState.scoreHome}
                onChange={(value) => updateCreateField("scoreHome", value)}
              />

              <StatInput
                label="Score away"
                value={createState.scoreAway}
                onChange={(value) => updateCreateField("scoreAway", value)}
              />
            </div>
          </div>

          <div className={sectionClass()}>
            <h2 className="text-lg font-bold text-white">3. Team stats</h2>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="text-sm font-semibold text-white">Home</div>

                <StatInput label="Posesión" value={createState.teamStats.home.possession} onChange={(value) => updateCreateTeamStats("home", "possession", value)} />
                <StatInput label="Tiros" value={createState.teamStats.home.shots} onChange={(value) => updateCreateTeamStats("home", "shots", value)} />
                <StatInput label="Tiros al arco" value={createState.teamStats.home.shotsOnTarget} onChange={(value) => updateCreateTeamStats("home", "shotsOnTarget", value)} />
                <StatInput label="Pases" value={createState.teamStats.home.passes} onChange={(value) => updateCreateTeamStats("home", "passes", value)} />
                <StatInput label="Pases completados" value={createState.teamStats.home.passesCompleted} onChange={(value) => updateCreateTeamStats("home", "passesCompleted", value)} />
                <StatInput label="Faltas" value={createState.teamStats.home.fouls} onChange={(value) => updateCreateTeamStats("home", "fouls", value)} />
                <StatInput label="Corners" value={createState.teamStats.home.corners} onChange={(value) => updateCreateTeamStats("home", "corners", value)} />
                <StatInput label="Amarillas" value={createState.teamStats.home.yellowCards} onChange={(value) => updateCreateTeamStats("home", "yellowCards", value)} />
                <StatInput label="Rojas" value={createState.teamStats.home.redCards} onChange={(value) => updateCreateTeamStats("home", "redCards", value)} />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-white">Away</div>

                <StatInput label="Posesión" value={createState.teamStats.away.possession} onChange={(value) => updateCreateTeamStats("away", "possession", value)} />
                <StatInput label="Tiros" value={createState.teamStats.away.shots} onChange={(value) => updateCreateTeamStats("away", "shots", value)} />
                <StatInput label="Tiros al arco" value={createState.teamStats.away.shotsOnTarget} onChange={(value) => updateCreateTeamStats("away", "shotsOnTarget", value)} />
                <StatInput label="Pases" value={createState.teamStats.away.passes} onChange={(value) => updateCreateTeamStats("away", "passes", value)} />
                <StatInput label="Pases completados" value={createState.teamStats.away.passesCompleted} onChange={(value) => updateCreateTeamStats("away", "passesCompleted", value)} />
                <StatInput label="Faltas" value={createState.teamStats.away.fouls} onChange={(value) => updateCreateTeamStats("away", "fouls", value)} />
                <StatInput label="Corners" value={createState.teamStats.away.corners} onChange={(value) => updateCreateTeamStats("away", "corners", value)} />
                <StatInput label="Amarillas" value={createState.teamStats.away.yellowCards} onChange={(value) => updateCreateTeamStats("away", "yellowCards", value)} />
                <StatInput label="Rojas" value={createState.teamStats.away.redCards} onChange={(value) => updateCreateTeamStats("away", "redCards", value)} />
              </div>
            </div>
          </div>

          <div className={sectionClass()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">4. Player stats de mi club</h2>
              <button
                type="button"
                onClick={addPlayerStatRow}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Agregar jugador
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {createState.playerStats.map((row, index) => (
                <div
                  key={`ps-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">
                      Jugador {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePlayerStatRow(index)}
                      className="rounded-xl border border-red-500/30 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Jugador</span>
                      <select
                        value={row.user}
                        onChange={(e) =>
                          updatePlayerStatRow(index, { user: e.target.value })
                        }
                        className={inputClass()}
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
                      <span className="text-sm text-slate-300">Posición</span>
                      <input
                        className={inputClass()}
                        value={row.position}
                        onChange={(e) =>
                          updatePlayerStatRow(index, { position: e.target.value })
                        }
                      />
                    </label>

                    <StatInput
                      label="Rating"
                      value={row.rating}
                      onChange={(value) =>
                        updatePlayerStatRow(index, { rating: value })
                      }
                    />

                    <StatInput
                      label="Minutos"
                      value={row.minutesPlayed}
                      onChange={(value) =>
                        updatePlayerStatRow(index, { minutesPlayed: value })
                      }
                    />

                    <StatInput
                      label="Goles"
                      value={row.goals}
                      onChange={(value) =>
                        updatePlayerStatRow(index, { goals: value })
                      }
                    />

                    <StatInput
                      label="Asistencias"
                      value={row.assists}
                      onChange={(value) =>
                        updatePlayerStatRow(index, { assists: value })
                      }
                    />

                    <StatInput
                      label="Tiros"
                      value={row.shots}
                      onChange={(value) =>
                        updatePlayerStatRow(index, { shots: value })
                      }
                    />

                    <StatInput
                      label="Tiros al arco"
                      value={row.shotsOnTarget}
                      onChange={(value) =>
                        updatePlayerStatRow(index, { shotsOnTarget: value })
                      }
                    />

                    <StatInput
                      label="Pases"
                      value={row.passes}
                      onChange={(value) =>
                        updatePlayerStatRow(index, { passes: value })
                      }
                    />

                    <StatInput
                      label="Pases completados"
                      value={row.passesCompleted}
                      onChange={(value) =>
                        updatePlayerStatRow(index, { passesCompleted: value })
                      }
                    />

                    <StatInput
                      label="Intercepciones"
                      value={row.interceptions}
                      onChange={(value) =>
                        updatePlayerStatRow(index, { interceptions: value })
                      }
                    />

                    <StatInput
                      label="Recuperaciones"
                      value={row.recoveries}
                      onChange={(value) =>
                        updatePlayerStatRow(index, { recoveries: value })
                      }
                    />
                  </div>

                  <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={Boolean(row.isMVP)}
                      onChange={(e) =>
                        updatePlayerStatRow(index, { isMVP: e.target.checked })
                      }
                    />
                    Marcar como MVP
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
  <button
    type="submit"
    disabled={createSaving || loadingBase}
    className={primaryButtonClass("emerald")}
  >
    {createSaving ? "Guardando..." : "Guardar partido manual"}
  </button>

  <button
    type="button"
    onClick={resetCreateForm}
    disabled={createSaving}
    className={secondaryButtonClass()}
  >
    Limpiar
  </button>
</div>
        </form>
      </div>
    </section>
  );
}