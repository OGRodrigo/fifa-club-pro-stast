// src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Club = require("../models/Club");

/**
 * Helper: arma clubContext del usuario (clubId + role) o null
 */
async function buildClubContext(userId) {
  const club = await Club.findOne({ "members.user": userId }).select("_id members");
  if (!club) return null;

  const row = club.members.find((m) => String(m.user) === String(userId));
  const role = row?.role || "member";

  return { clubId: String(club._id), role };
}

/**
 * =========================
 * POST /auth/register
 * =========================
 */
const register = async (req, res) => {
  try {
    const { username, email, password, gamerTag, platform, country } = req.body;

    if (!username || !email || !password || !gamerTag) {
      return res.status(400).json({
        message: "username, email, password y gamerTag son obligatorios",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET no configurado" });
    }

    const emailNorm = String(email).trim().toLowerCase();

    const exists = await User.findOne({ email: emailNorm }).select("_id");
    if (exists) {
      return res.status(409).json({ message: "Email ya registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: String(username).trim(),
      email: emailNorm,
      passwordHash,
      gamerTag: String(gamerTag).trim(),
      platform: platform ? String(platform).trim() : undefined,
      country: country ? String(country).trim() : undefined,
    });

    // (Opcional) puedes devolver token en register; por ahora simple: usuario creado
    return res.status(201).json({
      message: "Usuario creado",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        gamerTag: user.gamerTag,
        platform: user.platform,
        country: user.country,
      },
    });
  } catch (err) {
    console.error("register ERROR:", err);
    return res.status(500).json({ message: "Error en register" });
  }
};

/**
 * =========================
 * POST /auth/login
 * =========================
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y password requeridos" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET no configurado" });
    }

    const emailNorm = String(email).trim().toLowerCase();

    // ⚠️ passwordHash suele estar select:false
    const user = await User.findOne({ email: emailNorm }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { sub: user._id }, // estándar
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Importante: clubContext al login (para tu menú)
    const clubContext = await buildClubContext(user._id);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        gamerTag: user.gamerTag,
        platform: user.platform,
        country: user.country,
      },
      clubContext, // { clubId, role } o null
    });
  } catch (err) {
    console.error("login ERROR:", err);
    return res.status(500).json({ message: "Error en login" });
  }
};

/**
 * =========================
 * GET /auth/me (PROTEGIDO)
 * Devuelve clubContext => { clubId, role } o null
 * =========================
 */
const me = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "No autenticado" });

    const clubContext = await buildClubContext(userId);

    return res.status(200).json({ clubContext });
  } catch (err) {
    console.error("me ERROR:", err);
    return res.status(500).json({ message: "Error en /auth/me" });
  }
};

module.exports = { register, login, me };
