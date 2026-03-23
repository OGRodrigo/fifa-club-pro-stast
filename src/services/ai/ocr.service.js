// src/services/ai/ocr.service.js
const sharp = require("sharp");
const Tesseract = require("tesseract.js");

/**
 * =====================================================
 * OCR SERVICE
 * -----------------------------------------------------
 * Responsabilidades:
 * 1) Preprocesar la imagen para mejorar OCR
 * 2) Ejecutar reconocimiento de texto
 * 3) Devolver texto limpio + metadatos básicos
 *
 * Nota:
 * - Esta V1 usa inglés porque Tesseract funciona mejor
 *   con interfaces de juegos en ese idioma.
 * - Luego podemos probar spa+eng si hace falta.
 * =====================================================
 */

/**
 * Preprocesa la imagen para mejorar lectura OCR.
 *
 * Estrategia:
 * - resize: agrandar ayuda a Tesseract
 * - grayscale: simplifica la señal
 * - normalize: mejora contraste
 * - sharpen: resalta bordes de texto
 * - threshold: binariza
 */
async function preprocessImage(buffer) {
  return sharp(buffer)
    .resize({ width: 2200, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(155)
    .png()
    .toBuffer();
}

/**
 * Limpia el texto bruto que devuelve OCR.
 */
function cleanOcrText(text = "") {
  return String(text)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Ejecuta OCR sobre una imagen.
 */
async function readImageText(buffer) {
  const processed = await preprocessImage(buffer);

  const result = await Tesseract.recognize(processed, "eng", {
    logger: () => {},
  });

  const rawText = result?.data?.text || "";
  const cleanedText = cleanOcrText(rawText);

  return {
    text: cleanedText,
    confidence: Number(result?.data?.confidence ?? 0),
    lines: Array.isArray(result?.data?.lines)
      ? result.data.lines.map((line) => ({
          text: cleanOcrText(line.text || ""),
          confidence: Number(line.confidence ?? 0),
        }))
      : [],
  };
}

module.exports = {
  preprocessImage,
  cleanOcrText,
  readImageText,
};