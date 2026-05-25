// src/controllers/news.controller.js
const prisma = require("../config/prisma");
const { newsErrors, generalErrors } = require("../utils/errorMessages");

function formatNovedad(n) {
  const empleado = n.horario?.empleado;
  return {
    id:           n.id,
    employeeId:   String(empleado?.id ?? ""),
    employeeName: empleado ? `${empleado.nombre} ${empleado.apellido}` : "Sin empleado",
    type:         n.tipoNovedad ?? "otro",
    date:         n.fechaInicio ? n.fechaInicio.toISOString().split("T")[0] : "",
    fechaFinal:   n.fechaFinal  ? n.fechaFinal.toISOString().split("T")[0]  : null,
    startTime:    n.horaInicio  ? n.horaInicio.toISOString().slice(11, 16)  : null,
    endTime:      n.horaFinal   ? n.horaFinal.toISOString().slice(11, 16)   : null,
    description:  n.descripcion ?? "",
    status:       n.estado ?? "pendiente",
    createdAt:    n.fechaInicio ? n.fechaInicio.toISOString() : "",
  };
}

const getAll = async (req, res) => {
  try {
    let empleadoId = null;
    const rol = (req.usuario?.rol ?? "").toLowerCase();

    // Si es un rol de empleado (cualquier rol que no sea Admin o Cliente)
    const esEmpleado = !["admin", "administrador", "cliente"].includes(rol);
    
    if (esEmpleado) {
      const empRecord = await prisma.empleado.findFirst({
        where: { usuarioId: req.usuario.id },
        select: { id: true }
      });
      if (empRecord) empleadoId = empRecord.id;
    }

    const whereClause = empleadoId 
      ? { horario: { empleadoId } }
      : {};

    const data = await prisma.novedad.findMany({
      where: whereClause,
      include: { horario: { include: { empleado: true } } },
      orderBy: { fechaInicio: "desc" },
    });
    res.json(data.map(formatNovedad));
  } catch (err) {
    res.status(500).json({ error: generalErrors.INTERNAL_ERROR });
  }
};

