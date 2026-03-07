const express = require("express");
const router = express.Router();

/**
 * =====================================================
 * ADVANCED STATS ROUTES
 * -----------------------------------------------------
 * Rutas para estadísticas avanzadas de clubes
 * Base path sugerido:
 *   /stats/advanced
 * =====================================================
 */

const controller = require("../controllers/advancedStats.controller");

/**
 * 📊 Estadísticas avanzadas de un club
 * GET /stats/advanced/:clubId
 *
 * Params:
 *  - clubId: ObjectId del club
 *
 * Response:
 *  - played
 *  - goalsFor / goalsAgainst
 *  - goalDifference
 *  - cleanSheets
 *  - matchesAsHome / matchesAsAway
 *  - promedios
 */
router.get("/:clubId", controller.getAdvancedClubStats);

module.exports = router;
