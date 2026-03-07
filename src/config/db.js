const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,              // 🔥 fuerza IPv4
      serverSelectionTimeoutMS: 10000,
    });

    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("❌ Error MongoDB:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