const create = async (req, res) => {
  try {
    let { employeeId, type, date, fechaFinal, startTime, endTime, description, action, reassignToEmployeeId } = req.body;

    const rol = (req.usuario?.rol ?? "").toLowerCase();

    // Si es un rol de empleado (cualquier rol que no sea Admin o Cliente), forzar su propio empleadoId
    const esEmpleado = !["admin", "administrador", "cliente"].includes(rol);
    
    if (esEmpleado) {
      const empRecord = await prisma.empleado.findFirst({
        where: { usuarioId: req.usuario.id },
        select: { id: true }
      });
      if (!empRecord) {
        return res.status(400).json({ error: "No se encontró un perfil de empleado asociado a tu cuenta." });
      }
      employeeId = String(empRecord.id);
    }

    if (!employeeId || !date || !description)
      return res.status(400).json({ error: newsErrors.NEWS_REQUIRED_FIELDS });

    const fechaInicio = new Date(date);
    const fechaFin    = fechaFinal ? new Date(fechaFinal) : fechaInicio;

    // ── Buscar citas del empleado en el rango de fechas ──────────────────────
    // Solo buscamos citas Pendientes o Confirmadas — las ya canceladas/completadas no importan
    const citasConflicto = await prisma.agendamientoDetalle.findMany({
      where: {
        empleadoId: Number(employeeId),
        cita: {
          fecha:  { gte: fechaInicio, lte: fechaFin },
          estado: { in: ["Pendiente", "Confirmada"] },
        },
      },
      include: {
        cita: {
          include: { cliente: true },
        },
        servicio: true,
      },
    });

    // ── Si hay conflictos y el frontend no decidió qué hacer ─────────────────
    // action puede ser: undefined (primera llamada), "cancel", "keep", o "reassign"
    if (citasConflicto.length > 0 && action === undefined) {
      const servicios = citasConflicto.map(d => ({
        detalleId:     d.id,
        citaId:        d.citaId,
        clienteNombre: d.cita.cliente
          ? `${d.cita.cliente.nombre} ${d.cita.cliente.apellido}`
          : "Sin cliente",
        fecha:         d.cita.fecha.toISOString().split("T")[0],
        hora:          d.cita.horario?.toISOString().slice(11, 16) ?? "—",
        servicio:      d.servicio?.nombre ?? "Servicio",
      }));

      // Obtener empleados disponibles como alternativa
      const empleadosDisponibles = await prisma.empleado.findMany({
        where: {
          id: { not: Number(employeeId) },
          estado: "Activo",
        },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          especialidad: true,
        },
      });

      // 409 Conflict — hay servicios asignados al empleado, el frontend decide
      return res.status(409).json({
        conflict:  true,
        message: newsErrors.NEWS_CONFLICT_APPOINTMENTS,
        servicios,
        empleadosDisponibles: empleadosDisponibles.map(e => ({
          id: e.id,
          name: `${e.nombre} ${e.apellido}`,
          specialty: e.especialidad,
        })),
      });
    }

    // ── Acciones sobre los servicios en conflicto ────────────────────────────
    if (citasConflicto.length > 0) {
      if (action === "cancel") {
        // Cancelar las citas completas
        const citaIds = [...new Set(citasConflicto.map(d => d.citaId))];
        await prisma.agendamientoCita.updateMany({
          where: { id: { in: citaIds } },
          data:  { estado: "Cancelada" },
        });
      } else if (action === "reassign" && reassignToEmployeeId) {
        // Reasignar solo los detalles del empleado con novedad al nuevo empleado
        const detalleIds = citasConflicto.map(d => d.id);
        await prisma.agendamientoDetalle.updateMany({
          where: { id: { in: detalleIds } },
          data:  { empleadoId: Number(reassignToEmployeeId) },
        });
      }
      // action === "keep" → no hacer nada, solo crear la novedad
    }

    // ── Crear o reutilizar horario ────────────────────────────────────────────
    let horario = await prisma.horario.findFirst({
      where: { empleadoId: Number(employeeId), fecha: fechaInicio },
    });

    if (!horario) {
      horario = await prisma.horario.create({
        data: {
          empleadoId: Number(employeeId),
          fecha:      fechaInicio,
          horaInicio: new Date(`1970-01-01T${startTime || "08:00"}:00`),
          horaFinal:  new Date(`1970-01-01T${endTime   || "17:00"}:00`),
          diaSemana:  fechaInicio.toLocaleDateString("es-ES", { weekday: "long" }),
        },
      });
    }

    const novedad = await prisma.novedad.create({
      data: {
        horarioId:   horario.id,
        tipoNovedad: type        ?? "otro",
        descripcion: description,
        fechaInicio,
        fechaFinal:  fechaFinal  ? new Date(fechaFinal) : null,
        horaInicio:  startTime   ? new Date(`1970-01-01T${startTime}:00`) : null,
        horaFinal:   endTime     ? new Date(`1970-01-01T${endTime}:00`)   : null,
        estado:      "pendiente",
      },
    });

    res.status(201).json({ ok: true, id: novedad.id });
  } catch (err) {
    res.status(500).json({ error: generalErrors.INTERNAL_ERROR });
  }
};

