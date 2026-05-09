//backend-highsoft-sena\src\routes\dashboard.routes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/dashboard.controller");

router.get("/", ctrl.getStats);
router.get("/debug-citas", ctrl.debugCitas);

module.exports = router;
