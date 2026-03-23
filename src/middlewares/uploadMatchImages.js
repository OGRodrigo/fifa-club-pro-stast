// src/middlewares/uploadMatchImages.js
const multer = require("multer");

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function fileFilter(req, file, cb) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(
      new Error(
        `Formato no permitido: ${file.mimetype}. Solo se aceptan JPG, PNG o WEBP.`
      )
    );
  }

  cb(null, true);
}

const uploadMatchImages = multer({
  storage,
  fileFilter,
  limits: {
    files: 12,
    fileSize: 10 * 1024 * 1024, // 10 MB por archivo
  },
});

module.exports = uploadMatchImages;