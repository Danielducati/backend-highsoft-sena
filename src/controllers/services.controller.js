// src/controllers/services.controller.js
const servicesModel = require("../models/services");
const { categoriesModel } = require("../models/services");

// ─── SERVICIOS ───────────────────────────────────────────────────────────────

const getAllServices = async (req, res) => {
  try {
    const soloActivos = req.query.all === "true" ? false : true;
    const services = await servicesModel.getAll({ soloActivos });
    res.json({ ok: true, data: services });
  } catch (error) {
    console.error("getAllServices:", error);
    res.status(500).json({ ok: false, message: "Error al obtener servicios" });
  }
};

const getServiceById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ ok: false, message: "ID inválido" });

    const service = await servicesModel.getById(id);
    if (!service)
      return res.status(404).json({ ok: false, message: "Servicio no encontrado" });
    res.json({ ok: true, data: service });
  } catch (error) {
    console.error("getServiceById:", error);
    res.status(500).json({ ok: false, message: "Error al obtener el servicio" });
  }
};

const createService = async (req, res) => {
  try {
    const { nombre, descripcion, categoriaId, duracion, precio, imagenServicio } = req.body;

    if (!nombre || typeof nombre !== "string" || nombre.trim() === "")
      return res.status(400).json({ ok: false, message: "El nombre es obligatorio" });

    if (nombre.trim().length < 2)
      return res.status(400).json({ ok: false, message: "El nombre debe tener al menos 2 caracteres" });

    if (nombre.trim().length > 200)
      return res.status(400).json({ ok: false, message: "El nombre no puede superar 200 caracteres" });

    if (!categoriaId || isNaN(Number(categoriaId)))
      return res.status(400).json({ ok: false, message: "La categoría es obligatoria y debe ser válida" });

    if (duracion !== undefined && (isNaN(Number(duracion)) || Number(duracion) <= 0))
      return res.status(400).json({ ok: false, message: "La duración debe ser un número mayor a 0 (en minutos)" });

    if (precio !== undefined && (isNaN(Number(precio)) || Number(precio) < 0))
      return res.status(400).json({ ok: false, message: "El precio debe ser un número mayor o igual a 0" });

    const service = await servicesModel.create({
      nombre:        nombre.trim(),
      descripcion:   descripcion?.trim() ?? null,
      categoriaId:   Number(categoriaId),
      duracion:      duracion ? Number(duracion) : null,
      precio:        precio   ? Number(precio)   : null,
      imagenServicio: imagenServicio ?? null,
    });
    res.status(201).json({ ok: true, data: service });
  } catch (error) {
    console.error("createService:", error);
    res.status(500).json({ ok: false, message: "Error al crear el servicio" });
  }
};

