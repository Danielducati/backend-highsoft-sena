const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/quotations.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

router.get("/",              verificarToken, ctrl.getAll);
router.post("/auto-reject-expired", verificarToken, ctrl.autoRejectExpired);
router.get("/:id",           verificarToken, ctrl.getOne);
router.post("/",             verificarToken, ctrl.create);
router.put("/:id",           verificarToken, ctrl.update);
router.put("/:id/estado",    verificarToken, ctrl.updateEstado);

module.exports = router;