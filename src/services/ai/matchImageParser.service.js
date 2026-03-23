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
function extractScoreFromText(text = "") {
  const normalized = String(text).replace(/\s+/g, " ").trim();

  const patterns = [
    /(\d{1,2})\s*[:\-–]\s*(\d{1,2})/,
    /\b(\d{1,2})\s+(\d{1,2})\b/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const home = Number(match[1]);
    const away = Number(match[2]);

    if (
      Number.isInteger(home) &&
      Number.isInteger(away) &&
      home >= 0 &&
      away >= 0 &&
      home <= 30 &&
      away <= 30
    ) {
      return { home, away };
    }
  }

  return { home: null, away: null };
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
  const normalized = String(text)
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match = normalized.match(
    /^(.+?)\s+vs\s+\d{1,2}\s*[:\-–]\s*\d{1,2}\s+vs\s+(.+)$/i
  );

  if (match) {
    const home = cleanClubCandidate(match[1]);
    const awayRaw = cleanClubCandidate(match[2]);
    const away = cutAtSectionKeyword(awayRaw);

    return {
      home: home || null,
      away: away || null,
    };
  }

  return {
    home: null,
    away: null,
  };
}

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
          "possession",
          "shots",
          "passes",
          "defense",
          "defensa",
          "stats",
          "statistics",
        ].includes(line.toLowerCase())
    );
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

function normalizeOcrTextForStats(text = "") {
  return String(text)
    .replace(/\r/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPercentPairs(text = "") {
  const normalized = normalizeOcrTextForStats(text);

  const matches = [...normalized.matchAll(/(\d{1,3})\s*%/g)].map((m) =>
    Number(m[1])
  );

  return matches.filter((n) => Number.isInteger(n) && n >= 0 && n <= 100);
}

function extractPossessionFromText(text = "") {
  const percents = extractPercentPairs(text);

  /**
   * Heurística:
   * buscamos el primer par que sume ~100
   */
  for (let i = 0; i < percents.length - 1; i += 1) {
    const home = percents[i];
    const away = percents[i + 1];
    const total = home + away;

    if (total >= 98 && total <= 102) {
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

/**
 * Intenta extraer stats básicas desde texto OCR.
 * Por ahora solo dejamos estructura sin asumir demasiado.
 */
function extractNumberPairs(text = "") {
  const normalized = normalizeOcrTextForStats(text);

  const matches = [...normalized.matchAll(/\b(\d{1,2})\b/g)].map((m) =>
    Number(m[1])
  );

  return matches.filter((n) => Number.isInteger(n) && n >= 0 && n <= 99);
}

function extractShotsFromText(text = "") {
  const normalized = normalizeOcrTextForStats(text).toLowerCase();

  const keywordMatch = normalized.match(
    /(tiros|shots)([\s\S]{0,120})/i
  );

  if (!keywordMatch) {
    return {
      shotsHome: null,
      shotsAway: null,
    };
  }

  const windowText = keywordMatch[2] || "";
  const nums = [...windowText.matchAll(/\b(\d{1,2})\b/g)].map((m) =>
    Number(m[1])
  );

  if (nums.length >= 2) {
    return {
      shotsHome: nums[0],
      shotsAway: nums[1],
    };
  }

  return {
    shotsHome: null,
    shotsAway: null,
  };
}

function extractStatsFromText(text = "") {
  const possession = extractPossessionFromText(text);
  const shots = extractShotsFromText(text);

  return {
    possessionHome: possession.possessionHome,
    possessionAway: possession.possessionAway,

    shotsHome: shots.shotsHome,
    shotsAway: shots.shotsAway,

    shotsOnTargetHome: null,
    shotsOnTargetAway: null,

    passesHome: null,
    passesAway: null,
    passAccuracyHome: null,
    passAccuracyAway: null,

    tacklesHome: null,
    tacklesAway: null,
    recoveriesHome: null,
    recoveriesAway: null,
    savesHome: null,
    savesAway: null,

    foulsHome: null,
    foulsAway: null,
    offsidesHome: null,
    offsidesAway: null,
    cornersHome: null,
    cornersAway: null,

    yellowCardsHome: null,
    yellowCardsAway: null,
    redCardsHome: null,
    redCardsAway: null,

    xgHome: null,
    xgAway: null,
    dribbleSuccessHome: null,
    dribbleSuccessAway: null,
    shotAccuracyHome: null,
    shotAccuracyAway: null,
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
  const type = image.type || "unknown";
  const baseConfidence = getBaseConfidenceByType(type);

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
        stats,
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
    stats: extractStatsFromText(text),
  };

  const notes = [
  `Imagen clasificada como '${type}'.`,
  "OCR ejecutado correctamente.",
  `Texto OCR preview: ${text.slice(0, 120)}`,
  `Score detectado: ${score.home ?? "null"} - ${score.away ?? "null"}`,
  `Clubes detectados: ${clubs.home ?? "null"} vs ${clubs.away ?? "null"}`,
  `Tiros detectados: ${stats.shotsHome ?? "null"} - ${stats.shotsAway ?? "null"}`,
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