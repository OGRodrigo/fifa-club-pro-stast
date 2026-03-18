// src/index.js
require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 3000;
let server;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI no configurado");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB conectado");
    console.log(`🧪 NODE_ENV=${process.env.NODE_ENV || "(no definido)"}`);
    console.log("🔐 JWT_SECRET loaded?", Boolean(process.env.JWT_SECRET));

    server = app.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error al iniciar servidor:", err);
    process.exit(1);
  }
}

async function shutdown(signal) {
  try {
    console.log(`\n🛑 Recibido ${signal}. Cerrando servidor...`);

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      console.log("✅ HTTP server cerrado");
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log("✅ Mongo connection cerrada");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error en shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();