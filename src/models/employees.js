// src/models/employees.js
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

const COLORS = ["#78D1BD","#A78BFA","#60A5FA","#FBBF24","#F87171","#34D399","#FB923C","#E879F9"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatEmployee(emp, idx = 0) {
  return {
    id:              String(emp.id),
    name:            `${emp.nombre} ${emp.apellido}`,
    nombre:          emp.nombre,
    apellido:        emp.apellido,
    specialty:       emp.especialidad ?? "",
    email:           emp.correo       ?? "",
    phone:           emp.telefono     ?? "",
    tipoDocumento:   emp.tipoDocumento ?? "",
    numeroDocumento: emp.numeroDocumento ?? "",
    ciudad:          emp.ciudad    ?? "",
    direccion:       emp.direccion ?? "",
    fotoPerfil:      emp.fotoPerfil ?? "",
    image:           emp.fotoPerfil      ?? "",  // alias para el frontend
    image:           emp.fotoPerfil ?? "",
    estado:          emp.estado,
    isActive:        emp.estado === "Activo",
    color:           COLORS[idx % COLORS.length],
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────
const getAll = async ({ soloActivos = true } = {}) => {
  const empleados = await prisma.empleado.findMany({
    where:   soloActivos ? { estado: "Activo" } : {},
    orderBy: { nombre: "asc" },
  });
  return empleados.map(formatEmployee);
};

const getById = async (id) => {
  const emp = await prisma.empleado.findUnique({ where: { id: Number(id) } });
  return emp ? formatEmployee(emp) : null;
};

const create = async ({ nombre, apellido, tipoDocumento, numeroDocumento, correo,
                        telefono, ciudad, especialidad, direccion, fotoPerfil,
                        contrasena, idRol }) => {
  const hashed = await bcrypt.hash(contrasena || "empleado123", 10);

  // Transacción: crear Usuario + Empleado
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        correo,
        contrasena: hashed,
        estado:     "Activo",
        rolId:      idRol ?? 2,
      },
    });
    const empleado = await tx.empleado.create({
      data: {
        nombre,  apellido,
        tipoDocumento:   tipoDocumento   ?? null,
        numeroDocumento: numeroDocumento ?? null,
        correo,
        telefono:   telefono   ?? null,
        ciudad:     ciudad     ?? null,
        especialidad: especialidad ?? null,
        direccion:  direccion  ?? null,
        fotoPerfil: fotoPerfil ?? null,
        estado:     "Activo",
        usuarioId:  usuario.id,
      },
    });
    return formatEmployee(empleado);
  });
};

const update = async (id, data) => {
  const updateData = {};

  if (data.nombre          !== undefined) updateData.nombre          = data.nombre;
  if (data.apellido        !== undefined) updateData.apellido        = data.apellido;
  if (data.tipoDocumento   !== undefined) updateData.tipoDocumento   = data.tipoDocumento;
  if (data.numeroDocumento !== undefined) updateData.numeroDocumento = data.numeroDocumento;
  // correo no se actualiza aquí para mantener consistencia con la tabla Usuarios
  if (data.telefono        !== undefined) updateData.telefono        = data.telefono;
  if (data.ciudad          !== undefined) updateData.ciudad          = data.ciudad;
  if (data.especialidad    !== undefined) updateData.especialidad    = data.especialidad;
  if (data.direccion       !== undefined) updateData.direccion       = data.direccion;
  if (data.fotoPerfil      !== undefined) updateData.fotoPerfil      = data.fotoPerfil;
  if (data.estado          !== undefined) updateData.estado          = data.estado;

  const emp = await prisma.empleado.update({
    where: { id: Number(id) },
    data:  updateData,
  });

  return formatEmployee(emp);
};

// Soft delete
const deactivate = async (id) => {
  return prisma.empleado.update({
    where: { id: Number(id) },
    data:  { estado: "Inactivo" },
  });
};

module.exports = { getAll, getById, create, update, deactivate, formatEmployee };