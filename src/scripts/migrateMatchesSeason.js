require("dotenv").config();
const mongoose = require("mongoose");
const Match = require("../models/Match");

(async () => {
  try {
    console.log("🔌 Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB conectado");

    // Buscar partidos sin season
    const matches = await Match.find({
      $or: [
        { season: { $exists: false } },
        { season: null }
      ]
    });

    console.log(`🔎 Matches sin season encontrados: ${matches.length}`);

    let updated = 0;

    for (const match of matches) {
      if (!match.date) continue;

      const year = new Date(match.date).getFullYear();
      if (isNaN(year)) continue;

      match.season = year;
      await match.save();
      updated++;
    }

    console.log(`✅ Migración completa. Matches actualizados: ${updated}`);
    process.exit(0);

  } catch (error) {
    console.error("❌ Error en migración:", error);
    process.exit(1);
  }
})();
