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
      orderBy: { fecha: "asc" },
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

        if (dayOfWeek === 0) throw new Error(scheduleErrors.BLOCKED_DAY);

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

      // 🗑️ PASO 2: Borrar todos los horarios de esa semana para ese empleado
      const deletedCount = await tx.horario.deleteMany({
        where: {
          empleadoId: Number(employeeId),
          fecha: { gte: monday, lte: sunday },
        },
      });

      console.log(`📅 Horarios eliminados para historial: ${deletedCount.count} registros`);

      // ➕ PASO 3: Recrear con los nuevos datos
      for (const ds of daySchedules) {
        if (ds.startTime >= ds.endTime) throw new Error(scheduleErrors.INVALID_TIME_RANGE);
        if (ds.startTime < OPEN_TIME || ds.endTime > CLOSE_TIME) throw new Error(scheduleErrors.OUTSIDE_WORK_HOURS);

        const fecha     = buildFecha(weekStartDate, ds.dayIndex);
        const dayOfWeek = fecha.getUTCDay();

        if (dayOfWeek === 0) throw new Error(scheduleErrors.BLOCKED_DAY);

        const start = toTime(ds.startTime);
        const end   = toTime(ds.endTime);

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
    const { deleteReason } = req.body;

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

module.exports = { 
  getAll, 
  create, 
  update, 
  remove,
  // Nuevos endpoints de historial
  getEmployeeHistory,
  getWeekHistory,
  restoreFromHistory,
  getHistoryStats
};
