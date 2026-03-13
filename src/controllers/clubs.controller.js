const mongoose = require("mongoose");
const Club = require("../models/Club");
const Match = require("../models/Match");
const User = require("../models/User");

/**
 * Escapa texto para usarlo seguro en regex
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * =====================================================
 * CLUBS CONTROLLER
 * =====================================================
 */

/**
 * GET /clubs
 */
const getClubs = async (req, res) => {
  try {
    const clubs = await Club.find();
    return res.status(200).json(clubs);
  } catch (error) {
    console.error("getClubs ERROR:", error);
    return res.status(500).json({ message: "Error al obtener clubs" });
  }
};

/**
 * GET /clubs/:id
 * Obtiene un club por su ID
 */
const getClubById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const club = await Club.findById(id);

    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    return res.status(200).json(club);
  } catch (error) {
    console.error("getClubById ERROR:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * POST /clubs
 */
const createClub = async (req, res) => {
  try {
    const { name, country, founded, isPrivate } = req.body;

    const nameNorm = String(name || "").trim();
    const countryNorm = String(country || "").trim();

    if (!nameNorm || !countryNorm) {
      return res.status(400).json({
        message: "name y country son obligatorios",
      });
    }

    const creatorUserId = req.user?.id;
    if (!creatorUserId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const user = await User.findById(creatorUserId).select("_id");
    if (!user) {
      return res.status(404).json({ message: "Usuario creador no existe" });
    }

    const existingClubByMembership = await Club.findOne({
      "members.user": creatorUserId,
    }).select("_id");

    if (existingClubByMembership) {
      return res.status(400).json({ message: "Ya perteneces a un club" });
    }

    /**
     * Validación de nombre repetido sin distinguir mayúsculas/minúsculas
     * Ejemplo:
     * - FC Prueba
     * - fc prueba
     * => se consideran el mismo club
     */
    const existingClubByName = await Club.findOne({
      name: {
        $regex: `^${escapeRegex(nameNorm)}$`,
        $options: "i",
      },
    }).select("_id name");

    if (existingClubByName) {
      return res.status(409).json({
        message: "Ya existe un club con ese nombre",
      });
    }

    const club = await Club.create({
      name: nameNorm,
      country: countryNorm,
      founded,
      isPrivate: Boolean(isPrivate),
      members: [{ user: creatorUserId, role: "admin" }],
    });

    return res.status(201).json(club);
  } catch (error) {
    console.error("createClub ERROR:", error);

    /**
     * Fallback por índice único de Mongo
     */
    if (error?.code === 11000) {
      if (error?.keyPattern?.name) {
        return res.status(409).json({
          message: "Ya existe un club con ese nombre",
        });
      }

      return res.status(409).json({
        message: "Ya existe un registro duplicado",
      });
    }

    return res.status(500).json({ message: "Error al crear club" });
  }
};

/**
 * PUT /clubs/:clubId
 */
const updateClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const incomingName = req.body?.name ? String(req.body.name).trim() : "";

    if (incomingName) {
      const existingClubByName = await Club.findOne({
        _id: { $ne: clubId },
        name: {
          $regex: `^${escapeRegex(incomingName)}$`,
          $options: "i",
        },
      }).select("_id");

      if (existingClubByName) {
        return res.status(409).json({
          message: "Ya existe un club con ese nombre",
        });
      }
    }

    const payload = {
      ...req.body,
    };

    if (payload.name !== undefined) {
      payload.name = String(payload.name).trim();
    }

    if (payload.country !== undefined) {
      payload.country = String(payload.country).trim();
    }

    const club = await Club.findByIdAndUpdate(clubId, payload, {
      new: true,
      runValidators: true,
    });

    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    return res.status(200).json(club);
  } catch (error) {
    console.error("updateClub ERROR:", error);

    if (error?.code === 11000) {
      if (error?.keyPattern?.name) {
        return res.status(409).json({
          message: "Ya existe un club con ese nombre",
        });
      }

      return res.status(409).json({
        message: "Ya existe un registro duplicado",
      });
    }

    return res.status(400).json({ message: "Error al actualizar club" });
  }
};

/**
 * DELETE /clubs/:clubId
 * -----------------------------------------------------
 * Opción B: eliminación en cascada
 * - elimina el club
 * - elimina todos los partidos asociados al club
 * -----------------------------------------------------
 * Requisitos:
 * - auth + requireClubRole(["admin"]) ya protegen la ruta
 * - aquí además validamos nuevamente por defensa
 * =====================================================
 */
const deleteClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const actorUserId = req.user?.id;

    if (!clubId) {
      return res.status(400).json({ message: "clubId es obligatorio" });
    }

    if (!actorUserId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const club = await Club.findById(clubId);

    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    // Defensa extra: confirmar que el actor siga siendo admin real del club
    const actorMembership = Array.isArray(club.members)
      ? club.members.find(
          (member) => String(member.user) === String(actorUserId)
        )
      : null;

    if (!actorMembership || actorMembership.role !== "admin") {
      return res.status(403).json({
        message: "Solo el admin del club puede eliminarlo",
      });
    }

    // 1) contar partidos asociados
    const linkedMatchesCount = await Match.countDocuments({
      $or: [{ homeClub: clubId }, { awayClub: clubId }],
    });

    // 2) eliminar partidos asociados
    const deletedMatchesResult = await Match.deleteMany({
      $or: [{ homeClub: clubId }, { awayClub: clubId }],
    });

    // 3) eliminar club
    await Club.findByIdAndDelete(clubId);

    return res.status(200).json({
      message: "Club y partidos asociados eliminados correctamente",
      deletedClubId: clubId,
      deletedMatches: deletedMatchesResult?.deletedCount || linkedMatchesCount || 0,
    });
  } catch (error) {
    console.error("deleteClub ERROR:", error);
    return res.status(500).json({
      message: "Error al eliminar club y sus datos asociados",
    });
  }
};

/**
 * GET /clubs/:clubId/dashboard
 */
const getClubDashboard = async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId).populate(
      "members.user",
      "username gamerTag platform country"
    );

    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    return res.status(200).json({
      club,
      members: club.members,
    });
  } catch (err) {
    console.error("getClubDashboard ERROR:", err);
    return res.status(500).json({ message: "Error al obtener dashboard" });
  }
};

/**
 * GET /clubs/:clubId/form
 */
const getClubForm = async (req, res) => {
  try {
    const { clubId } = req.params;

    const matches = await Match.find({
      $or: [{ homeClub: clubId }, { awayClub: clubId }],
    }).sort({ date: -1 });

    return res.status(200).json(matches.slice(0, 5));
  } catch (err) {
    console.error("getClubForm ERROR:", err);
    return res.status(500).json({ message: "Error al obtener forma del club" });
  }
};

/**
 * GET /clubs/:clubAId/vs/:clubBId
 */
const getHeadToHeadClubs = async (req, res) => {
  try {
    const { clubAId, clubBId } = req.params;

    const matches = await Match.find({
      $or: [
        { homeClub: clubAId, awayClub: clubBId },
        { homeClub: clubBId, awayClub: clubAId },
      ],
    });

    return res.status(200).json(matches);
  } catch (err) {
    console.error("getHeadToHeadClubs ERROR:", err);
    return res.status(500).json({ message: "Error al obtener enfrentamiento" });
  }
};

module.exports = {
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
  getClubDashboard,
  getClubForm,
  getHeadToHeadClubs,
};