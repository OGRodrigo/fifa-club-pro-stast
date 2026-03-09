const express = require("express");
const router = express.Router();

const {
  getLeagueDashboard,
  getLeagueTable,
  getLeagueTableBySeason,
  getLeagueSeasons,
  getLeagueTrends,
  getPowerRanking,
} = require("../controllers/league.controller");

// Dashboard principal
// GET /league/dashboard?season=2026
router.get("/dashboard", getLeagueDashboard);

// Tabla general opcional por season
// GET /league/table?season=2026
router.get("/table", getLeagueTable);

// Tabla por season en params
// GET /league/table/2026
router.get("/table/:season", getLeagueTableBySeason);

// Temporadas disponibles
// GET /league/seasons
router.get("/seasons", getLeagueSeasons);

// Tendencias de liga
// GET /league/trends?from=2026&to=2028
router.get("/trends", getLeagueTrends);

// Power ranking
// GET /league/power-ranking?limit=10&last=5
router.get("/power-ranking", getPowerRanking);

module.exports = router;