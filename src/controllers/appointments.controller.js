// src/controllers/appointments.controller.js
const appointmentsModel = require("../models/appointments");
const prisma            = require("../config/prisma");

const getAll = async (req, res) => {
  try { res.json(await appointmentsModel.getAll()); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

const getOne = async (req, res) => {
  try {
    const data = await appointmentsModel.getById(req.params.id);
    if (!data) return res.status(404).json({ error: "Cita no encontrada" });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const create = async (req, res) => {
  try {
    const { cliente, fecha, hora, notas, servicios } = req.body;
    if (!fecha || !hora || !Array.isArray(servicios) || servicios.length === 0)
      return res.status(400).json({ error: "fecha, hora y servicios son requeridos" });
    const hoyStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    if (fecha < hoyStr)
  return res.status(400).json({ error: "No se pueden crear citas en fechas pasadas" });
    const id = await appointmentsModel.create({ cliente, fecha, hora, notas, servicios });
    res.status(201).json({ ok: true, PK_id_cita: id });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const update = async (req, res) => {
  try {
    await appointmentsModel.update(req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const updateStatus = async (req, res) => {
  try {
    await appointmentsModel.updateStatus(req.params.id, req.body.status);
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const cancel = async (req, res) => {
  try {
    await appointmentsModel.updateStatus(req.params.id, "cancelled");
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID invalido" });

    // Verificar que la cita existe y su estado
    const cita = await prisma.agendamientoCita.findUnique({ where: { id } });
    if (!cita)
      return res.status(404).json({ error: "Cita no encontrada" });

    // Bloquear eliminacion segun estado
    if (cita.estado === "Completada")
      return res.status(400).json({
        error: "No se puede eliminar una cita completada. Ya fue facturada.",
      });

    if (cita.estado === "Cancelada")
      return res.status(400).json({
        error: "No se puede eliminar una cita cancelada. Solo se pueden eliminar citas pendientes.",
      });

    // Verificar ventas — usar FK_id_cita que es el nombre real en el schema
    const ventas = await prisma.venta.count({ where: { FK_id_cita: id } });
    if (ventas > 0)
      return res.status(400).json({
        error: `No se puede eliminar. La cita tiene ${ventas} venta(s) asociada(s)`,
      });

    await appointmentsModel.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getOne, create, update, updateStatus, cancel, remove };