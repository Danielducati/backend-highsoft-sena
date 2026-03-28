// src/routes/permissions.routes.js
const express = require("express");
const router  = express.Router();
const {
  getAllPermissions, getPermissionsByRole,
  assignPermissions, addPermission, removePermission,
} = require("../controllers/permissions.controller");
const { verificarToken, soloAdmin }                          = require("../middlewares/auth.middleware");
const { validateAssignPermissions, validatePermissionParams,
        validateRoleIdParam }                                 = require("../middlewares/validate.middleware");

router.get("/",                             verificarToken,                                            getAllPermissions);
router.get("/rol/:roleId",                  verificarToken, validateRoleIdParam,                       getPermissionsByRole);
router.put("/rol/:roleId",                  verificarToken, soloAdmin,
                                            validateRoleIdParam, validateAssignPermissions,            assignPermissions);
router.post("/rol/:roleId/:permissionId",   verificarToken, soloAdmin, validatePermissionParams,       addPermission);
router.delete("/rol/:roleId/:permissionId", verificarToken, soloAdmin, validatePermissionParams,       removePermission);

module.exports = router;