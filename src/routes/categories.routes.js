const express = require("express");
const router  = express.Router();
const {
getAllCategories, getCategoryById,
createCategory, updateCategory, deleteCategory,
} = require("../controllers/categories.controller");
const { verificarToken, adminOrPermission } = require("../middlewares/auth.middleware");

router.get("/",        verificarToken,            getAllCategories);
router.get("/:id",     verificarToken,            getCategoryById);
router.post("/",       verificarToken, adminOrPermission("categorias.crear"), createCategory);
router.put("/:id",     verificarToken, adminOrPermission("categorias.editar"), updateCategory);
router.delete("/:id",  verificarToken, adminOrPermission("categorias.eliminar"), deleteCategory);

module.exports = router;