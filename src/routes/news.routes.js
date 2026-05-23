//backend-highsoft-sena\src\routes\news.routes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/news.controller");

router.get("/",                                ctrl.getAll);
router.get("/employee/:employeeId/date/:date", ctrl.getEmployeeNewsForDate);
router.post("/",                               ctrl.create);
router.put("/:id",                             ctrl.update);
router.patch("/:id/status",                    ctrl.updateStatus);
router.delete("/:id",                          ctrl.remove);

module.exports = router;
