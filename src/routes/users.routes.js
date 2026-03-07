const express = require("express");
const router = express.Router();

const { auth } = require("../middlewares/auth.middleware");

const {
  createUser,
  getUsers,
  getUserById,
  getMe,
} = require("../controllers/users.controller");

router.post("/", createUser);
router.get("/", getUsers);
router.get("/me", auth, getMe);
router.get("/:id", getUserById);

module.exports = router;
