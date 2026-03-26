// src/controllers/quotations.controller.js
const quotationsModel = require("../models/quotations");

const getAll = async (req, res) => {
  try {
    res.json(await quotationsModel.getAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const data = await quotationsModel.getById(id);
    if (!data) return res.status(404).json({ error: "Cotización no encontrada" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { id_cliente, fecha, hora_inicio, notas, descuento, servicios } = req.body;

    if (!id_cliente || isNaN(Number(id_cliente)))
      return res.status(400).json({ error: "El cliente es obligatorio y debe ser válido" });

    if (!servicios || !Array.isArray(servicios) || servicios.length === 0)
      return res.status(400).json({ error: "Debe incluir al menos un servicio" });

    // Validar cada servicio
    for (const [i, sv] of servicios.entries()) {
      if (!sv.id_servicio || isNaN(Number(sv.id_servicio)))
        return res.status(400).json({ error: `Servicio ${i + 1}: id_servicio es obligatorio` });
      if (!sv.precio || isNaN(Number(sv.precio)) || Number(sv.precio) <= 0)
        return res.status(400).json({ error: `Servicio ${i + 1}: precio debe ser mayor a 0` });
      if (!sv.cantidad || isNaN(Number(sv.cantidad)) || Number(sv.cantidad) <= 0)
        return res.status(400).json({ error: `Servicio ${i + 1}: cantidad debe ser mayor a 0` });
    }

    if (fecha && isNaN(Date.parse(fecha)))
      return res.status(400).json({ error: "La fecha no tiene un formato válido (YYYY-MM-DD)" });

    if (hora_inicio && !/^\d{2}:\d{2}$/.test(hora_inicio))
      return res.status(400).json({ error: "La hora debe tener formato HH:MM" });

    if (descuento !== undefined && (isNaN(Number(descuento)) || Number(descuento) < 0))
      return res.status(400).json({ error: "El descuento debe ser un número mayor o igual a 0" });

    const id = await quotationsModel.create({
      clienteId:  Number(id_cliente),
      fecha,
      horaInicio: hora_inicio,
      notas:      notas ?? null,
      descuento:  descuento ?? 0,
      servicios,
    });

    res.status(201).json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const { id_cliente, fecha, hora_inicio, notas, descuento, servicios } = req.body;

    if (!servicios || !Array.isArray(servicios) || servicios.length === 0)
      return res.status(400).json({ error: "Debe incluir al menos un servicio" });

    for (const [i, sv] of servicios.entries()) {
      if (!sv.id_servicio && !sv.serviceId)
        return res.status(400).json({ error: `Servicio ${i + 1}: id_servicio es obligatorio` });
      const precio = sv.precio ?? sv.price;
      if (!precio || isNaN(Number(precio)) || Number(precio) <= 0)
        return res.status(400).json({ error: `Servicio ${i + 1}: precio debe ser mayor a 0` });
    }

    if (fecha && isNaN(Date.parse(fecha)))
      return res.status(400).json({ error: "La fecha no tiene un formato válido (YYYY-MM-DD)" });

    if (hora_inicio && !/^\d{2}:\d{2}$/.test(hora_inicio))
      return res.status(400).json({ error: "La hora debe tener formato HH:MM" });

    if (descuento !== undefined && (isNaN(Number(descuento)) || Number(descuento) < 0))
      return res.status(400).json({ error: "El descuento debe ser un número mayor o igual a 0" });

    await quotationsModel.update(id, {
      clienteId:  id_cliente ? Number(id_cliente) : undefined,
      fecha,
      horaInicio: hora_inicio,
      notas:      notas ?? null,
      descuento:  descuento ?? 0,
      servicios,
    });

    res.json({ ok: true });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Cotización no encontrada" });
    res.status(500).json({ error: err.message });
  }
};

const updateEstado = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id))
      return res.status(400).json({ error: "ID inválido" });

    const { estado } = req.body;
    if (!estado) return res.status(400).json({ error: "El estado es requerido" });

    const ESTADOS_VALIDOS = ["pending", "approved", "rejected", "cancelled", "expired"];
    if (!ESTADOS_VALIDOS.includes(estado))
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` });

    await quotationsModel.updateEstado(id, estado);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Cotización no encontrada" });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getOne, create, update, updateEstado };