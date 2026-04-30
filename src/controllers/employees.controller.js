// src/controllers/employees.controller.js
const employeesModel = require("../models/employees");
const prisma = require("../config/prisma");

// ======================================================
// GET MI PERFIL (empleado logueado)
// ======================================================
const getMiPerfil = async (req, res) => {
  try {
    const emp = await prisma.empleado.findFirst({
      where: { usuarioId: req.usuario.id },
    });
    if (!emp) return res.status(404).json({ error: "Perfil de empleado no encontrado" });
    res.json(employeesModel.formatEmployee(emp));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// UPDATE MI PERFIL (empleado logueado actualiza su propio perfil)
// ======================================================
const updateMiPerfil = async (req, res) => {
  try {
    const emp = await prisma.empleado.findFirst({
      where: { usuarioId: req.usuario.id },
    });
    if (!emp) return res.status(404).json({ error: "Perfil de empleado no encontrado" });

    const {
      nombre, apellido, tipo_documento, numero_documento,
      telefono, ciudad, especialidad, direccion, foto_perfil,
    } = req.body;

    const data = {};
    if (nombre          !== undefined) data.nombre          = nombre;
    if (apellido        !== undefined) data.apellido        = apellido;
    if (tipo_documento  !== undefined) data.tipoDocumento   = tipo_documento;
    if (numero_documento !== undefined) data.numeroDocumento = numero_documento;
    if (telefono        !== undefined) data.telefono        = telefono;
    if (ciudad          !== undefined) data.ciudad          = ciudad;
    if (especialidad    !== undefined) data.especialidad    = especialidad;
    if (direccion       !== undefined) data.direccion       = direccion;
    if (foto_perfil     !== undefined) data.fotoPerfil      = foto_perfil;

    const updated = await prisma.empleado.update({
      where: { id: emp.id },
      data,
    });

    res.json(employeesModel.formatEmployee(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// GET DISPONIBLES (empleados con horario en una fecha)
// ======================================================
const getDisponibles = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha || isNaN(Date.parse(fecha))) {
      return res.status(400).json({ error: "Parámetro 'fecha' inválido (YYYY-MM-DD)" });
    }

    // Fecha con Date.UTC para coincidir con cómo SQL Server guarda y Prisma lee las fechas @db.Date
    const [y, m, d] = fecha.split("-").map(Number);
    const fechaLocal = new Date(Date.UTC(y, m - 1, d));

    // Empleados que tienen al menos un horario registrado en esa fecha
    const horarios = await prisma.horario.findMany({
      where: { fecha: fechaLocal },
      include: { empleado: true },
    });

    const COLORS = ["#78D1BD","#A78BFA","#60A5FA","#FBBF24","#F87171","#34D399","#FB923C","#E879F9"];

    // Deduplicar por empleado y filtrar activos
    const seen = new Set();
    const empleados = [];
    horarios.forEach((h, idx) => {
      if (!h.empleado || h.empleado.estado !== "Activo") return;
      if (seen.has(h.empleadoId)) return;
      seen.add(h.empleadoId);
      empleados.push({
        id:        String(h.empleado.id),
        name:      `${h.empleado.nombre} ${h.empleado.apellido}`,
        specialty: h.empleado.especialidad ?? "",
        color:     COLORS[idx % COLORS.length],
        isActive:  true,
        // Rango de horario del día
        horaInicio: h.horaInicio.toISOString().slice(11, 16),
        horaFinal:  h.horaFinal.toISOString().slice(11, 16),
      });
    });

    res.json(empleados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// GET MIS SERVICIOS (servicios asignados al empleado logueado)
// ======================================================
const getMisServicios = async (req, res) => {
  try {
    const emp = await prisma.empleado.findFirst({
      where: { usuarioId: req.usuario.id },
      select: { id: true, especialidad: true },
    });
    if (!emp) return res.status(404).json({ error: "Perfil de empleado no encontrado" });

    // Primero intentar con EmpleadoServicio (relación explícita)
    const relaciones = await prisma.empleadoServicio.findMany({
      where: { empleadoId: emp.id },
      include: { servicio: { include: { categoria: true } } },
    });

    if (relaciones.length > 0) {
      const activos = relaciones
        .filter(r => r.servicio?.estado === "Activo")
        .map(r => ({
          id:       String(r.servicio.id),
          name:     r.servicio.nombre,
          category: r.servicio.categoria?.nombre ?? "",
          duration: r.servicio.duracion ?? 60,
          price:    r.servicio.precio ? Number(r.servicio.precio) : 0,
        }));
      if (activos.length > 0) return res.json(activos);
      // Si todas las relaciones apuntan a servicios inactivos, caer al fallback
    }

    // Fallback: filtrar por especialidad si no hay relaciones explícitas
    if (emp.especialidad) {
      const servicios = await prisma.servicio.findMany({
        where: {
          estado:    "Activo",
          categoria: { nombre: emp.especialidad },
        },
        include: { categoria: true },
      });
      if (servicios.length > 0) {
        return res.json(servicios.map(s => ({
          id:       String(s.id),
          name:     s.nombre,
          category: s.categoria?.nombre ?? "",
          duration: s.duracion ?? 60,
          price:    s.precio ? Number(s.precio) : 0,
        })));
      }
    }

    // Sin relaciones ni especialidad coincidente → todos los servicios activos
    const todos = await prisma.servicio.findMany({
      where: { estado: "Activo" },
      include: { categoria: true },
    });
    res.json(todos.map(s => ({
      id:       String(s.id),
      name:     s.nombre,
      category: s.categoria?.nombre ?? "",
      duration: s.duracion ?? 60,
      price:    s.precio ? Number(s.precio) : 0,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// GET ALL
// ======================================================
const getAll = async (req, res) => {
  try {
    const soloActivos = req.query.all !== "true";
    const data = await employeesModel.getAll({ soloActivos });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// GET ONE
// ======================================================
const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const data = await employeesModel.getById(id);
    if (!data)
      return res.status(404).json({ error: "Empleado no encontrado" });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// CREATE
// ======================================================
const create = async (req, res) => {
  try {
    const {
      nombre, apellido, tipo_documento, numero_documento, correo,
      telefono, ciudad, especialidad, direccion, foto_perfil,
      contrasena, id_rol
    } = req.body;

    // VALIDACIONES
    if (!nombre?.trim())
      return res.status(400).json({ error: "El nombre es obligatorio" });

    if (!apellido?.trim())
      return res.status(400).json({ error: "El apellido es obligatorio" });

    if (!correo?.trim())
      return res.status(400).json({ error: "El correo es obligatorio" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo))
      return res.status(400).json({ error: "Correo inválido" });

    if (telefono && !/^\d{7,15}$/.test(telefono.replace(/\s/g, "")))
      return res.status(400).json({ error: "Teléfono inválido" });

    const TIPOS_DOC = ["CC", "CE", "TI", "Pasaporte", "NIT"];
    if (tipo_documento && !TIPOS_DOC.includes(tipo_documento))
      return res.status(400).json({ error: "Tipo de documento inválido" });

    if (!tipo_documento?.trim())
      return res.status(400).json({ error: "El tipo de documento es obligatorio" });
    
    if (!numero_documento?.trim())
      return res.status(400).json({ error: "El número de documento es obligatorio" });

    const data = {
      nombre:    nombre.trim(),
      apellido:  apellido.trim(),
      correo:    correo.trim().toLowerCase(),
      contrasena: contrasena?.trim() || "empleado123",
      idRol:     id_rol ?? 2,
      estado:    "Activo",
    };

    if (tipo_documento)   data.tipoDocumento   = tipo_documento;
    if (numero_documento) data.numeroDocumento = numero_documento;
    if (telefono)         data.telefono        = telefono;
    if (ciudad)           data.ciudad          = ciudad;
    if (especialidad)     data.especialidad    = especialidad;
    if (direccion)        data.direccion       = direccion;
    if (foto_perfil)      data.fotoPerfil      = foto_perfil;

    const nuevo = await employeesModel.create(data);

    res.status(201).json({
      mensaje: "Empleado creado exitosamente",
      id: nuevo.id,
      contrasenaUsada: contrasena?.trim() ? "personalizada" : "empleado123",
    });

  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({ error: "El correo ya existe" });
    if (err.message?.toLowerCase().includes("ya existe"))
      return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// UPDATE
// ======================================================
const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const existing = await prisma.empleado.findUnique({ where: { id } });

    if (!existing)
      return res.status(404).json({ error: "Empleado no encontrado" });

    // 🔥 destructuring correcto
    const {
      nombre, apellido, tipo_documento, numero_documento, correo,
      telefono, ciudad, especialidad, direccion, foto_perfil,
      Estado, estado
    } = req.body;

    const estadoFinal = Estado ?? estado;

    // 🔥 detectar si solo cambia estado
    const soloCambiaEstado =
      Object.keys(req.body).length === 1 && estadoFinal !== undefined;

    // 🔴 bloquear edición si está inactivo
    if (existing.estado === "Inactivo" && !soloCambiaEstado) {
      return res.status(400).json({
        error: "No se puede editar un empleado inactivo"
      });
    }

    // VALIDACIONES
    if (nombre !== undefined && !nombre.trim())
      return res.status(400).json({ error: "Nombre vacío" });

    if (apellido !== undefined && !apellido.trim())
      return res.status(400).json({ error: "Apellido vacío" });

    if (correo !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo))
        return res.status(400).json({ error: "Correo inválido" });
    }

    if (telefono && !/^\d{7,15}$/.test(telefono.replace(/\s/g, "")))
      return res.status(400).json({ error: "Teléfono inválido" });

    const ESTADOS_VALIDOS = ["Activo", "Inactivo"];
    if (estadoFinal && !ESTADOS_VALIDOS.includes(estadoFinal))
      return res.status(400).json({ error: "Estado inválido" });

    // Validar duplicado de número de documento (excluyendo al empleado actual)
    if (numero_documento !== undefined && numero_documento !== null && String(numero_documento).trim() !== "") {
      const docDuplicate = await prisma.empleado.findFirst({
        where: {
          numeroDocumento: String(numero_documento).trim(),
          id: { not: id },
        },
      });
      if (docDuplicate) {
        return res.status(409).json({ error: "Ya existe un empleado con ese número de documento" });
      }
    }

    const data = {};

    if (nombre !== undefined) data.nombre = nombre.trim();
    if (apellido !== undefined) data.apellido = apellido.trim();
    if (tipo_documento !== undefined) data.tipoDocumento = tipo_documento;
    if (numero_documento !== undefined) data.numeroDocumento = numero_documento;
    // El correo no se actualiza en Empleado para evitar inconsistencias con la tabla Usuarios
    if (telefono !== undefined) data.telefono = telefono;
    if (ciudad !== undefined) data.ciudad = ciudad;
    if (especialidad !== undefined) data.especialidad = especialidad;
    if (direccion !== undefined) data.direccion = direccion;
    if (foto_perfil !== undefined) data.fotoPerfil = foto_perfil;

    if (estadoFinal !== undefined) data.estado = estadoFinal;

    await employeesModel.update(id, data);

    res.json({ mensaje: "Empleado actualizado exitosamente" });

  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Empleado no encontrado" });
    if (err.code === "P2002")
      return res.status(409).json({ error: "El correo ya existe" });
    if (err.message?.toLowerCase().includes("ya existe"))
      return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// DELETE (SOFT DELETE)
// ======================================================
const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const existing = await prisma.empleado.findUnique({ where: { id } });

    if (!existing)
      return res.status(404).json({ error: "Empleado no encontrado" });

    if (existing.estado === "Inactivo") {
      return res.status(400).json({
        error: "El empleado ya está inactivo"
      });
    }

    // SOFT DELETE (MEJOR PRÁCTICA)
    await prisma.empleado.update({
      where: { id },
      data: { estado: "Inactivo" }
    });

    res.json({ mensaje: "Empleado desactivado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// RESET PASSWORD (admin resetea la contraseña de un empleado)
// ======================================================
const resetPassword = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const { nuevaContrasena } = req.body;
    if (!nuevaContrasena?.trim() || nuevaContrasena.trim().length < 6)
      return res.status(400).json({ error: "La contraseña debe tener mínimo 6 caracteres" });

    // Buscar el usuario vinculado al empleado
    const empleado = await prisma.empleado.findUnique({
      where: { id },
      include: { usuario: true },
    });

    if (!empleado)
      return res.status(404).json({ error: "Empleado no encontrado" });

    const bcrypt = require("bcryptjs");
    const hashed = await bcrypt.hash(nuevaContrasena.trim(), 10);

    await prisma.usuario.update({
      where: { id: empleado.usuarioId },
      data:  { contrasena: hashed },
    });

    res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getOne, getMiPerfil, updateMiPerfil, getMisServicios, getDisponibles, create, update, remove, resetPassword };