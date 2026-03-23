// src/services/ai/matchImageMerge.service.js

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
  return Number((valid.reduce((acc, n) => acc + n, 0) / valid.length).toFixed(2));
}

function mergeMatchImageResults({ parsedResults = [], meta = {} }) {
  const output = createEmptyDraft(meta);

  parsedResults.forEach((result) => {
    const draft = result.partialDraft || {};
    const stats = draft.stats || {};

    fillIfEmpty(output.matchDraft.homeClub, "name", draft.homeClub?.name ?? null);
    fillIfEmpty(
      output.matchDraft.homeClub,
      "normalizedName",
      draft.homeClub?.normalizedName ?? null
    );

    fillIfEmpty(output.matchDraft.awayClub, "name", draft.awayClub?.name ?? null);
    fillIfEmpty(
      output.matchDraft.awayClub,
      "normalizedName",
      draft.awayClub?.normalizedName ?? null
    );

    fillIfEmpty(output.matchDraft, "scoreHome", draft.scoreHome);
    fillIfEmpty(output.matchDraft, "scoreAway", draft.scoreAway);
    fillIfEmpty(output.matchDraft, "minute", draft.minute);
    fillIfEmpty(output.matchDraft, "status", draft.status);
    fillIfEmpty(output.matchDraft, "season", draft.season);

    mergeStats(output.matchDraft.stats, stats);

    if (result.sourceImage) {
      output.matchDraft.sourceImages.push(result.sourceImage);
    }

    if (Array.isArray(result.notes)) {
      output.notes.push(...result.notes);
    }

    if (Array.isArray(result.conflicts)) {
      output.conflicts.push(...result.conflicts);
    }
  });

  output.confidence = {
    overall: average(parsedResults.map((r) => r.confidence?.overall)),
    score: average(parsedResults.map((r) => r.confidence?.score)),
    clubs: average(parsedResults.map((r) => r.confidence?.clubs)),
    stats: average(parsedResults.map((r) => r.confidence?.stats)),
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