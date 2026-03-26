// src/controllers/clients.controller.js
const clientsModel = require("../models/clients");
const prisma       = require("../config/prisma");

const getAll = async (req, res) => {
  try {
    const soloActivos = req.query.all !== "true";
    res.json(await clientsModel.getAll({ soloActivos }));
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
    const { firstName, lastName, documentType, document, email, phone, address, image } = req.body;

    if (!firstName || !lastName || !email)
      return res.status(400).json({ error: "Nombre, apellido y correo son requeridos" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ error: "El correo no tiene un formato válido" });

    const data = await clientsModel.create({ firstName, lastName, documentType, document, email, phone, address, image });
    res.status(201).json(data);
  } catch (err) {
    if (err.message?.includes("ya existe"))
      return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    await clientsModel.update(req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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

    // Verificar asociaciones
    const [citas, cotizaciones, ventas] = await Promise.all([
      prisma.agendamientoCita.count({ where: { clienteId: id } }),
      prisma.cotizacion.count({ where: { clienteId: id } }),
      prisma.venta.count({ where: { FK_id_cliente: id } }),
    ]);

    console.log("Asociaciones cliente", id, ":", { citas, cotizaciones, ventas });

    const total = citas + cotizaciones + ventas;

    if (total > 0)
      return res.status(400).json({
        error: `No se puede eliminar. El cliente tiene ${total} registro(s) asociado(s)`,
      });

    const cliente = await prisma.cliente.findUnique({ where: { PK_id_cliente: id } });
    await prisma.$transaction(async (tx) => {
      await tx.cliente.delete({ where: { PK_id_cliente: id } });
      if (cliente?.fk_id_usuario)
        await tx.usuario.delete({ where: { id: cliente.fk_id_usuario } });
    });

    res.json({ mensaje: "Cliente eliminado exitosamente" });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Cliente no encontrado" });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getOne, create, update, setStatus, remove };