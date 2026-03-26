// src/controllers/schedules.controller.js
const prisma = require("../config/prisma");

function getMondayOfWeek(date) {
const d = new Date(date);
const day = d.getDay();
const diff = day === 0 ? -6 : 1 - day;
d.setDate(d.getDate() + diff);
d.setHours(0, 0, 0, 0);
return d;
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

    const dayOfWeek = new Date(h.fecha).getDay();
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
    res.status(500).json({ error: err.message });
}
};

const create = async (req, res) => {
try {
    const { employeeId, weekStartDate, daySchedules } = req.body;

    if (!employeeId || !weekStartDate || !Array.isArray(daySchedules) || daySchedules.length === 0)
    return res.status(400).json({ error: "employeeId, weekStartDate y daySchedules son requeridos" });

    const monday = new Date(weekStartDate + "T00:00:00");

    await prisma.$transaction(async (tx) => {
    for (const ds of daySchedules) {
        const fecha = new Date(monday);
        fecha.setDate(monday.getDate() + ds.dayIndex);
        await tx.horario.create({
        data: {
            empleadoId: Number(employeeId),
            fecha,
            horaInicio: new Date(`1970-01-01T${ds.startTime}:00`),
            horaFinal:  new Date(`1970-01-01T${ds.endTime}:00`),
            diaSemana:  fecha.toLocaleDateString("es-ES", { weekday: "long" }),
        },
        });
    }
    });

    res.status(201).json({ ok: true });
} catch (err) {
    res.status(500).json({ error: err.message });
}
};

const update = async (req, res) => {
try {
    const { employeeId, weekStartDate } = req.params;
    const { daySchedules } = req.body;

    const monday = new Date(weekStartDate + "T00:00:00");
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);

    await prisma.$transaction(async (tx) => {
    await tx.horario.deleteMany({
        where: {
        empleadoId: Number(employeeId),
        fecha:      { gte: monday, lte: sunday },
        },
    });
    for (const ds of daySchedules) {
        const fecha = new Date(monday);
        fecha.setDate(monday.getDate() + ds.dayIndex);
        await tx.horario.create({
        data: {
            empleadoId: Number(employeeId),
            fecha,
            horaInicio: new Date(`1970-01-01T${ds.startTime}:00`),
            horaFinal:  new Date(`1970-01-01T${ds.endTime}:00`),
            diaSemana:  fecha.toLocaleDateString("es-ES", { weekday: "long" }),
        },
        });
    }
    });

    res.json({ ok: true });
} catch (err) {
    res.status(500).json({ error: err.message });
}
};

const remove = async (req, res) => {
try {
    const { employeeId, weekStartDate } = req.params;
    const monday = new Date(weekStartDate + "T00:00:00");
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);

    await prisma.horario.deleteMany({
    where: {
        empleadoId: Number(employeeId),
        fecha:      { gte: monday, lte: sunday },
    },
    });

    res.json({ ok: true });
} catch (err) {
    res.status(500).json({ error: err.message });
}
};

module.exports = { getAll, create, update, remove };