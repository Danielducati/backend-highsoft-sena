// src/controllers/clients.controller.js
const clientsModel = require("../models/clients");
const prisma       = require("../config/prisma");

const getAll = async (req, res) => {
  try {
    const soloActivos = req.query.all !== "true";
    res.json(await clientsModel.getAll({ soloActivos }));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// Devuelve el perfil del cliente logueado (sin necesitar permiso clientes.ver)
const getMiPerfil = async (req, res) => {
  try {
    let cliente = await prisma.cliente.findFirst({
      where: { fk_id_usuario: req.usuario.id },
    });

    // Si no existe, crearlo automáticamente con datos básicos del usuario
    if (!cliente) {
      const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
      if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

      cliente = await prisma.cliente.create({
        data: {
          nombre:           usuario.correo.split("@")[0],
          apellido:         "",
          tipo_documento:   null,
          numero_documento: null,
          correo:           usuario.correo,
          telefono:         null,
          direccion:        null,
          foto_perfil:      "",
          Estado:           "Activo",
          fk_id_usuario:    usuario.id,
        },
      });
    }

    res.json(cliente);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getOne = async (req, res) => {
  try {
    const data = await clientsModel.getById(req.params.id);
    if (!data) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const create = async (req, res) => {
  try {
    const { firstName, lastName, documentType, document, email, phone, address, image, contrasena } = req.body;

    if (!firstName || !lastName || !email)
      return res.status(400).json({ error: "Nombre, apellido y correo son requeridos" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ error: "El correo no tiene un formato válido" });

    const data = await clientsModel.create({ firstName, lastName, documentType, document, email, phone, address, image, contrasena });
    res.status(201).json(data);
  } catch (err) {
    if (err.message?.includes("ya existe"))
      return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const updated = await clientsModel.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    if (err.message?.toLowerCase().includes("ya existe"))
      return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

const setStatus = async (req, res) => {
  try {
    await clientsModel.setStatus(req.params.id, req.body.isActive);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const cliente = await prisma.cliente.findUnique({ where: { PK_id_cliente: id } });
    await prisma.$transaction(async (tx) => {
      // Desasociar relaciones antes de borrar
      await tx.agendamientoCita.updateMany({
        where: { clienteId: id },
        data:  { clienteId: null },
      });
      await tx.cotizacion.updateMany({
        where: { clienteId: id },
        data:  { clienteId: null },
      });
      await tx.venta.updateMany({
        where: { FK_id_cliente: id },
        data:  { FK_id_cliente: null },
      });
      await tx.cliente.delete({ where: { PK_id_cliente: id } });
      if (cliente?.fk_id_usuario) {
        await tx.resetPasswordToken.deleteMany({ where: { usuarioId: cliente.fk_id_usuario } });
        await tx.usuario.delete({ where: { id: cliente.fk_id_usuario } });
      }
    });

    res.json({ mensaje: "Cliente eliminado exitosamente" });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Cliente no encontrado" });
    res.status(500).json({ error: err.message });
  }
};

// Lista ligera de clientes activos para uso en citas/cotizaciones (sin permiso clientes.ver)
const getParaCitas = async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      where: { Estado: "Activo" },
      select: {
        PK_id_cliente: true,
        nombre:        true,
        apellido:      true,
        correo:        true,
        telefono:      true,
      },
      orderBy: { nombre: "asc" },
    });
    res.json(clientes.map(c => ({
      id:       c.PK_id_cliente,
      nombre:   c.nombre,
      apellido: c.apellido,
      name:     `${c.nombre} ${c.apellido}`.trim(),
      correo:   c.correo   ?? "",
      telefono: c.telefono ?? "",
      phone:    c.telefono ?? "",
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getAll, getMiPerfil, getParaCitas, getOne, create, update, setStatus, remove };