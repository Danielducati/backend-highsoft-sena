const express = require("express");
const {
  login,
  register,
  forgotPassword,
  validateResetToken,
  resetPassword,
  me,
} = require("../controllers/auth.controller");
const { verificarToken } = require("../middlewares/auth.middleware");
const { validateClientRegister} = require ("../middlewares/validate.middleware");
const router = express.Router();

router.post("/login", login);
router.post("/register", validateClientRegister, register);
router.post("/forgot-password", forgotPassword);
router.post("/validate-reset-token", validateResetToken);
router.post("/reset-password", resetPassword);
router.get("/me", verificarToken, me);

module.exports = router;