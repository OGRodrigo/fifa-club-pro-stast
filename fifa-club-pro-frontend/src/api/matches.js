// src/api/matches.js
import { api } from "./client";

/**
 * Lista partidos
 * - Mantiene compatibilidad con filtros opcionales
 */
export async function listMatches(params = {}) {
  const { data } = await api.get("/matches", { params });
  return data;
}

/**
 * Crea partido usando la ruta segura del backend
 * Requiere clubId en la llamada
 */
export async function createMatch(clubId, payload) {
  if (!clubId) {
    throw new Error("createMatch requiere clubId");
  }

  const { data } = await api.post(`/matches/clubs/${clubId}`, payload);
  return data;
}

/**
 * Actualiza partido usando la ruta segura del backend
 */
export async function updateMatch(matchId, clubId, payload) {
  if (!matchId) {
    throw new Error("updateMatch requiere matchId");
  }

  if (!clubId) {
    throw new Error("updateMatch requiere clubId");
  }

  const { data } = await api.put(`/matches/${matchId}/clubs/${clubId}`, payload);
  return data;
}

/**
 * Elimina partido usando la ruta segura del backend
 */
export async function deleteMatch(matchId, clubId) {
  if (!matchId) {
    throw new Error("deleteMatch requiere matchId");
  }

  if (!clubId) {
    throw new Error("deleteMatch requiere clubId");
  }

  const { data } = await api.delete(`/matches/${matchId}/clubs/${clubId}`);
  return data;
}

/**
 * Actualiza playerStats usando la ruta segura del backend
 */
export async function updateMatchPlayerStats(matchId, clubId, payload) {
  if (!matchId) {
    throw new Error("updateMatchPlayerStats requiere matchId");
  }

  if (!clubId) {
    throw new Error("updateMatchPlayerStats requiere clubId");
  }

  const { data } = await api.patch(
    `/matches/${matchId}/clubs/${clubId}/player-stats`,
    payload
  );

  return data;
}