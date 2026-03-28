// src/models/categories.js
const prisma = require("../config/prisma");

const getAll = async ({ soloActivos = true }) => {
  const categorias = await prisma.categoriaServicio.findMany({
    where: soloActivos ? { estado: "Activo" } : {},
    include: {
      _count: {
        select: { servicios: true }
      }
    },
    orderBy: { nombre: "asc" },
  });

  return categorias.map(cat => ({
    id:            cat.id,
    nombre:        cat.nombre,
    descripcion:   cat.descripcion,
    color:         cat.color,
    estado:        cat.estado,
    servicesCount: cat._count.servicios,
  }));
};

const getById = async (id) => {
  const cat = await prisma.categoriaServicio.findUnique({
    where: { id },
    include: {
      _count: {
        select: { servicios: true }
      }
    },
  });

  if (!cat) return null;

  return {
    id:            cat.id,
    nombre:        cat.nombre,
    descripcion:   cat.descripcion,
    color:         cat.color,
    estado:        cat.estado,
    servicesCount: cat._count.servicios,
  };
};

const create = async ({ nombre, descripcion, color }) => {
  const cat = await prisma.categoriaServicio.create({
    data: {
      nombre,
      descripcion,
      color,
      estado: "Activo",
    },
  });

  return {
    id:          cat.id,
    nombre:      cat.nombre,
    descripcion: cat.descripcion,
    color:       cat.color,
    estado:      cat.estado,
  };
};

const update = async (id, { nombre, descripcion, color, estado }) => {
  const cat = await prisma.categoriaServicio.update({
    where: { id },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(descripcion !== undefined && { descripcion }),
      ...(color !== undefined && { color }),
      ...(estado !== undefined && { estado }),
    },
  });

  return {
    id:          cat.id,
    nombre:      cat.nombre,
    descripcion: cat.descripcion,
    color:       cat.color,
    estado:      cat.estado,
  };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
};