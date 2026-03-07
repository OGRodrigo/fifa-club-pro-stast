const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth.middleware");
const { requireAnyClubRole } = require("../middlewares/requireAnyClubRole");
const { requireClubRole } = require("../middlewares/authClubRole");

const {
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
  getClubDashboard,
  getClubForm,
  getHeadToHeadClubs
} = require("../controllers/clubs.controller");

// Público
router.get("/", getClubs);

// Protegido: solo miembros del club
router.get(
  "/:clubId/dashboard",
  auth,
  requireClubRole(["admin", "captain", "member"]),
  getClubDashboard
);

router.get(
  "/:clubId/form",
  auth,
  requireClubRole(["admin", "captain", "member"]),
  getClubForm
);

// Crear club: requiere login
router.post("/", auth, createClub);

// Update/Delete: solo admin del club
router.put(
  "/:clubId",
  auth,
  requireClubRole(["admin"]),
  updateClub
);

router.get("/:clubAId/vs/:clubBId",auth,
  requireAnyClubRole({clubParams: ["clubAId", "clubBId"],
    allowedRoles: ["admin", "captain", "member"]}),getHeadToHeadClubs
);

router.delete(
  "/:clubId",
  auth,
  requireClubRole(["admin"]),
  deleteClub
);

router.get("/:id", getClubById);


module.exports = router;
