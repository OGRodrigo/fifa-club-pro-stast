const Club = require("../models/Club");
const Match = require("../models/Match");
const User = require("../models/User");

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

    if (!name || !country) {
      return res.status(400).json({ message: "name y country son obligatorios" });
    }

    const creatorUserId = req.user?.id;
    if (!creatorUserId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const user = await User.findById(creatorUserId);
    if (!user) {
      return res.status(404).json({ message: "Usuario creador no existe" });
    }

    const existingClub = await Club.findOne({ "members.user": creatorUserId }).select("_id");
    if (existingClub) {
      return res.status(400).json({ message: "Ya perteneces a un club" });
    }

    const club = await Club.create({
      name: name.trim(),
      country: country.trim(),
      founded,
      isPrivate: Boolean(isPrivate),
      members: [{ user: creatorUserId, role: "admin" }]
    });

    return res.status(201).json(club);
  } catch (error) {
    console.error("createClub ERROR:", error);
    return res.status(500).json({ message: "Error al crear club" });
  }
};

/**
 * PUT /clubs/:clubId
 */
const updateClub = async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findByIdAndUpdate(clubId, req.body, {
      new: true,
      runValidators: true
    });

    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    return res.status(200).json(club);
  } catch (error) {
    console.error("updateClub ERROR:", error);
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
      members: club.members
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
      $or: [{ homeClub: clubId }, { awayClub: clubId }]
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
        { homeClub: clubBId, awayClub: clubAId }
      ]
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
  getHeadToHeadClubs
};
