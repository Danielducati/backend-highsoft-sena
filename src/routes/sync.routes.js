// src/routes/sync.routes.js
const express = require("express");
const router = express.Router();
const syncController = require("../controllers/sync.controller");
const { verifyToken, requireAdmin } = require("../middlewares/auth.middleware");

// Sincronizar especialidades de empleados con roles de usuarios
// Solo accesible por administradores
router.get("/employee-specialty-role", verifyToken, requireAdmin, syncController.syncEmployeeSpecialtyWithRole);

module.exports = router;
