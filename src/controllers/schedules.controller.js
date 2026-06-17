const prisma = require("../config/prisma");
const { scheduleErrors } = require("../utils/errorMessages");
const ScheduleHistoryService = require("../services/ScheduleHistoryService");

const OPEN_TIME  = "08:00";
const CLOSE_TIME = "20:00";

// Construye una fecha UTC para columnas @db.Date en SQL Server.
// SQL Server guarda Date sin hora; Prisma la lee como T00:00:00.000Z (medianoche UTC).
// Por eso guardamos con Date.UTC para que la fecha UTC coincida con la fecha real.
function buildFecha(weekStartDate, dayIndex) {
  const [y, m, d] = weekStartDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dayIndex));
}

// Convierte "HH:MM" a Date UTC para columnas @db.Time en SQL Server
function toTime(hhmm) {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

function getMondayOfWeek(date) {
  const d   = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
}

function formatSchedule(horarios) {
  const map = new Map();

  for (const h of horarios) {
    const monday    = getMondayOfWeek(h.fecha);
    const mondayISO = monday.toISOString().split("T")[0];
    const key       = `${h.empleadoId}_${mondayISO}`;

    if (!map.has(key)) {
      map.set(key, {
        id:                key,
        employeeId:        String(h.empleadoId),
        employeeName:      h.empleado ? `${h.empleado.nombre} ${h.empleado.apellido}` : "Sin empleado",
        employeeSpecialty: h.empleado?.especialidad ?? "",
        weekStartDate:     mondayISO,
        daySchedules:      [],
        isActive:          true,
      });
    }

    const dayOfWeek = h.fecha.getUTCDay();
    const dayIndex  = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    map.get(key).daySchedules.push({
      id:        h.id,
      dayIndex,
      fecha:     h.fecha.toISOString().split("T")[0],
      startTime: h.horaInicio.toISOString().slice(11, 16),
      endTime:   h.horaFinal.toISOString().slice(11, 16),
    });
  }

  return [...map.values()];
}

const getAll = async (req, res) => {
  try {
    const horarios = await prisma.horario.findMany({
      include: { empleado: true },
      orderBy: { fecha: "desc" },
    });
    res.json(formatSchedule(horarios));
  } catch (err) {
    res.status(500).json({ error: scheduleErrors.SERVER_ERROR });
  }
};

const create = async (req, res) => {
  try {
    const { employeeId, weekStartDate, daySchedules } = req.body;

    if (!employeeId || !weekStartDate) {
      return res.status(400).json({ error: scheduleErrors.REQUIRED_FIELDS });
    }
    if (!Array.isArray(daySchedules) || daySchedules.length === 0) {
      return res.status(400).json({ error: scheduleErrors.EMPTY_DAY_SCHEDULES });
    }

    await prisma.$transaction(async (tx) => {
      for (const ds of daySchedules) {

        if (ds.startTime >= ds.endTime) throw new Error(scheduleErrors.INVALID_TIME_RANGE);
        if (ds.startTime < OPEN_TIME || ds.endTime > CLOSE_TIME) throw new Error(scheduleErrors.OUTSIDE_WORK_HOURS);

        const fecha     = buildFecha(weekStartDate, ds.dayIndex);
        const dayOfWeek = fecha.getUTCDay();

        // Domingos permitidos � el spa trabaja los 7 dias

        const start = toTime(ds.startTime);
        const end   = toTime(ds.endTime);

        // Verificar solapamiento en JS (evita comparar time vs datetimeoffset en SQL Server)
        const horariosExistentes = await tx.horario.findMany({
          where: { empleadoId: Number(employeeId), fecha },
        });
        const overlapping = horariosExistentes.some(h => {
          const hStart = new Date(h.horaInicio).getTime();
          const hEnd   = new Date(h.horaFinal).getTime();
          return start.getTime() < hEnd && end.getTime() > hStart;
        });
        if (overlapping) throw new Error(scheduleErrors.OVERLAPPING_SCHEDULE);

        await tx.horario.create({
          data: {
            empleadoId: Number(employeeId),
            fecha,
            horaInicio: start,
            horaFinal:  end,
            diaSemana:  fecha.toLocaleDateString("es-ES", { weekday: "long", timeZone: "UTC" }),
          },
        });
      }
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || scheduleErrors.SERVER_ERROR });
  }
};

const update = async (req, res) => {
  try {
    const { employeeId, weekStartDate } = req.params;
    const { daySchedules, changeReason } = req.body;

    if (!Array.isArray(daySchedules) || daySchedules.length === 0) {
      return res.status(400).json({ error: scheduleErrors.EMPTY_DAY_SCHEDULES });
    }

    const monday = buildFecha(weekStartDate, 0);
    const sunday = buildFecha(weekStartDate, 6);

    await prisma.$transaction(async (tx) => {
      // 🔄 PASO 1: Guardar horario actual en historial ANTES de modificar
      try {
        await ScheduleHistoryService.saveToHistory(
          Number(employeeId),
          weekStartDate,
          changeReason || "Actualización de horario",
          req.user?.id || null // ID del usuario autenticado (si está disponible)
        );
      } catch (historyError) {
        console.warn("⚠️ Error guardando historial (continuando con actualización):", historyError.message);
      }

      // 🔍 PASO 2: Obtener horarios existentes de la semana
      const horariosExistentes = await tx.horario.findMany({
        where: {
          empleadoId: Number(employeeId),
          fecha: { gte: monday, lte: sunday },
        },
      });

      // Crear un mapa de horarios existentes por fecha
      const horariosPorFecha = new Map();
      horariosExistentes.forEach(h => {
        const fechaISO = h.fecha.toISOString().split("T")[0];
        if (!horariosPorFecha.has(fechaISO)) {
          horariosPorFecha.set(fechaISO, []);
        }
        horariosPorFecha.get(fechaISO).push(h);
      });

      // 🗑️ PASO 3: Identificar horarios a eliminar (los que NO tienen novedades asociadas)
      const fechasNuevas = new Set(
        daySchedules.map(ds => buildFecha(weekStartDate, ds.dayIndex).toISOString().split("T")[0])
      );

      for (const [fechaISO, horarios] of horariosPorFecha.entries()) {
        if (!fechasNuevas.has(fechaISO)) {
          // Esta fecha ya no está en el nuevo horario, intentar eliminar
          for (const h of horarios) {
            // Verificar si tiene novedades asociadas
            const tieneNovedades = await tx.novedad.count({
              where: { horarioId: h.id },
            });

            if (tieneNovedades === 0) {
              // No tiene novedades, se puede eliminar
              await tx.horario.delete({ where: { id: h.id } });
              console.log(`🗑️ Horario ${h.id} eliminado (sin novedades)`);
            } else {
              console.warn(`⚠️ Horario ${h.id} NO eliminado (tiene ${tieneNovedades} novedades asociadas)`);
            }
          }
        }
      }

      // ➕ PASO 4: Actualizar o crear horarios según corresponda
      for (const ds of daySchedules) {
        if (ds.startTime >= ds.endTime) throw new Error(scheduleErrors.INVALID_TIME_RANGE);
        if (ds.startTime < OPEN_TIME || ds.endTime > CLOSE_TIME) throw new Error(scheduleErrors.OUTSIDE_WORK_HOURS);

        const fecha = buildFecha(weekStartDate, ds.dayIndex);
        const fechaISO = fecha.toISOString().split("T")[0];
        const start = toTime(ds.startTime);
        const end = toTime(ds.endTime);

        // Buscar si ya existe un horario para esta fecha
        const horarioExistente = horariosPorFecha.get(fechaISO)?.[0];

        if (horarioExistente) {
          // Actualizar el horario existente
          await tx.horario.update({
            where: { id: horarioExistente.id },
            data: {
              horaInicio: start,
              horaFinal: end,
              diaSemana: fecha.toLocaleDateString("es-ES", { weekday: "long", timeZone: "UTC" }),
            },
          });
          console.log(`✏️ Horario ${horarioExistente.id} actualizado`);
        } else {
          // Crear nuevo horario
          await tx.horario.create({
            data: {
              empleadoId: Number(employeeId),
              fecha,
              horaInicio: start,
              horaFinal: end,
              diaSemana: fecha.toLocaleDateString("es-ES", { weekday: "long", timeZone: "UTC" }),
            },
          });
          console.log(`➕ Nuevo horario creado para ${fechaISO}`);
        }
      }
    });

    console.log(`✅ Horario actualizado para empleado ${employeeId}, semana ${weekStartDate}`);
    res.json({ 
      ok: true, 
      message: "Horario actualizado y guardado en historial",
      historyEnabled: true 
    });
  } catch (err) {
    console.error("❌ Error actualizando horario:", err);
    res.status(400).json({ error: err.message || scheduleErrors.SERVER_ERROR });
  }
};

const remove = async (req, res) => {
  try {
    const { employeeId, weekStartDate } = req.params;
    const deleteReason = req.body?.deleteReason;

    const monday     = buildFecha(weekStartDate, 0);
    const nextMonday = buildFecha(weekStartDate, 7);

    // 🔄 Guardar en historial antes de eliminar
    try {
      await ScheduleHistoryService.saveToHistory(
        Number(employeeId),
        weekStartDate,
        deleteReason || "Eliminación de horario",
        req.user?.id || null
      );
    } catch (historyError) {
      console.warn("⚠️ Error guardando historial antes de eliminar:", historyError.message);
    }

    const result = await prisma.horario.deleteMany({
      where: {
        empleadoId: Number(employeeId),
        fecha: { gte: monday, lt: nextMonday },
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: scheduleErrors.SCHEDULE_NOT_FOUND });
    }

    console.log(`🗑️ Horario eliminado para empleado ${employeeId}, semana ${weekStartDate}`);
    res.json({ 
      ok: true, 
      deletedCount: result.count,
      message: "Horario eliminado y guardado en historial"
    });
  } catch (err) {
    res.status(500).json({ error: err.message || scheduleErrors.SERVER_ERROR });
  }
};

// 📊 NUEVOS ENDPOINTS PARA HISTORIAL

const getEmployeeHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 10 } = req.query;

    const history = await ScheduleHistoryService.getEmployeeHistory(
      Number(employeeId), 
      Number(limit)
    );

    res.json({
      employeeId,
      history,
      total: history.length,
      message: "Historial obtenido exitosamente"
    });
  } catch (err) {
    console.error("Error obteniendo historial del empleado:", err);
    res.status(500).json({ error: "Error obteniendo historial" });
  }
};

