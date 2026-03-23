// src/controllers/ai.controller.js
const classifyImages = require("../services/ai/imageClassifier.service");
const parseMatchImagesService = require("../services/ai/matchImageParser.service");
const mergeMatchImageResults = require("../services/ai/matchImageMerge.service");
const normalizeMatchDraft = require("../services/ai/matchDraftNormalizer.service");

exports.parseMatchImages = async (req, res, next) => {
  try {
    const files = req.files || [];
    const { clubId = "", season = "", source = "ea_fc_match_screens" } = req.body || {};

    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "Debes subir al menos una imagen en el campo 'images'.",
      });
    }

    const classifiedImages = classifyImages(files);

    const parsedResults = await parseMatchImagesService({
      classifiedImages,
      meta: { clubId, season, source },
    });

    const mergedDraft = mergeMatchImageResults({
      parsedResults,
      meta: { clubId, season, source },
    });

    const normalizedDraft = normalizeMatchDraft(mergedDraft);

    return res.status(200).json({
      success: true,
      message: "Imágenes procesadas correctamente",
      ...normalizedDraft,
    });
  } catch (error) {
    next(error);
  }
};