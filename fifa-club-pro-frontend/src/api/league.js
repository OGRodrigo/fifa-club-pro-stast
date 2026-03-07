// src/api/league.js
import { api } from "./client";

/**
 * GET /league/dashboard?season=2025
 * Ideal para "tablas por temporadas" + últimos partidos
 */
export async function getLeagueDashboard(season) {
  const { data } = await api.get("/league/dashboard", {
    params: season ? { season } : undefined,
  });
  return data;
}
