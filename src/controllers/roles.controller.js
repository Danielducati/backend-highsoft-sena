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
    const rol = await rolesModel.getById(Number(req.params.id));
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
    if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio" });

    const rol = await rolesModel.create({ nombre, descripcion, permisosIds });
    res.status(201).json(rol);
} catch (err) {
    console.error("Error POST /roles:", err);
    res.status(500).json({ error: "Error al crear el rol" });
}
};

const updateRol = async (req, res) => {
try {
    const { nombre, descripcion, estado, permisosIds } = req.body;
    if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio" });

    const rol = await rolesModel.update(Number(req.params.id), { nombre, descripcion, estado, permisosIds });
    if (!rol) return res.status(404).json({ error: "Rol no encontrado" });
    res.json(rol);
} catch (err) {
    console.error("Error PUT /roles/:id:", err);
    res.status(500).json({ error: "Error al actualizar el rol" });
}
};

const deactivateRol = async (req, res) => {
try {
    const id = Number(req.params.id);
    const totalUsuarios = await rolesModel.countUsuarios(id);
    if (totalUsuarios > 0)
    return res.status(400).json({
        error: `No se puede desactivar. Hay ${totalUsuarios} usuario(s) con este rol.`,
    });

    const rol = await rolesModel.deactivate(id);
    if (!rol) return res.status(404).json({ error: "Rol no encontrado" });
    res.json({ mensaje: "Rol desactivado correctamente", data: rol });
} catch (err) {
    console.error("Error DELETE /roles/:id:", err);
    res.status(500).json({ error: "Error al desactivar el rol" });
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
    res.json(await rolesModel.getPermisosByRol(Number(req.params.id)));
} catch (err) {
    console.error("Error GET /roles/:id/permisos:", err);
    res.status(500).json({ error: "Error al obtener permisos del rol" });
}
};

module.exports = {
getAllRoles, getRolById, createRol, updateRol, deactivateRol,
getAllPermisos, getPermisosByRol,
};