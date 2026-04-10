// src/controllers/quotations.controller.js
const quotationsModel = require("../models/quotations");
const prisma = require("../config/prisma");

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

    // Al aprobar, crear cita automáticamente si no existe ya una
    if (estado === "approved") {
      try {
        const cotizacion = await prisma.cotizacion.findUnique({
          where: { id },
          include: { detalles: { include: { servicio: true } } }
        });

        if (cotizacion && cotizacion.fecha) {
          // Verificar que no exista ya una cita para esta cotización
          const citaExistente = await prisma.agendamientoCita.findFirst({
            where: { cotizacionId: id }
          });

          if (!citaExistente) {
            const cita = await prisma.agendamientoCita.create({
              data: {
                clienteId:    cotizacion.clienteId ?? null,
                cotizacionId: cotizacion.id,
                fecha:        cotizacion.fecha,
                horario:      cotizacion.horaInicio ?? null,
                estado:       "Pendiente",
                notas:        cotizacion.notas ?? null,
              }
            });

            // Para cada servicio, buscar un empleado disponible automáticamente
            for (const detalle of cotizacion.detalles) {
              let empleadoAsignado = null;

              try {
                // Empleados que pueden realizar este servicio
                const empleadosDelServicio = await prisma.empleadoServicio.findMany({
                  where: { servicioId: detalle.servicioId },
                  include: { empleado: true }
                });

                const horaInicio = cotizacion.horaInicio
                  ? new Date(cotizacion.horaInicio)
                  : null;
                const duracion = detalle.servicio?.duracion ?? 60;

                for (const es of empleadosDelServicio) {
                  if (es.empleado.estado !== "Activo") continue;

                  // Verificar que no tenga citas solapadas ese día
                  if (horaInicio && cotizacion.fecha) {
                    const nuevaFin = new Date(horaInicio.getTime() + duracion * 60000);

                    const citasSolapadas = await prisma.agendamientoCita.findMany({
                      where: {
                        fecha:  cotizacion.fecha,
                        estado: { not: "Cancelada" },
                        detalles: { some: { empleadoId: es.empleadoId } }
                      },
                      include: {
                        detalles: {
                          where:   { empleadoId: es.empleadoId },
                          include: { servicio: true }
                        }
                      }
                    });

                    let disponible = true;
                    for (const c of citasSolapadas) {
                      const h = new Date(c.horario);
                      const inicioExistente = new Date(`1970-01-01T${String(h.getUTCHours()).padStart(2,"0")}:${String(h.getUTCMinutes()).padStart(2,"0")}:00`);
                      for (const d of c.detalles) {
                        const finExistente = new Date(inicioExistente.getTime() + (d.servicio?.duracion ?? 60) * 60000);
                        if (horaInicio < finExistente && nuevaFin > inicioExistente) {
                          disponible = false;
                          break;
                        }
                      }
                      if (!disponible) break;
                    }

                    if (disponible) { empleadoAsignado = es.empleadoId; break; }
                  } else {
                    // Sin hora definida, asignar el primero activo
                    empleadoAsignado = es.empleadoId;
                    break;
                  }
                }
              } catch (empErr) {
                console.warn("⚠️ No se pudo asignar empleado para servicio", detalle.servicioId, empErr.message);
              }

              await prisma.agendamientoDetalle.create({
                data: {
                  citaId:     cita.id,
                  servicioId: detalle.servicioId,
                  empleadoId: empleadoAsignado,
                  precio:     detalle.precio ?? 0,
                }
              });
            }
          }
        }
      } catch (citaErr) {
        // No fallar si la cita no se pudo crear — solo loguear
        console.error("⚠️ No se pudo crear la cita automática:", citaErr.message);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Cotización no encontrada" });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getOne, create, update, updateEstado };