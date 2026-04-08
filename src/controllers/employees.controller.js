// src/controllers/employees.controller.js
const employeesModel = require("../models/employees");
const prisma = require("../config/prisma");

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
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      correo: correo.trim().toLowerCase(),
      estado: "Activo", // 🔥 SIEMPRE inicia activo
    };

    if (tipo_documento) data.tipoDocumento = tipo_documento;
    if (numero_documento) data.numeroDocumento = numero_documento;
    if (telefono) data.telefono = telefono;
    if (ciudad) data.ciudad = ciudad;
    if (especialidad) data.especialidad = especialidad;
    if (direccion) data.direccion = direccion;
    if (foto_perfil) data.fotoPerfil = foto_perfil;

    const nuevo = await employeesModel.create(data);

    res.status(201).json({
      mensaje: "Empleado creado exitosamente",
      id: nuevo.id
    });

  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({ error: "El correo ya existe" });

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

    const data = {};

    if (nombre !== undefined) data.nombre = nombre.trim();
    if (apellido !== undefined) data.apellido = apellido.trim();
    if (tipo_documento !== undefined) data.tipoDocumento = tipo_documento;
    if (numero_documento !== undefined) data.numeroDocumento = numero_documento;
    if (correo !== undefined) data.correo = correo.trim().toLowerCase();
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

module.exports = { getAll, getOne, create, update, remove };