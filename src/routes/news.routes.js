const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/news.controller");

router.get("/",              ctrl.getAll);
router.post("/",             ctrl.create);
router.put("/:id",           ctrl.update);
router.patch("/:id/status",  ctrl.updateStatus);
router.delete("/:id",        ctrl.remove);

module.exports = router;
