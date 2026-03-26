const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/auth.controller");

router.post("/login",  ctrl.login);
router.post("/register", ctrl.register);
router.get("/me",      ctrl.me);

// Endpoint temporal para crear/resetear contraseña del admin
// Borrarlo después de usarlo
// router.post("/setup-admin", ctrl.setupAdmin);

module.exports = { router };