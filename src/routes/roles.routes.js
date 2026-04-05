// src/routes/roles.routes.js
const express = require("express");
const router  = express.Router();
const {
  getAllRoles, getRolById, createRol, updateRol, deleteRol,
  getAllPermisos, getPermisosByRol,
} = require("../controllers/roles.controller");
const { verificarToken, soloAdmin }                          = require("../middlewares/auth.middleware");
const { validateCreateRole, validateUpdateRole,
        validateRoleId }                                     = require("../middlewares/validate.middleware");

// ⚠️ /permisos debe ir antes de /:id
router.get("/permisos",     verificarToken,                                     getAllPermisos);
router.get("/:id/permisos", verificarToken, validateRoleId,                     getPermisosByRol);
router.get("/",             verificarToken,                                     getAllRoles);
router.get("/:id",          verificarToken, validateRoleId,                     getRolById);
router.post("/",            verificarToken, soloAdmin, validateCreateRole,      createRol);
router.put("/:id",          verificarToken, soloAdmin, validateRoleId,
                                            validateUpdateRole,                 updateRol);
router.delete("/:id",       verificarToken, soloAdmin, validateRoleId,          deleteRol);

module.exports = router;