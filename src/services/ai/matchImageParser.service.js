// src/services/ai/matchImageParser.service.js
const {
  getBaseConfidenceByType,
  buildFieldConfidence,
} = require("../../utils/ai/confidence.js");
const { readImageText } = require("./ocr.service");

/**
 * =====================================================
 * MATCH IMAGE PARSER SERVICE
 * -----------------------------------------------------
 * V2 OCR:
 * - Usa OCR real sobre la imagen
 * - Intenta extraer:
 *   - scoreHome
 *   - scoreAway
 *   - status
 *   - nombres probables de clubes
 *
 * Importante:
 * - Esta versión NO será perfecta.
 * - Priorizamos scoreboard_summary y final_overview_screen.
 * - Luego ampliamos a possession/shots/passes/defense.
 * =====================================================
 */

/**
 * Dado un texto OCR, intenta encontrar un marcador.
 * Soporta ejemplos:
 * - 2-1
 * - 2 : 1
 * - 2–1
 * - 2 1 (solo si contexto ayuda)
 */
function isValidScoreNumber(value) {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 30
  );
}

function extractScoreFromText(text = "") {
  const normalized = String(text)
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return {
      home: null,
      away: null,
      method: null,
      confidence: 0,
    };
  }

  // 1) Máxima prioridad:
  // "KKTeam Vs 3 : 7 Vs Fecha Libre"
  const vsScoreVsMatch = normalized.match(
    /.+?\bvs\b\s*(\d{1,2})\s*[:\-–]\s*(\d{1,2})\s*\bvs\b\s*.+/i
  );

  if (vsScoreVsMatch) {
    const home = Number(vsScoreVsMatch[1]);
    const away = Number(vsScoreVsMatch[2]);

    if (isValidScoreNumber(home) && isValidScoreNumber(away)) {
      return {
        home,
        away,
        method: "vs_score_vs",
        confidence: 0.9,
      };
    }
  }

  // 2) Segunda prioridad:
  // score clásico "3 : 7"
  const classicMatch = normalized.match(/(\d{1,2})\s*[:\-–]\s*(\d{1,2})/);

  if (classicMatch) {
    const home = Number(classicMatch[1]);
    const away = Number(classicMatch[2]);

    if (isValidScoreNumber(home) && isValidScoreNumber(away)) {
      return {
        home,
        away,
        method: "classic_pair",
        confidence: 0.55,
      };
    }
  }

  // 3) Última prioridad:
  // "3 7" solo como fallback
  const looseMatch = normalized.match(/\b(\d{1,2})\s+(\d{1,2})\b/);

  if (looseMatch) {
    const home = Number(looseMatch[1]);
    const away = Number(looseMatch[2]);

    if (isValidScoreNumber(home) && isValidScoreNumber(away)) {
      return {
        home,
        away,
        method: "loose_pair",
        confidence: 0.25,
      };
    }
  }

  return {
    home: null,
    away: null,
    method: null,
    confidence: 0,
  };
}

/**
 * Detecta si el texto sugiere partido finalizado.
 */
function extractMatchStatus(text = "") {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("full time") ||
    normalized.includes("match finished") ||
    normalized.includes("final") ||
    normalized.includes("ft")
  ) {
    return "final";
  }

  return null;
}

/**
 * Filtra líneas OCR candidatas a nombre de club.
 */
function extractClubCandidates(lines = []) {
  return lines
    .map((line) => cleanClubCandidate(line?.text || ""))
    .filter(Boolean)
    .filter((line) => line.length >= 2 && line.length <= 40)
    .filter((line) => !/^\d+$/.test(line))
    .filter(
      (line) =>
        ![
          "full time",
          "match finished",
          "final",
          "summary",
          "overview",
          "resumen",
          "posesion",
          "posesión",
          "shots",
          "passes",
          "defense",
          "defensa",
          "stats",
          "statistics",
          "eventos",
          "tiros",
          "pases",
        ].includes(line.toLowerCase())
    );
}

/**
 * Heurística simple:
 * toma las primeras 2 líneas candidatas como clubes.
 * Es imperfecto, pero útil como V2.
 */
