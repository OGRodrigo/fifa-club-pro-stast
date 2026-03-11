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
 */
const getClubById = async (req, res) => {
  try {
    const { id } = req.params;

    const club = await Club.findById(id);
    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    return res.status(200).json(club);
  } catch (error) {
    console.error("getClubById ERROR:", error);
    return res.status(400).json({ message: "ID inválido" });
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
 */
const deleteClub = async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findByIdAndDelete(clubId);
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    return res.status(200).json({ message: "Club eliminado correctamente" });
  } catch (error) {
    console.error("deleteClub ERROR:", error);
    return res.status(400).json({ message: "ID inválido" });
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