const updateService = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ ok: false, message: "ID inválido" });

    const { nombre, descripcion, categoriaId, duracion, precio, imagenServicio, estado } = req.body;

    if (!nombre || typeof nombre !== "string" || nombre.trim() === "")
      return res.status(400).json({ ok: false, message: "El nombre es obligatorio" });

    if (nombre.trim().length < 2)
      return res.status(400).json({ ok: false, message: "El nombre debe tener al menos 2 caracteres" });

    if (!categoriaId || isNaN(Number(categoriaId)))
      return res.status(400).json({ ok: false, message: "La categoría es obligatoria y debe ser válida" });

    if (duracion !== undefined && (isNaN(Number(duracion)) || Number(duracion) <= 0))
      return res.status(400).json({ ok: false, message: "La duración debe ser un número mayor a 0 (en minutos)" });

    if (precio !== undefined && (isNaN(Number(precio)) || Number(precio) < 0))
      return res.status(400).json({ ok: false, message: "El precio debe ser un número mayor o igual a 0" });

    const ESTADOS_VALIDOS = ["Activo", "Inactivo"];
    if (estado && !ESTADOS_VALIDOS.includes(estado))
      return res.status(400).json({ ok: false, message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` });

    const service = await servicesModel.update(id, {
      nombre:        nombre.trim(),
      descripcion:   descripcion?.trim() ?? null,
      categoriaId:   Number(categoriaId),
      duracion:      duracion ? Number(duracion) : null,
      precio:        precio   ? Number(precio)   : null,
      imagenServicio: imagenServicio ?? null,
      estado,
    });
    res.json({ ok: true, data: service });
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ ok: false, message: "Servicio no encontrado" });
    console.error("updateService:", error);
    res.status(500).json({ ok: false, message: "Error al actualizar el servicio" });
  }
};

const deactivateService = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ ok: false, message: "ID inválido" });

    await servicesModel.deactivate(id);
    res.json({ ok: true, message: "Servicio desactivado correctamente" });
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ ok: false, message: "Servicio no encontrado" });
    console.error("deactivateService:", error);
    res.status(500).json({ ok: false, message: "Error al desactivar el servicio" });
  }
};

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────

const getAllCategories = async (req, res) => {
  try {
    const categories = await categoriesModel.getAll();
    res.json({ ok: true, data: categories });
  } catch (error) {
    console.error("getAllCategories:", error);
    res.status(500).json({ ok: false, message: "Error al obtener categorías" });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ ok: false, message: "ID inválido" });

    const category = await categoriesModel.getById(id);
    if (!category)
      return res.status(404).json({ ok: false, message: "Categoría no encontrada" });
    res.json({ ok: true, data: category });
  } catch (error) {
    console.error("getCategoryById:", error);
    res.status(500).json({ ok: false, message: "Error al obtener la categoría" });
  }
};

const createCategory = async (req, res) => {
  try {
    const { nombre, descripcion, color } = req.body;

    if (!nombre || typeof nombre !== "string" || nombre.trim() === "")
      return res.status(400).json({ ok: false, message: "El nombre es obligatorio" });

    if (nombre.trim().length < 2)
      return res.status(400).json({ ok: false, message: "El nombre debe tener al menos 2 caracteres" });

    if (color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color))
      return res.status(400).json({ ok: false, message: "El color debe ser un código hexadecimal válido (ej: #FF5733)" });

    const category = await categoriesModel.create({
      nombre:      nombre.trim(),
      descripcion: descripcion?.trim() ?? null,
      color:       color ?? null,
    });
    res.status(201).json({ ok: true, data: category });
  } catch (error) {
    if (error.code === "P2002")
      return res.status(409).json({ ok: false, message: "Ya existe una categoría con ese nombre" });
    console.error("createCategory:", error);
    res.status(500).json({ ok: false, message: "Error al crear la categoría" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ ok: false, message: "ID inválido" });

    const { nombre, descripcion, color, estado } = req.body;

    if (!nombre || typeof nombre !== "string" || nombre.trim() === "")
      return res.status(400).json({ ok: false, message: "El nombre es obligatorio" });

    if (color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color))
      return res.status(400).json({ ok: false, message: "El color debe ser un código hexadecimal válido (ej: #FF5733)" });

    const ESTADOS_VALIDOS = ["Activo", "Inactivo"];
    if (estado && !ESTADOS_VALIDOS.includes(estado))
      return res.status(400).json({ ok: false, message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` });

    const category = await categoriesModel.update(id, {
      nombre:      nombre.trim(),
      descripcion: descripcion?.trim() ?? null,
      color:       color ?? null,
      estado,
    });
    res.json({ ok: true, data: category });
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ ok: false, message: "Categoría no encontrada" });
    if (error.code === "P2002")
      return res.status(409).json({ ok: false, message: "Ya existe una categoría con ese nombre" });
    console.error("updateCategory:", error);
    res.status(500).json({ ok: false, message: "Error al actualizar la categoría" });
  }
};

const deactivateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ ok: false, message: "ID inválido" });

    await categoriesModel.deactivate(id);
    res.json({ ok: true, message: "Categoría desactivada correctamente" });
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ ok: false, message: "Categoría no encontrada" });
    console.error("deactivateCategory:", error);
    res.status(500).json({ ok: false, message: "Error al desactivar la categoría" });
  }
};

module.exports = {
  getAllServices, getServiceById, createService, updateService, deactivateService,
  getAllCategories, getCategoryById, createCategory, updateCategory, deactivateCategory,
};