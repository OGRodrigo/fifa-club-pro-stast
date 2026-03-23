// src/services/ai/imageClassifier.service.js

/**
 * Clasificación heurística básica por nombre de archivo.
 * Esta V1 NO hace OCR ni visión real todavía.
 * Solo intenta etiquetar el tipo de pantalla usando filename/originalname.
 */
function detectImageType(fileName = "") {
  const name = String(fileName).toLowerCase();

  if (
    name.includes("summary") ||
    name.includes("resumen") ||
    name.includes("score") ||
    name.includes("resultado") ||
    name.includes("marcador")
  ) {
    return "scoreboard_summary";
  }

  if (name.includes("possession") || name.includes("posesion")) {
    return "possession_screen";
  }

  if (
    name.includes("shots") ||
    name.includes("shoot") ||
    name.includes("tiros") ||
    name.includes("remates")
  ) {
    return "shots_screen";
  }

  if (
    name.includes("passes") ||
    name.includes("passing") ||
    name.includes("pases")
  ) {
    return "passes_screen";
  }

  if (
    name.includes("defense") ||
    name.includes("defensa") ||
    name.includes("tackle") ||
    name.includes("recover")
  ) {
    return "defense_screen";
  }

  if (
    name.includes("overview") ||
    name.includes("general") ||
    name.includes("match") ||
    name.includes("partido")
  ) {
    return "final_overview_screen";
  }

  return "unknown";
}

function classifyImages(files = []) {
  return files.map((file, index) => {
    const originalName = file.originalname || `image-${index + 1}`;
    const type = detectImageType(originalName);

    return {
      index,
      type,
      originalName,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    };
  });
}

module.exports = classifyImages;