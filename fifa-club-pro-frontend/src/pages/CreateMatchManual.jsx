import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
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
  return (Array.isArray(rows) ? rows : []).map((row) => ({
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

function cardClass() {
  return "rounded-2xl border border-white/10 bg-white/5 p-6";
}

function inputClass() {
  return "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/40";
}

export default function CreateMatchManual() {
  const navigate = useNavigate();
  const { clubContext } = useAuth();

  const myClubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";
  const isAllowed = role === "admin" || role === "captain";

  const [clubs, setClubs] = useState([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [baseError, setBaseError] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [competitionType, setCompetitionType] = useState("league");
  const [competitionId, setCompetitionId] = useState("");
  const [mySide, setMySide] = useState("home");
  const [opponentClub, setOpponentClub] = useState("");
  const [date, setDate] = useState("");
  const [stadium, setStadium] = useState("");
  const [competition, setCompetition] = useState("League");
  const [status, setStatus] = useState("played");
  const [scoreMine, setScoreMine] = useState(0);
  const [scoreOpponent, setScoreOpponent] = useState(0);

  useEffect(() => {
    async function loadBase() {
      try {
        setLoadingBase(true);
        setBaseError("");

        const { data } = await api.get("/clubs");
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.clubs)
          ? data.clubs
          : [];

        setClubs(list);
      } catch (err) {
        console.error(err);
        setBaseError("No se pudieron cargar los clubes.");
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
    const found = clubOptions.find((club) => club.id === opponentClub);
    return found?.label || "—";
  }, [clubOptions, opponentClub]);

  const resolvedHomeClub = mySide === "home" ? myClubId : opponentClub;
  const resolvedAwayClub = mySide === "home" ? opponentClub : myClubId;

  const resolvedHomeLabel = mySide === "home" ? myClubLabel : opponentLabel;
  const resolvedAwayLabel = mySide === "home" ? opponentLabel : myClubLabel;

  const resolvedScoreHome =
    mySide === "home"
      ? normalizeNumber(scoreMine, 0)
      : normalizeNumber(scoreOpponent, 0);

  const resolvedScoreAway =
    mySide === "home"
      ? normalizeNumber(scoreOpponent, 0)
      : normalizeNumber(scoreMine, 0);

  function resetForm() {
    setCompetitionType("league");
    setCompetitionId("");
    setMySide("home");
    setOpponentClub("");
    setDate("");
    setStadium("");
    setCompetition("League");
    setStatus("played");
    setScoreMine(0);
    setScoreOpponent(0);
    setError("");
    setOk("");
  }

  function validateForm() {
    if (!myClubId) return "No tienes club activo.";
    if (!isAllowed) return "Solo admin o captain pueden crear partidos.";
    if (!opponentClub) return "Debes seleccionar el club rival.";
    if (!date) return "Debes indicar fecha y hora.";
    if (!stadium.trim()) return "Debes indicar estadio.";
    if (resolvedHomeClub === resolvedAwayClub) {
      return "El rival no puede ser el mismo club.";
    }
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setOk("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setOk("");

      const payload = {
        homeClub: resolvedHomeClub,
        awayClub: resolvedAwayClub,
        date,
        stadium: stadium.trim(),
        competition: competition.trim() || "League",
        status: status || "played",
        scoreHome: resolvedScoreHome,
        scoreAway: resolvedScoreAway,
        teamStats: {
          home: createEmptyTeamStats(),
          away: createEmptyTeamStats(),
        },
        lineups: {
          home: { formation: "", players: [] },
          away: { formation: "", players: [] },
        },
        playerStats: [],
        strictTotals: false,
      };

      await api.post(`/matches/clubs/${myClubId}`, payload);

      setOk("Partido manual creado correctamente.");
      setTimeout(() => navigate("/matches"), 900);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo crear el partido."
      );
      setOk("");
    } finally {
      setSaving(false);
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
            No tienes club activo. Debes seleccionar un club para usar este flujo.
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
              Registro manual limpio, separado del flujo IA, alineado con la lógica
              del proyecto.
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
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-sm font-semibold text-emerald-100">
            Base de carga manual creada correctamente
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Desde aquí puedes registrar el partido sin IA, manteniendo el flujo
            separado, ordenado y fácil de mantener.
          </p>
        </div>

        {baseError ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {baseError}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {ok ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {ok}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
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
                  value={mySide}
                  onChange={(e) => setMySide(e.target.value)}
                  className={inputClass()}
                >
                  <option value="home">Local</option>
                  <option value="away">Visita</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Club rival</span>
                <select
                  value={opponentClub}
                  onChange={(e) => setOpponentClub(e.target.value)}
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
                {resolvedHomeLabel}
              </div>
              <div className="mt-1">
                <span className="font-semibold">Away club:</span>{" "}
                {resolvedAwayLabel}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-lg font-bold text-white">2. Datos base</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Fecha y hora</span>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Estadio</span>
                <input
                  value={stadium}
                  onChange={(e) => setStadium(e.target.value)}
                  className={inputClass()}
                  placeholder="Ej. Estadio Nacional"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Competición</span>
                <input
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Estado</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputClass()}
                >
                  <option value="played">played</option>
                  <option value="scheduled">scheduled</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-lg font-bold text-white">3. Marcador</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Goles de mi club</span>
                <input
                  type="number"
                  value={scoreMine}
                  onChange={(e) => setScoreMine(e.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Goles del rival</span>
                <input
                  type="number"
                  value={scoreOpponent}
                  onChange={(e) => setScoreOpponent(e.target.value)}
                  className={inputClass()}
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
              <div>
                <span className="font-semibold">Score final:</span>{" "}
                {resolvedScoreHome} - {resolvedScoreAway}
              </div>
              <div className="mt-1 text-slate-300">
                Se resuelve automáticamente según si tu club fue local o visita.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || loadingBase}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar partido manual"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-xl border border-white/10 px-5 py-2.5 font-semibold text-white hover:bg-white/10 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}