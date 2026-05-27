const express = require("express");
const {
  login, loginWithGoogle, register, forgotPassword,
  validateResetToken, resetPassword, me, changePassword, establecerContrasena,
} = require("../controllers/auth.controller");
const { verificarToken } = require("../middlewares/auth.middleware");
const { validateClientRegister } = require("../middlewares/validate.middleware");
const { verifyConnection, sendWelcomeEmail } = require("../config/email");

const router = express.Router();

router.post("/login",                login);
router.post("/google",               loginWithGoogle);
router.post("/register",             validateClientRegister, register);
router.post("/forgot-password",      forgotPassword);
router.post("/validate-reset-token", validateResetToken);
router.post("/reset-password",       resetPassword);
router.post("/change-password",      verificarToken, changePassword);
router.post("/establecer-contrasena", verificarToken, establecerContrasena);
router.get("/me",                    verificarToken, me);

// Diagnóstico de email (solo para verificar configuración en producción)
router.get("/email-status", async (req, res) => {
  const emailUser = (process.env.EMAIL_USER || "").trim();
  const emailPass = (process.env.EMAIL_PASSWORD || "").replace(/\s/g, "");

  const status = {
    EMAIL_USER: emailUser || "❌ no configurado",
    EMAIL_PASSWORD: emailPass ? `✅ ${emailPass.length} chars` : "❌ no configurado",
    FRONTEND_URL: process.env.FRONTEND_URL || "❌ no configurado",
  };

  try {
    const ok = await verifyConnection(1);
    status.smtp_connection = ok ? "✅ OK" : "❌ FALLO";
  } catch (e) {
    status.smtp_connection = `❌ ERROR: ${e.message}`;
  }

  res.json(status);
});

// Test de envío real (solo en desarrollo o con clave)
router.post("/test-email", async (req, res) => {
  const { to, secret } = req.body;
  if (secret !== "highlife_test_2024") {
    return res.status(403).json({ error: "No autorizado" });
  }
  try {
    const result = await sendWelcomeEmail(to || process.env.EMAIL_USER, "Usuario Test");
    res.json({ ok: result, message: result ? "Email enviado" : "Falló el envío" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;