// src/utils/ai/normalizeClubName.js
function normalizeClubName(name = "") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

module.exports = normalizeClubName;