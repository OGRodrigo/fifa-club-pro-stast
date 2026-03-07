require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
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
// ------------------------------
// Objetivo:
// - usar CLIENT_URL desde .env
// - mantener localhost:5173 como fallback de desarrollo
// - permitir requests sin Origin (Postman, mobile apps, server-to-server)
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
      // Permitir requests sin origin:
      // - Postman
      // - apps móviles nativas
      // - scripts server-to-server
      if (!origin) {
        return callback(null, true);
      }

      // Permitir frontend autorizado
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Bloquear otros orígenes
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
// 1) players específicos por club
// 2) members + join-requests
// 3) clubs CRUD + dashboard/form/etc
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

// ==============================
// 8) Mongo + server
// ==============================
const PORT = process.env.PORT || 3000;
let server;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB conectado");

    server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🧪 NODE_ENV=${process.env.NODE_ENV || "(no definido)"}`);
      console.log("🌐 Allowed CORS origins:", allowedOrigins);
    });
  })
  .catch((err) => {
    console.error("❌ Error MongoDB:", err);
    process.exit(1);
  });

// ==============================
// 9) Shutdown gracioso
// ==============================
const shutdown = async (signal) => {
  try {
    console.log(`\n🛑 Recibido ${signal}. Cerrando...`);

    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log("✅ HTTP server cerrado");
    }

    await mongoose.connection.close(false);
    console.log("✅ Mongo connection cerrada");

    process.exit(0);
  } catch (e) {
    console.error("❌ Error en shutdown:", e);
    process.exit(1);
  }
};

// Solo log de verificación simple
console.log("JWT_SECRET loaded?", Boolean(process.env.JWT_SECRET));

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = app;