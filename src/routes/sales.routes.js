const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/sales.controller");

router.get("/",             ctrl.getAll);
router.get("/monthly-stats", ctrl.getMonthlyStats);
router.get("/appointments", ctrl.getAvailableAppointments);
router.post("/",            ctrl.create);
router.delete("/:id",       ctrl.remove);

module.exports = router;