// src/models/clients.js
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

function formatClient(c, usuario = null) {
  // Calcular totalVisits y totalSpent desde relaciones incluidas
  const citas = c.citas ?? [];
  const ventas = c.Venta ?? [];

  const totalVisits = citas.length;
  const totalSpent  = ventas.reduce((sum, v) => sum + (Number(v.Total) || 0), 0);

  // Última visita
  const fechas = citas
    .map(ci => ci.fecha ? new Date(ci.fecha) : null)
    .filter(Boolean)
    .sort((a, b) => b - a);
  const lastVisit = fechas.length > 0
    ? fechas[0].toLocaleDateString("es-CO")
    : "-";

  // Combinar datos de ambas tablas (usar el que tenga información)
  const nombre = c.nombre || usuario?.nombre || "";
  const apellido = c.apellido || usuario?.apellido || "";
  const telefono = c.telefono || usuario?.telefono || "";
  // Para la foto, priorizar la del Cliente si existe, sino la del Usuario
  const fotoPerfil = c.foto_perfil || usuario?.foto_perfil || "";
  // Para el estado, usar el del Cliente (es la fuente de verdad para el módulo de clientes)
  const estado = c.Estado;

  return {
    id:               c.PK_id_cliente,
    firstName:        nombre,
    lastName:         apellido,
    name:             `${nombre} ${apellido}`,
    email:            c.correo          ?? "",
    phone:            telefono          ?? "",
    address:          c.direccion       ?? "",
    tipo_documento:   c.tipo_documento  ?? "",
    numero_documento: c.numero_documento ?? "",
    image:            fotoPerfil        ?? "",
    isActive:         estado === "Activo",
    totalVisits,
    totalSpent,
    lastVisit,
  };
}

const INCLUDE_STATS = {
  citas:  { select: { id: true, fecha: true, estado: true } },
  Venta:  { select: { PK_id_venta_encabezado: true, Total: true, Fecha: true } },
};

const getAll = async ({ soloActivos = false } = {}) => {
  console.log(`[clientsModel.getAll] soloActivos=${soloActivos}`);
  
  // Obtener todos los usuarios con rol "Cliente" (sin filtrar por estado aquí)
  const usuarios = await prisma.usuario.findMany({
    where: {
      rol: { nombre: "Cliente" },
    },
    include: {
      rol: true,
      Cliente: true,
    },
    orderBy: { id: "desc" },
  });

  console.log(`[clientsModel.getAll] Encontrados ${usuarios.length} usuarios con rol Cliente`);

  // Para cada usuario, obtener o crear su perfil de cliente con estadísticas
  const clientes = await Promise.all(
    usuarios.map(async (usuario) => {
      let cliente = usuario.Cliente?.[0];
      
      // Si el usuario no tiene perfil de cliente, crearlo automáticamente
      if (!cliente) {
        cliente = await prisma.cliente.create({
          data: {
            nombre:           usuario.nombre || usuario.correo.split("@")[0],
            apellido:         usuario.apellido || "",
            tipo_documento:   null,
            numero_documento: null,
            correo:           usuario.correo,
            telefono:         usuario.telefono || null,
            direccion:        null,
            foto_perfil:      usuario.foto_perfil || "",
            Estado:           usuario.estado,
            fk_id_usuario:    usuario.id,
          },
        });
      }

      // Obtener el cliente con estadísticas
      const clienteConStats = await prisma.cliente.findUnique({
        where: { PK_id_cliente: cliente.PK_id_cliente },
        include: INCLUDE_STATS,
      });

      return { cliente: clienteConStats, usuario };
    })
  );

  // Filtrar por estado del Cliente (no del Usuario) si soloActivos es true
  let resultado = clientes.filter(item => item.cliente);
  
  console.log(`[clientsModel.getAll] Antes de filtrar por estado: ${resultado.length} clientes`);
  
  if (soloActivos) {
    resultado = resultado.filter(item => item.cliente.Estado === "Activo");
    console.log(`[clientsModel.getAll] Después de filtrar solo activos: ${resultado.length} clientes`);
  }

  // Formatear, combinando datos de ambas tablas
  return resultado.map(item => formatClient(item.cliente, item.usuario));
};

