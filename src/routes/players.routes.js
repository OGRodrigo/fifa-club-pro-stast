const express = require("express");
const router = express.Router({ mergeParams: true });

const { requireClubRole } = require("../middlewares/authClubRole");
const playersController = require("../controllers/players.controller");
const { auth } = require("../middlewares/auth.middleware");

/**
 * =====================================================
 * PLAYERS ROUTES (por club)
 * -----------------------------------------------------
 * IMPORTANTE:
 * - Este router depende de req.params.clubId
 * - Por eso usa mergeParams: true
 *
 * Debe montarse así (ejemplo):
 *   app.use("/clubs/:clubId/players", playersRoutes)
 * =====================================================
 */

const allowAnyMember = [auth,requireClubRole(["admin", "captain", "member"])];


/**
 * ======================
 * STATS (ME / CLUB / USER)
 * ======================
 */

// 👤 Mis stats dentro del club
// GET /clubs/:clubId/players/me/stats?season=2029&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/me/stats", allowAnyMember, playersController.getMyPlayerStats);

// 📊 Tabla de stats de jugadores del club (requiere season o from/to)
// GET /clubs/:clubId/players/stats?season=2029&from=...&to=...
router.get("/stats", allowAnyMember, playersController.getClubPlayersStats);

// 📌 Stats de un jugador específico dentro del club
// GET /clubs/:clubId/players/:userId/stats?season=2029&from=...&to=...
router.get("/:userId/stats", allowAnyMember, playersController.getPlayerStats);

/**
 * ======================
 * LEADERBOARDS
 * ======================
 */

// ⚽ Top goleadores
// GET /clubs/:clubId/players/top-scorers?season=2029&limit=10
router.get("/top-scorers", allowAnyMember, playersController.getTopScorers);

// 🎯 Top asistencias
// GET /clubs/:clubId/players/top-assists?season=2029&limit=10
router.get("/top-assists", allowAnyMember, playersController.getTopAssists);

// 🏅 MVP de la season
// GET /clubs/:clubId/players/mvp-season?season=2029
router.get("/mvp-season", allowAnyMember, playersController.getSeasonMVP);

// 🧾 Leaderboards unificados (requiere season o from/to)
// GET /clubs/:clubId/players/leaderboards?season=2029&from=...&to=...&limit=10
router.get("/leaderboards", allowAnyMember, playersController.getLeaderboards);

module.exports = router;
