import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { parseMatchImages } from "../services/aiMatchImport";

function safeText(value = "") {
  return String(value || "").trim();
}

function normalizeName(value = "") {
  return safeText(value).toLowerCase();
}

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

function computePercent(part, total) {
  const a = Number(part);
  const b = Number(total);

  if (Number.isNaN(a) || Number.isNaN(b) || b <= 0) return 0;
  return Math.round((a / b) * 100);
}

function buildSideTeamStats(raw = {}) {
  const base = createEmptyTeamStats();

  const shots = normalizeNumber(raw.shots, 0);
  const shotsOnTarget = normalizeNumber(raw.shotsOnTarget, 0);
  const passes = normalizeNumber(raw.passes, 0);
  const passesCompleted = normalizeNumber(raw.passesCompleted, 0);
  const tackles = normalizeNumber(raw.tackles, 0);
  const tacklesWon = normalizeNumber(raw.tacklesWon, 0);

  return {
    ...base,
    possession: normalizeNumber(raw.possession, 0),
    shots,
    shotsOnTarget,
    shotAccuracy:
      raw.shotAccuracy != null
        ? normalizeNumber(raw.shotAccuracy, 0)
        : computePercent(shotsOnTarget, shots),
    expectedGoals: normalizeNumber(raw.expectedGoals, 0),
    passes,
    passesCompleted,
    passAccuracy:
      raw.passAccuracy != null
        ? normalizeNumber(raw.passAccuracy, 0)
        : computePercent(passesCompleted, passes),
    dribbleSuccess: normalizeNumber(raw.dribbleSuccess, 0),
    tackles,
    tacklesWon,
    tackleSuccess: computePercent(tacklesWon, tackles),
    recoveries: normalizeNumber(raw.recoveries, 0),
    interceptions: normalizeNumber(raw.interceptions, 0),
    clearances: normalizeNumber(raw.clearances, 0),
    blocks: normalizeNumber(raw.blocks, 0),
    saves: normalizeNumber(raw.saves, 0),
    fouls: normalizeNumber(raw.fouls, 0),
    offsides: normalizeNumber(raw.offsides, 0),
    corners: normalizeNumber(raw.corners, 0),
    freeKicks: normalizeNumber(raw.freeKicks, 0),
    penalties: normalizeNumber(raw.penalties, 0),
    yellowCards: normalizeNumber(raw.yellowCards, 0),
    redCards: normalizeNumber(raw.redCards, 0),
  };
}

function buildImportedTeamStats(aiStats = {}, mySide = "home") {
  const detectedHome = buildSideTeamStats({
    possession: aiStats?.possessionHome,
    shots: aiStats?.shotsHome,
    shotsOnTarget: aiStats?.shotsOnTargetHome,
    shotAccuracy: aiStats?.shotAccuracyHome,
    expectedGoals: aiStats?.xgHome,
    passes: aiStats?.passesHome,
    passesCompleted: aiStats?.passesCompletedHome,
    passAccuracy: aiStats?.passAccuracyHome,
    dribbleSuccess: aiStats?.dribbleSuccessHome,
    tackles: aiStats?.tacklesHome,
    tacklesWon: aiStats?.tacklesWonHome,
    recoveries: aiStats?.recoveriesHome,
    interceptions: aiStats?.interceptionsHome,
    clearances: aiStats?.clearancesHome,
    blocks: aiStats?.blocksHome,
    saves: aiStats?.savesHome,
    fouls: aiStats?.foulsHome,
    offsides: aiStats?.offsidesHome,
    corners: aiStats?.cornersHome,
    freeKicks: aiStats?.freeKicksHome,
    penalties: aiStats?.penaltiesHome,
    yellowCards: aiStats?.yellowCardsHome,
    redCards: aiStats?.redCardsHome,
  });

  const detectedAway = buildSideTeamStats({
    possession: aiStats?.possessionAway,
    shots: aiStats?.shotsAway,
    shotsOnTarget: aiStats?.shotsOnTargetAway,
    shotAccuracy: aiStats?.shotAccuracyAway,
    expectedGoals: aiStats?.xgAway,
    passes: aiStats?.passesAway,
    passesCompleted: aiStats?.passesCompletedAway,
    passAccuracy: aiStats?.passAccuracyAway,
    dribbleSuccess: aiStats?.dribbleSuccessAway,
    tackles: aiStats?.tacklesAway,
    tacklesWon: aiStats?.tacklesWonAway,
    recoveries: aiStats?.recoveriesAway,
    interceptions: aiStats?.interceptionsAway,
    clearances: aiStats?.clearancesAway,
    blocks: aiStats?.blocksAway,
    saves: aiStats?.savesAway,
    fouls: aiStats?.foulsAway,
    offsides: aiStats?.offsidesAway,
    corners: aiStats?.cornersAway,
    freeKicks: aiStats?.freeKicksAway,
    penalties: aiStats?.penaltiesAway,
    yellowCards: aiStats?.yellowCardsAway,
    redCards: aiStats?.redCardsAway,
  });

  if (mySide === "away") {
    return {
      home: detectedAway,
      away: detectedHome,
    };
  }

  return {
    home: detectedHome,
    away: detectedAway,
  };
}

