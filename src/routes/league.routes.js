// src/routes/league.routes.js
const express = require("express");
const router = express.Router();

const {
  getLeagueDashboard,
  getLeagueTableBySeason,
  getLeagueSeasons, // ✅ nuevo
} = require("../controllers/league.controller");

// 🏟️ Dashboard general de la liga
// GET /league/dashboard
router.get("/dashboard", getLeagueDashboard);

// ✅ Temporadas disponibles
// GET /league/seasons
router.get("/seasons", getLeagueSeasons);

// 📊 Tabla de posiciones por temporada
// GET /league/table/:season
router.get("/table/:season", getLeagueTableBySeason);

module.exports = router;