const getById = async (id) => {
  const c = await prisma.cliente.findUnique({
    where:   { PK_id_cliente: Number(id) },
    include: {
      ...INCLUDE_STATS,
      Usuarios: true,
    },
  });
  
  if (!c) return null;
  
  // Pasar el usuario para priorizar sus datos
  return formatClient(c, c.Usuarios);
};

const create = async ({ firstName, lastName, documentType, document,
                        email, phone, address, image, contrasena }) => {
  return prisma.$transaction(async (tx) => {
    // Correo duplicado en Usuario
    const existeUsuario = await tx.usuario.findUnique({ where: { correo: email } });
    if (existeUsuario) {
      throw new Error(`Ya existe un usuario registrado con el correo ${email}`);
    }

    const finalPassword = contrasena || document || "Highlife2024*";
    const hashed = await bcrypt.hash(finalPassword, 10);

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
  const clienteId = Number(id);

  // Correo duplicado en otro cliente
  if (email) {
    const existeCorreo = await prisma.cliente.findFirst({
      where: { correo: email, NOT: { PK_id_cliente: clienteId } },
    });
    if (existeCorreo) {
      throw new Error(`Ya existe un cliente registrado con el correo ${email}`);
    }
  }

  // Documento duplicado en otro cliente
  if (documentType && document) {
    const existeDoc = await prisma.cliente.findFirst({
      where: {
        tipo_documento:   documentType,
        numero_documento: document,
        NOT: { PK_id_cliente: clienteId },
      },
    });
    if (existeDoc) {
      throw new Error(`Ya existe un cliente con ${documentType} ${document}`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updateData = {
      nombre:           firstName,
      apellido:         lastName,
      tipo_documento:   documentType ?? null,
      numero_documento: document     ?? null,
      correo:           email        ?? null,
      telefono:         phone        ?? null,
      direccion:        address      ?? null,
      Estado:           estado       ?? "Activo",
    };

    if (image !== undefined && image !== null) {
      updateData.foto_perfil = image;
    }

    const c = await tx.cliente.update({
      where: { PK_id_cliente: clienteId },
      data:  updateData,
      include: INCLUDE_STATS,
    });

    // Sincronizar cambios con el Usuario relacionado
    if (c.fk_id_usuario) {
      const usuarioUpdateData = {};
      
      if (firstName !== undefined) usuarioUpdateData.nombre = firstName;
      if (lastName !== undefined) usuarioUpdateData.apellido = lastName;
      if (phone !== undefined) usuarioUpdateData.telefono = phone;
      if (email !== undefined) usuarioUpdateData.correo = email;
      if (image !== undefined && image !== null) {
        usuarioUpdateData.foto_perfil = image;
      }
      if (estado !== undefined) {
        usuarioUpdateData.estado = estado;
      }

      if (Object.keys(usuarioUpdateData).length > 0) {
        await tx.usuario.update({
          where: { id: c.fk_id_usuario },
          data: usuarioUpdateData,
        });
      }
    }

    return formatClient(c);
  });
};

const setStatus = async (id, isActive) => {
  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.update({
      where: { PK_id_cliente: Number(id) },
      data:  { Estado: isActive ? "Activo" : "Inactivo" },
    });

    // Sincronizar estado con el Usuario relacionado
    if (cliente.fk_id_usuario) {
      await tx.usuario.update({
        where: { id: cliente.fk_id_usuario },
        data:  { estado: isActive ? "Activo" : "Inactivo" },
      });
    }

    return cliente;
  });
};

const deactivate = async (id) => setStatus(id, false);

module.exports = { getAll, getById, create, update, setStatus, deactivate };