// src/models/users.js
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

// ── Helpers ───────────────────────────────────────────────────
function formatUser(u, cliente = null) {
  const isEmpleado = !!u.empleado;
  const perfil     = isEmpleado ? u.empleado : cliente;

  return {
    id:           u.id,
    email:        u.correo,
    name:         perfil ? `${perfil.nombre} ${perfil.apellido}`.trim() : u.correo,
    firstName:    perfil?.nombre           ?? "",
    lastName:     perfil?.apellido         ?? "",
    phone:        perfil?.telefono         ?? "",
    documentType: perfil?.tipoDocumento    ?? perfil?.tipo_documento    ?? "",
    document:     perfil?.numeroDocumento  ?? perfil?.numero_documento  ?? "",
    role:         u.rol?.nombre            ?? "",
    rolId:        u.rolId,
    photo:        perfil?.fotoPerfil       ?? perfil?.foto_perfil       ?? "",
    isActive:     u.estado === "Activo",
    estado:       u.estado,
  };
}

// ── Queries ───────────────────────────────────────────────────
const getAll = async () => {
  const usuarios = await prisma.usuario.findMany({
    include: { rol: true, empleado: true },
    orderBy: { id: "desc" },
  });

  const result = await Promise.all(usuarios.map(async (u) => {
    const empleado = u.empleado?.[0] ?? null;
    const cliente  = await prisma.cliente.findFirst({ where: { fk_id_usuario: u.id } });
    return formatUser({ ...u, empleado }, cliente);
  }));

  return result;
};

const getById = async (id) => {
  const u = await prisma.usuario.findUnique({
    where:   { id: Number(id) },
    include: { rol: true, empleado: true },
  });
  if (!u) return null;
  const empleado = u.empleado?.[0] ?? null;
  const cliente  = await prisma.cliente.findFirst({ where: { fk_id_usuario: u.id } });
  return formatUser({ ...u, empleado }, cliente);
};

const getRoles = async () => {
  return prisma.rol.findMany({
    where:   { estado: "Activo" },
    orderBy: { nombre: "asc" },
    select:  { id: true, nombre: true },
  });
};

const create = async ({ firstName, lastName, documentType, document, email, phone, role, photo, password, contrasena }) => {
  const finalPassword = contrasena || password || document || "Highlife2024*";
  const rolFound = await prisma.rol.findFirst({ where: { nombre: role } });
  if (!rolFound) throw new Error(`Rol '${role}' no encontrado`);

  const hash = await bcrypt.hash(finalPassword, 10);

  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        correo:     email,
        contrasena: hash,
        estado:     "Activo",
        rolId:      rolFound.id,
      },
    });

    const esCliente = role.toLowerCase() === "cliente";

    if (esCliente) {
      await tx.cliente.create({
        data: {
          nombre:           firstName,
          apellido:         lastName,
          tipo_documento:   documentType ?? null,
          numero_documento: document     ?? null,
          correo:           email,
          telefono:         phone        ?? null,
          foto_perfil:      photo        ?? "",
          Estado:           "Activo",
          fk_id_usuario:    usuario.id,
        },
      });
    } else {
      await tx.empleado.create({
        data: {
          nombre:          firstName,
          apellido:        lastName,
          tipoDocumento:   documentType ?? null,
          numeroDocumento: document     ?? null,
          correo:          email,
          telefono:        phone        ?? null,
          fotoPerfil:      photo        ?? null,
          estado:          "Activo",
          usuarioId:       usuario.id,
        },
      });
    }

    return { ok: true, id: usuario.id };
  });
};

const update = async (id, { firstName, lastName, documentType, document, email, phone, role, photo }) => {
  return prisma.$transaction(async (tx) => {
    // Siempre actualizar el correo del usuario
    const usuarioData = { correo: email };

    if (role) {
      const rolFound = await tx.rol.findFirst({ where: { nombre: role } });
      if (rolFound) usuarioData.rolId = rolFound.id;
    }

    await tx.usuario.update({
      where: { id: Number(id) },
      data:  usuarioData,
    });

    // Actualizar empleado si existe
    const empleado = await tx.empleado.findFirst({ where: { usuarioId: Number(id) } });
    if (empleado) {
      await tx.empleado.update({
        where: { id: empleado.id },
        data: {
          nombre:          firstName    || "",
          apellido:        lastName     || "",
          tipoDocumento:   documentType ?? null,
          numeroDocumento: document     ?? null,
          correo:          email        || "",
          telefono:        phone        ?? null,
          ...(photo !== undefined && photo !== "" && { fotoPerfil: photo }),
        },
      });
    }

    // Actualizar cliente si existe
    const cliente = await tx.cliente.findFirst({ where: { fk_id_usuario: Number(id) } });
    if (cliente) {
      await tx.cliente.update({
        where: { PK_id_cliente: cliente.PK_id_cliente },
        data: {
          nombre:           firstName    || "",
          apellido:         lastName     || "",
          tipo_documento:   documentType ?? null,
          numero_documento: document     ?? null,
          correo:           email        || "",
          telefono:         phone        ?? null,
          ...(photo !== undefined && photo !== "" && { foto_perfil: photo }),
        },
      });
    }

    return { ok: true };
  });
};

const updateStatus = async (id, isActive) => {
  return prisma.usuario.update({
    where: { id: Number(id) },
    data:  { estado: isActive ? "Activo" : "Inactivo" },
  });
};

const remove = async (id) => {
  return prisma.$transaction(async (tx) => {
    const empleado = await tx.empleado.findFirst({ where: { usuarioId: Number(id) } });

    if (empleado) {
      // Borrar novedades de los horarios del empleado
      await tx.novedad.deleteMany({
        where: { horario: { empleadoId: empleado.id } },
      });
      // Borrar horarios
      await tx.horario.deleteMany({ where: { empleadoId: empleado.id } });
      // Desasociar agendamiento detalles (poner empleadoId en null)
      await tx.agendamientoDetalle.updateMany({
        where: { empleadoId: empleado.id },
        data:  { empleadoId: null },
      });
      // Desasociar venta detalles (poner empleadoId en null)
      await tx.ventaDetalle.updateMany({
        where: { empleadoId: empleado.id },
        data:  { empleadoId: null },
      });
      // Borrar relaciones empleado-servicio
      await tx.empleadoServicio.deleteMany({ where: { empleadoId: empleado.id } });
      // Borrar el empleado
      await tx.empleado.delete({ where: { id: empleado.id } });
    }

    await tx.cliente.deleteMany({ where: { fk_id_usuario: Number(id) } });
    await tx.resetPasswordToken.deleteMany({ where: { usuarioId: Number(id) } });
    await tx.usuario.delete({ where: { id: Number(id) } });
    return { ok: true };
  });
};

module.exports = { getAll, getById, getRoles, create, update, updateStatus, remove };