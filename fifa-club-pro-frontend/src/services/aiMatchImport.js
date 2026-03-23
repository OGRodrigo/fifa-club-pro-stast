// src/services/aiMatchImport.js
import { api } from "../api/client";

/**
 * Envía varias imágenes al backend IA y devuelve la respuesta completa.
 *
 * No se transforma aquí.
 * La transformación del draft se hace en la página Matches,
 * porque allí ya tenemos acceso a:
 * - myClubId
 * - clubes cargados
 * - members cargados
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