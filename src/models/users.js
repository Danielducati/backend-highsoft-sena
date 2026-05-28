// src/models/users.js
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

// ── Helpers ───────────────────────────────────────────────────
function formatUser(u, cliente = null) {
  const isEmpleado = !!u.empleado;
  const perfil     = isEmpleado ? u.empleado : cliente;

  // Combinar foto: priorizar Usuario, luego Cliente, luego Empleado
  let photo = u.foto_perfil;
  if (!photo && cliente?.foto_perfil) {
    photo = cliente.foto_perfil;
  }
  if (!photo && perfil?.fotoPerfil) {
    photo = perfil.fotoPerfil;
  }

  return {
    id:           u.id,
    email:        u.correo,
    name:         u.nombre ? `${u.nombre} ${u.apellido}`.trim()
                           : perfil ? `${perfil.nombre} ${perfil.apellido}`.trim()
                           : u.correo,
    firstName:    u.nombre               ?? perfil?.nombre           ?? perfil?.nombre ?? "",
    lastName:     u.apellido             ?? perfil?.apellido         ?? "",
    phone:        u.telefono             ?? perfil?.telefono         ?? "",
    documentType: perfil?.tipoDocumento  ?? perfil?.tipo_documento   ?? "",
    document:     perfil?.numeroDocumento ?? perfil?.numero_documento ?? "",
    role:         u.rol?.nombre          ?? "",
    rolId:        u.rolId,
    photo:        photo ?? "",
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
  const rolFound = await prisma.rol.findFirst({ where: { nombre: role } });
  if (!rolFound) throw new Error(`Rol '${role}' no encontrado`);

  const existeCorreo = await prisma.usuario.findUnique({ where: { correo: email } });
  if (existeCorreo) throw new Error(`Ya existe un usuario registrado con el correo ${email}`);

  if (documentType && document) {
    const existeDocEmp = await prisma.empleado.findFirst({
      where: { tipoDocumento: documentType, numeroDocumento: document }
    });
    if (existeDocEmp) throw new Error(`Ya existe un empleado con ${documentType} ${document}`);

    const existeDocCli = await prisma.cliente.findFirst({
      where: { tipo_documento: documentType, numero_documento: document }
    });
    if (existeDocCli) throw new Error(`Ya existe un cliente con ${documentType} ${document}`);
  }

  const passwordBase = contrasena?.trim() || document || "Highlife2024*";
  const hash = await bcrypt.hash(passwordBase, 10);

  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        correo:     email,
        contrasena: hash,
        estado:     "Activo",
        rolId:      rolFound.id,
        nombre:     firstName ?? null,
        apellido:   lastName  ?? null,
        telefono:   phone     ?? null,
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


// Mapeo entre roles y especialidades (categorías)
const ROL_A_ESPECIALIDAD = {
  "Barbero": "Barbería",
  "Cosmetóloga": "Cosmetología",
  "Estilista": "Estilismo",
  "Manicurista": "Manicura",
  "Masajista": "Masajes",
};

const update = async (id, { firstName, lastName, documentType, document, email, phone, role, photo, contrasena }) => {
  return prisma.$transaction(async (tx) => {

    // Validar documento duplicado en empleados (excluyendo el usuario actual)
    if (documentType && document) {
      const empDup = await tx.empleado.findFirst({
        where: {
          tipoDocumento:   documentType,
          numeroDocumento: document,
          NOT: { usuarioId: Number(id) },
        },
      });
      if (empDup) throw new Error(`Ya existe un usuario con ${documentType} ${document}`);

      const cliDup = await tx.cliente.findFirst({
        where: {
          tipo_documento:   documentType,
          numero_documento: document,
          NOT: { fk_id_usuario: Number(id) },
        },
      });
      if (cliDup) throw new Error(`Ya existe un usuario con ${documentType} ${document}`);
    }

    const usuarioData = {};

    if (email     !== undefined) usuarioData.correo   = email;
    if (firstName !== undefined) usuarioData.nombre   = firstName ?? null;
    if (lastName  !== undefined) usuarioData.apellido = lastName  ?? null;
    if (phone     !== undefined) usuarioData.telefono = phone     ?? null;
    // foto_perfil: actualizar siempre que venga definido (incluso vacío para borrarla)
    if (photo !== undefined) {
      try { usuarioData.foto_perfil = photo ?? ""; } catch { /* campo no existe, ignorar */ }
    }

    if (contrasena && contrasena.trim() !== "") {
      const hash = await bcrypt.hash(contrasena.trim(), 10);
      usuarioData.contrasena = hash;
    }

    let isNewRoleCliente = false;
    let isNewRoleEmpleado = false;

    if (role) {
      const rolFound = await tx.rol.findFirst({
        where: { nombre: { equals: role, mode: "insensitive" } },
      });
      if (rolFound) {
        usuarioData.rolId = rolFound.id;
        isNewRoleCliente = rolFound.nombre.toLowerCase() === "cliente";
        isNewRoleEmpleado = rolFound.nombre.toLowerCase() !== "cliente";
      }
    }

    const updatedUsuario = await tx.usuario.update({
      where: { id: Number(id) },
      data:  usuarioData,
      include: { rol: true }
    });
    
    if (!role) {
       isNewRoleCliente = updatedUsuario.rol.nombre.toLowerCase() === "cliente";
       isNewRoleEmpleado = updatedUsuario.rol.nombre.toLowerCase() !== "cliente";
    }

    console.log(`[update] usuario ${id} data:`, JSON.stringify(usuarioData));

    // Verificar perfiles existentes
    const empleado = await tx.empleado.findFirst({ where: { usuarioId: Number(id) } });
    const cliente = await tx.cliente.findFirst({ where: { fk_id_usuario: Number(id) } });

    // Si el rol es empleado/admin pero no tiene perfil de empleado, se lo creamos
    if (isNewRoleEmpleado && !empleado) {
      await tx.empleado.create({
        data: {
          nombre:          firstName    || updatedUsuario.nombre || "",
          apellido:        lastName     || updatedUsuario.apellido || "",
          tipoDocumento:   documentType ?? (cliente?.tipo_documento || null),
          numeroDocumento: document     ?? (cliente?.numero_documento || null),
          correo:          email        || updatedUsuario.correo,
          telefono:        phone        ?? (updatedUsuario.telefono || null),
          fotoPerfil:      photo        ?? (cliente?.foto_perfil || null),
          especialidad:    updatedUsuario.rol.nombre, // Especialidad = Rol (sin mapeo)
          estado:          updatedUsuario.estado,
          usuarioId:       updatedUsuario.id,
        }
      });
    } else if (empleado) {
      const empleadoUpdateData = {
        ...(firstName !== undefined && { nombre: firstName || "" }),
        ...(lastName !== undefined && { apellido: lastName || "" }),
        ...(documentType !== undefined && { tipoDocumento: documentType }),
        ...(document !== undefined && { numeroDocumento: document }),
        ...(email !== undefined && { correo: email || "" }),
        ...(phone !== undefined && { telefono: phone }),
        ...(photo !== undefined && { fotoPerfil: photo }),
      };

      // Si cambió el rol, actualizar la especialidad del empleado (especialidad = rol)
      if (role !== undefined) {
        empleadoUpdateData.especialidad = updatedUsuario.rol.nombre;
      }

      await tx.empleado.update({
        where: { id: empleado.id },
        data: empleadoUpdateData,
      });
    }

    // Si el rol es cliente pero no tiene perfil de cliente, se lo creamos
    if (isNewRoleCliente && !cliente) {
      await tx.cliente.create({
        data: {
          nombre:           firstName    || updatedUsuario.nombre || "",
          apellido:         lastName     || updatedUsuario.apellido || "",
          tipo_documento:   documentType ?? (empleado?.tipoDocumento || null),
          numero_documento: document     ?? (empleado?.numeroDocumento || null),
          correo:           email        || updatedUsuario.correo,
          telefono:         phone        ?? (updatedUsuario.telefono || null),
          foto_perfil:      photo        ?? (empleado?.fotoPerfil || ""),
          Estado:           updatedUsuario.estado,
          fk_id_usuario:    updatedUsuario.id,
        }
      });
    } else if (cliente) {
      await tx.cliente.update({
        where: { PK_id_cliente: cliente.PK_id_cliente },
        data: {
          ...(firstName !== undefined && { nombre: firstName || "" }),
          ...(lastName !== undefined && { apellido: lastName || "" }),
          ...(documentType !== undefined && { tipo_documento: documentType }),
          ...(document !== undefined && { numero_documento: document }),
          ...(email !== undefined && { correo: email || "" }),
          ...(phone !== undefined && { telefono: phone }),
          ...(photo !== undefined && { foto_perfil: photo }),
        },
      });
    }

    return { ok: true };
  });
};

const updateStatus = async (id, isActive) => {
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.update({
      where: { id: Number(id) },
      data:  { estado: isActive ? "Activo" : "Inactivo" },
      include: { rol: true },
    });

    // Sincronizar estado con el Cliente relacionado (si existe)
    const cliente = await tx.cliente.findFirst({
      where: { fk_id_usuario: Number(id) }
    });

    if (cliente) {
      await tx.cliente.update({
        where: { PK_id_cliente: cliente.PK_id_cliente },
        data:  { Estado: isActive ? "Activo" : "Inactivo" },
      });
    }

    // Sincronizar estado con el Empleado relacionado (si existe)
    const empleado = await tx.empleado.findFirst({
      where: { usuarioId: Number(id) }
    });

    if (empleado) {
      await tx.empleado.update({
        where: { id: empleado.id },
        data:  { estado: isActive ? "Activo" : "Inactivo" },
      });
    }

    return usuario;
  });
};

