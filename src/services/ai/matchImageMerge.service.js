function createEmptyDraft(meta = {}) {
  return {
    matchDraft: {
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
      stats: {
        possessionHome: null,
        possessionAway: null,

        shotsHome: null,
        shotsAway: null,
        shotsOnTargetHome: null,
        shotsOnTargetAway: null,
        shotAccuracyHome: null,
        shotAccuracyAway: null,

        xgHome: null,
        xgAway: null,

        passesHome: null,
        passesAway: null,
        passesCompletedHome: null,
        passesCompletedAway: null,
        passAccuracyHome: null,
        passAccuracyAway: null,

        dribbleSuccessHome: null,
        dribbleSuccessAway: null,

        tacklesHome: null,
        tacklesAway: null,
        tacklesWonHome: null,
        tacklesWonAway: null,

        recoveriesHome: null,
        recoveriesAway: null,
        interceptionsHome: null,
        interceptionsAway: null,
        clearancesHome: null,
        clearancesAway: null,
        blocksHome: null,
        blocksAway: null,
        savesHome: null,
        savesAway: null,

        foulsHome: null,
        foulsAway: null,
        offsidesHome: null,
        offsidesAway: null,
        cornersHome: null,
        cornersAway: null,
        freeKicksHome: null,
        freeKicksAway: null,
        penaltiesHome: null,
        penaltiesAway: null,
        yellowCardsHome: null,
        yellowCardsAway: null,
        redCardsHome: null,
        redCardsAway: null,
      },
      sourceImages: [],
    },
    confidence: {
      overall: 0,
      score: 0,
      clubs: 0,
      stats: 0,
    },
    missingFields: [],
    conflicts: [],
    notes: [],
  };
}

function fillIfEmpty(target, key, value) {
  if (target[key] == null && value != null) {
    target[key] = value;
  }
}

function mergeStats(targetStats, incomingStats) {
  Object.keys(targetStats).forEach((key) => {
    if (targetStats[key] == null && incomingStats[key] != null) {
      targetStats[key] = incomingStats[key];
    }
  });
}

function average(nums = []) {
  const valid = nums.filter((n) => typeof n === "number");
  if (!valid.length) return 0;
  return Number(
    (valid.reduce((acc, n) => acc + n, 0) / valid.length).toFixed(2)
  );
}

function pickBestScoreResult(parsedResults = []) {
  const candidates = parsedResults
    .map((result) => {
      const draft = result?.partialDraft || {};
      const home = draft?.scoreHome;
      const away = draft?.scoreAway;

      if (home == null || away == null) {
        return null;
      }

      const notes = Array.isArray(result?.notes) ? result.notes : [];
      const methodNote = notes.find((note) =>
        String(note).startsWith("Método score:")
      );
      const confidenceNote = notes.find((note) =>
        String(note).startsWith("Confianza score imagen:")
      );

      const method = methodNote
        ? methodNote.replace("Método score:", "").trim()
        : null;

      const scoreImageConfidence = confidenceNote
        ? Number(
            confidenceNote.replace("Confianza score imagen:", "").trim()
          ) || 0
        : 0;

      let priority = 0;

      if (method === "vs_score_vs") priority = 3;
      else if (method === "classic_pair") priority = 2;
      else if (method === "loose_pair") priority = 1;

      return {
        home,
        away,
        method,
        priority,
        scoreImageConfidence,
      };
    })
    .filter(Boolean);

  if (!candidates.length) return null;

candidates.sort((a, b) => {
  // 1. PRIMERO confianza real (CRÍTICO)
  if (b.scoreImageConfidence !== a.scoreImageConfidence) {
    return b.scoreImageConfidence - a.scoreImageConfidence;
  }

  // 2. Luego método
  if (b.priority !== a.priority) {
    return b.priority - a.priority;
  }

  return 0;
});

  return candidates[0];
}

function mergeMatchImageResults({ parsedResults = [], meta = {} }) {
  const output = createEmptyDraft(meta);

  parsedResults.forEach((result) => {
    const draft = result?.partialDraft || {};
    const stats = draft?.stats || {};

    fillIfEmpty(output.matchDraft.homeClub, "name", draft?.homeClub?.name ?? null);
    fillIfEmpty(
      output.matchDraft.homeClub,
      "normalizedName",
      draft?.homeClub?.normalizedName ?? null
    );

    fillIfEmpty(output.matchDraft.awayClub, "name", draft?.awayClub?.name ?? null);
    fillIfEmpty(
      output.matchDraft.awayClub,
      "normalizedName",
      draft?.awayClub?.normalizedName ?? null
    );

    fillIfEmpty(output.matchDraft, "minute", draft?.minute);
    fillIfEmpty(output.matchDraft, "status", draft?.status);
    fillIfEmpty(output.matchDraft, "season", draft?.season);

    mergeStats(output.matchDraft.stats, stats);

    if (result?.sourceImage) {
      output.matchDraft.sourceImages.push(result.sourceImage);
    }

    if (Array.isArray(result?.notes)) {
      output.notes.push(...result.notes);
    }

    if (Array.isArray(result?.conflicts)) {
      output.conflicts.push(...result.conflicts);
    }
  });

  const bestScore = pickBestScoreResult(parsedResults);

  if (bestScore) {
    output.matchDraft.scoreHome = bestScore.home;
    output.matchDraft.scoreAway = bestScore.away;

    output.notes.push(
      `Score final elegido: ${bestScore.home} - ${bestScore.away}`,
      `Método score final: ${bestScore.method ?? "null"}`,
      `Confianza score final: ${bestScore.scoreImageConfidence ?? 0}`
    );
  }

  output.confidence = {
    overall: average(parsedResults.map((r) => r?.confidence?.overall)),
    score: average(parsedResults.map((r) => r?.confidence?.score)),
    clubs: average(parsedResults.map((r) => r?.confidence?.clubs)),
    stats: average(parsedResults.map((r) => r?.confidence?.stats)),
  };

  const missingFields = [];

  if (!output.matchDraft.homeClub.name) missingFields.push("homeClub.name");
  if (!output.matchDraft.awayClub.name) missingFields.push("awayClub.name");
  if (output.matchDraft.scoreHome == null) missingFields.push("scoreHome");
  if (output.matchDraft.scoreAway == null) missingFields.push("scoreAway");

  Object.entries(output.matchDraft.stats).forEach(([key, value]) => {
    if (value == null) {
      missingFields.push(`stats.${key}`);
    }
  });

  output.missingFields = missingFields;

  return output;
}

module.exports = mergeMatchImageResults;