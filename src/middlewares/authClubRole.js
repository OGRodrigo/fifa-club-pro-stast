const mongoose = require("mongoose");
const Club = require("../models/Club");

/**
 * =====================================================
 * requireClubRole
 * -----------------------------------------------------
 * Valida:
 * - usuario autenticado
 * - club existente
 * - pertenencia al club
 * - rol permitido
 *
 * Uso:
 *   requireClubRole(["admin"])
 *   requireClubRole(["admin", "captain"])
 * =====================================================
 */
function requireClubRole(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const clubId = req.params?.clubId;

      if (!userId) {
        return res.status(401).json({
          message: "No autenticado",
        });
      }

      if (!clubId) {
        return res.status(400).json({
          message: "clubId es requerido",
        });
      }

      // ✅ validar ObjectId antes de consultar Mongo
      if (!mongoose.Types.ObjectId.isValid(clubId)) {
        return res.status(400).json({
          message: "ID inválido",
        });
      }

      const club = await Club.findById(clubId).select("_id members");
      if (!club) {
        return res.status(404).json({
          message: "Club no encontrado",
        });
      }

      const membership = club.members.find(
        (m) => String(m.user) === String(userId)
      );

      if (!membership) {
        return res.status(403).json({
          message: "No perteneces a este club",
        });
      }

      if (
        Array.isArray(allowedRoles) &&
        allowedRoles.length > 0 &&
        !allowedRoles.includes(membership.role)
      ) {
        return res.status(403).json({
          message: "No autorizado para esta acción",
        });
      }

      req.club = club;
      req.clubMembership = membership;

      next();
    } catch (error) {
      console.error("ERROR requireClubRole:", error);

      return res.status(500).json({
        message: "Error validando permisos del club",
      });
    }
  };
}

module.exports = { requireClubRole };