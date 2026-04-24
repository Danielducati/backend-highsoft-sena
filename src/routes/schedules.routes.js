const express = require("express");
const router  = express.Router();
// 1. IMPORTAS EL CONTROLADOR AQUÍ
const schedulesCtrl = require("../controllers/schedules.controller");
const { verificarToken, tienePermiso } = require("../middlewares/auth.middleware");

// ===== RUTAS PRINCIPALES =====

// GET /schedules
router.get("/", verificarToken, tienePermiso("horarios.ver"), schedulesCtrl.getAll);

// POST /schedules
router.post("/", verificarToken, tienePermiso("horarios.crear"), schedulesCtrl.create);

// PUT /schedules
router.put("/:employeeId/:weekStartDate", verificarToken, tienePermiso("horarios.editar"), schedulesCtrl.update);

// DELETE /schedules
// 2. USAS LA FUNCIÓN DEL CONTROLADOR DIRECTAMENTE
router.delete("/:employeeId/:weekStartDate", verificarToken, tienePermiso("horarios.eliminar"), schedulesCtrl.remove);

// ===== RUTAS DE HISTORIAL =====

// GET /schedules/history/:employeeId - Historial de un empleado
router.get("/history/:employeeId", verificarToken, tienePermiso("horarios.ver"), schedulesCtrl.getEmployeeHistory);

// GET /schedules/history/:employeeId/:weekStartDate - Historial de una semana específica
router.get("/history/:employeeId/:weekStartDate", verificarToken, tienePermiso("horarios.ver"), schedulesCtrl.getWeekHistory);

// POST /schedules/restore/:historyId - Restaurar desde historial
router.post("/restore/:historyId", verificarToken, tienePermiso("horarios.editar"), schedulesCtrl.restoreFromHistory);

// GET /schedules/stats/:employeeId - Estadísticas de historial
router.get("/stats/:employeeId", verificarToken, tienePermiso("horarios.ver"), schedulesCtrl.getHistoryStats);

module.exports = router;