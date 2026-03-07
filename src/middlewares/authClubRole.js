const Club = require("../models/Club");

/**
 * Middleware:
 * valida que el usuario autenticado pertenezca al club
 * y que tenga uno de los roles permitidos.
 *
 * Uso:
 * requireClubRole(["admin"])
 * requireClubRole(["admin", "captain"])
 */
function requireClubRole(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const { clubId } = req.params;

      // Compatibilidad con distintas formas del user id
      const userId = req.user?.sub || req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          message: "Usuario no autenticado",
        });
      }

      if (!clubId) {
        return res.status(400).json({
          message: "Falta clubId en la ruta",
        });
      }

      if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return res.status(500).json({
          message: "Configuración inválida de roles permitidos",
        });
      }

      const club = await Club.findById(clubId).select("members");

      if (!club) {
        return res.status(404).json({
          message: "Club no encontrado",
        });
      }

      const membership = club.members.find(
        (member) => String(member.user) === String(userId)
      );

      if (!membership) {
        return res.status(403).json({
          message: "No perteneces a este club",
        });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          message: "No tienes permisos para realizar esta acción",
          requiredRoles: allowedRoles,
          currentRole: membership.role,
        });
      }

      // Contexto útil para controladores posteriores
      req.clubMembership = membership;
      req.clubRole = membership.role;
      req.clubId = clubId;

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