const remove = async (id) => {
  return prisma.$transaction(async (tx) => {
    const empleado = await tx.empleado.findFirst({ where: { usuarioId: Number(id) } });

    if (empleado) {
      await tx.novedad.deleteMany({
        where: { horario: { empleadoId: empleado.id } },
      });
      await tx.horario.deleteMany({ where: { empleadoId: empleado.id } });
      await tx.agendamientoDetalle.updateMany({
        where: { empleadoId: empleado.id },
        data:  { empleadoId: null },
      });
      await tx.ventaDetalle.updateMany({
        where: { empleadoId: empleado.id },
        data:  { empleadoId: null },
      });
      await tx.empleadoServicio.deleteMany({ where: { empleadoId: empleado.id } });
      await tx.empleado.delete({ where: { id: empleado.id } });
    }

    const cliente = await tx.cliente.findFirst({ where: { fk_id_usuario: Number(id) } });
    if (cliente) {
      await tx.agendamientoCita.updateMany({
        where: { clienteId: cliente.PK_id_cliente },
        data:  { clienteId: null },
      });
      await tx.cotizacion.updateMany({
        where: { clienteId: cliente.PK_id_cliente },
        data:  { clienteId: null },
      });
      await tx.venta.updateMany({
        where: { FK_id_cliente: cliente.PK_id_cliente },
        data:  { FK_id_cliente: null },
      });
      await tx.cliente.delete({ where: { PK_id_cliente: cliente.PK_id_cliente } });
    }

    await tx.resetPasswordToken.deleteMany({ where: { usuarioId: Number(id) } });
    await tx.usuario.delete({ where: { id: Number(id) } });
    return { ok: true };
  });
};

module.exports = { getAll, getById, getRoles, create, update, updateStatus, remove };