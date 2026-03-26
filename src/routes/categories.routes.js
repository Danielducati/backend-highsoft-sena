const express = require("express");
const router  = express.Router();
const {
getAllCategories, getCategoryById,
createCategory, updateCategory, deleteCategory,
} = require("../controllers/categories.controller");
const { verificarToken, soloAdmin } = require("../middlewares/auth.middleware");

router.get("/",        verificarToken,            getAllCategories);
router.get("/:id",     verificarToken,            getCategoryById);
router.post("/",       verificarToken, soloAdmin, createCategory);
router.put("/:id",     verificarToken, soloAdmin, updateCategory);
router.delete("/:id",  verificarToken, soloAdmin, deleteCategory);

module.exports = router;