// src/routes/users.routes.js
const express = require("express");
const router  = express.Router();
const {
  getAllUsers, getUserById, getRoles,
  createUser, updateUser, updateStatus, deleteUser,
  getMiPerfil, updateMiPerfil,
} = require("../controllers/users.controller");
const { verificarToken, adminOrPermission }                  = require("../middlewares/auth.middleware");
const { validateCreateUser, validateUpdateUser,
        validateUserId, validateUserStatus }                  = require("../middlewares/validate.middleware");

// ⚠️ rutas fijas ANTES de /:id
router.get("/roles",        verificarToken,                                              getRoles);
router.get("/mi-perfil",    verificarToken,                                              getMiPerfil);
router.patch("/mi-perfil",  verificarToken,                                              updateMiPerfil);

router.get("/",             verificarToken, adminOrPermission("usuarios.ver"),     getAllUsers);
router.get("/:id",          verificarToken, adminOrPermission("usuarios.ver"), validateUserId, getUserById);
router.post("/",            verificarToken, adminOrPermission("usuarios.crear"), validateCreateUser, createUser);
router.put("/:id",          verificarToken, adminOrPermission("usuarios.editar"), validateUserId, validateUpdateUser, updateUser);
router.patch("/:id/status", verificarToken, adminOrPermission("usuarios.editar"), validateUserId, validateUserStatus, updateStatus);
router.delete("/:id",       verificarToken, adminOrPermission("usuarios.eliminar"), validateUserId, deleteUser);

module.exports = router;
