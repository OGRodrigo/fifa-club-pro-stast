// src/services/aiMatchImport.js
import { api } from "../api/client";

/**
 * Envía varias imágenes al backend IA y devuelve el borrador de partido.
 *
 * @param {Object} params
 * @param {File[]} params.images
 * @param {string} [params.season]
 * @param {string} [params.source]
 * @param {string} [params.clubId]
 */
export async function parseMatchImages({
  images = [],
  season = "",
  source = "ea_fc_match_screens",
  clubId = "",
}) {
  const formData = new FormData();

  images.forEach((file) => {
    formData.append("images", file);
  });

  if (season) formData.append("season", season);
  if (source) formData.append("source", source);
  if (clubId) formData.append("clubId", clubId);

  const { data } = await api.post("/ai/parse-match-images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}