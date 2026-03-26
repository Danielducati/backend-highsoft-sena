// src/models/categories.js
const prisma = require("../config/prisma");

// ── Helpers ───────────────────────────────────────────────────
function formatCategoria(cat) {
return {
    id:          cat.id,
    nombre:      cat.nombre,
    descripcion: cat.descripcion ?? "",
    color:       cat.color       ?? "",
    estado:      cat.estado,
    isActive:    cat.estado === "Activo",
};
}

// ── Queries ───────────────────────────────────────────────────
const getAll = async ({ soloActivos = false } = {}) => {
const categorias = await prisma.categoriaServicio.findMany({
    where:   soloActivos ? { estado: "Activo" } : {},
    orderBy: { nombre: "asc" },
});
return categorias.map(formatCategoria);
};

const getById = async (id) => {
const cat = await prisma.categoriaServicio.findUnique({
    where: { id: Number(id) },
});
return cat ? formatCategoria(cat) : null;
};

const create = async ({ nombre, descripcion, color }) => {
const cat = await prisma.categoriaServicio.create({
    data: {
    nombre,
    descripcion: descripcion ?? null,
    color:       color       ?? null,
    estado:      "Activo",
    },
});
return formatCategoria(cat);
};

const update = async (id, { nombre, descripcion, color, estado }) => {
const cat = await prisma.categoriaServicio.update({
    where: { id: Number(id) },
    data: {
    nombre,
    descripcion: descripcion ?? null,
    color:       color       ?? null,
    estado:      estado      ?? "Activo",
    },
});
return formatCategoria(cat);
};

const deactivate = async (id) => {
return prisma.categoriaServicio.update({
    where: { id: Number(id) },
    data:  { estado: "Inactivo" },
});
};

module.exports = { getAll, getById, create, update, deactivate };