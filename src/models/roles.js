// src/models/roles.js
const prisma = require("../config/prisma");

function formatRol(rol) {
  return {
    id:       rol.id,
    nombre:   rol.nombre,
    descripcion: rol.descripcion ?? "",
    estado:   rol.estado,
    isActive: rol.estado === "Activo",
    permisos: rol.rolesPermisos?.map(rp => ({
      id:     rp.permiso.id,
      nombre: rp.permiso.nombre,
    })) ?? [],
  };
}

const getAll = async ({ soloActivos = false } = {}) => {
  const roles = await prisma.rol.findMany({
    where:   soloActivos ? { estado: "Activo" } : {},
    include: { rolesPermisos: { include: { permiso: true } } },
    orderBy: { nombre: "asc" },
  });
  return roles.map(formatRol);
};

const getById = async (id) => {
  const rol = await prisma.rol.findUnique({
    where:   { id: Number(id) },
    include: { rolesPermisos: { include: { permiso: true } } },
  });
  return rol ? formatRol(rol) : null;
};

const create = async ({ nombre, descripcion, permisosIds = [] }) => {
  const rol = await prisma.rol.create({
    data: {
      nombre,
      descripcion: descripcion ?? "",
      estado:      "Activo",
      rolesPermisos: {
        create: permisosIds.map(id => ({
          permiso: { connect: { id: Number(id) } },
        })),
      },
    },
    include: { rolesPermisos: { include: { permiso: true } } },
  });
  return formatRol(rol);
};

const update = async (id, { nombre, descripcion, estado, permisosIds }) => {
  if (permisosIds) {
    await prisma.rolPermiso.deleteMany({ where: { rolId: Number(id) } });
  }
  const rol = await prisma.rol.update({
    where: { id: Number(id) },
    data: {
      nombre,
      descripcion: descripcion ?? "",
      estado:      estado ?? "Activo",
      ...(permisosIds && {
        rolesPermisos: {
          create: permisosIds.map(pid => ({
            permiso: { connect: { id: Number(pid) } },
          })),
        },
      }),
    },
    include: { rolesPermisos: { include: { permiso: true } } },
  });
  return formatRol(rol);
};

const deactivate = async (id) => {
  // Eliminar permisos asociados primero
  await prisma.rolPermiso.deleteMany({ where: { rolId: Number(id) } });
  // Eliminar el rol físicamente
  return prisma.rol.delete({ where: { id: Number(id) } });
};

const countUsuarios = async (id) => {
  return prisma.usuario.count({ where: { rolId: Number(id) } });
};

const getAllPermisos = async () => {
  return prisma.permiso.findMany({ orderBy: { nombre: "asc" } });
};

const getPermisosByRol = async (id) => {
  const items = await prisma.rolPermiso.findMany({
    where:   { rolId: Number(id) },
    include: { permiso: true },
  });
  return items.map(rp => ({ id: rp.permiso.id, nombre: rp.permiso.nombre }));
};

module.exports = {
  getAll, getById, create, update, deactivate,
  countUsuarios, getAllPermisos, getPermisosByRol,
};