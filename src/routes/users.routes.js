// src/routes/users.routes.js
const express = require("express");
const router  = express.Router();
const {
getAllUsers, getUserById, getRoles,
createUser, updateUser, updateStatus, deleteUser,
} = require("../controllers/users.controller");
const { verificarToken, soloAdmin } = require("../middlewares/auth.middleware");

// ⚠️ /roles debe ir antes de /:id
router.get("/roles",        verificarToken,            getRoles);
router.get("/",             verificarToken, soloAdmin, getAllUsers);
router.get("/:id",          verificarToken, soloAdmin, getUserById);
router.post("/",            verificarToken, soloAdmin, createUser);
router.put("/:id",          verificarToken, soloAdmin, updateUser);
router.patch("/:id/status", verificarToken, soloAdmin, updateStatus);
router.delete("/:id",       verificarToken, soloAdmin, deleteUser);

module.exports = router;