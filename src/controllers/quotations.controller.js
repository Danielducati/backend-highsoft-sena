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
    const { id_cliente, fecha, hora_inicio, notas, descuento, servicios, clienteOcasional } = req.body;

    // Requiere cliente registrado O datos de cliente ocasional
    if (!id_cliente && !clienteOcasional?.firstName) {
      return res.status(400).json({ error: "El cliente es obligatorio" });
    }
    if (id_cliente && isNaN(Number(id_cliente))) {
      return res.status(400).json({ error: "ID de cliente inválido" });
    }

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

    // Validar que la fecha no sea en el pasado
    if (fecha) {
      const fechaCotizacion = new Date(fecha + "T00:00:00");
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fechaCotizacion < hoy)
        return res.status(400).json({ error: "La fecha de la cotización no puede ser en el pasado" });
    }

    if (hora_inicio && !/^\d{2}:\d{2}$/.test(hora_inicio))
      return res.status(400).json({ error: "La hora debe tener formato HH:MM" });

    if (descuento !== undefined && (isNaN(Number(descuento)) || Number(descuento) < 0))
      return res.status(400).json({ error: "El descuento debe ser un número mayor o igual a 0" });

    const id = await quotationsModel.create({
      clienteId:      id_cliente ? Number(id_cliente) : null,
      clienteOcasional: clienteOcasional ?? null,
      fecha,
      horaInicio: hora_inicio,
      notas:      notas ?? null,
      descuento:  descuento ?? 0,
      servicios,  // cada item puede traer empleado_id
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

    // Validar que la fecha no sea en el pasado (solo si se proporciona una nueva fecha)
    if (fecha) {
      const fechaCotizacion = new Date(fecha + "T00:00:00");
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fechaCotizacion < hoy)
        return res.status(400).json({ error: "La fecha de la cotización no puede ser en el pasado" });
    }

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
          const citaExistente = await prisma.agendamientoCita.findFirst({
            where: { cotizacionId: id }
          });

          if (!citaExistente) {
            // Decodificar empleados guardados en notas
            const { empleadosMap } = (() => {
              const raw = cotizacion.notas ?? "";
              const idx = raw.indexOf("__EMPLEADOS__:");
              if (idx === -1) return { empleadosMap: {} };
              try { return { empleadosMap: JSON.parse(raw.slice(idx + "__EMPLEADOS__:".length)) }; }
              catch { return { empleadosMap: {} }; }
            })();

            const cita = await prisma.agendamientoCita.create({
              data: {
                clienteId:    cotizacion.clienteId ?? null,
                cotizacionId: cotizacion.id,
                fecha:        cotizacion.fecha,
                horario:      cotizacion.horaInicio ?? null,
                estado:       "Pendiente",
                notas:        null,
              }
            });

            for (const detalle of cotizacion.detalles) {
              // Usar empleado guardado en la cotización, si existe
              let empleadoAsignado = empleadosMap[detalle.servicioId]
                ? Number(empleadosMap[detalle.servicioId])
                : null;

              // Si no hay empleado guardado, buscar uno disponible automáticamente
              if (!empleadoAsignado) {
                try {
                  const empleadosDelServicio = await prisma.empleadoServicio.findMany({
                    where: { servicioId: detalle.servicioId },
                    include: { empleado: true }
                  });

                  const horaInicio = cotizacion.horaInicio ? new Date(cotizacion.horaInicio) : null;
                  const duracion   = detalle.servicio?.duracion ?? 60;

                  for (const es of empleadosDelServicio) {
                    if (es.empleado.estado !== "Activo") continue;
                    if (horaInicio && cotizacion.fecha) {
                      const nuevaFin = new Date(horaInicio.getTime() + duracion * 60000);
                      const citasSolapadas = await prisma.agendamientoCita.findMany({
                        where: { fecha: cotizacion.fecha, estado: { not: "Cancelada" }, detalles: { some: { empleadoId: es.empleadoId } } },
                        include: { detalles: { where: { empleadoId: es.empleadoId }, include: { servicio: true } } }
                      });
                      let disponible = true;
                      for (const c of citasSolapadas) {
                        const h = new Date(c.horario);
                        const ini = new Date(`1970-01-01T${String(h.getUTCHours()).padStart(2,"0")}:${String(h.getUTCMinutes()).padStart(2,"0")}:00`);
                        for (const d of c.detalles) {
                          const fin = new Date(ini.getTime() + (d.servicio?.duracion ?? 60) * 60000);
                          if (horaInicio < fin && nuevaFin > ini) { disponible = false; break; }
                        }
                        if (!disponible) break;
                      }
                      if (disponible) { empleadoAsignado = es.empleadoId; break; }
                    } else {
                      empleadoAsignado = es.empleadoId;
                      break;
                    }
                  }
                } catch (empErr) {
                  // No se pudo asignar empleado automáticamente, continuar sin asignación
                }
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
        // Error al crear cita automática, la cotización ya fue aprobada exitosamente
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