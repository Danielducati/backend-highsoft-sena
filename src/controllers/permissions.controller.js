// src/controllers/permissions.controller.js
const permissionsModel = require("../models/permissions");

const getAllPermissions = async (req, res) => {
try {
    res.json(await permissionsModel.getAll());
} catch (err) {
    console.error("Error GET /permisos:", err);
    res.status(500).json({ error: "Error al obtener permisos" });
}
};

const getPermissionsByRole = async (req, res) => {
try {
    res.json(await permissionsModel.getByRoleId(req.params.roleId));
} catch (err) {
    console.error("Error GET /permisos/rol/:roleId:", err);
    res.status(500).json({ error: "Error al obtener permisos del rol" });
}
};

const assignPermissions = async (req, res) => {
try {
    const { permisosIds } = req.body;
    if (!Array.isArray(permisosIds))
    return res.status(400).json({ error: "permisosIds debe ser un array" });

    const role = await permissionsModel.assignPermissions(req.params.roleId, permisosIds);
    res.json(role);
} catch (err) {
    console.error("Error PUT /permisos/rol/:roleId:", err);
    res.status(500).json({ error: "Error al asignar permisos" });
}
};

const addPermission = async (req, res) => {
try {
    const result = await permissionsModel.addPermission(
    req.params.roleId,
    req.params.permissionId
    );
    res.json(result);
} catch (err) {
    console.error("Error POST /permisos/rol/:roleId/:permissionId:", err);
    res.status(500).json({ error: "Error al agregar permiso" });
}
};

const removePermission = async (req, res) => {
try {
    const result = await permissionsModel.removePermission(
    req.params.roleId,
    req.params.permissionId
    );
    res.json(result);
} catch (err) {
    console.error("Error DELETE /permisos/rol/:roleId/:permissionId:", err);
    res.status(500).json({ error: "Error al quitar permiso" });
}
};

module.exports = {
getAllPermissions, getPermissionsByRole,
assignPermissions, addPermission, removePermission,
};