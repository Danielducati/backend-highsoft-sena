const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/quotations.controller");

router.get("/",              ctrl.getAll);
router.get("/:id",           ctrl.getOne);
router.post("/",             ctrl.create);
router.put("/:id",           ctrl.update);
router.put("/:id/estado",    ctrl.updateEstado);

module.exports = router;