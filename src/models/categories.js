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
    rolId:         cat.rolId || null,
    rolNombre:     null,
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
    rolId:         cat.rolId || null,
    rolNombre:     null,
    servicesCount: cat._count.servicios,
  };
};

const create = async ({ nombre, descripcion, color, rolId }) => {
  const data = {
    nombre,
    descripcion,
    color,
    estado: "Activo",
  };
  
  // Solo agregar rolId si el campo existe en el schema
  if (rolId !== undefined && rolId !== null && rolId !== "") {
    try {
      data.rolId = Number(rolId);
    } catch (e) {
      // Ignorar si el campo no existe en la BD
    }
  }

  const cat = await prisma.categoriaServicio.create({ data });

  return {
    id:          cat.id,
    nombre:      cat.nombre,
    descripcion: cat.descripcion,
    color:       cat.color,
    estado:      cat.estado,
    rolId:       cat.rolId || null,
  };
};

const update = async (id, { nombre, descripcion, color, estado, rolId }) => {
  const data = {};
  
  if (nombre !== undefined) data.nombre = nombre;
  if (descripcion !== undefined) data.descripcion = descripcion;
  if (color !== undefined) data.color = color;
  if (estado !== undefined) data.estado = estado;
  
  // Solo agregar rolId si el campo existe en el schema
  if (rolId !== undefined) {
    try {
      data.rolId = rolId && rolId !== "" ? Number(rolId) : null;
    } catch (e) {
      // Ignorar si el campo no existe en la BD
    }
  }

  const cat = await prisma.categoriaServicio.update({
    where: { id },
    data,
  });

  return {
    id:          cat.id,
    nombre:      cat.nombre,
    descripcion: cat.descripcion,
    color:       cat.color,
    estado:      cat.estado,
    rolId:       cat.rolId || null,
  };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
};