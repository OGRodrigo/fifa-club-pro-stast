// src/routes/auth.routes.js
const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth.middleware"); // ✅ ahora sí, es function
const { register, login, me } = require("../controllers/auth.controller");

// públicas
router.post("/register", register);
router.post("/login", login);

// protegida
router.get("/me", auth, me);

module.exports = router;
