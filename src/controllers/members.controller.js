const Club = require("../models/Club");
const User = require("../models/User");

/**
 * =====================================================
 * MEMBERS CONTROLLER (dentro de clubs)
 * -----------------------------------------------------
 * Maneja:
 * - Agregar miembro
 * - Cambiar rol
 * - Bootstrap admin inicial
 * - Listar miembros
 * - Mi rol en el club (/clubs/:clubId/me)
 * - Join requests (solicitudes)
 * - Kick / Remove / Leave
 * =====================================================
 */

// =====================================================
// POST /clubs/:clubId/members
// Agrega un miembro al club (por userId) y rol opcional
// =====================================================
exports.addMemberToClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId es obligatorio" });
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const already = club.members.some(m => m.user.toString() === userId);
    if (already) {
      return res.status(409).json({ message: "Usuario ya es miembro del club" });
    }

    const allowedRoles = ["admin", "captain", "member"];
    const finalRole = allowedRoles.includes(role) ? role : "member";

    club.members.push({ user: userId, role: finalRole });
    await club.save();

    return res.status(201).json({ message: "Miembro agregado correctamente" });
  } catch (err) {
    console.error("addMemberToClub ERROR:", err);
    return res.status(500).json({ message: "Error al agregar miembro" });
  }
};

// =====================================================
// PUT /clubs/:clubId/members/:userId/role
// Cambia rol de un miembro (normalmente protegido por middleware)
// =====================================================
exports.updateMemberRole = async (req, res) => {
  try {
    const { clubId, userId } = req.params;
    const { role } = req.body;

    const allowedRoles = ["admin", "captain", "member"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Rol inválido" });
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    const member = club.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ message: "Miembro no encontrado" });
    }

    // ❌ No quitar el rol al único admin
    if (member.role === "admin" && role !== "admin") {
      const adminCount = club.members.filter(m => m.role === "admin").length;
      if (adminCount === 1) {
        return res.status(400).json({ message: "No puedes quitar el rol al único admin" });
      }
    }

    member.role = role;
    await club.save();

    return res.status(200).json({ message: "Rol actualizado", role });
  } catch (err) {
    console.error("updateMemberRole ERROR:", err);
    return res.status(500).json({ message: "Error al actualizar rol" });
  }
};

// =====================================================
// PUT /clubs/:clubId/bootstrap-admin/:userId
// Asigna admin inicial si aún no existe uno
// =====================================================
exports.bootstrapAdmin = async (req, res) => {
  try {
    const { clubId, userId } = req.params;
    const actorUserId = req.user?.id;

    if (!actorUserId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // ✅ Solo puedes bootstrapping para ti mismo
    if (actorUserId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Solo puedes bootstrapping tu propio usuario" });
    }

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    const hasAdmin = club.members.some(m => m.role === "admin");
    if (hasAdmin) {
      return res.status(409).json({ message: "Ya existe un admin en el club" });
    }

    const member = club.members.find(m => m.user.toString() === actorUserId.toString());
    if (!member) {
      return res.status(403).json({ message: "Debes ser miembro del club para bootstrap" });
    }

    member.role = "admin";
    await club.save();

    return res.status(200).json({ message: "Admin inicial asignado", userId: actorUserId });
  } catch (err) {
    console.error("bootstrapAdmin ERROR:", err);
    return res.status(500).json({ message: "Error al asignar admin" });
  }
};

// =====================================================
// DELETE /clubs/:clubId/members/:userId
// Elimina a un miembro (remove). (Cuidado: tienes kick con ruta similar)
// =====================================================
exports.removeMemberFromClub = async (req, res) => {
  try {
    const { clubId, userId } = req.params;

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    const memberIndex = club.members.findIndex(m => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Miembro no encontrado" });
    }

    const target = club.members[memberIndex];

    // ❌ No expulsar al único admin
    if (target.role === "admin") {
      const adminCount = club.members.filter(m => m.role === "admin").length;
      if (adminCount === 1) {
        return res.status(400).json({ message: "No puedes eliminar al único admin" });
      }
    }

    club.members.splice(memberIndex, 1);
    await club.save();

    return res.status(200).json({ message: "Miembro eliminado del club" });
  } catch (err) {
    console.error("removeMemberFromClub ERROR:", err);
    return res.status(500).json({ message: "Error al eliminar miembro" });
  }
};

// =====================================================
// GET /clubs/:clubId/members
// Lista miembros con datos del usuario (populate)
// =====================================================
exports.getClubMembers = async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId).populate(
      "members.user",
      "username gamerTag platform country"
    );

    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      members: club.members
    });
  } catch (error) {
    console.error("getClubMembers ERROR:", error);
    return res.status(500).json({ message: "Error al obtener miembros del club" });
  }
};


