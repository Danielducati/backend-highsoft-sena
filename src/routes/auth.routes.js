const express = require("express");
const {
  login,
  register,
  forgotPassword,
  validateResetToken,
  resetPassword,
} = require("../controllers/auth.controller");
const { validateClientRegister } = require("../middlewares/validate.middleware");

const router = express.Router();

router.post("/login", login);
router.post("/register", validateClientRegister, register);
router.post("/forgot-password", forgotPassword);
router.post("/validate-reset-token", validateResetToken);
router.post("/reset-password", resetPassword);

module.exports = router;