const getWeekHistory = async (req, res) => {
  try {
    const { employeeId, weekStartDate } = req.params;

    const history = await ScheduleHistoryService.getWeekHistory(
      Number(employeeId),
      weekStartDate
    );

    res.json({
      employeeId,
      weekStartDate,
      history,
      versions: history.length,
      message: "Historial de semana obtenido exitosamente"
    });
  } catch (err) {
    console.error("Error obteniendo historial de semana:", err);
    res.status(500).json({ error: "Error obteniendo historial de semana" });
  }
};

const restoreFromHistory = async (req, res) => {
  try {
    const { historyId } = req.params;
    const { restoreReason } = req.body;

    const restored = await ScheduleHistoryService.restoreFromHistory(
      Number(historyId),
      req.user?.id || null
    );

    res.json({
      ok: true,
      restored,
      message: "Horario restaurado desde historial exitosamente"
    });
  } catch (err) {
    console.error("Error restaurando desde historial:", err);
    res.status(400).json({ error: err.message || "Error restaurando horario" });
  }
};

const getHistoryStats = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const stats = await ScheduleHistoryService.getHistoryStats(Number(employeeId));

    res.json({
      employeeId,
      stats,
      message: "Estadísticas de historial obtenidas exitosamente"
    });
  } catch (err) {
    console.error("Error obteniendo estadísticas:", err);
    res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
};

