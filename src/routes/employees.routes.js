const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/employees.controller");
const { verificarToken, soloAdmin } = require("../middlewares/auth.middleware");

router.get("/",       ctrl.getAll);
router.get("/:id",    ctrl.getOne);
router.post("/",      verificarToken, soloAdmin, ctrl.create);
router.put("/:id",    verificarToken, soloAdmin, ctrl.update);
router.delete("/:id", verificarToken, soloAdmin, ctrl.remove);

module.exports = router;