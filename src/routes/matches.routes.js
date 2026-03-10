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
 * GET (sin :id)
 * ======================
 */
router.get("/ping", (req, res) => {
  return res.json({ ok: true, route: "/matches/ping" });
});

router.get("/calendar", matchesController.getCalendar);
router.get("/h2h/:clubA/:clubB", matchesController.getMatchesHeadToHead);
router.get("/", matchesController.getMatches);

/**
 * ======================
 * POST
 * ======================
 */
router.post(
  "/clubs/:clubId",
  auth,
  requireClubRole(["admin", "captain"]),
  matchesController.createMatch
);

/**
 * ======================
 * PATCHS seguros
 * ======================
 */
router.patch(
  "/:id/clubs/:clubId/player-stats",
  auth,
  requireClubRole(["admin", "captain"]),
  matchesController.updateMatchPlayerStats
);

router.patch(
  "/:id/clubs/:clubId/team-stats",
  auth,
  requireClubRole(["admin", "captain"]),
  matchesController.updateMatchTeamStats
);

router.patch(
  "/:id/clubs/:clubId/lineups",
  auth,
  requireClubRole(["admin", "captain"]),
  matchesController.updateMatchLineups
);

/**
 * ======================
 * Rutas por ID
 * ======================
 */
router.get("/:id/full", matchesController.getMatchByIdFull);
router.get("/:id/mvp", matchesController.getMatchMVP);

router.put(
  "/:id/clubs/:clubId",
  auth,
  requireClubRole(["admin", "captain"]),
  matchesController.updateMatch
);

router.delete(
  "/:id/clubs/:clubId",
  auth,
  requireClubRole(["admin"]),
  matchesController.deleteMatch
);

router.get("/:id", matchesController.getMatchById);

module.exports = router;