// src/routes/users.routes.js
const express = require("express");
const router  = express.Router();
const {
  getAllUsers, getUserById, getRoles,
  createUser, updateUser, updateStatus, deleteUser,
} = require("../controllers/users.controller");
const { verificarToken, soloAdmin }                          = require("../middlewares/auth.middleware");
const { validateCreateUser, validateUpdateUser,
        validateUserId, validateUserStatus }                  = require("../middlewares/validate.middleware");

// ⚠️ /roles debe ir antes de /:id
router.get("/roles",        verificarToken,                                              getRoles);
router.get("/",             verificarToken, soloAdmin,                                   getAllUsers);
router.get("/:id",          verificarToken, soloAdmin, validateUserId,                   getUserById);
router.post("/",            verificarToken, soloAdmin, validateCreateUser,               createUser);
router.put("/:id",          verificarToken, soloAdmin, validateUserId, validateUpdateUser, updateUser);
router.patch("/:id/status", verificarToken, soloAdmin, validateUserId, validateUserStatus, updateStatus);
router.delete("/:id",       verificarToken, soloAdmin, validateUserId,                   deleteUser);

module.exports = router;