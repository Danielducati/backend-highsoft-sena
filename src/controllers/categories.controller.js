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

    const categoriaActual = await prisma.categoriaServicio.findUnique({
      where: { id },
    });

    if (!categoriaActual) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    if (categoriaActual.estado !== "Activo") {
      return res.status(400).json({ 
        error: "No se puede editar una categoría que ya está desactivada" 
      });
    }

    if (estado === "Inactivo") {
      const serviciosActivos = await prisma.servicio.count({
        where: { 
          categoriaId: id,
          estado: "Activo" 
        },
      });

      if (serviciosActivos > 0) {
        return res.status(400).json({
          error: `No se puede desactivar la categoría porque tiene ${serviciosActivos} servicio(s) activo(s) asociado(s). Primero desactiva los servicios.`,
        });
      }
    }

    if (nombre !== undefined) {
      if (!nombre || typeof nombre !== "string" || nombre.trim() === "")
        return res.status(400).json({ error: "El nombre es obligatorio" });

      if (nombre.trim().length < 2)
        return res.status(400).json({ error: "El nombre debe tener al menos 2 caracteres" });

      if (nombre.trim().length > 100)
        return res.status(400).json({ error: "El nombre no puede superar 100 caracteres" });

      const existe = await prisma.categoriaServicio.findFirst({
        where: { nombre: nombre.trim(), id: { not: id } },
      });
      if (existe)
        return res.status(409).json({ error: `Ya existe una categoría con el nombre "${nombre.trim()}"` });
    }

    if (color !== undefined && color !== null) {
      if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color))
        return res.status(400).json({ error: "El color debe ser un código hexadecimal válido (ej: #FF5733)" });
    }

    if (estado !== undefined) {
      const ESTADOS_VALIDOS = ["Activo", "Inactivo"];
      if (!ESTADOS_VALIDOS.includes(estado))
        return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` });
    }

    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre.trim();
    if (descripcion !== undefined) updateData.descripcion = descripcion?.trim() ?? null;
    if (color !== undefined) updateData.color = color ?? null;
    if (estado !== undefined) updateData.estado = estado;

    const cat = await categoriesModel.update(id, updateData);
    
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

    const categoria = await prisma.categoriaServicio.findUnique({
      where: { id },
      include: {
        servicios: {
          where: { estado: "Activo" }
        }
      }
    });

    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    if (categoria.estado !== "Activo") {
      return res.status(400).json({ 
        error: "No se puede eliminar una categoría desactivada" 
      });
    }

    if (categoria.servicios && categoria.servicios.length > 0) {
      return res.status(400).json({
        error: `No se puede eliminar la categoría porque tiene ${categoria.servicios.length} servicio(s) activo(s) asociado(s)`,
      });
    }

    const serviciosCount = await prisma.servicio.count({
      where: { categoriaId: id },
    });

    if (serviciosCount > 0)
      return res.status(400).json({
        error: `No se puede eliminar la categoría porque tiene ${serviciosCount} servicio(s) asociado(s)`,
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