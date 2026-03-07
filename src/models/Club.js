// src/models/Club.js
const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    country: { type: String, trim: true },

    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["admin", "captain", "member"], default: "member" },
      },
    ],

    // ✅ FIX: necesario para populate("joinRequests.user")
    joinRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// ⚠️ SOLO ESTA LÍNEA DEFINE EL MODELO
module.exports =
  mongoose.models.Club || mongoose.model("Club", clubSchema);
