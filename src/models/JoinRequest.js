// models/JoinRequest.js

const mongoose = require("mongoose");

/**
 * JoinRequest
 * ------------------------------------
 * Representa una solicitud para unirse
 * a un club.
 *
 * Reglas:
 * - Un usuario solo puede tener 1 solicitud pendiente
 * - Cuando se aprueba → se agrega a Club.members
 */

const joinRequestSchema = new mongoose.Schema(
  {
    // Usuario que quiere entrar
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Club al que quiere entrar
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true
    },

    // Estado de la solicitud
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

/**
 * 🔒 Índice compuesto:
 * Evita que el mismo usuario tenga
 * múltiples solicitudes activas.
 */
joinRequestSchema.index(
  { user: 1 },
  { unique: false }
);

module.exports = mongoose.model("JoinRequest", joinRequestSchema);
