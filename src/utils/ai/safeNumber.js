// src/utils/ai/safeNumber.js
function safeNumber(value) {
  if (value == null || value === "") return null;

  const normalized = String(value).replace(",", ".").trim();
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = safeNumber;