// src/controllers/categories.controller.js
const categoriesModel = require("../models/categories");
const prisma          = require("../config/prisma");

const getAllCategories = async (req, res) => {
  try {
    const soloActivos = req.query.all !== "true";
    res.json(await categoriesModel.getAll({ soloActivos }));
  } catch (err) {
    console.error("Error GET /categories:", err);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const cat = await categoriesModel.getById(id);
    if (!cat) return res.status(404).json({ error: "Categoría no encontrada" });
    res.json(cat);
  } catch (err) {
    console.error("Error GET /categories/:id:", err);
    res.status(500).json({ error: "Error al obtener la categoría" });
  }
};

const createCategory = async (req, res) => {
  try {
    const { nombre, descripcion, color } = req.body;

    if (!nombre || typeof nombre !== "string" || nombre.trim() === "")
      return res.status(400).json({ error: "El nombre es obligatorio" });

    if (nombre.trim().length < 2)
      return res.status(400).json({ error: "El nombre debe tener al menos 2 caracteres" });

    if (nombre.trim().length > 100)
      return res.status(400).json({ error: "El nombre no puede superar 100 caracteres" });

    if (color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color))
      return res.status(400).json({ error: "El color debe ser un código hexadecimal válido (ej: #FF5733)" });

    const existe = await prisma.categoriaServicio.findFirst({
      where: { nombre: nombre.trim() },
    });
    if (existe)
      return res.status(409).json({ error: `Ya existe una categoría con el nombre "${nombre.trim()}"` });

    const cat = await categoriesModel.create({
      nombre:      nombre.trim(),
      descripcion: descripcion?.trim() ?? null,
      color:       color ?? null,
    });
    res.status(201).json(cat);
  } catch (err) {
    console.error("Error POST /categories:", err);
    res.status(500).json({ error: "Error al crear la categoría" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const { nombre, descripcion, color, estado } = req.body;

    if (!nombre || typeof nombre !== "string" || nombre.trim() === "")
      return res.status(400).json({ error: "El nombre es obligatorio" });

    if (nombre.trim().length < 2)
      return res.status(400).json({ error: "El nombre debe tener al menos 2 caracteres" });

    if (nombre.trim().length > 100)
      return res.status(400).json({ error: "El nombre no puede superar 100 caracteres" });

    if (color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color))
      return res.status(400).json({ error: "El color debe ser un código hexadecimal válido (ej: #FF5733)" });

    const ESTADOS_VALIDOS = ["Activo", "Inactivo"];
    if (estado && !ESTADOS_VALIDOS.includes(estado))
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` });

    const existe = await prisma.categoriaServicio.findFirst({
      where: { nombre: nombre.trim(), id: { not: id } },
    });
    if (existe)
      return res.status(409).json({ error: `Ya existe una categoría con el nombre "${nombre.trim()}"` });

    const cat = await categoriesModel.update(id, {
      nombre:      nombre.trim(),
      descripcion: descripcion?.trim() ?? null,
      color:       color ?? null,
      estado,
    });
    if (!cat) return res.status(404).json({ error: "Categoría no encontrada" });
    res.json(cat);
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Categoría no encontrada" });
    console.error("Error PUT /categories/:id:", err);
    res.status(500).json({ error: "Error al actualizar la categoría" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const serviciosCount = await prisma.servicio.count({
      where: { categoriaId: id },
    });

    if (serviciosCount > 0)
      return res.status(400).json({
        error: `No se puede eliminar. Tiene ${serviciosCount} servicio(s) asociado(s)`,
      });

    await prisma.categoriaServicio.delete({ where: { id } });
    res.json({ mensaje: "Categoría eliminada correctamente" });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Categoría no encontrada" });
    console.error("Error DELETE /categories/:id:", err);
    res.status(500).json({ error: "Error al eliminar la categoría" });
  }
};

module.exports = {
  getAllCategories, getCategoryById,
  createCategory, updateCategory, deleteCategory,
};