function cleanClubCandidate(value = "") {
  return String(value)
    .replace(/[|[\]{}()<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cutAtSectionKeyword(value = "") {
  let cleaned = cleanClubCandidate(value);

  const sectionPattern =
    /\b(resumen|posesi[oó]n|tiros|pases|defens[ae]|eventos|statistics|stats|overview|summary)\b/i;

  const sectionMatch = cleaned.match(sectionPattern);
  if (sectionMatch) {
    cleaned = cleaned.slice(0, sectionMatch.index).trim();
  }

  // Corta si aparece una secuencia rara típica de OCR roto
  cleaned = cleaned.replace(/\b[eE][sS][pP]\b.*$/i, "").trim();

  // Corta si aparecen números largos después del nombre
  cleaned = cleaned.replace(/\s+\d{3,}.*$/i, "").trim();

  // Corta si aparece una repetición rara de letras mayúsculas
  cleaned = cleaned.replace(/\s+[A-Z]{2,}(?:\s+[A-Z]{2,})+.*$/i, "").trim();

  // Limpieza final de basura al final
  cleaned = cleaned.replace(/[-–—\s]+$/g, "").trim();

  return cleaned || null;
}

function extractClubNamesFromText(text = "") {
  const normalized = cleanOCRText(text);

  // Detecta "A vs B"
  const vsMatch = normalized.match(
    /([a-z0-9\s]{3,40})\s+vs\s+[0-9]{1,2}\s*[:\-–]\s*[0-9]{1,2}\s+([a-z0-9\s]{3,40})/i
  );

  if (vsMatch) {
    return {
      home: vsMatch[1].trim(),
      away: vsMatch[2].trim(),
    };
  }

  // fallback: líneas OCR
  const words = normalized.split(" ");

  const candidates = words.filter(
    (w) =>
      w.length > 3 &&
      !/\d/.test(w) &&
      !["vs", "resumen", "posesion", "tiros", "pases"].includes(w)
  );

  if (candidates.length >= 2) {
    return {
      home: candidates[0],
      away: candidates[1],
    };
  }

  return { home: null, away: null };
}

function extractClubNamesFromLines(lines = [], text = "") {
  const fromText = extractClubNamesFromText(text);
  if (fromText.home || fromText.away) {
    return fromText;
  }

  const candidates = extractClubCandidates(lines);

  if (candidates.length >= 2) {
    return {
      home: candidates[0],
      away: candidates[1],
    };
  }

  return {
    home: null,
    away: null,
  };
}

function cleanOCRText(text = "") {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s:%.\-]/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function normalizeOcrTextForStats(text = "") {
  return cleanOCRText(text);
}

function labelToRegex(label = "") {
  return String(label)
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
}

function toSafeNumber(value, allowFloat = false) {
  if (value == null || value === "") return null;
  const parsed = allowFloat ? Number(value) : Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function detectImageType(text = "") {
  const normalized = cleanOCRText(text);

  if (!normalized) return "unknown";

  if (
    normalized.includes("pases en general") ||
    normalized.includes("total de pases") ||
    normalized.includes("completados") ||
    normalized.includes("interceptados") ||
    normalized.includes("precision de pases")
  ) {
    return "passes_screen";
  }

  if (
    normalized.includes("defensa en general") ||
    normalized.includes("entradas de frente") ||
    normalized.includes("entradas con exito") ||
    normalized.includes("recuperaciones") ||
    normalized.includes("bloqueos") ||
    normalized.includes("despejes") ||
    normalized.includes("atajadas") ||
    normalized.includes("tarjetas amarillas") ||
    normalized.includes("tarjetas rojas")
  ) {
    return "defense_screen";
  }

  if (
    normalized.includes("posesion total") ||
    normalized.includes("% de posesion") ||
    normalized.includes("amenaza") ||
    normalized.includes("global posesion")
  ) {
    return "possession_screen";
  }

  if (
    normalized.includes("tiros a puerta") ||
    normalized.includes("precision en tiros")
  ) {
    return "shots_screen";
  }

  if (
    normalized.includes("resumen") ||
    normalized.includes("goles esperados") ||
    normalized.includes("tasa de exito en regates") ||
    normalized.includes("precision de pases") ||
    normalized.includes("precision en tiros")
  ) {
    return "scoreboard_summary";
  }

  return "unknown";
}

function extractLabeledPair(text = "", labels = [], options = {}) {
  const { allowFloat = false } = options;
  const normalized = normalizeOcrTextForStats(text);

  const numberPattern = allowFloat
    ? "(\\d{1,3}(?:\\.\\d+)?)"
    : "(\\d{1,3})";

  for (const label of labels) {
    const labelRegex = labelToRegex(label);

    const regex = new RegExp(
      `${numberPattern}\\s*${labelRegex}\\s*${numberPattern}`,
      "i"
    );

    const match = normalized.match(regex);

    if (match) {
      const home = toSafeNumber(match[1], allowFloat);
      const away = toSafeNumber(match[2], allowFloat);

      if (home !== null && away !== null) {
        return { home, away };
      }
    }
  }

  return { home: null, away: null };
}

function extractRepeatedPercentMetric(text = "", labels = []) {
  const normalized = normalizeOcrTextForStats(text);

  for (const label of labels) {
    const labelRegex = labelToRegex(label);
    const regex = new RegExp(`(\\d{1,3})\\s*%\\s*${labelRegex}`, "gi");

    const values = [];
    let match;

    while ((match = regex.exec(normalized)) !== null) {
      const value = Number(match[1]);
      if (Number.isInteger(value) && value >= 0 && value <= 100) {
        values.push(value);
      }
    }

    if (values.length >= 2) {
      return {
        home: values[0],
        away: values[1],
      };
    }
  }

  return { home: null, away: null };
}

function pickPair(primary = {}, fallback = {}) {
  return {
    home:
      primary?.home !== null && primary?.home !== undefined
        ? primary.home
        : fallback?.home ?? null,
    away:
      primary?.away !== null && primary?.away !== undefined
        ? primary.away
        : fallback?.away ?? null,
  };
}

function extractPossessionFromText(text = "") {
  const normalized = normalizeOcrTextForStats(text);

  // Caso 1: pantalla de posesión tipo "45% POSESION TOTAL 55%"
  const sidePair = normalized.match(
    /(\d{1,3})\s*%\s*(?:posesion total|posesion|global)[\s\S]{0,80}(\d{1,3})\s*%/i
  );

  if (sidePair) {
    const home = Number(sidePair[1]);
    const away = Number(sidePair[2]);

    if (
      Number.isInteger(home) &&
      Number.isInteger(away) &&
      home >= 0 &&
      away >= 0 &&
      home <= 100 &&
      away <= 100 &&
      home + away >= 90 &&
      home + away <= 110
    ) {
      return {
        possessionHome: home,
        possessionAway: away,
      };
    }
  }

  // Caso 2: línea central tipo "52 % de posesion 48"
  const centralPair = normalized.match(
    /(\d{1,3})\s*(?:%|)\s*(?:de\s*)?posesi\w*\s*(\d{1,3})/i
  );

  if (centralPair) {
    const home = Number(centralPair[1]);
    const away = Number(centralPair[2]);

    if (
      Number.isInteger(home) &&
      Number.isInteger(away) &&
      home >= 0 &&
      away >= 0 &&
      home <= 100 &&
      away <= 100 &&
      home + away >= 90 &&
      home + away <= 110
    ) {
      return {
        possessionHome: home,
        possessionAway: away,
      };
    }
  }

  // Caso 3: fallback buscando dos porcentajes que sumen ~100
  const percents = [...normalized.matchAll(/(\d{1,3})\s*%/g)].map((m) =>
    Number(m[1])
  );

  for (let i = 0; i < percents.length - 1; i += 1) {
    const home = percents[i];
    const away = percents[i + 1];
    const total = home + away;

    if (
      Number.isInteger(home) &&
      Number.isInteger(away) &&
      total >= 90 &&
      total <= 110
    ) {
      return {
        possessionHome: home,
        possessionAway: away,
      };
    }
  }

  return {
    possessionHome: null,
    possessionAway: null,
  };
}

function extractShotsFromText(text = "") {
  const pair = extractLabeledPair(text, ["tiros", "shots"]);
  return {
    shotsHome: pair.home,
    shotsAway: pair.away,
  };
}

function extractXgFromText(text = "") {
  const pair = extractLabeledPair(
    text,
    ["goles esperados", "expected goals"],
    { allowFloat: true }
  );

  return {
    xgHome: pair.home,
    xgAway: pair.away,
  };
}

function extractPassesFromText(text = "") {
  const totalPasses = extractLabeledPair(text, ["total de pases", "pases"]);
  const completed = extractLabeledPair(text, ["completados"]);
  const intercepted = extractLabeledPair(text, ["interceptados"]);
  const freeStyleOffsides = extractLabeledPair(text, [
    "fuera de juego",
    "fueras de lugar",
  ]);

  const accuracy = extractRepeatedPercentMetric(text, [
  "precision de pases",
]);

  return {
    passesHome: totalPasses.home,
    passesAway: totalPasses.away,
    passesCompletedHome: completed.home,
    passesCompletedAway: completed.away,
    interceptionsHome: intercepted.home,
    interceptionsAway: intercepted.away,
    offsidesHome: freeStyleOffsides.home,
    offsidesAway: freeStyleOffsides.away,
  };
}

function extractDefenseFromText(text = "") {
  const tackles = pickPair(
    extractLabeledPair(text, ["entradas de frente", "entradas"]),
    extractLabeledPair(text, ["entradas"])
  );

  const tacklesWon = pickPair(
    extractLabeledPair(text, ["entradas de frente ganadas", "entradas con exito"]),
    extractLabeledPair(text, ["entradas con exito"])
  );

  const recoveries = extractLabeledPair(text, ["recuperaciones"]);
  const blocks = extractLabeledPair(text, ["bloqueos"]);
  const saves = extractLabeledPair(text, ["atajadas"]);
  const clearances = extractLabeledPair(text, ["despejes"]);
  const fouls = pickPair(
    extractLabeledPair(text, ["faltas cometidas"]),
    extractLabeledPair(text, ["faltas"])
  );
  const penalties = pickPair(
    extractLabeledPair(text, ["penales cometidos"]),
    extractLabeledPair(text, ["penales"])
  );
  const yellowCards = extractLabeledPair(text, ["tarjetas amarillas"]);
  const redCards = extractLabeledPair(text, ["tarjetas rojas"]);
  const corners = extractLabeledPair(text, ["tiros de esquina"]);
  const freeKicks = extractLabeledPair(text, ["tiros libres"]);
  const offsides = pickPair(
    extractLabeledPair(text, ["fueras de lugar"]),
    extractLabeledPair(text, ["fuera de juego"])
  );

  return {
    tacklesHome: tackles.home,
    tacklesAway: tackles.away,

    tacklesWonHome: tacklesWon.home,
    tacklesWonAway: tacklesWon.away,

    recoveriesHome: recoveries.home,
    recoveriesAway: recoveries.away,

    blocksHome: blocks.home,
    blocksAway: blocks.away,

    savesHome: saves.home,
    savesAway: saves.away,

    clearancesHome: clearances.home,
    clearancesAway: clearances.away,

    foulsHome: fouls.home,
    foulsAway: fouls.away,

    penaltiesHome: penalties.home,
    penaltiesAway: penalties.away,

    yellowCardsHome: yellowCards.home,
    yellowCardsAway: yellowCards.away,

    redCardsHome: redCards.home,
    redCardsAway: redCards.away,

    cornersHome: corners.home,
    cornersAway: corners.away,

    freeKicksHome: freeKicks.home,
    freeKicksAway: freeKicks.away,

    offsidesHome: offsides.home,
    offsidesAway: offsides.away,
  };
}

function extractCirclePercentsFromText(text = "") {
  const normalized = normalizeOcrTextForStats(text);

  function extractTwoPercentsAroundLabel(labelRegexSource) {
    const regex = new RegExp(
      `(\\d{1,3})\\s*%[\\s\\S]{0,80}${labelRegexSource}[\\s\\S]{0,120}(\\d{1,3})\\s*%`,
      "i"
    );

    const match = normalized.match(regex);
    if (!match) {
      return { home: null, away: null };
    }

    const home = Number(match[1]);
    const away = Number(match[2]);

    if (
      Number.isInteger(home) &&
      Number.isInteger(away) &&
      home >= 0 &&
      away >= 0 &&
      home <= 100 &&
      away <= 100
    ) {
      return { home, away };
    }

    return { home: null, away: null };
  }

  const dribble = extractTwoPercentsAroundLabel(
    "tasa\\s*de\\s*exito\\s*en\\s*regates|exito\\s*en\\s*regates|regates"
  );

  const shotAccuracy = extractTwoPercentsAroundLabel(
    "precision\\s*en\\s*tiros|precision\\s*de\\s*tiro|tiros"
  );

  const passAccuracy = extractTwoPercentsAroundLabel(
    "precision\\s*de\\s*pases|precision\\s*en\\s*pases|pases"
  );

  return {
    dribbleSuccessHome: dribble.home,
    dribbleSuccessAway: dribble.away,

    shotAccuracyHome: shotAccuracy.home,
    shotAccuracyAway: shotAccuracy.away,

    passAccuracyHome: passAccuracy.home,
    passAccuracyAway: passAccuracy.away,
  };
}

function extractStatsFromText(text = "") {
  const possession = extractPossessionFromText(text);
  const shots = extractShotsFromText(text);
  const xg = extractXgFromText(text);
  const passes = extractPassesFromText(text);
  const defense = extractDefenseFromText(text);
  const circles = extractCirclePercentsFromText(text);

  return {
    possessionHome: possession.possessionHome,
    possessionAway: possession.possessionAway,

    shotsHome: shots.shotsHome,
    shotsAway: shots.shotsAway,

    shotsOnTargetHome: null,
    shotsOnTargetAway: null,

    passesHome: passes.passesHome,
    passesAway: passes.passesAway,

    passesCompletedHome: passes.passesCompletedHome,
    passesCompletedAway: passes.passesCompletedAway,

    passAccuracyHome: circles.passAccuracyHome,
    passAccuracyAway: circles.passAccuracyAway,

    tacklesHome: defense.tacklesHome,
    tacklesAway: defense.tacklesAway,

    tacklesWonHome: defense.tacklesWonHome,
    tacklesWonAway: defense.tacklesWonAway,

    recoveriesHome: defense.recoveriesHome,
    recoveriesAway: defense.recoveriesAway,

    interceptionsHome: passes.interceptionsHome,
    interceptionsAway: passes.interceptionsAway,

    clearancesHome: defense.clearancesHome,
    clearancesAway: defense.clearancesAway,

    blocksHome: defense.blocksHome,
    blocksAway: defense.blocksAway,

    savesHome: defense.savesHome,
    savesAway: defense.savesAway,

    foulsHome: defense.foulsHome,
    foulsAway: defense.foulsAway,

    offsidesHome: defense.offsidesHome ?? passes.offsidesHome,
    offsidesAway: defense.offsidesAway ?? passes.offsidesAway,

    cornersHome: defense.cornersHome,
    cornersAway: defense.cornersAway,

    freeKicksHome: defense.freeKicksHome,
    freeKicksAway: defense.freeKicksAway,

    penaltiesHome: defense.penaltiesHome,
    penaltiesAway: defense.penaltiesAway,

    yellowCardsHome: defense.yellowCardsHome,
    yellowCardsAway: defense.yellowCardsAway,

    redCardsHome: defense.redCardsHome,
    redCardsAway: defense.redCardsAway,

    xgHome: xg.xgHome,
    xgAway: xg.xgAway,

    dribbleSuccessHome: circles.dribbleSuccessHome,
    dribbleSuccessAway: circles.dribbleSuccessAway,

    shotAccuracyHome: circles.shotAccuracyHome,
    shotAccuracyAway: circles.shotAccuracyAway,
  };
}

/**
 * Devuelve qué campos intentamos usar según tipo.
 */
function usedFieldsByType(type = "unknown") {
  const map = {
    scoreboard_summary: [
      "homeClub",
      "awayClub",
      "scoreHome",
      "scoreAway",
      "status",
    ],
    possession_screen: ["possessionHome", "possessionAway"],
    shots_screen: [
      "shotsHome",
      "shotsAway",
      "shotsOnTargetHome",
      "shotsOnTargetAway",
      "shotAccuracyHome",
      "shotAccuracyAway",
    ],
    passes_screen: [
      "passesHome",
      "passesAway",
      "passAccuracyHome",
      "passAccuracyAway",
    ],
    defense_screen: [
      "tacklesHome",
      "tacklesAway",
      "recoveriesHome",
      "recoveriesAway",
      "savesHome",
      "savesAway",
      "foulsHome",
      "foulsAway",
      "yellowCardsHome",
      "yellowCardsAway",
      "redCardsHome",
      "redCardsAway",
    ],
    final_overview_screen: [
      "homeClub",
      "awayClub",
      "scoreHome",
      "scoreAway",
      "status",
    ],
    unknown: [],
  };

  return map[type] || [];
}

/**
 * Parser de una sola imagen
 */
async function parseSingleImage(image, meta = {}) {
  let type = image.type || "unknown";
  let baseConfidence = getBaseConfidenceByType(type);

  let ocr = {
    text: "",
    confidence: 0,
    lines: [],
  };

  try {
    ocr = await readImageText(image.buffer);
  } catch (error) {
    return {
      sourceImage: {
        index: image.index,
        type,
        originalName: image.originalName,
        size: image.size,
        mimetype: image.mimetype,
        usedFields: usedFieldsByType(type),
      },
      partialDraft: {
        homeClub: {
          name: null,
          normalizedName: null,
        },
        awayClub: {
          name: null,
          normalizedName: null,
        },
        scoreHome: null,
        scoreAway: null,
        minute: null,
        status: null,
        season: meta.season || null,
        stats: extractStatsFromText(""),
      },
      confidence: buildFieldConfidence(baseConfidence),
      notes: [
        `Imagen clasificada como '${type}'.`,
        "OCR falló en esta imagen.",
      ],
      conflicts: [],
      missingFields: ["ocr.text"],
    };
  }

  const text = ocr.text || "";

  const detectedType = detectImageType(text);
  if (type === "unknown" && detectedType !== "unknown") {
    type = detectedType;
    baseConfidence = getBaseConfidenceByType(type);
  }

  const score = extractScoreFromText(text);
  const clubs = extractClubNamesFromLines(ocr.lines, text);
  const status = extractMatchStatus(text);
  const stats = extractStatsFromText(text);

  const canUseScoreboardData =
    type === "scoreboard_summary" ||
    type === "final_overview_screen" ||
    type === "unknown";

  const partialDraft = {
    homeClub: {
      name: canUseScoreboardData ? clubs.home : null,
      normalizedName: null,
    },
    awayClub: {
      name: canUseScoreboardData ? clubs.away : null,
      normalizedName: null,
    },
    scoreHome: canUseScoreboardData ? score.home : null,
    scoreAway: canUseScoreboardData ? score.away : null,
    minute: null,
    status: canUseScoreboardData ? status : null,
    season: meta.season || null,
    stats,
  };

  const notes = [
    `Imagen clasificada como '${type}'.`,
    "OCR ejecutado correctamente.",
    `Texto OCR preview: ${text.slice(0, 120)}`,
    `Score detectado: ${score.home ?? "null"} - ${score.away ?? "null"}`,
    `Método score: ${score.method ?? "null"}`,
    `Confianza score imagen: ${score.confidence ?? 0}`,
    `Clubes detectados: ${clubs.home ?? "null"} vs ${clubs.away ?? "null"}`,
    `Posesión detectada: ${stats.possessionHome ?? "null"} - ${stats.possessionAway ?? "null"}`,
    `Tiros detectados: ${stats.shotsHome ?? "null"} - ${stats.shotsAway ?? "null"}`,
    `Pases detectados: ${stats.passesHome ?? "null"} - ${stats.passesAway ?? "null"}`,
    `Recuperaciones detectadas: ${stats.recoveriesHome ?? "null"} - ${stats.recoveriesAway ?? "null"}`,
  ];

  if (ocr.text) {
    notes.push("Texto OCR detectado.");
  } else {
    notes.push("OCR sin texto útil.");
  }

  const missingFields = [];
  if (!partialDraft.homeClub.name) missingFields.push("homeClub.name");
  if (!partialDraft.awayClub.name) missingFields.push("awayClub.name");
  if (partialDraft.scoreHome == null) missingFields.push("scoreHome");
  if (partialDraft.scoreAway == null) missingFields.push("scoreAway");

  return {
    sourceImage: {
      index: image.index,
      type,
      originalName: image.originalName,
      size: image.size,
      mimetype: image.mimetype,
      usedFields: usedFieldsByType(type),
      ocrPreview: text.slice(0, 300),
    },
    partialDraft,
    confidence: {
      ...buildFieldConfidence(baseConfidence),
      ocr: Number(ocr.confidence || 0),
    },
    notes,
    conflicts: [],
    missingFields,
  };
}

async function parseMatchImagesService({ classifiedImages = [], meta = {} }) {
  const results = [];

  for (const image of classifiedImages) {
    const parsed = await parseSingleImage(image, meta);
    results.push(parsed);
  }

  return results;
}

module.exports = parseMatchImagesService;