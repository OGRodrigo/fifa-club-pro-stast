const express = require("express");
const router = express.Router();

const auditController = require("../controllers/audit.controller");

router.get("/suspicious-matches", auditController.getSuspiciousMatches);

module.exports = router;
