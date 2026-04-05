const express = require("express");
const router  = express.Router();
// 1. IMPORTAS EL CONTROLADOR AQUÍ
const schedulesCtrl = require("../controllers/schedules.controller");
const { verificarToken, tienePermiso } = require("../middlewares/auth.middleware");

// GET /schedules
router.get("/", verificarToken, tienePermiso("horarios.ver"), schedulesCtrl.getAll);

// POST /schedules
router.post("/", verificarToken, tienePermiso("horarios.crear"), schedulesCtrl.create);

// PUT /schedules
router.put("/:employeeId/:weekStartDate", verificarToken, tienePermiso("horarios.editar"), schedulesCtrl.update);

// DELETE /schedules
// 2. USAS LA FUNCIÓN DEL CONTROLADOR DIRECTAMENTE
router.delete("/:employeeId/:weekStartDate", verificarToken, tienePermiso("horarios.eliminar"), schedulesCtrl.remove);

module.exports = router;