// Obtener franjas horarias disponibles para una semana (para el calendario de citas)
const getAvailableTimeSlots = async (req, res) => {
  try {
    const { weekStartDate } = req.query;
    
    if (!weekStartDate) {
      return res.status(400).json({ error: "weekStartDate es requerido (formato YYYY-MM-DD)" });
    }

    const monday = buildFecha(weekStartDate, 0);
    const sunday = buildFecha(weekStartDate, 6);

    // Obtener todos los horarios de la semana
    const horarios = await prisma.horario.findMany({
      where: {
        fecha: { gte: monday, lte: sunday },
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            estado: true,
          },
        },
      },
      orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
    });

    // IDs de empleados con novedad aprobada o activa que cubre algún día de esta semana
    const novedadesAprobadas = await prisma.novedad.findMany({
      where: {
        estado: { in: ["pendiente", "Aprobada", "aprobada", "Activo"] },
        fechaInicio: { lte: sunday },
        OR: [
          { fechaFinal: { gte: monday } },
          { fechaFinal: null }, // Novedades sin fecha final
        ],
      },
      include: {
        horario: { select: { empleadoId: true, fecha: true } },
      },
    });

    // Mapa: empleadoId → Set de fechas bloqueadas (ISO string YYYY-MM-DD)
    const fechasBloqueadas = new Map();
    for (const n of novedadesAprobadas) {
      const empId = n.horario.empleadoId;
      if (!fechasBloqueadas.has(empId)) fechasBloqueadas.set(empId, new Set());
      // Marcar cada día del rango de la novedad
      const inicio = new Date(n.fechaInicio);
      const fin    = new Date(n.fechaFinal);
      for (let dt = new Date(inicio); dt <= fin; dt.setUTCDate(dt.getUTCDate() + 1)) {
        fechasBloqueadas.get(empId).add(dt.toISOString().split("T")[0]);
      }
    }

    // Agrupar por fecha, excluyendo empleados con novedad aprobada ese día
    const slotsByDate = {};
    
    for (const h of horarios) {
      if (h.empleado.estado !== "Activo") continue;

      const fechaISO = h.fecha.toISOString().split("T")[0];

      // Excluir si el empleado tiene novedad aprobada en esta fecha
      const bloqueadas = fechasBloqueadas.get(h.empleadoId);
      if (bloqueadas && bloqueadas.has(fechaISO)) continue;

      if (!slotsByDate[fechaISO]) {
        slotsByDate[fechaISO] = {
          date: fechaISO,
          hasSchedules: true,
          timeRanges: [],
          employees: new Set(),
        };
      }
      
      slotsByDate[fechaISO].timeRanges.push({
        startTime: h.horaInicio.toISOString().slice(11, 16),
        endTime: h.horaFinal.toISOString().slice(11, 16),
        employeeId: h.empleadoId,
        employeeName: `${h.empleado.nombre} ${h.empleado.apellido}`,
      });
      
      slotsByDate[fechaISO].employees.add(h.empleadoId);
    };

    // Convertir Set a array y calcular rango global por día
    const result = Object.keys(slotsByDate).map(date => {
      const data = slotsByDate[date];
      const times = data.timeRanges.map(r => ({ start: r.startTime, end: r.endTime }));
      const minTime = times.reduce((min, t) => t.start < min ? t.start : min, "23:59");
      const maxTime = times.reduce((max, t) => t.end > max ? t.end : max, "00:00");
      
      return {
        date: data.date,
        hasSchedules: true,
        minTime,
        maxTime,
        employeeCount: data.employees.size,
        timeRanges: data.timeRanges,
      };
    });

    res.json({
      weekStartDate,
      slots: result,
      message: "Franjas horarias disponibles obtenidas exitosamente",
    });
  } catch (err) {
    console.error("Error obteniendo franjas horarias:", err);
    res.status(500).json({ error: "Error obteniendo franjas horarias disponibles" });
  }
};

