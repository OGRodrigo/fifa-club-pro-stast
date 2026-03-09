const express = require("express");
const router = express.Router();

// 📊 ANALYTICS / STATS
const {
  getClubStats,
  getAdvancedClubStats,
  getHistoricalRanking,
  getHeadToHead,
  getHomeAwayStats,
  getClubStreaks,
  getClubAverages,
  getClubSeasonStats,
  getClubSeasonComparison,
  getBestClubSeasons,
  getAveragePointsRanking,
  getBestWorstSeason,
  compareClubsBySeason,
  getHomeAwayPro,
  getClubSummary,
  getClubRivals,
} = require("../controllers/stats.controller");

/**
 * =====================================================
 * RUTAS GENERALES ANALÍTICAS
 * =====================================================
 */

// 📈 Ranking histórico de clubes
// GET /stats/ranking
router.get("/ranking", getHistoricalRanking);

// 📊 Ranking por promedio de puntos
// GET /stats/ranking/average-points
router.get("/ranking/average-points", getAveragePointsRanking);

// ⚔️ Head-to-head entre dos clubes
// GET /stats/h2h/:clubA/:clubB
router.get("/h2h/:clubA/:clubB", getHeadToHead);

// ⚔️ Comparación por temporada entre dos clubes
// GET /stats/compare/:clubA/:clubB/:season
router.get("/compare/:clubA/:clubB/:season", compareClubsBySeason);

/**
 * =====================================================
 * RUTAS POR CLUB
 * =====================================================
 */

// 📊 Stats avanzadas por club
// GET /stats/club/:clubId/advanced
router.get("/club/:clubId/advanced", getAdvancedClubStats);

// 🏠✈️ Local/Visitante simple
// GET /stats/club/:clubId/home-away
router.get("/club/:clubId/home-away", getHomeAwayStats);

// 🏠✈️ Local/Visitante pro
// GET /stats/club/:clubId/home-away-pro
router.get("/club/:clubId/home-away-pro", getHomeAwayPro);

// 📈 Rachas
// GET /stats/club/:clubId/streaks
router.get("/club/:clubId/streaks", getClubStreaks);

// 📈 Promedios
// GET /stats/club/:clubId/averages
router.get("/club/:clubId/averages", getClubAverages);

// 📅 Stats por temporada específica
// GET /stats/club/:clubId/season/:seasonYear
router.get("/club/:clubId/season/:seasonYear", getClubSeasonStats);

// 📊 Comparación entre temporadas del club
// GET /stats/club/:clubId/seasons
router.get("/club/:clubId/seasons", getClubSeasonComparison);

// 🥇 Mejores temporadas
// GET /stats/club/:clubId/best-seasons?limit=3
router.get("/club/:clubId/best-seasons", getBestClubSeasons);

// 🏆 Mejor y peor temporada
// GET /stats/club/:clubId/best-worst-season
router.get("/club/:clubId/best-worst-season", getBestWorstSeason);

// 📌 Dashboard summary club
// GET /stats/club/:clubId/summary
router.get("/club/:clubId/summary", getClubSummary);

// 🥊 Rivales principales
// GET /stats/club/:clubId/rivals?limit=5
router.get("/club/:clubId/rivals", getClubRivals);

/**
 * =====================================================
 * ESTA RUTA SIEMPRE AL FINAL
 * =====================================================
 */

// 📊 Stats básicas por club
// GET /stats/:clubId
router.get("/:clubId", getClubStats);

module.exports = router;