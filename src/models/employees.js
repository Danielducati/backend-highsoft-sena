// src/models/employees.js
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

const COLORS = ["#78D1BD","#A78BFA","#60A5FA","#FBBF24","#F87171","#34D399","#FB923C","#E879F9"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatEmployee(emp, usuario = null, idx = 0) {
  // Combinar datos de ambas tablas (usar el que tenga información)
  const nombre = emp.nombre || usuario?.nombre || "";
  const apellido = emp.apellido || usuario?.apellido || "";
  const telefono = emp.telefono || usuario?.telefono || "";
  // Para la foto, priorizar la del Empleado si existe, sino la del Usuario
  const fotoPerfil = emp.fotoPerfil || usuario?.foto_perfil || "";
  // Para el estado, usar el del Empleado (es la fuente de verdad para el módulo de empleados)
  const estado = emp.estado;

  return {
    id:              String(emp.id),
    name:            `${nombre} ${apellido}`,
    nombre:          nombre,
    apellido:        apellido,
    specialty:       emp.especialidad ?? "",
    email:           emp.correo       ?? "",
    phone:           telefono         ?? "",
    tipoDocumento:   emp.tipoDocumento ?? "",
    numeroDocumento: emp.numeroDocumento ?? "",
    ciudad:          emp.ciudad    ?? "",
    direccion:       emp.direccion ?? "",
    fotoPerfil:      fotoPerfil    ?? "",
    image:           fotoPerfil    ?? "",
    estado:          estado,
    isActive:        estado === "Activo",
    color:           COLORS[idx % COLORS.length],
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────
const getAll = async ({ soloActivos = false } = {}) => {
  const empleados = await prisma.empleado.findMany({
    where: {
      // No filtrar por estado aquí, se filtra después
      // Solo empleados cuyo usuario NO sea Admin ni Cliente
      usuario: {
        rol: {
          nombre: { notIn: ["Admin", "Administrador", "Cliente"] },
        },
      },
    },
    include: { usuario: { include: { rol: true } } },
    orderBy: { nombre: "asc" },
  });

  // Filtrar por estado del Empleado si soloActivos es true
  let resultado = empleados;
  if (soloActivos) {
    resultado = empleados.filter(emp => emp.estado === "Activo");
  }

  return resultado.map((emp, idx) => formatEmployee(emp, emp.usuario, idx));
};

const getById = async (id) => {
  const emp = await prisma.empleado.findUnique({ where: { id: Number(id) } });
  return emp ? formatEmployee(emp) : null;
};

// Mapeo entre especialidades (categorías) y roles
const ESPECIALIDAD_A_ROL = {
  "Barbería": "Barbero",
  "Cosmetología": "Cosmetóloga",
  "Estilismo": "Estilista",
  "Cabello": "Estilista",
  "Manicura": "Manicurista",
  "Uñas": "Manicurista",
  "Masajes": "Masajista",
};

const ROL_A_ESPECIALIDAD = {
  "Barbero": "Barbería",
  "Cosmetóloga": "Cosmetología",
  "Estilista": "Estilismo",
  "Manicurista": "Manicura",
  "Masajista": "Masajes",
};

const create = async ({ nombre, apellido, tipoDocumento, numeroDocumento, correo,
                        telefono, ciudad, especialidad, direccion, fotoPerfil,
                        contrasena, idRol }) => {
  const passwordBase = contrasena?.trim() || numeroDocumento || "empleado123";
  const hashed = await bcrypt.hash(passwordBase, 10);

  // Si se proporciona especialidad, buscar el rol correspondiente
  let rolId = idRol;
  if (especialidad && !rolId) {
    // Mapear especialidad a rol (Barbería -> Barbero, etc.)
    const nombreRol = ESPECIALIDAD_A_ROL[especialidad] || especialidad;
    const rolPorEspecialidad = await prisma.rol.findFirst({
      where: { nombre: nombreRol },
    });
    if (rolPorEspecialidad) {
      rolId = rolPorEspecialidad.id;
    }
  }

  // Si no se pasa idRol ni especialidad, buscar el rol "Empleado" por nombre
  if (!rolId) {
    const rolEmpleado = await prisma.rol.findFirst({
      where: { nombre: { in: ["Empleado", "empleado"] } },
    });
    if (!rolEmpleado) throw new Error("No se encontró el rol 'Empleado' en la base de datos");
    rolId = rolEmpleado.id;
  }

  // Verificar que el rol existe
  const rolExiste = await prisma.rol.findUnique({ where: { id: Number(rolId) } });
  if (!rolExiste) {
    // Fallback: usar el rol Empleado por nombre
    const rolEmpleado = await prisma.rol.findFirst({
      where: { nombre: { in: ["Empleado", "empleado"] } },
    });
    if (!rolEmpleado) throw new Error("No se encontró el rol 'Empleado' en la base de datos");
    rolId = rolEmpleado.id;
  }

  // Si no se proporcionó especialidad pero sí rol, mapear rol a especialidad
  let especialidadFinal = especialidad;
  if (!especialidadFinal && rolExiste) {
    especialidadFinal = ROL_A_ESPECIALIDAD[rolExiste.nombre] || rolExiste.nombre;
  }

  // Documento duplicado
  if (tipoDocumento && numeroDocumento) {
    const existeDoc = await prisma.empleado.findFirst({
      where: { tipoDocumento, numeroDocumento },
    });
    if (existeDoc) {
      throw new Error(`Ya existe un empleado con ${tipoDocumento} ${numeroDocumento}`);
    }
  }

  // Correo duplicado
  const existeCorreo = await prisma.usuario.findUnique({ where: { correo } });
  if (existeCorreo) {
    throw new Error(`Ya existe un usuario registrado con el correo ${correo}`);
  }

  // Transacción: crear Usuario + Empleado
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        correo,
        contrasena: hashed,
        estado:     "Activo",
        rolId:      Number(rolId),
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
        especialidad: especialidadFinal ?? null,
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
  const empId = Number(id);

  // Documento duplicado en otro empleado o cliente
  if (data.tipoDocumento && data.numeroDocumento) {
    const existeEmp = await prisma.empleado.findFirst({
      where: {
        tipoDocumento:   data.tipoDocumento,
        numeroDocumento: data.numeroDocumento,
        NOT: { id: empId },
      },
    });
    if (existeEmp) {
      throw new Error(`Ya existe un empleado con ${data.tipoDocumento} ${data.numeroDocumento}`);
    }

    const existeCli = await prisma.cliente.findFirst({
      where: {
        tipo_documento:   data.tipoDocumento,
        numero_documento: data.numeroDocumento,
      },
    });
    if (existeCli) {
      throw new Error(`Ya existe un cliente con ${data.tipoDocumento} ${data.numeroDocumento}`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updateData = {};

    if (data.nombre          !== undefined) updateData.nombre          = data.nombre;
    if (data.apellido        !== undefined) updateData.apellido        = data.apellido;
    if (data.tipoDocumento   !== undefined) updateData.tipoDocumento   = data.tipoDocumento;
    if (data.numeroDocumento !== undefined) updateData.numeroDocumento = data.numeroDocumento;
    if (data.telefono        !== undefined) updateData.telefono        = data.telefono;
    if (data.ciudad          !== undefined) updateData.ciudad          = data.ciudad;
    if (data.especialidad    !== undefined) updateData.especialidad    = data.especialidad;
    if (data.direccion       !== undefined) updateData.direccion       = data.direccion;
    if (data.fotoPerfil      !== undefined) updateData.fotoPerfil      = data.fotoPerfil;
    if (data.estado          !== undefined) updateData.estado          = data.estado;

    const emp = await tx.empleado.update({
      where: { id: empId },
      data:  updateData,
    });

    // Sincronizar cambios con el Usuario relacionado
    if (emp.usuarioId) {
      const usuarioUpdateData = {};
      
      if (data.nombre !== undefined) usuarioUpdateData.nombre = data.nombre;
      if (data.apellido !== undefined) usuarioUpdateData.apellido = data.apellido;
      if (data.telefono !== undefined) usuarioUpdateData.telefono = data.telefono;
      if (data.fotoPerfil !== undefined && data.fotoPerfil !== null && data.fotoPerfil !== "") {
        usuarioUpdateData.foto_perfil = data.fotoPerfil;
      }
      if (data.estado !== undefined) {
        usuarioUpdateData.estado = data.estado;
      }

      // Si cambia la especialidad, actualizar el rol del usuario
      if (data.especialidad !== undefined) {
        const nombreRol = ESPECIALIDAD_A_ROL[data.especialidad] || data.especialidad;
        const rolPorEspecialidad = await tx.rol.findFirst({
          where: { nombre: nombreRol },
        });
        if (rolPorEspecialidad) {
          usuarioUpdateData.rolId = rolPorEspecialidad.id;
        }
      }

      if (Object.keys(usuarioUpdateData).length > 0) {
        await tx.usuario.update({
          where: { id: emp.usuarioId },
          data: usuarioUpdateData,
        });
      }
    }

    return formatEmployee(emp);
  });
};

// Soft delete
const deactivate = async (id) => {
  return prisma.$transaction(async (tx) => {
    const empleado = await tx.empleado.update({
      where: { id: Number(id) },
      data:  { estado: "Inactivo" },
    });

    // Sincronizar estado con el Usuario relacionado
    if (empleado.usuarioId) {
      await tx.usuario.update({
        where: { id: empleado.usuarioId },
        data:  { estado: "Inactivo" },
      });
    }

    return empleado;
  });
};

module.exports = { getAll, getById, create, update, deactivate, formatEmployee };