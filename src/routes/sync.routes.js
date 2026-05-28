// src/routes/sync.routes.js
const express = require("express");
const router = express.Router();
const syncController = require("../controllers/sync.controller");
const { verificarToken, soloAdmin } = require("../middlewares/auth.middleware");

// Sincronizar especialidades de empleados con roles de usuarios
// Solo accesible por administradores
router.get("/employee-specialty-role", verificarToken, soloAdmin, syncController.syncEmployeeSpecialtyWithRole);

module.exports = router;
