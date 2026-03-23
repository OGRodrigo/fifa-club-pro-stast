// src/routes/ai.routes.js
const express = require("express");
const { parseMatchImages } = require("../controllers/ai.controller");
const uploadMatchImages = require("../middlewares/uploadMatchImages");

const router = express.Router();

/**
 * POST /ai/parse-match-images
 * multipart/form-data
 * fields:
 * - images[]: files
 * - clubId?: string
 * - season?: string
 * - source?: string
 */
router.post(
  "/parse-match-images",
  uploadMatchImages.array("images", 12),
  parseMatchImages
);

module.exports = router;