// =====================================================
// GET /clubs/:clubId/me
// Devuelve mi rol dentro del club (JWT + requireClubRole)
// =====================================================

exports.getMyClubRole = async (req, res) => {
  try {
    return res.status(200).json({
      clubId: req.clubId,
      actorUserId: req.user?.id || null,
      role: req.clubRole || null,
    });
  } catch (err) {
    console.error("getMyClubRole ERROR:", err);
    return res.status(500).json({ message: "Error al obtener mi rol" });
  }
};


// =====================================================
// POST /clubs/:clubId/join-requests
// Usuario solicita unirse al club (JWT)
// =====================================================
exports.requestToJoinClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.id; // ✅ desde JWT

    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    // ✅ asegurar array
    if (!Array.isArray(club.joinRequests)) {
      club.joinRequests = [];
    }

    // ❌ ya es miembro
    const isMember = club.members.some(m => m.user.toString() === userId.toString());
    if (isMember) {
      return res.status(400).json({ message: "Ya eres miembro del club" });
    }

    // ❌ solicitud ya existente (pending)
    const existingRequest = club.joinRequests.find(
      r => r.user.toString() === userId.toString() && r.status === "pending"
    );
    if (existingRequest) {
      return res.status(400).json({ message: "Solicitud ya enviada" });
    }

    club.joinRequests.push({ user: userId }); // status pending por default
    await club.save();

    return res.status(201).json({ message: "Solicitud enviada" });
  } catch (err) {
    console.error("requestToJoinClub ERROR:", err);
    return res.status(500).json({ message: "Error al solicitar unión" });
  }
};

// =====================================================
// GET /clubs/:clubId/join-requests
// Admin/captain ve solicitudes
// =====================================================
exports.getJoinRequests = async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId).populate(
      "joinRequests.user",
      "username gamerTag platform country"
    );

    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    return res.status(200).json({
      club: { id: club._id, name: club.name },
      requests: club.joinRequests || []
    });
  } catch (err) {
    console.error("getJoinRequests ERROR:", err);
    return res.status(500).json({ message: "Error al obtener solicitudes" });
  }
};

// =====================================================
// PUT /clubs/:clubId/join-requests/:userId
// action: "accept" | "reject"
// =====================================================
exports.resolveJoinRequest = async (req, res) => {
  try {
    const { clubId, userId } = req.params;
    const { action } = req.body;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Acción inválida" });
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    const joinRequests = club.joinRequests || [];

    const requestIndex = joinRequests.findIndex(
      r => r.user.toString() === userId && r.status === "pending"
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    // ✅ reject: eliminar request
    if (action === "reject") {
      club.joinRequests.splice(requestIndex, 1);
      await club.save();
      return res.status(200).json({ message: "Solicitud rechazada" });
    }

    // ✅ accept:
    const alreadyMember = club.members.some(m => m.user.toString() === userId);
    if (!alreadyMember) {
      club.members.push({ user: userId, role: "member" });
    }

    club.joinRequests.splice(requestIndex, 1);
    await club.save();

    return res.status(200).json({
      message: alreadyMember ? "Usuario ya era miembro (ok)" : "Usuario agregado al club"
    });
  } catch (err) {
    console.error("resolveJoinRequest ERROR:", err);
    return res.status(500).json({ message: "Error al resolver solicitud" });
  }
};


// =====================================================
// DELETE /clubs/:clubId/leave
// El usuario sale del club (JWT)
// =====================================================
exports.leaveClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.id; // 🔑 SIEMPRE desde JWT

    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    const index = club.members.findIndex(
      m => m.user.toString() === userId.toString()
    );

    if (index === -1) {
      return res.status(404).json({ message: "No eres miembro del club" });
    }

    const member = club.members[index];

    // ❌ No salir si es el único admin
    if (member.role === "admin") {
      const admins = club.members.filter(m => m.role === "admin");
      if (admins.length === 1) {
        return res.status(400).json({
          message: "No puedes salir: eres el único admin"
        });
      }
    }

    club.members.splice(index, 1);
    await club.save();

    return res.status(200).json({ message: "Saliste del club" });

  } catch (err) {
    console.error("leaveClub ERROR:", err);
    return res.status(500).json({ message: "Error al salir del club" });
  }
};