// 🩺 DIAGNOSTIC ENDPOINT - Get schedules for specific employee
const getDiagnosticEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    console.log('🩺 [DIAGNOSTIC] Checking schedules for employeeId:', employeeId);
    
    // Verificar si el empleado existe
    const empleado = await prisma.empleado.findUnique({
      where: { id: Number(employeeId) },
      include: { usuario: { select: { correo: true, estado: true } } }
    });
    
    if (!empleado) {
      return res.status(404).json({ 
        error: "Empleado no encontrado",
        employeeId,
        exists: false
      });
    }
    
    console.log('🩺 [DIAGNOSTIC] Employee found:', empleado.nombre, empleado.apellido);
    
    // Obtener TODOS los horarios del empleado (sin filtro de fecha)
    const horarios = await prisma.horario.findMany({
      where: { empleadoId: Number(employeeId) },
      orderBy: { fecha: 'asc' }
    });
    
    console.log('🩺 [DIAGNOSTIC] Total schedules found:', horarios.length);
    
    // Formatear horarios por semana
    const formatted = formatSchedule(horarios.map(h => ({ ...h, empleado })));
    
    res.json({
      employeeId: Number(employeeId),
      employeeName: `${empleado.nombre} ${empleado.apellido}`,
      employeeStatus: empleado.estado,
      userEmail: empleado.usuario?.correo,
      userStatus: empleado.usuario?.estado,
      totalScheduleRecords: horarios.length,
      totalWeeks: formatted.length,
      schedules: formatted,
      rawSchedules: horarios.map(h => ({
        id: h.id,
        fecha: h.fecha.toISOString().split('T')[0],
        dia: h.diaSemana,
        horaInicio: h.horaInicio.toISOString().slice(11, 16),
        horaFinal: h.horaFinal.toISOString().slice(11, 16),
      })),
      message: "Diagnostic completed"
    });
  } catch (err) {
    console.error('🩺 [DIAGNOSTIC] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { 
  getAll, 
  create, 
  update, 
  remove,
  // Nuevos endpoints de historial
  getEmployeeHistory,
  getWeekHistory,
  restoreFromHistory,
  getHistoryStats,
  // Endpoint para calendario de citas
  getAvailableTimeSlots,
  // Diagnostic endpoint
  getDiagnosticEmployee,
};
