// src/services/ai/matchDraftNormalizer.service.js
const normalizeClubName = require("../../utils/ai/normalizeClubName.js");

function normalizeMatchDraft(payload = {}) {
  const output = structuredClone(payload);

  if (output.matchDraft?.homeClub?.name) {
    output.matchDraft.homeClub.normalizedName = normalizeClubName(
      output.matchDraft.homeClub.name
    );
  }

  if (output.matchDraft?.awayClub?.name) {
    output.matchDraft.awayClub.normalizedName = normalizeClubName(
      output.matchDraft.awayClub.name
    );
  }

  output.notes = Array.isArray(output.notes) ? [...new Set(output.notes)] : [];
  output.conflicts = Array.isArray(output.conflicts)
    ? [...new Set(output.conflicts)]
    : [];
  output.missingFields = Array.isArray(output.missingFields)
    ? [...new Set(output.missingFields)]
    : [];

  return output;
}

module.exports = normalizeMatchDraft;