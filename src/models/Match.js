const mongoose = require("mongoose");

/**
 * =====================================================
 * MATCH SCHEMA V2
 * -----------------------------------------------------
 * Evolución compatible del modelo Match.
 *
 * Mantiene:
 * - homeClub / awayClub
 * - date / stadium / season
 * - scoreHome / scoreAway
 * - playerStats
 *
 * Agrega:
 * - teamStats (stats colectivas por club)
 * - lineups (alineaciones por club)
 * - playerStats enriquecido
 * - advancedVisuals (opcional, preparado para futuro)
 * =====================================================
 */

/**
 * =====================================================
 * TEAM STATS
 * -----------------------------------------------------
 * Stats colectivas por club en un partido
 * Inspiradas en las pantallas que enviaste:
 * - posesión
 * - tiros
 * - xG
 * - pases
 * - precisión
 * - defensa
 * - faltas / tarjetas
 * =====================================================
 */
const TeamStatsSchema = new mongoose.Schema(
  {
    possession: { type: Number, default: 0, min: 0, max: 100 },

    shots: { type: Number, default: 0, min: 0 },
    shotsOnTarget: { type: Number, default: 0, min: 0 },
    shotAccuracy: { type: Number, default: 0, min: 0, max: 100 },
    expectedGoals: { type: Number, default: 0, min: 0 },

    passes: { type: Number, default: 0, min: 0 },
    passesCompleted: { type: Number, default: 0, min: 0 },
    passAccuracy: { type: Number, default: 0, min: 0, max: 100 },

    dribbleSuccess: { type: Number, default: 0, min: 0, max: 100 },

    tackles: { type: Number, default: 0, min: 0 },
    tacklesWon: { type: Number, default: 0, min: 0 },
    tackleSuccess: { type: Number, default: 0, min: 0, max: 100 },

    recoveries: { type: Number, default: 0, min: 0 },
    interceptions: { type: Number, default: 0, min: 0 },
    clearances: { type: Number, default: 0, min: 0 },
    blocks: { type: Number, default: 0, min: 0 },
    saves: { type: Number, default: 0, min: 0 },

    fouls: { type: Number, default: 0, min: 0 },
    offsides: { type: Number, default: 0, min: 0 },
    corners: { type: Number, default: 0, min: 0 },
    freeKicks: { type: Number, default: 0, min: 0 },
    penalties: { type: Number, default: 0, min: 0 },

    yellowCards: { type: Number, default: 0, min: 0 },
    redCards: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

/**
 * =====================================================
 * LINEUPS
 * -----------------------------------------------------
 * Alineación por club
 * =====================================================
 */
const LineupPlayerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    shirtNumber: {
      type: Number,
      min: 1,
      max: 99,
    },
    starter: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const LineupSchema = new mongoose.Schema(
  {
    formation: {
      type: String,
      default: "",
      trim: true,
    },
    players: {
      type: [LineupPlayerSchema],
      default: [],
    },
  },
  { _id: false }
);

/**
 * =====================================================
 * PLAYER STATS
 * -----------------------------------------------------
 * Evolución del subdocumento actual.
 *
 * Mantiene:
 * - user
 * - club
 * - goals
 * - assists
 *
 * Agrega:
 * - position
 * - rating
 * - minutesPlayed
 * - isMVP
 * - métricas ofensivas / pase / defensa
 * =====================================================
 */
const PlayerStatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
    },

    position: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    minutesPlayed: {
      type: Number,
      min: 0,
      max: 130,
      default: 90,
    },
    isMVP: {
      type: Boolean,
      default: false,
    },

    goals: {
      type: Number,
      default: 0,
      min: 0,
    },
    assists: {
      type: Number,
      default: 0,
      min: 0,
    },

    shots: {
      type: Number,
      default: 0,
      min: 0,
    },
    shotsOnTarget: {
      type: Number,
      default: 0,
      min: 0,
    },
    shotAccuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    passes: {
      type: Number,
      default: 0,
      min: 0,
    },
    passesCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    passAccuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    keyPasses: {
      type: Number,
      default: 0,
      min: 0,
    },

    dribbles: {
      type: Number,
      default: 0,
      min: 0,
    },
    dribblesWon: {
      type: Number,
      default: 0,
      min: 0,
    },
    dribbleSuccess: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    tackles: {
      type: Number,
      default: 0,
      min: 0,
    },
    tacklesWon: {
      type: Number,
      default: 0,
      min: 0,
    },
    interceptions: {
      type: Number,
      default: 0,
      min: 0,
    },
    recoveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    clearances: {
      type: Number,
      default: 0,
      min: 0,
    },
    blocks: {
      type: Number,
      default: 0,
      min: 0,
    },
    saves: {
      type: Number,
      default: 0,
      min: 0,
    },

    fouls: {
      type: Number,
      default: 0,
      min: 0,
    },
    yellowCards: {
      type: Number,
      default: 0,
      min: 0,
    },
    redCards: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

/**
 * =====================================================
 * ADVANCED VISUALS
 * -----------------------------------------------------
 * Preparado para futuro:
 * - shot map
 * - momentum
 * - network
 * - heatmaps
 *
 * No obligatorio aún.
 * =====================================================
 */
const MatchSchema = new mongoose.Schema(
  {
    homeClub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
    },
    awayClub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    stadium: {
      type: String,
      required: true,
      trim: true,
    },

    scoreHome: {
      type: Number,
      required: true,
      min: 0,
    },

    scoreAway: {
      type: Number,
      required: true,
      min: 0,
    },

    season: {
      type: Number,
      required: true,
    },

    competition: {
      type: String,
      default: "League",
      trim: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "played", "cancelled"],
      default: "played",
    },

    teamStats: {
      home: {
        type: TeamStatsSchema,
        default: () => ({}),
      },
      away: {
        type: TeamStatsSchema,
        default: () => ({}),
      },
    },

    lineups: {
      home: {
        type: LineupSchema,
        default: () => ({ formation: "", players: [] }),
      },
      away: {
        type: LineupSchema,
        default: () => ({ formation: "", players: [] }),
      },
    },

    playerStats: {
      type: [PlayerStatSchema],
      default: [],
    },

    advancedVisuals: {
      momentum: {
        type: [Number],
        default: [],
      },
      shotMap: {
        home: { type: Array, default: [] },
        away: { type: Array, default: [] },
      },
      passNetwork: {
        home: { type: Array, default: [] },
        away: { type: Array, default: [] },
      },
      heatmaps: {
        home: { type: Array, default: [] },
        away: { type: Array, default: [] },
      },
    },
  },
  { timestamps: true }
);

/**
 * =====================================================
 * VALIDACIONES
 * =====================================================
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

/**
 * =====================================================
 * ÍNDICES
 * =====================================================
 */
MatchSchema.index({ season: 1, date: -1 });
MatchSchema.index({ homeClub: 1, season: 1 });
MatchSchema.index({ awayClub: 1, season: 1 });
MatchSchema.index({ "playerStats.user": 1, season: 1 });
MatchSchema.index({ "playerStats.club": 1, season: 1 });

module.exports = mongoose.model("Match", MatchSchema);