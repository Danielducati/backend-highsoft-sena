const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/clients.controller");
const { verificarToken, soloAdmin } = require("../middlewares/auth.middleware");

router.get("/",             ctrl.getAll);
router.get("/:id",          ctrl.getOne);
router.post("/",            ctrl.create);           // público: registro de clientes
router.put("/:id",          verificarToken, ctrl.update);
router.patch("/:id/status", verificarToken, soloAdmin, ctrl.setStatus);
router.delete("/:id",       verificarToken, soloAdmin, ctrl.remove);

module.exports = router;