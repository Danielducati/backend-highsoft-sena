// src/controllers/quotations.controller.js
const quotationsModel = require("../models/quotations");
const prisma = require("../config/prisma");

const getAll = async (req, res) => {
  try {
    // Ejecutar auto-rechazo de cotizaciones vencidas antes de obtener la lista
    await quotationsModel.autoRejectExpired();
    
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

    // Verificar que la cotización existe y obtener su estado actual
    const cotizacionActual = await prisma.cotizacion.findUnique({
      where: { id },
    });

    if (!cotizacionActual) {
      return res.status(404).json({ error: "Cotización no encontrada" });
    }

    // No permitir editar cotizaciones aprobadas
    if (cotizacionActual.estado === "Aprobada") {
      return res.status(400).json({ 
        error: "No se pueden editar cotizaciones aprobadas. La cotización ya ha sido procesada y tiene una cita asociada." 
      });
    }

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

    // Si el usuario es cliente, verificar que la cotización le pertenece
    // y que solo puede aprobar o cancelar
    const rolUsuario = req.usuario?.rol?.toLowerCase();
    const esCliente  = rolUsuario === "cliente";

    if (esCliente) {
      if (!["approved", "cancelled"].includes(estado))
        return res.status(403).json({ error: "Los clientes solo pueden aprobar o cancelar cotizaciones" });

      const cotizacionCheck = await prisma.cotizacion.findUnique({ where: { id } });
      if (!cotizacionCheck)
        return res.status(404).json({ error: "Cotización no encontrada" });

      // Verificar que el cliente autenticado es dueño de la cotización
      const clienteDelUsuario = await prisma.cliente.findFirst({
        where: { fk_id_usuario: req.usuario.id },
      });
      if (!clienteDelUsuario || cotizacionCheck.clienteId !== clienteDelUsuario.PK_id_cliente)
        return res.status(403).json({ error: "No tienes permiso para modificar esta cotización" });

      if (cotizacionCheck.estado !== "Pendiente")
        return res.status(400).json({ error: "Solo se pueden aprobar cotizaciones en estado Pendiente" });
    }

    await quotationsModel.updateEstado(id, estado);

    // Al aprobar, crear cita automáticamente si no existe ya una
    if (estado === "approved") {
      const cotizacion = await prisma.cotizacion.findUnique({
        where: { id },
        include: { detalles: { include: { servicio: true } } },
      });

      if (!cotizacion) {
        return res.status(404).json({ error: "Cotización no encontrada tras actualizar estado" });
      }

      const citaExistente = await prisma.agendamientoCita.findFirst({
        where: { cotizacionId: id },
      });

      if (!citaExistente) {
        console.log(`[updateEstado] Creando cita para cotización #${id}:`, {
          clienteId: cotizacion.clienteId,
          fecha: cotizacion.fecha,
          horaInicio: cotizacion.horaInicio,
          detalles: cotizacion.detalles.length,
        });
        // Decodificar empleados guardados en notas
        const empleadosMap = (() => {
          const raw = cotizacion.notas ?? "";
          const idx = raw.indexOf("__EMPLEADOS__:");
          if (idx === -1) return {};
          try { return JSON.parse(raw.slice(idx + "__EMPLEADOS__:".length)); }
          catch { return {}; }
        })();

        // Extraer información de cliente ocasional si existe
        const clienteOcasional = (() => {
          const raw = cotizacion.notas ?? "";
          const idx = raw.indexOf("__CLIENTE_OCASIONAL__:");
          if (idx === -1) return null;
          const endIdx = raw.indexOf("__EMPLEADOS__:", idx);
          const jsonStr = endIdx === -1 
            ? raw.slice(idx + "__CLIENTE_OCASIONAL__:".length)
            : raw.slice(idx + "__CLIENTE_OCASIONAL__:".length, endIdx);
          try { return JSON.parse(jsonStr); }
          catch { return null; }
        })();

        // Usar fecha de la cotización o la fecha actual si no tiene
        const fechaCita = cotizacion.fecha ?? new Date();
        // Normalizar a medianoche UTC para comparaciones de fecha
        const fechaCitaNorm = new Date(Date.UTC(
          fechaCita.getUTCFullYear(),
          fechaCita.getUTCMonth(),
          fechaCita.getUTCDate(),
        ));

        // Preparar notas de la cita con información del cliente ocasional si existe
        let notasCita = null;
        if (clienteOcasional && !cotizacion.clienteId) {
          notasCita = `Cliente ocasional: ${clienteOcasional.firstName || ''} ${clienteOcasional.lastName || ''} - Tel: ${clienteOcasional.phone || 'N/A'}`;
        }

        const cita = await prisma.agendamientoCita.create({
          data: {
            clienteId:    cotizacion.clienteId ?? null,
            cotizacionId: cotizacion.id,
            fecha:        fechaCitaNorm,
            horario:      cotizacion.horaInicio ?? null,
            estado:       "Pendiente",
            notas:        notasCita,
          },
        });

        for (const detalle of cotizacion.detalles) {
          const cantidad = Number(detalle.cantidad ?? 1) || 1;
          // Usar empleado guardado en la cotización si existe
          let empleadoAsignado = empleadosMap[detalle.servicioId]
            ? Number(empleadosMap[detalle.servicioId])
            : null;

          // Si no hay empleado asignado, buscar uno disponible automáticamente
          if (!empleadoAsignado) {
            try {
              const empleadosDelServicio = await prisma.empleadoServicio.findMany({
                where:   { servicioId: detalle.servicioId },
                include: { empleado: true },
              });

              const horaInicio = cotizacion.horaInicio ? new Date(cotizacion.horaInicio) : null;
              const duracion   = detalle.servicio?.duracion ?? 60;

              for (const es of empleadosDelServicio) {
                if (es.empleado.estado !== "Activo") continue;

                if (horaInicio) {
                  const nuevaFin = new Date(horaInicio.getTime() + duracion * 60000);
                  const citasSolapadas = await prisma.agendamientoCita.findMany({
                    where: {
                      fecha:   fechaCitaNorm,
                      estado:  { not: "Cancelada" },
                      detalles: { some: { empleadoId: es.empleadoId } },
                    },
                    include: {
                      detalles: {
                        where:   { empleadoId: es.empleadoId },
                        include: { servicio: true },
                      },
                    },
                  });

                  let disponible = true;
                  for (const c of citasSolapadas) {
                    if (!c.horario) continue;
                    const h   = new Date(c.horario);
                    const ini = new Date(`1970-01-01T${String(h.getUTCHours()).padStart(2,"0")}:${String(h.getUTCMinutes()).padStart(2,"0")}:00`);
                    for (const d of c.detalles) {
                      const fin = new Date(ini.getTime() + (d.servicio?.duracion ?? 60) * 60000);
                      if (horaInicio < fin && nuevaFin > ini) { disponible = false; break; }
                    }
                    if (!disponible) break;
                  }
                  if (disponible) { empleadoAsignado = es.empleadoId; break; }
                } else {
                  // Sin hora, asignar el primero activo disponible
                  empleadoAsignado = es.empleadoId;
                  break;
                }
              }
            } catch (empErr) {
              console.error(`[updateEstado] Error buscando empleado para servicio ${detalle.servicioId}:`, empErr.message);
            }
          }

          for (let i = 0; i < cantidad; i++) {
            await prisma.agendamientoDetalle.create({
              data: {
                citaId:     cita.id,
                servicioId: detalle.servicioId,
                empleadoId: empleadoAsignado ?? null,
                precio:     detalle.precio ? Number(detalle.precio) : 0,
              },
            });
          }
        }

        console.log(`[updateEstado] Cita #${cita.id} creada para cotización #${id}`);
      } else {
        console.log(`[updateEstado] Ya existe cita #${citaExistente.id} para cotización #${id}, no se crea otra`);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[updateEstado] Error:", err);
    if (err.code === "P2025")
      return res.status(404).json({ error: "Cotización no encontrada" });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getOne, create, update, updateEstado };

// Endpoint adicional para ejecutar manualmente el auto-rechazo
const autoRejectExpired = async (req, res) => {
  try {
    const result = await quotationsModel.autoRejectExpired();
    res.json({
      ok: true,
      message: `${result.rechazadas} cotización(es) vencida(s) rechazada(s) automáticamente`,
      rechazadas: result.rechazadas,
      ids: result.ids,
    });
  } catch (err) {
    console.error("[autoRejectExpired] Error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getOne, create, update, updateEstado, autoRejectExpired };