function countImportedStats(stats = {}) {
  const values = Object.values(stats || {});
  return values.filter(
    (value) => value !== null && value !== undefined && Number(value) !== 0
  ).length;
}

function cardClass() {
  return "rounded-2xl border border-white/10 bg-white/5 p-6";
}

function inputClass() {
  return "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/40";
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

export default function CreateMatchFromImages() {
  const navigate = useNavigate();
  const { clubContext } = useAuth();

  const myClubId = clubContext?.clubId || "";
  const role = clubContext?.role || "";
  const isAllowed = role === "admin" || role === "captain";

  const [competitionType, setCompetitionType] = useState("league");
  const [competitionId, setCompetitionId] = useState("");
  const [mySide, setMySide] = useState("home");
  const [opponentClub, setOpponentClub] = useState("");
  const [images, setImages] = useState([]);

  const [date, setDate] = useState("");
  const [stadium, setStadium] = useState("");
  const [competition, setCompetition] = useState("League");
  const [status, setStatus] = useState("played");

  const [detectedOpponentName, setDetectedOpponentName] = useState("");
  const [showMissingClubHint, setShowMissingClubHint] = useState(false);

  const [clubs, setClubs] = useState([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [baseError, setBaseError] = useState("");

  const [loadingIA, setLoadingIA] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [confirmLowConfidence, setConfirmLowConfidence] = useState(false);

  useEffect(() => {
    async function loadClubs() {
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
      loadClubs();
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

  const selectedOpponent = useMemo(() => {
    return clubOptions.find((club) => club.id === opponentClub) || null;
  }, [clubOptions, opponentClub]);

  const selectedOpponentLabel = selectedOpponent?.label || "—";
  const selectedImagesCount = images.length;

  const detectedScoreHome = aiResult?.matchDraft?.scoreHome;
  const detectedScoreAway = aiResult?.matchDraft?.scoreAway;
  const confidenceOverall = Number(aiResult?.confidence?.overall ?? 0);
  const confidenceScore = Number(aiResult?.confidence?.score ?? 0);
  const confidenceStats = Number(aiResult?.confidence?.stats ?? 0);
  const aiNotes = Array.isArray(aiResult?.notes) ? aiResult.notes : [];

  const hasDetectedScore =
    detectedScoreHome !== null &&
    detectedScoreHome !== undefined &&
    detectedScoreAway !== null &&
    detectedScoreAway !== undefined;

  const finalScoreHome = useMemo(() => {
    if (!hasDetectedScore) return null;
    return mySide === "away"
      ? normalizeNumber(detectedScoreAway, 0)
      : normalizeNumber(detectedScoreHome, 0);
  }, [hasDetectedScore, detectedScoreHome, detectedScoreAway, mySide]);

  const finalScoreAway = useMemo(() => {
    if (!hasDetectedScore) return null;
    return mySide === "away"
      ? normalizeNumber(detectedScoreHome, 0)
      : normalizeNumber(detectedScoreAway, 0);
  }, [hasDetectedScore, detectedScoreHome, detectedScoreAway, mySide]);

  const resolvedHomeClub = mySide === "home" ? myClubId : opponentClub;
  const resolvedAwayClub = mySide === "home" ? opponentClub : myClubId;

  const resolvedHomeLabel = mySide === "home" ? myClubLabel : selectedOpponentLabel;
  const resolvedAwayLabel = mySide === "home" ? selectedOpponentLabel : myClubLabel;

  const rivalMatchesSelection = useMemo(() => {
    if (!detectedOpponentName || !selectedOpponentLabel || selectedOpponentLabel === "—") {
      return null;
    }
    return normalizeName(detectedOpponentName) === normalizeName(selectedOpponentLabel);
  }, [detectedOpponentName, selectedOpponentLabel]);

    const importedTeamStats = useMemo(() => {
    return buildImportedTeamStats(aiResult?.matchDraft?.stats || {}, mySide);
  }, [aiResult, mySide]);

  const importedStatsCount = useMemo(() => {
    const homeCount = countImportedStats(importedTeamStats?.home);
    const awayCount = countImportedStats(importedTeamStats?.away);
    return homeCount + awayCount;
  }, [importedTeamStats]);

  const scoreLooksUsable = hasDetectedScore;
    const statsLookUsable = importedStatsCount >= 6 || confidenceStats >= 0.5;

  useEffect(() => {
    if (!detectedOpponentName) {
      setShowMissingClubHint(false);
      return;
    }

    const exists = clubs.some(
      (club) => normalizeName(club?.name) === normalizeName(detectedOpponentName)
    );

    setShowMissingClubHint(!exists);
  }, [detectedOpponentName, clubs]);

  function resetForm() {
    setCompetitionType("league");
    setCompetitionId("");
    setMySide("home");
    setOpponentClub("");
    setImages([]);
    setDate("");
    setStadium("");
    setCompetition("League");
    setStatus("played");
    setDetectedOpponentName("");
    setShowMissingClubHint(false);
    setAiResult(null);
    setError("");
    setOk("");
    setConfirmLowConfidence(false);
  }

  function resolveDetectedOpponentName(data) {
    const homeName = safeText(data?.matchDraft?.homeClub?.name);
    const awayName = safeText(data?.matchDraft?.awayClub?.name);

    if (homeName && awayName) return awayName;
    if (awayName) return awayName;
    if (homeName) return homeName;
    return "";
  }

  async function handleProcessImages() {
    try {
      setLoadingIA(true);
      setError("");
      setOk("");
      setAiResult(null);
      setDetectedOpponentName("");
      setShowMissingClubHint(false);
      setConfirmLowConfidence(false);

      if (!opponentClub) {
        setError("Debes seleccionar el club rival.");
        return;
      }

      if (!images.length) {
        setError("Debes subir imágenes.");
        return;
      }

      const data = await parseMatchImages({
        images,
        clubId: myClubId,
      });

      setAiResult(data);

      const detectedName = resolveDetectedOpponentName(data);
      if (detectedName) {
        setDetectedOpponentName(detectedName);
      }
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Error procesando imágenes."
      );
    } finally {
      setLoadingIA(false);
    }
  }

  function validateSave() {
    if (!myClubId) return "No tienes club activo.";
    if (!isAllowed) return "Solo admin o captain pueden crear partidos.";
    if (!opponentClub) return "Debes seleccionar el club rival.";
    if (!date) return "Debes indicar fecha y hora.";
    if (!stadium.trim()) return "Debes indicar estadio.";
    if (resolvedHomeClub === resolvedAwayClub) return "El rival no puede ser el mismo club.";
    if (!scoreLooksUsable || finalScoreHome == null || finalScoreAway == null) {
      return "Primero debes procesar imágenes para obtener un marcador usable.";
    }
    if (confidenceOverall < 0.5 && !confirmLowConfidence) {
      return "Debes confirmar manualmente que quieres guardar un resultado con baja confianza.";
    }
    return "";
  }

  async function handleSaveImportedMatch() {
    const validationError = validateSave();
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
        status: status || aiResult?.matchDraft?.status || "played",
        scoreHome: finalScoreHome,
        scoreAway: finalScoreAway,
                teamStats: importedTeamStats,
        lineups: {
          home: { formation: "", players: [] },
          away: { formation: "", players: [] },
        },
        playerStats: [],
        strictTotals: false,
      };

      await api.post(`/matches/clubs/${myClubId}`, payload);

      setOk("Partido importado creado correctamente.");
      setTimeout(() => navigate("/matches"), 900);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo guardar el partido importado."
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
            Crear partido por imágenes
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            No tienes club activo. Debes tener un club seleccionado para usar
            este flujo.
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
            Crear partido por imágenes
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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
        FIFA Club Pro
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
        Crear partido por imágenes
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
        Flujo guiado: el sistema define el contexto del partido y la IA ayuda
        con el marcador, manteniendo el control manual antes de guardar.
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
        {baseError ? (
          <div className={errorBoxClass()}>
            {baseError}
          </div>
        ) : null}

        {error ? (
          <div className={errorBoxClass()}>
            {error}
          </div>
        ) : null}

        {ok ? (
          <div className={successBoxClass()}>
            {ok}
          </div>
        ) : null}

        <div className="space-y-7">
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
                <span className="font-semibold">Home club final:</span>{" "}
                {resolvedHomeLabel}
              </div>
              <div className="mt-1">
                <span className="font-semibold">Away club final:</span>{" "}
                {resolvedAwayLabel}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-lg font-bold text-white">2. Datos base del partido</h2>

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

          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
            <h2 className="text-lg font-bold text-sky-100">3. Importación por imágenes</h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
  La IA se usa como apoyo para detectar el marcador. El rival, la condición
  local/visita y el contexto del partido los define el sistema para evitar
  errores de OCR.
</p>

            <div className="mt-4 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Imágenes</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setImages(files);
                  }}
                  className="block w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </label>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
                {selectedImagesCount > 0
                  ? `${selectedImagesCount} imagen(es) seleccionada(s)`
                  : "Todavía no has seleccionado imágenes"}
              </div>

              {aiResult ? (
  <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5 text-sm text-emerald-100">
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
          Lectura IA
        </div>
        <div className="mt-2 text-base font-bold text-white">
          {detectedScoreHome ?? "-"} - {detectedScoreAway ?? "-"}
        </div>
        <div className="mt-2 text-slate-300">
          Score detectado por IA
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
          Resultado final
        </div>
        <div className="mt-2 text-base font-bold text-white">
          {finalScoreHome ?? "-"} - {finalScoreAway ?? "-"}
        </div>
        <div className="mt-2 text-slate-300">
          Score resuelto según local / visita
        </div>
      </div>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
          Confianza general
        </div>
        <div className="mt-2 text-base font-bold text-white">
          {confidenceOverall}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
          Confianza score
        </div>
        <div className="mt-2 text-base font-bold text-white">
          {confidenceScore}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
          Estado detectado
        </div>
        <div className="mt-2 text-base font-bold text-white">
          {aiResult?.matchDraft?.status || "—"}
        </div>
      </div>
    </div>

    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
        Team stats importados
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold text-white">Home</div>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            <div>Posesión: {importedTeamStats.home.possession}</div>
            <div>Tiros: {importedTeamStats.home.shots}</div>
            <div>xG: {importedTeamStats.home.expectedGoals}</div>
            <div>Pases: {importedTeamStats.home.passes}</div>
            <div>Precisión pase: {importedTeamStats.home.passAccuracy}%</div>
            <div>Entradas: {importedTeamStats.home.tackles}</div>
            <div>Recuperaciones: {importedTeamStats.home.recoveries}</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold text-white">Away</div>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            <div>Posesión: {importedTeamStats.away.possession}</div>
            <div>Tiros: {importedTeamStats.away.shots}</div>
            <div>xG: {importedTeamStats.away.expectedGoals}</div>
            <div>Pases: {importedTeamStats.away.passes}</div>
            <div>Precisión pase: {importedTeamStats.away.passAccuracy}%</div>
            <div>Entradas: {importedTeamStats.away.tackles}</div>
            <div>Recuperaciones: {importedTeamStats.away.recoveries}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-400">
        Campos detectados con valor distinto de 0: {importedStatsCount}
      </div>
    </div>


    {!statsLookUsable ? (
      <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
        Los stats detectados por IA no se usarán en esta etapa porque la
        confianza sigue siendo baja.
      </div>
    ) : null}

    {confidenceOverall < 0.5 ? (
      <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
        La IA respondió con baja confianza general. Revisa el marcador antes de
        guardar.
      </div>
    ) : null}
  </div>
) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <h2 className="text-lg font-bold text-amber-100">
              4. Validación visual del rival detectado
            </h2>

            <p className="mt-2 text-sm text-slate-300">
              Si la IA detecta un nombre de club que no existe en la base de
              datos, se mostrará aquí como aviso visual. No se creará
              automáticamente.
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
              <div>
                <span className="font-semibold text-white">
                  Club detectado por IA:
                </span>{" "}
                {detectedOpponentName || "—"}
              </div>

              <div className="mt-2">
                <span className="font-semibold text-white">
                  Estado en base de datos:
                </span>{" "}
                {detectedOpponentName
                  ? showMissingClubHint
                    ? "No encontrado"
                    : "Existe en la base de datos"
                  : "Sin validar todavía"}
              </div>

              <div className="mt-2">
                <span className="font-semibold text-white">
                  Club rival elegido:
                </span>{" "}
                {selectedOpponentLabel}
              </div>

              <div className="mt-2">
                <span className="font-semibold text-white">
                  Coincide IA vs selección:
                </span>{" "}
                {rivalMatchesSelection === null
                  ? "Sin validar todavía"
                  : rivalMatchesSelection
                  ? "Sí"
                  : "No"}
              </div>
            </div>

            {showMissingClubHint ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                El club detectado no existe en la base de datos. Puedes crearlo
                manualmente si quieres usarlo en liga, torneo, tabla o nuevos
                partidos.
              </div>
            ) : null}

            {rivalMatchesSelection === false ? (
              <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                El rival detectado por IA no coincide con el rival que
                seleccionaste. Revisa las imágenes antes de guardar.
              </div>
            ) : null}
          </div>

          {aiNotes.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-bold text-white">5. Notas del procesamiento IA</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                {aiNotes.slice(0, 8).map((note, index) => (
                  <div
                    key={`${index}-${note}`}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {aiResult && confidenceOverall < 0.5 ? (
            <label className="flex items-start gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-100">
              <input
                type="checkbox"
                checked={confirmLowConfidence}
                onChange={(e) => setConfirmLowConfidence(e.target.checked)}
                className="mt-1"
              />
              <span>
                Confirmo manualmente que revisé el marcador y quiero guardar el
                partido aunque la IA tenga baja confianza.
              </span>
            </label>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
  <button
    type="button"
    onClick={handleProcessImages}
    disabled={loadingIA}
    className={primaryButtonClass("sky")}
  >
    {loadingIA ? "Procesando..." : "Procesar imágenes"}
  </button>

  <button
    type="button"
    onClick={handleSaveImportedMatch}
    disabled={saving || !aiResult}
    className={primaryButtonClass("emerald")}
  >
    {saving ? "Guardando..." : "Guardar partido importado"}
  </button>

  <button
    type="button"
    onClick={resetForm}
    disabled={loadingIA || saving}
    className={secondaryButtonClass()}
  >
    Limpiar
  </button>
</div>
        </div>
      </div>
    </section>
  );
}