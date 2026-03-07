// routes/joinRequest.routes.js

const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth.middleware");
const { requireClubRole } = require("../middlewares/authClubRole");

const {
  createJoinRequest,
  getPendingRequests,
  approveRequest,
  rejectRequest
} = require("../controllers/joinRequest.controller");

/**
 * =====================================================
 * JOIN REQUEST ROUTES
 * Base path: /clubs
 * =====================================================
 */

/**
 * POST /clubs/:clubId/join
 * Usuario autenticado envía solicitud
 */
router.post("/:clubId/join", auth, createJoinRequest);

/**
 * GET /clubs/:clubId/requests
 * Solo admin puede ver solicitudes pendientes
 */
router.get(
  "/:clubId/requests",
  auth,
  requireClubRole(["admin"]),
  getPendingRequests
);

/**
 * PUT /clubs/:clubId/requests/:requestId/approve
 * Solo admin puede aprobar
 */
router.put(
  "/:clubId/requests/:requestId/approve",
  auth,
  requireClubRole(["admin"]),
  approveRequest
);

/**
 * PUT /clubs/:clubId/requests/:requestId/reject
 * Solo admin puede rechazar
 */
router.put(
  "/:clubId/requests/:requestId/reject",
  auth,
  requireClubRole(["admin"]),
  rejectRequest
);

module.exports = router;