const update = async (req, res) => {
  try {
    const { type, date, fechaFinal, startTime, endTime, description } = req.body;

    await prisma.novedad.update({
      where: { id: Number(req.params.id) },
      data: {
        tipoNovedad: type        ?? undefined,
        descripcion: description ?? undefined,
        fechaInicio: date        ? new Date(date)       : undefined,
        fechaFinal:  fechaFinal  ? new Date(fechaFinal) : null,
        horaInicio:  startTime   ? new Date(`1970-01-01T${startTime}:00`) : null,
        horaFinal:   endTime     ? new Date(`1970-01-01T${endTime}:00`)   : null,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: generalErrors.INTERNAL_ERROR });
  }
};



const updateStatus = async (req, res) => {
  try {
    const { status, action, reassignToEmployeeId } = req.body;
    const novedadId = Number(req.params.id);

    // Obtener la novedad actual
    const novedad = await prisma.novedad.findUnique({
      where: { id: novedadId },
      include: {
        horario: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
              },
            },
          },
        },
      },
    });

    if (!novedad) {
      return res.status(404).json({ error: newsErrors.NEWS_NOT_FOUND });
    }

    // Si se está aprobando la novedad, verificar citas existentes
    if ((status === "aprobada" || status === "Aprobada") && novedad.estado !== "aprobada" && novedad.estado !== "Aprobada") {
      
      const empleadoId = novedad.horario.empleadoId;
      const fechaInicio = novedad.fechaInicio;
      const fechaFinal = novedad.fechaFinal || novedad.fechaInicio;

      console.log(`🔍 Aprobando novedad #${novedadId} para empleado #${empleadoId}`);

      // Buscar citas del empleado en el rango de fechas de la novedad
      const citasConflicto = await prisma.agendamientoDetalle.findMany({
        where: {
          empleadoId: empleadoId,
          cita: {
            fecha: { gte: fechaInicio, lte: fechaFinal },
            estado: { in: ["Pendiente", "Confirmada"] },
          },
        },
        include: {
          cita: {
            include: {
              cliente: {
                select: {
                  nombre: true,
                  apellido: true,
                  correo: true,
                  telefono: true,
                },
              },
            },
          },
          servicio: {
            select: {
              id: true,
              nombre: true,
              duracion: true,
            },
          },
        },
      });

      console.log(`📋 Citas en conflicto encontradas: ${citasConflicto.length}`);

      // Si hay citas y no se ha decidido qué hacer
      if (citasConflicto.length > 0 && action === undefined) {
        
        // Filtrar citas que realmente tienen conflicto de horario
        const citasConConflictoReal = [];

        for (const detalle of citasConflicto) {
          const cita = detalle.cita;
          const citaHora = cita.horario ? new Date(cita.horario) : null;

          if (!citaHora) continue;

          // Si la novedad tiene rango horario, validar solapamiento
          if (novedad.horaInicio && novedad.horaFinal) {
            const citaInicio = new Date(
              `1970-01-01T${String(citaHora.getUTCHours()).padStart(2, "0")}:${String(citaHora.getUTCMinutes()).padStart(2, "0")}:00.000Z`
            );
            
            const duracion = detalle.servicio?.duracion || 60;
            const citaFin = new Date(citaInicio.getTime() + duracion * 60000);

            const novedadInicio = new Date(novedad.horaInicio);
            const novedadFin = new Date(novedad.horaFinal);
            
            const novedadInicioTime = new Date(
              `1970-01-01T${String(novedadInicio.getUTCHours()).padStart(2, "0")}:${String(novedadInicio.getUTCMinutes()).padStart(2, "0")}:00.000Z`
            );
            const novedadFinTime = new Date(
              `1970-01-01T${String(novedadFin.getUTCHours()).padStart(2, "0")}:${String(novedadFin.getUTCMinutes()).padStart(2, "0")}:00.000Z`
            );

            // Verificar solapamiento
            const overlap = citaInicio < novedadFinTime && citaFin > novedadInicioTime;
            
            if (overlap) {
              citasConConflictoReal.push(detalle);
            }
          } else {
            // Sin rango horario = bloquea todo el día
            citasConConflictoReal.push(detalle);
          }
        }

        console.log(`⚠️ Citas con conflicto real: ${citasConConflictoReal.length}`);

        if (citasConConflictoReal.length > 0) {
          // Formatear información de las citas
          const citasInfo = citasConConflictoReal.map(d => ({
            citaId: d.citaId,
            detalleId: d.id,
            fecha: d.cita.fecha.toISOString().split("T")[0],
            hora: d.cita.horario?.toISOString().slice(11, 16) ?? "—",
            servicio: d.servicio?.nombre ?? "Servicio",
            cliente: d.cita.cliente
              ? `${d.cita.cliente.nombre} ${d.cita.cliente.apellido}`
              : "Sin cliente",
            clienteContacto: {
              correo: d.cita.cliente?.correo,
              telefono: d.cita.cliente?.telefono,
            },
          }));

          // Obtener empleados disponibles como alternativa
          const empleadosDisponibles = await prisma.empleado.findMany({
            where: {
              id: { not: empleadoId },
              estado: "Activo",
            },
            select: {
              id: true,
              nombre: true,
              apellido: true,
              especialidad: true,
            },
          });

          // 409 Conflict - Hay citas que se verán afectadas
          return res.status(409).json({
            conflict: true,
            message: "Esta novedad afecta citas existentes. ¿Qué deseas hacer?",
            novedad: {
              id: novedad.id,
              tipo: novedad.tipoNovedad,
              empleado: `${novedad.horario.empleado.nombre} ${novedad.horario.empleado.apellido}`,
              fechaInicio: novedad.fechaInicio.toISOString().split("T")[0],
              fechaFinal: novedad.fechaFinal?.toISOString().split("T")[0] || novedad.fechaInicio.toISOString().split("T")[0],
              horaInicio: novedad.horaInicio?.toISOString().slice(11, 16),
              horaFinal: novedad.horaFinal?.toISOString().slice(11, 16),
            },
            citasAfectadas: citasInfo,
            empleadosDisponibles: empleadosDisponibles.map(e => ({
              id: e.id,
              nombre: `${e.nombre} ${e.apellido}`,
              especialidad: e.especialidad,
            })),
            opciones: [
              {
                action: "cancel",
                label: "Cancelar las citas afectadas",
                description: "Las citas serán canceladas y los clientes deberán ser notificados",
              },
              {
                action: "reassign",
                label: "Reasignar a otro empleado",
                description: "Selecciona un empleado disponible para reasignar los servicios",
                requiresEmployeeId: true,
              },
              {
                action: "keep",
                label: "Mantener las citas (no recomendado)",
                description: "Las citas se mantendrán a pesar de la novedad",
              },
            ],
          });
        }
      }

      // Si hay conflictos y se decidió qué hacer
      if (citasConflicto.length > 0 && action) {
        console.log(`🔧 Ejecutando acción: ${action}`);

        if (action === "cancel") {
          // Cancelar las citas completas
          const citaIds = [...new Set(citasConflicto.map(d => d.citaId))];
          
          await prisma.agendamientoCita.updateMany({
            where: { id: { in: citaIds } },
            data: { estado: "Cancelada" },
          });

          console.log(`✅ ${citaIds.length} citas canceladas`);

        } else if (action === "reassign" && reassignToEmployeeId) {
          // Reasignar solo los detalles del empleado con novedad
          const detalleIds = citasConflicto.map(d => d.id);
          
          await prisma.agendamientoDetalle.updateMany({
            where: { id: { in: detalleIds } },
            data: { empleadoId: Number(reassignToEmployeeId) },
          });

          console.log(`✅ ${detalleIds.length} servicios reasignados al empleado #${reassignToEmployeeId}`);

        } else if (action === "keep") {
          console.log(`⚠️ Manteniendo citas a pesar del conflicto`);
        }
      }
    }

    // Actualizar el estado de la novedad
    await prisma.novedad.update({
      where: { id: novedadId },
      data: { estado: status },
    });

    console.log(`✅ Novedad #${novedadId} actualizada a estado: ${status}`);

    res.json({ 
      ok: true,
      message: "Estado de novedad actualizado exitosamente",
    });

  } catch (err) {
    console.error("❌ Error actualizando estado de novedad:", err);
    res.status(500).json({ error: newsErrors.NEWS_INVALID_STATUS });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.novedad.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: newsErrors.NEWS_NOT_FOUND });
  }
};

