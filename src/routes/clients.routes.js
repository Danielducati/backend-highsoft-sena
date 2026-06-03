// src/routes/clients.routes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/clients.controller");
const { verificarToken, adminOrPermission, hasPermission } = require("../middlewares/auth.middleware");
const { validateCreateClient, validateUpdateClient,
        validateClientId }                                 = require("../middlewares/validate.middleware");

router.get("/",              verificarToken, hasPermission("clientes.ver"),    ctrl.getAll);
router.get("/mi-perfil",     verificarToken,                                    ctrl.getMiPerfil);
router.get("/para-citas",    verificarToken,                                    ctrl.getParaCitas);
router.get("/:id",           verificarToken, validateClientId,
                                             hasPermission("clientes.ver"),    ctrl.getOne);
router.post("/",             validateCreateClient,                              ctrl.create);  // público
router.patch("/mi-perfil",   verificarToken,                                    ctrl.updateMiPerfil); // cliente edita su propio perfil
router.put("/:id",           verificarToken, validateClientId,
                                             validateUpdateClient,
                                             hasPermission("clientes.editar"), ctrl.update);
router.patch("/:id/status",  verificarToken, adminOrPermission("clientes.editar"), validateClientId, ctrl.setStatus);
router.delete("/:id",        verificarToken, adminOrPermission("clientes.eliminar"), validateClientId, ctrl.remove);

module.exports = router;
