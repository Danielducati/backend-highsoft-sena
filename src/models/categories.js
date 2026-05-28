// src/models/categories.js
const prisma = require("../config/prisma");

const getAll = async ({ soloActivos = true }) => {
  const categorias = await prisma.categoriaServicio.findMany({
    where: soloActivos ? { estado: "Activo" } : {},
    include: {
      _count: {
        select: { servicios: true }
      },
      rol: true
    },
    orderBy: { nombre: "asc" },
  });

  return categorias.map(cat => ({
    id:            cat.id,
    nombre:        cat.nombre,
    descripcion:   cat.descripcion,
    color:         cat.color,
    estado:        cat.estado,
    rolId:         cat.rolId,
    rolNombre:     cat.rol?.nombre,
    servicesCount: cat._count.servicios,
  }));
};

const getById = async (id) => {
  const cat = await prisma.categoriaServicio.findUnique({
    where: { id },
    include: {
      _count: {
        select: { servicios: true }
      },
      rol: true
    },
  });

  if (!cat) return null;

  return {
    id:            cat.id,
    nombre:        cat.nombre,
    descripcion:   cat.descripcion,
    color:         cat.color,
    estado:        cat.estado,
    rolId:         cat.rolId,
    rolNombre:     cat.rol?.nombre,
    servicesCount: cat._count.servicios,
  };
};

const create = async ({ nombre, descripcion, color, rolId }) => {
  const cat = await prisma.categoriaServicio.create({
    data: {
      nombre,
      descripcion,
      color,
      estado: "Activo",
      ...(rolId && { rolId: Number(rolId) }),
    },
  });

  return {
    id:          cat.id,
    nombre:      cat.nombre,
    descripcion: cat.descripcion,
    color:       cat.color,
    estado:      cat.estado,
    rolId:       cat.rolId,
  };
};

const update = async (id, { nombre, descripcion, color, estado, rolId }) => {
  const cat = await prisma.categoriaServicio.update({
    where: { id },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(descripcion !== undefined && { descripcion }),
      ...(color !== undefined && { color }),
      ...(estado !== undefined && { estado }),
      ...(rolId !== undefined && { rolId: rolId ? Number(rolId) : null }),
    },
  });

  return {
    id:          cat.id,
    nombre:      cat.nombre,
    descripcion: cat.descripcion,
    color:       cat.color,
    estado:      cat.estado,
    rolId:       cat.rolId,
  };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
};