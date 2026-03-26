const express = require("express");
const router  = express.Router();
const {
  getAllRoles, getRolById, createRol, updateRol, deactivateRol,
  getAllPermisos, getPermisosByRol,
} = require("../controllers/roles.controller");

router.get("/permisos",      getAllPermisos);
router.get("/:id/permisos",  getPermisosByRol);
router.get("/",              getAllRoles);
router.get("/:id",           getRolById);
router.post("/",             createRol);
router.put("/:id",           updateRol);
router.delete("/:id",        deactivateRol);

module.exports = router;