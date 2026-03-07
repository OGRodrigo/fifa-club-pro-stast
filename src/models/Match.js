const mongoose = require("mongoose");

/**
 * =====================================================
 * MATCH SCHEMA
 * -----------------------------------------------------
 * - homeClub / awayClub: clubs del partido
 * - date: fecha del match
 * - stadium: estadio
 * - scoreHome / scoreAway: marcador
 * - season: año (ej: 2026)
 *
 * playerStats:
 * - stats individuales por jugador (por partido)
 * - user: jugador
 * - club: club por el que jugó en ese partido (home o away)
 * - goals/assists: no negativos
 * =====================================================
 */

// Subdocumento para stats (evita _id por cada stat)
const PlayerStatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true
    },
    goals: {
      type: Number,
      default: 0,
      min: 0
    },
    assists: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const MatchSchema = new mongoose.Schema(
  {
    homeClub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true
    },
    awayClub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    stadium: {
      type: String,
      required: true,
      trim: true
    },
    scoreHome: {
      type: Number,
      required: true,
      min: 0
    },
    scoreAway: {
      type: Number,
      required: true,
      min: 0
    },
    season: {
      type: Number,
      required: true
    },

    // ✅ Estadísticas individuales por partido
    playerStats: [PlayerStatSchema]
  },
  { timestamps: true }
);

/**
 * ✅ Validación: homeClub y awayClub no pueden ser el mismo
 * (esto NO rompe tu API, solo evita datos inválidos)
 */
MatchSchema.pre("validate", function () {
  if (
    this.homeClub &&
    this.awayClub &&
    this.homeClub.toString() === this.awayClub.toString()
  ) {
    throw new Error("homeClub y awayClub no pueden ser el mismo club");
  }
});


// ✅ Índices (los tuyos + mantenidos)
MatchSchema.index({ season: 1, date: -1 });
MatchSchema.index({ homeClub: 1, season: 1 });
MatchSchema.index({ awayClub: 1, season: 1 });
MatchSchema.index({ "playerStats.user": 1, season: 1 });
MatchSchema.index({ "playerStats.club": 1, season: 1 });

module.exports = mongoose.model("Match", MatchSchema);
