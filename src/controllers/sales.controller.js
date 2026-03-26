// src/controllers/sales.controller.js
const salesModel = require("../models/sales");

const getAll = async (req, res) => {
  try {
    res.json(await salesModel.getAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const data = await salesModel.getById(id);
    if (!data) return res.status(404).json({ error: "Venta no encontrada" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAvailableAppointments = async (req, res) => {
  try {
    res.json(await salesModel.getAvailableAppointments());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const {
      tipo,
      clienteId,
      clienteNombre,
      citaId,     id_cita,
      servicios,
      descuento,
      metodoPago, metodo_pago,
    } = req.body;

    const TIPOS_VALIDOS = ["directo", "cita"];
    if (!tipo || !TIPOS_VALIDOS.includes(tipo))
      return res.status(400).json({ error: `El tipo es obligatorio. Valores permitidos: ${TIPOS_VALIDOS.join(", ")}` });

    const citaIdFinal = citaId ?? id_cita;
    const metodoPagoFinal = metodoPago ?? metodo_pago;

    // Si es por cita, debe tener citaId
    if (tipo === "cita" && !citaIdFinal)
      return res.status(400).json({ error: "Para ventas por cita, citaId es obligatorio" });

    // Si es directo, debe tener servicios
    if (tipo === "directo") {
      if (!servicios || !Array.isArray(servicios) || servicios.length === 0)
        return res.status(400).json({ error: "Para ventas directas, debe incluir al menos un servicio" });

      for (const [i, item] of servicios.entries()) {
        if (!item.id || isNaN(Number(item.id)))
          return res.status(400).json({ error: `Servicio ${i + 1}: id es obligatorio` });
        if (!item.precio || isNaN(Number(item.precio)) || Number(item.precio) <= 0)
          return res.status(400).json({ error: `Servicio ${i + 1}: precio debe ser mayor a 0` });
      }
    }

    if (descuento !== undefined && (isNaN(Number(descuento)) || Number(descuento) < 0))
      return res.status(400).json({ error: "El descuento debe ser un número mayor o igual a 0" });

    const METODOS_PAGO = ["efectivo", "tarjeta", "transferencia", "nequi", "daviplata"];
    if (metodoPagoFinal && !METODOS_PAGO.includes(metodoPagoFinal.toLowerCase()))
      return res.status(400).json({ error: `Método de pago inválido. Valores permitidos: ${METODOS_PAGO.join(", ")}` });

    const id = await salesModel.create({
      tipo,
      clienteId,
      clienteNombre,
      citaId:     citaIdFinal,
      servicios,
      descuento:  descuento  ?? 0,
      metodoPago: metodoPagoFinal ?? null,
    });

    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error("Error crear venta:", err);
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    await salesModel.remove(id);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Venta no encontrada" });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getOne, getAvailableAppointments, create, remove };