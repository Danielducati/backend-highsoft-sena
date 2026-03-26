// src/models/permissions.js
const prisma = require("../config/prisma");

// ── Helpers ───────────────────────────────────────────────────
function formatPermission(p) {
return {
    id:     p.id,
    nombre: p.nombre, // ← se mantiene en español para el frontend
};
}

function formatRoleWithPermissions(role) {
return {
    id:       role.id,
    nombre:   role.nombre,
    estado:   role.estado,
    isActive: role.estado === "Activo",
    permisos: role.rolesPermisos?.map(rp => formatPermission(rp.permiso)) ?? [],
};
}

// ── Queries ───────────────────────────────────────────────────

// Get all available permissions
const getAll = async () => {
const permissions = await prisma.permiso.findMany({
    orderBy: { nombre: "asc" },
});
return permissions.map(formatPermission);
};

// Get permissions by role ID
const getByRoleId = async (roleId) => {
const items = await prisma.rolPermiso.findMany({
    where:   { rolId: Number(roleId) },
    include: { permiso: true },
});
return items.map(rp => formatPermission(rp.permiso));
};

// Assign permissions to a role (replaces all existing)
const assignPermissions = async (roleId, permissionIds = []) => {
await prisma.rolPermiso.deleteMany({
    where: { rolId: Number(roleId) },
});

if (permissionIds.length > 0) {
    await prisma.rolPermiso.createMany({
    data: permissionIds.map(pid => ({
        rolId:     Number(roleId),
        permisoId: Number(pid),
    })),
    });
}

const role = await prisma.rol.findUnique({
    where:   { id: Number(roleId) },
    include: { rolesPermisos: { include: { permiso: true } } },
});

return formatRoleWithPermissions(role);
};

// Add a single permission to a role
const addPermission = async (roleId, permissionId) => {
const exists = await prisma.rolPermiso.findFirst({
    where: { rolId: Number(roleId), permisoId: Number(permissionId) },
});

if (exists) return { ok: false, mensaje: "El permiso ya está asignado a este rol" };

await prisma.rolPermiso.create({
    data: { rolId: Number(roleId), permisoId: Number(permissionId) },
});

return { ok: true, mensaje: "Permiso agregado correctamente" };
};

// Remove a single permission from a role
const removePermission = async (roleId, permissionId) => {
await prisma.rolPermiso.deleteMany({
    where: { rolId: Number(roleId), permisoId: Number(permissionId) },
});
return { ok: true, mensaje: "Permiso eliminado correctamente" };
};

// Check if a role has a specific permission
const hasPermission = async (roleId, permissionName) => {
const result = await prisma.rolPermiso.findFirst({
    where: {
    rolId:   Number(roleId),
    permiso: { nombre: permissionName },
    },
});
return !!result;
};

module.exports = {
getAll, getByRoleId, assignPermissions,
addPermission, removePermission, hasPermission,
};