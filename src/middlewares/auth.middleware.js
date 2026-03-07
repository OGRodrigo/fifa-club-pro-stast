// src/middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");

/**
 * AUTH MIDDLEWARE (JWT)
 * - Lee token desde Authorization: Bearer <token>
 * - Valida JWT
 * - Inyecta req.user = { id }
 */
const auth = (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET no configurado" });
    }

    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // compatible: token firmado con { sub } o { id }
    const userId = decoded.sub || decoded.id;

    if (!userId) {
      return res.status(401).json({ message: "Token inválido (sin subject)" });
    }

    req.user = { id: userId };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

module.exports = { auth };
