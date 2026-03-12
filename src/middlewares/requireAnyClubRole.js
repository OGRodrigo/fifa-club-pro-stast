const Club = require("../models/Club");

/**
 * Permite si el usuario es miembro de AL MENOS UNO
 * de los clubs pasados por params.
 *
 * Requiere auth antes (req.user.id).
 */
const requireAnyClubRole = ({
  clubParams = ["clubAId", "clubBId"],
  allowedRoles = []
} = {}) => {
  return async (req, res, next) => {
    try {
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const clubIds = clubParams.map(p => req.params[p]).filter(Boolean);
      if (clubIds.length === 0) {
        return res.status(400).json({ message: "Faltan ids de clubs en params" });
      }

      const clubs = await Club.find({ _id: { $in: clubIds } });
      if (!clubs || clubs.length === 0) {
        return res.status(404).json({ message: "Club no encontrado" });
      }

      // ✅ miembro de A o B
      for (const club of clubs) {
        const member = (club.members || []).find(
          m => m.user.toString() === actorUserId.toString()
        );

        if (!member) continue;

        if (allowedRoles.length === 0 || allowedRoles.includes(member.role)) {
          // inyectamos igual que tu requireClubRole (para consistencia)
          req.actor = { userId: actorUserId, role: member.role };
          req.club = club; // el club por el que se autorizó
          return next();
        }
      }

      return res.status(403).json({
        message: "No tienes permisos",
        requiredRoles: allowedRoles.length ? allowedRoles : ["member"]
      });
    } catch (error) {
      console.error("REQUIRE ANY CLUB ROLE ERROR:", error);
      return res.status(500).json({
        message: "Error en validación de permisos",
        error: error.message
      });
    }
  };
};

module.exports = { requireAnyClubRole };
