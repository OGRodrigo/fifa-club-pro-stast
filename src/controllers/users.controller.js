// src/controllers/users.controller.js
const User = require("../models/User");
const mongoose = require("mongoose");

/**
 * POST /users
 * Crea usuario (si lo mantienes público)
 */
const createUser = async (req, res) => {
  try {
    let { username, email, gamerTag, platform, country } = req.body;

    // Limpieza básica
    username = typeof username === "string" ? username.trim() : username;
    email = typeof email === "string" ? email.trim().toLowerCase() : email;
    gamerTag = typeof gamerTag === "string" ? gamerTag.trim() : gamerTag;
    platform = typeof platform === "string" ? platform.trim() : platform;
    country = typeof country === "string" ? country.trim() : country;

    if (!username || !email || !gamerTag) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    // Evitar duplicados
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      return res.status(409).json({ message: "Username o email ya existe" });
    }

    const user = await User.create({
      username,
      email,
      gamerTag,
      platform,
      country,
    });

    return res.status(201).json(user);
  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    return res.status(500).json({ message: "Error al crear usuario" });
  }
};

/**
 * GET /users
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    return res.status(500).json({ message: "Error al listar usuarios" });
  }
};

/**
 * GET /users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    return res.status(200).json(user);
  } catch (err) {
    console.error("GET USER BY ID ERROR:", err);
    return res.status(500).json({ message: "Error al obtener usuario" });
  }
};

/**
 * GET /users/me (protegida)
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const user = await User.findById(userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    return res.status(200).json(user);
  } catch (err) {
    console.error("GET ME ERROR:", err);
    return res.status(500).json({ message: "Error al obtener mi usuario" });
  }
};

// ✅ Export limpio (sin mezclar con exports.*)
module.exports = {
  createUser,
  getUsers,
  getUserById,
  getMe,
};
