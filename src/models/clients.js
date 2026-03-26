// src/models/clients.js
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

function formatClient(c) {
  return {
    id:               c.PK_id_cliente,
    firstName:        c.nombre,
    lastName:         c.apellido,
    name:             `${c.nombre} ${c.apellido}`,
    email:            c.correo          ?? "",
    phone:            c.telefono        ?? "",
    address:          c.direccion       ?? "",
    tipo_documento:   c.tipo_documento  ?? "",
    numero_documento: c.numero_documento ?? "",
    image:            c.foto_perfil     ?? "",
    isActive:         c.Estado === "Activo",
    totalVisits: 0,
    totalSpent:  0,
    lastVisit:   "-",
  };
}

const getAll = async ({ soloActivos = false } = {}) => {
  const clientes = await prisma.cliente.findMany({
    where:   soloActivos ? { Estado: "Activo" } : {},
    orderBy: { nombre: "asc" },
  });
  return clientes.map(formatClient);
};

const getById = async (id) => {
  const c = await prisma.cliente.findUnique({ where: { PK_id_cliente: Number(id) } });
  return c ? formatClient(c) : null;
};

const create = async ({ firstName, lastName, documentType, document,
                        email, phone, address, image }) => {
  return prisma.$transaction(async (tx) => {
    const existente = await tx.usuario.findUnique({ where: { correo: email } });
    if (existente) {
      throw new Error(`Ya existe un usuario registrado con el correo ${email}`);
    }

    const hashed = await bcrypt.hash(document ?? "cliente123", 10);

    const usuario = await tx.usuario.create({
      data: {
        correo:     email,
        contrasena: hashed,
        estado:     "Activo",
        rolId:      3,
      },
    });

    const cliente = await tx.cliente.create({
      data: {
        nombre:           firstName,
        apellido:         lastName,
        tipo_documento:   documentType ?? null,
        numero_documento: document     ?? null,
        correo:           email        ?? null,
        telefono:         phone        ?? null,
        direccion:        address      ?? null,
        foto_perfil:      image        ?? "",
        Estado:           "Activo",
        fk_id_usuario:    usuario.id,
      },
    });

    return formatClient(cliente);
  });
};

const update = async (id, { firstName, lastName, documentType, document,
                              email, phone, address, image, estado }) => {
  const c = await prisma.cliente.update({
    where: { PK_id_cliente: Number(id) },
    data: {
      nombre:           firstName,
      apellido:         lastName,
      tipo_documento:   documentType ?? null,
      numero_documento: document     ?? null,
      correo:           email        ?? null,
      telefono:         phone        ?? null,
      direccion:        address      ?? null,
      foto_perfil:      image        ?? "",
      Estado:           estado       ?? "Activo",
    },
  });
  return formatClient(c);
};

const setStatus = async (id, isActive) => {
  return prisma.cliente.update({
    where: { PK_id_cliente: Number(id) },
    data:  { Estado: isActive ? "Activo" : "Inactivo" },
  });
};

const deactivate = async (id) => setStatus(id, false);

module.exports = { getAll, getById, create, update, setStatus, deactivate };