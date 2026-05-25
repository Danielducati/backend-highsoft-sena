//backend-highsoft-sena\src\routes\news.routes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/news.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

// Todas las rutas requieren autenticación
router.get("/",                                verificarToken, ctrl.getAll);
router.get("/employee/:employeeId/date/:date", verificarToken, ctrl.getEmployeeNewsForDate);
router.post("/",                               verificarToken, ctrl.create);
router.put("/:id",                             verificarToken, ctrl.update);
router.patch("/:id/status",                    verificarToken, ctrl.updateStatus);
router.delete("/:id",                          ctrl.remove);

module.exports = router;
