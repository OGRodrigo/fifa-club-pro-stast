// src/utils/ai/confidence.js

function getBaseConfidenceByType(type = "unknown") {
  const map = {
    scoreboard_summary: 0.65,
    possession_screen: 0.5,
    shots_screen: 0.5,
    passes_screen: 0.5,
    defense_screen: 0.5,
    final_overview_screen: 0.55,
    unknown: 0.2,
  };

  return map[type] ?? 0.2;
}

function buildFieldConfidence(base = 0.2) {
  return {
    overall: base,
    score: base >= 0.6 ? base + 0.15 : base,
    clubs: base >= 0.55 ? base + 0.1 : base,
    stats: base,
  };
}

module.exports = {
  getBaseConfidenceByType,
  buildFieldConfidence,
};