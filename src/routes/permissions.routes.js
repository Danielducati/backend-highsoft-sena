// src/routes/permissions.routes.js
const express = require("express");
const router  = express.Router();
const {
getAllPermissions, getPermissionsByRole,
assignPermissions, addPermission, removePermission,
} = require("../controllers/permissions.controller");
const { verificarToken, soloAdmin } = require("../middlewares/auth.middleware");

router.get("/",                                  verificarToken,            getAllPermissions);
router.get("/rol/:roleId",                       verificarToken,            getPermissionsByRole);
router.put("/rol/:roleId",                       verificarToken, soloAdmin, assignPermissions);
router.post("/rol/:roleId/:permissionId",        verificarToken, soloAdmin, addPermission);
router.delete("/rol/:roleId/:permissionId",      verificarToken, soloAdmin, removePermission);

module.exports = router;