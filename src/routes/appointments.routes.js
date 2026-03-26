const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/appointments.controller");
const { verificarToken, hasPermission } = require("../middlewares/auth.middleware");

router.get("/",             verificarToken, hasPermission("citas.ver"),      ctrl.getAll);
router.get("/:id",          verificarToken, hasPermission("citas.ver"),      ctrl.getOne);
router.post("/",            verificarToken, hasPermission("citas.crear"),    ctrl.create);
router.put("/:id",          verificarToken, hasPermission("citas.editar"),   ctrl.update);
router.patch("/:id/status", verificarToken, hasPermission("citas.editar"),   ctrl.updateStatus);
router.patch("/:id/cancel", verificarToken, hasPermission("citas.editar"),   ctrl.cancel);
router.delete("/:id",       verificarToken, hasPermission("citas.eliminar"), ctrl.remove);

module.exports = router;