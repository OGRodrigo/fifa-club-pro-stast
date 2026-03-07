const Club = require("../models/club");

/**
 * =====================================================
 * REQUIRE CLUB ROLE (Middleware)
 * -----------------------------------------------------
 * - Valida que un usuario pertenezca a un club
 * - Verifica que tenga uno de los roles permitidos
 * - Inyecta `req.actor` y `req.club`
 *
 * REQUIERE que antes se ejecute el middleware `auth`
 * (el que setea req.user desde el JWT)
 *
 * Uso:
 * router.post("/clubs/:clubId/...", auth, requireClubRole(["admin"]), handler)
 * =====================================================
 *
 * @param {Array<string>} allowedRoles - Roles permitidos
 */
const requireClubRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // -------------------------------------------------
      // 1) Validar que venga usuario autenticado por JWT
      // -------------------------------------------------
      const actorUserId = req.user?.id; // ✅ desde JWT
      const { clubId } = req.params;

      if (!actorUserId) {
        return res.status(401).json({
          message: "No autenticado (falta token o req.user)"
        });
      }

      if (!clubId) {
        return res.status(400).json({
          message: "Falta clubId en params"
        });
      }

      // -------------------------------------------------
      // 2) Buscar club
      // -------------------------------------------------
      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).json({
          message: "Club no encontrado"
        });
      }

      // -------------------------------------------------
      // 3) Verificar membresía del usuario
      // -------------------------------------------------
      const member = club.members.find(
        (m) => m.user.toString() === actorUserId.toString()
      );

      if (!member) {
        return res.status(403).json({
          message: "No eres miembro del club"
        });
      }

      // -------------------------------------------------
      // 4) Verificar rol (si allowedRoles viene vacío, permite)
      // -------------------------------------------------
      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        return res.status(403).json({
          message: "No tienes permisos",
          requiredRoles: allowedRoles,
          yourRole: member.role
        });
      }

      // -------------------------------------------------
      // 5) Inyectar contexto al request (igual que antes)
      // -------------------------------------------------
      req.actor = {
        userId: actorUserId,
        role: member.role
      };

      req.club = club;

      return next();
    } catch (error) {
      console.error("REQUIRE CLUB ROLE ERROR:", error);
      return res.status(500).json({
        message: "Error en validación de permisos",
        error: error.message
      });
    }
  };
};

module.exports = { requireClubRole };
