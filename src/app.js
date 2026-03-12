// src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

// ==============================
// 1) Import de rutas
// ==============================
const auditRoutes = require("./routes/audit.routes");
const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const leagueRoutes = require("./routes/league.routes");
const matchesRoutes = require("./routes/matches.routes");
const statsRoutes = require("./routes/stats.routes");
const advancedStatsRoutes = require("./routes/advancedStats.routes");

const clubsRoutes = require("./routes/clubs.routes");
const membersRoutes = require("./routes/members.routes");
const playersRoutes = require("./routes/players.routes");

const app = express();

// ==============================
// 2) Configuración CORS
// ==============================
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean);

// ==============================
// 3) Middleware base
// ==============================
app.use(express.json());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  })
);

// ==============================
// 4) DEV: NO CACHE / NO ETAG
// ==============================
if (process.env.NODE_ENV !== "production") {
  app.set("etag", false);

  app.use((req, res, next) => {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  });
}

// ==============================
// 5) Rutas
// ==============================
app.use("/audit", auditRoutes);
app.use("/auth", authRoutes);

app.use("/users", usersRoutes);
app.use("/league", leagueRoutes);
app.use("/matches", matchesRoutes);
app.use("/stats", statsRoutes);
app.use("/advanced-stats", advancedStatsRoutes);

// ⚠️ /clubs (orden importante)
app.use("/clubs/:clubId/players", playersRoutes);
app.use("/clubs", membersRoutes);
app.use("/clubs", clubsRoutes);

// ==============================
// 6) 404 handler
// ==============================
app.use((req, res) => {
  return res.status(404).json({
    message: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

// ==============================
// 7) Error handler estándar
// ==============================
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);

  return res.status(err.statusCode || 500).json({
    message: err.message || "Error interno del servidor",
  });
});

module.exports = app;