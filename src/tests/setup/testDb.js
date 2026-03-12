// tests/setup/testDb.js
const mongoose = require("mongoose");

async function connectTestDB() {
  const mongoUri = process.env.MONGO_URI_TEST;

  if (!mongoUri) {
    throw new Error("Falta MONGO_URI_TEST en variables de entorno");
  }

  await mongoose.connect(mongoUri);
}

async function clearTestDB() {
  const { collections } = mongoose.connection;

  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

async function closeTestDB() {
  await mongoose.connection.close();
}

module.exports = {
  connectTestDB,
  clearTestDB,
  closeTestDB,
};