const mongoose = require("mongoose");

/**
 * =====================================================
 * USER SCHEMA
 * -----------------------------------------------------
 * Representa a un jugador/usuario del sistema.
 *
 * Reglas importantes:
 * - username único
 * - email único
 * - ambos se normalizan con trim
 * - email además se guarda en lowercase
 * =====================================================
 */

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    platform: {
      type: String,
      enum: ["PS", "XBOX", "PC"],
      default: "PS",
    },

    gamerTag: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      default: "Chile",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Índices explícitos
 * -----------------------------------------------------
 * Aunque "unique: true" ya ayuda, dejar los índices
 * explícitos hace más claro el contrato del modelo.
 */
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);