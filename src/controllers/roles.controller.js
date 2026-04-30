// src/controllers/roles.controller.js
const rolesModel = require("../models/roles");

const getAllRoles = async (req, res) => {
  try {
    res.json(await rolesModel.getAll());
  } catch (err) {
    console.error("Error GET /roles:", err);
    res.status(500).json({ error: "Error al obtener roles" });
  }
};

const getRolById = async (req, res) => {
  try {
    const rol = await rolesModel.getById(req.params.id);
    if (!rol) return res.status(404).json({ error: "Rol no encontrado" });
    res.json(rol);
  } catch (err) {
    console.error("Error GET /roles/:id:", err);
    res.status(500).json({ error: "Error al obtener el rol" });
  }
};

const createRol = async (req, res) => {
  try {
    const { nombre, descripcion, permisosIds } = req.body;
    if (!nombre?.trim())
      return res.status(400).json({ error: "El nombre es obligatorio" });

    // Validar nombre duplicado (case-insensitive)
    const todos = await rolesModel.getAll();
    const existe = todos.some(r => r.nombre.toLowerCase() === nombre.trim().toLowerCase());
    if (existe)
      return res.status(409).json({ error: `Ya existe un rol con el nombre "${nombre.trim()}"` });

    const rol = await rolesModel.create({ nombre: nombre.trim(), descripcion, permisosIds });
    res.status(201).json(rol);
  } catch (err) {
    console.error("Error POST /roles:", err);
    res.status(500).json({ error: "Error al crear el rol" });
  }
};

const updateRol = async (req, res) => {
  try {
    const { nombre, descripcion, permisosIds, estado } = req.body;

    // Proteger el rol Administrador
    const rolActual = await rolesModel.getById(req.params.id);
    if (rolActual?.nombre?.toLowerCase() === "administrador") {
      if (estado && estado !== "Activo")
        return res.status(403).json({ error: "No se puede desactivar el rol Administrador" });
    }

    // Si solo viene "estado", es un cambio de estado (toggle)
    if (estado && !nombre && !descripcion && !permisosIds) {
      const rol = await rolesModel.update(req.params.id, { estado });
      return res.json(rol);
    }

    // Si vienen otros datos, es una actualización completa
    if (nombre?.trim()) {
      const todos = await rolesModel.getAll();
      const existe = todos.some(
        r => r.nombre.toLowerCase() === nombre.trim().toLowerCase() &&
             String(r.id) !== String(req.params.id)
      );
      if (existe)
        return res.status(409).json({ error: `Ya existe un rol con el nombre "${nombre.trim()}"` });
    }

    const rol = await rolesModel.update(req.params.id, { nombre, descripcion, permisosIds, estado });
    res.json(rol);
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Rol no encontrado" });
    console.error("Error PUT /roles/:id:", err);
    res.status(500).json({ error: "Error al actualizar el rol" });
  }
};

const deleteRol = async (req, res) => {
  try {
    // Proteger el rol Administrador
    const rolActual = await rolesModel.getById(req.params.id);
    if (rolActual?.nombre?.toLowerCase() === "administrador")
      return res.status(403).json({ error: "No se puede eliminar el rol Administrador" });

    const count = await rolesModel.countUsuarios(req.params.id);
    if (count > 0)
      return res.status(400).json({
        error: `No se puede eliminar — ${count} usuario(s) tienen este rol asignado`,
      });
    
    // Eliminar primero los permisos asociados
    await rolesModel.deletePermissionsByRole(req.params.id);
    
    // Luego eliminar el rol completamente
    await rolesModel.deleteRole(req.params.id);
    
    res.json({ ok: true, mensaje: "Rol eliminado correctamente" });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Rol no encontrado" });
    console.error("Error DELETE /roles/:id:", err);
    res.status(500).json({ error: "Error al eliminar el rol" });
  }
};

const getAllPermisos = async (req, res) => {
  try {
    res.json(await rolesModel.getAllPermisos());
  } catch (err) {
    console.error("Error GET /roles/permisos:", err);
    res.status(500).json({ error: "Error al obtener permisos" });
  }
};

const getPermisosByRol = async (req, res) => {
  try {
    res.json(await rolesModel.getPermisosByRol(req.params.id));
  } catch (err) {
    console.error("Error GET /roles/:id/permisos:", err);
    res.status(500).json({ error: "Error al obtener permisos del rol" });
  }
};

module.exports = {
  getAllRoles, getRolById, createRol,
  updateRol, deleteRol,
  getAllPermisos, getPermisosByRol,
};