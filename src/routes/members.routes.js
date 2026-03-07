// routes/members.routes.js
const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth.middleware");
const { requireClubRole } = require("../middlewares/authClubRole");

const {
  addMemberToClub,
  updateMemberRole,
  bootstrapAdmin,
  removeMemberFromClub,
  getClubMembers,
  getMyClubRole,
  requestToJoinClub,
  getJoinRequests,
  resolveJoinRequest,
  leaveClub
} = require("../controllers/members.controller");

/**
 * =====================================================
 * MEMBERS ROUTES (cuelga de /clubs)
 * -----------------------------------------------------
 * index.js:
 *   app.use("/clubs", membersRoutes);
 *
 * Rutas:
 * - miembros
 * - mi rol
 * - join requests
 * - leave
 * =====================================================
 */

// =====================================================
// MEMBERS
// =====================================================

// GET /clubs/:clubId/members  (ver miembros)
router.get(
  "/:clubId/members",
  auth,
  requireClubRole(["admin", "captain", "member"]),
  getClubMembers
);

// POST /clubs/:clubId/members  (agregar miembro manualmente)
router.post(
  "/:clubId/members",
  auth,
  requireClubRole(["admin", "captain"]),
  addMemberToClub
);

// PUT /clubs/:clubId/members/:userId/role  (cambiar rol)
router.put(
  "/:clubId/members/:userId/role",
  auth,
  requireClubRole(["admin"]),
  updateMemberRole
);

// DELETE /clubs/:clubId/members/:userId  (remover miembro)
router.delete(
  "/:clubId/members/:userId",
  auth,
  requireClubRole(["admin"]),
  removeMemberFromClub
);

// =====================================================
// MY ROLE
// =====================================================

// GET /clubs/:clubId/me  (mi rol dentro del club)
router.get(
  "/:clubId/me",
  auth,
  requireClubRole(["admin", "captain", "member"]),
  getMyClubRole
);

// =====================================================
// JOIN REQUESTS (solicitudes)
// =====================================================

// POST /clubs/:clubId/join-requests  (usuario solicita unirse)
router.post(
  "/:clubId/join-requests",
  auth,
  requestToJoinClub
);

// GET /clubs/:clubId/join-requests  (admin/captain ve solicitudes)
router.get(
  "/:clubId/join-requests",
  auth,
  requireClubRole(["admin", "captain"]),
  getJoinRequests
);

// PUT /clubs/:clubId/join-requests/:userId  (admin/captain acepta/rechaza)
router.put(
  "/:clubId/join-requests/:userId",
  auth,
  requireClubRole(["admin", "captain"]),
  resolveJoinRequest
);

// =====================================================
// LEAVE
// =====================================================

// DELETE /clubs/:clubId/leave (salir del club)
router.delete(
  "/:clubId/leave",
  auth,
  requireClubRole(["admin", "captain", "member"]),
  leaveClub
);

// =====================================================
// BOOTSTRAP ADMIN (si lo usas)
// =====================================================

// PUT /clubs/:clubId/bootstrap-admin/:userId
router.put(
  "/:clubId/bootstrap-admin/:userId",
  auth,
  bootstrapAdmin
);

module.exports = router;
