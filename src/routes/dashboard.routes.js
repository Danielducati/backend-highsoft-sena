//backend-highsoft-sena\src\routes\dashboard.routes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/dashboard.controller");

router.get("/", ctrl.getStats);

module.exports = router;