/**
 * Obtener novedades de un empleado en una fecha específica
 * Útil para validar disponibilidad en el frontend
 */
const getEmployeeNewsForDate = async (req, res) => {
  try {
    const { employeeId, date } = req.params;
    
    if (!employeeId || !date) {
      return res.status(400).json({ 
        error: "employeeId y date son requeridos" 
      });
    }

    const fechaDate = new Date(date + "T00:00:00.000Z");

    const novedades = await prisma.novedad.findMany({
      where: {
        horario: {
          empleadoId: Number(employeeId),
        },
        estado: {
          in: ["pendiente", "Activo", "Aprobada", "aprobada"]
        },
        OR: [
          {
            fechaInicio: { lte: fechaDate },
            fechaFinal: { gte: fechaDate },
          },
          {
            fechaInicio: { lte: fechaDate },
            fechaFinal: null,
          },
        ],
      },
      include: {
        horario: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
              },
            },
          },
        },
      },
    });

    const formatted = novedades.map(n => ({
      id: n.id,
      tipo: n.tipoNovedad,
      descripcion: n.descripcion,
      fechaInicio: n.fechaInicio?.toISOString().split("T")[0],
      fechaFinal: n.fechaFinal?.toISOString().split("T")[0],
      horaInicio: n.horaInicio?.toISOString().slice(11, 16),
      horaFinal: n.horaFinal?.toISOString().slice(11, 16),
      estado: n.estado,
      bloqueaDiaCompleto: !n.horaInicio || !n.horaFinal,
    }));

    res.json({
      employeeId: Number(employeeId),
      date,
      novedades: formatted,
      hasNovedades: formatted.length > 0,
    });

  } catch (err) {
    console.error("Error obteniendo novedades del empleado:", err);
    res.status(500).json({ error: generalErrors.INTERNAL_ERROR });
  }
};

module.exports = { getAll, create, update, updateStatus, remove, getEmployeeNewsForDate };