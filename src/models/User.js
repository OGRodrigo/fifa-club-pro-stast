const mongoose = require("mongoose");

/**
 * =====================================================
 * USER SCHEMA
 * -----------------------------------------------------
 * Representa a un jugador/usuario del sistema.
 *
 * Campos clave:
 * - username: identificador único público
 * - email: único, normalizado a lowercase
 * - gamerTag: nombre in-game
 * - platform: plataforma principal
 * - country: país del jugador
 * - passwordHash: hash bcrypt del password (LOGIN REAL)
 * =====================================================
 */

const UserSchema = new mongoose.Schema(
  {
    // 🧑 Nombre de usuario (único en el sistema)
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3
    },

    // 📧 Email (único, normalizado)
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    // 🔐 Hash del password (bcrypt)
    passwordHash: {
      type: String,
      required: true,
      select: false // 👈 importante: no lo devuelve por defecto
    },

    // 🎮 Plataforma principal
    platform: {
      type: String,
      enum: ["PS", "XBOX", "PC"],
      default: "PS"
    },

    // 🕹️ GamerTag / Nick in-game
    gamerTag: {
      type: String,
      required: true,
      trim: true
    },

    // 🌎 País del jugador
    country: {
      type: String,
      default: "Chile",
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", UserSchema);
