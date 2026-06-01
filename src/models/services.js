// src/models/services.js
const prisma = require("../config/prisma");

function formatService(s) {
  // Si la categoría tiene un rol asociado, usar el nombre del rol como categoría
  // Esto asegura que coincida con la especialidad del empleado (que es el nombre del rol)
  const categoryName = s.categoria?.rol?.nombre || s.categoria?.nombre || "";
  
  return {
    id:          String(s.id),
    name:        s.nombre,
    description: s.descripcion  ?? "",
    category:    categoryName,
    categoryId:  s.categoriaId,
    duration:    s.duracion  ?? 60,
    price:       s.precio    ? Number(s.precio) : 0,
    status:      s.estado,
    image:       s.imagenServicio ?? "",
  };
}

const getAll = async ({ soloActivos = true } = {}) => {
  const servicios = await prisma.servicio.findMany({
    where:   soloActivos ? { estado: "Activo" } : {},
    include: { 
      categoria: {
        include: { rol: true }
      }
    },
    orderBy: { nombre: "asc" },
  });
  return servicios.map(formatService);
};

const getById = async (id) => {
  const s = await prisma.servicio.findUnique({
    where:   { id: Number(id) },
    include: { 
      categoria: {
        include: { rol: true }
      }
    },
  });
  return s ? formatService(s) : null;
};

const create = async ({ nombre, descripcion, categoriaId, duracion, precio, imagenServicio }) => {
  const s = await prisma.servicio.create({
    data: {
      nombre,
      descripcion:    descripcion    ?? null,
      categoriaId:    Number(categoriaId),
      duracion:       duracion       ?? null,
      precio:         precio         ?? null,
      imagenServicio: imagenServicio ?? null,
      estado:         "Activo",
    },
    include: { 
      categoria: {
        include: { rol: true }
      }
    },
  });
  return formatService(s);
};

const update = async (id, data) => {
  const s = await prisma.servicio.update({
    where: { id: Number(id) },
    data: {
      nombre:         data.nombre,
      descripcion:    data.descripcion    ?? null,
      categoriaId:    Number(data.categoriaId),
      duracion:       data.duracion       ?? null,
      precio:         data.precio         ?? null,
      imagenServicio: data.imagenServicio ?? null,
      estado:         data.estado         ?? "Activo",
    },
    include: { 
      categoria: {
        include: { rol: true }
      }
    },
  });
  return formatService(s);
};

const deactivate = async (id) => {
  return prisma.servicio.update({
    where: { id: Number(id) },
    data:  { estado: "Inactivo" },
  });
};

module.exports = { getAll, getById, create, update, deactivate };


// ─────────────────────────────────────────────────────────────────────────────
// src/models/categories.js  (exportado al final del mismo archivo por simplicidad,
// pero puedes moverlo a su propio archivo si prefieres)
// ─────────────────────────────────────────────────────────────────────────────
const categoriesModel = {
  getAll: async () => {
    return prisma.categoriaServicio.findMany({
      where:   { estado: "Activo" },
      orderBy: { nombre: "asc" },
    });
  },
  getById: async (id) => {
    return prisma.categoriaServicio.findUnique({ where: { id: Number(id) } });
  },
  create: async ({ nombre, descripcion, color }) => {
    return prisma.categoriaServicio.create({
      data: { nombre, descripcion: descripcion ?? null, color: color ?? null, estado: "Activo" },
    });
  },
  update: async (id, { nombre, descripcion, color, estado }) => {
    return prisma.categoriaServicio.update({
      where: { id: Number(id) },
      data:  { nombre, descripcion: descripcion ?? null, color: color ?? null, estado: estado ?? "Activo" },
    });
  },
  deactivate: async (id) => {
    return prisma.categoriaServicio.update({
      where: { id: Number(id) },
      data:  { estado: "Inactivo" },
    });
  },
};

module.exports.categoriesModel = categoriesModel;