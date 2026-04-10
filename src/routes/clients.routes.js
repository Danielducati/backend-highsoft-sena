// src/routes/clients.routes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/clients.controller");
const { verificarToken, soloAdmin, hasPermission }        = require("../middlewares/auth.middleware");
const { validateCreateClient, validateUpdateClient,
        validateClientId }                                 = require("../middlewares/validate.middleware");

router.get("/",             verificarToken, hasPermission("clientes.ver"),    ctrl.getAll);
router.get("/mi-perfil",    verificarToken,                                    ctrl.getMiPerfil);
router.get("/:id",          verificarToken, validateClientId,
                                            hasPermission("clientes.ver"),    ctrl.getOne);
router.post("/",            validateCreateClient,                              ctrl.create);  // público
router.put("/:id",          verificarToken, validateClientId,
                                            validateUpdateClient,
                                            hasPermission("clientes.editar"), ctrl.update);
router.patch("/:id/status", verificarToken, soloAdmin, validateClientId,      ctrl.setStatus);
router.delete("/:id",       verificarToken, soloAdmin, validateClientId,      ctrl.remove);

module.exports = router;