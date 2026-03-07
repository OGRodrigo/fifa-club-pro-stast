const express = require("express");
const router = express.Router();

const matchesController = require("../controllers/matches.controller");
const { auth } = require("../middlewares/auth.middleware");
const { requireClubRole } = require("../middlewares/authClubRole");

/**
 * =====================================================
 * MATCHES ROUTES
 * Base path: /matches
 * =====================================================
 */

/**
 * ======================
 * GET (no dependen de :id)
 * ======================
 */

router.get("/ping", (req, res) => {
  return res.json({ ok: true, route: "/matches/ping" });
});

// 📅 Calendario
router.get("/calendar", matchesController.getCalendar);

// 🤝 Head to Head
router.get("/h2h/:clubA/:clubB", matchesController.getMatchesHeadToHead);

// 📋 Lista partidos
router.get("/", matchesController.getMatches);

/**
 * ======================
 * POST
 * ======================
 */

// Crear partido público
router.post("/", matchesController.createMatch);

// Crear partido protegido (admin/captain)
router.post(
  "/clubs/:clubId",
  auth,
  requireClubRole(["admin", "captain"]),
  matchesController.createMatch
);

/**
 * ======================
 * PATCH PLAYER STATS
 * ======================
 */

router.patch(
  "/:id/player-stats",
  auth,
  matchesController.updateMatchPlayerStats
);

/**
 * ======================
 * Rutas por ID
 * ======================
 */

// Partido FULL
router.get("/:id/full", matchesController.getMatchByIdFull);

// MVP partido
router.get("/:id/mvp", matchesController.getMatchMVP);

// Update partido
router.put("/:id", matchesController.updateMatch);

// Delete partido
router.delete("/:id", matchesController.deleteMatch);

// Update seguro
router.put(
  "/:id/clubs/:clubId",
  auth,
  requireClubRole(["admin", "captain"]),
  matchesController.updateMatch
);

// Delete seguro
router.delete(
  "/:id/clubs/:clubId",
  auth,
  requireClubRole(["admin"]),
  matchesController.deleteMatch
);

// Obtener partido simple
router.get("/:id", matchesController.getMatchById);

module.exports = router;