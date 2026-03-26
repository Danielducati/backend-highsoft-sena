// src/models/schedules.js
const prisma = require("../config/prisma");

const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

function getMondayOfWeek(date) {
const d   = new Date(date);
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
        isActive:          true,
        daySchedules:      [],
    });
    }

    const dow      = new Date(h.fecha).getDay();
    const dayIndex = dow === 0 ? 6 : dow - 1;

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

const getAll = async () => {
const horarios = await prisma.horario.findMany({
    include: { empleado: true },
    orderBy: { fecha: "asc" },
});
return formatSchedule(horarios);
};

const create = async ({ employeeId, weekStartDate, daySchedules }) => {
const monday = new Date(weekStartDate + "T00:00:00");
const ids    = [];

await prisma.$transaction(async (tx) => {
    for (const ds of daySchedules) {
    const fecha = new Date(monday);
    fecha.setDate(monday.getDate() + ds.dayIndex);
    const h = await tx.horario.create({
        data: {
        empleadoId: Number(employeeId),
        fecha,
        horaInicio: new Date(`1970-01-01T${ds.startTime}:00`),
        horaFinal:  new Date(`1970-01-01T${ds.endTime}:00`),
        diaSemana:  DIAS[ds.dayIndex] ?? "Lunes",
        },
    });
    ids.push(h.id);
    }
});

return ids;
};

const update = async ({ employeeId, weekStartDate, daySchedules }) => {
const monday = new Date(weekStartDate + "T00:00:00");
const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);

await prisma.$transaction(async (tx) => {
    await tx.horario.deleteMany({
    where: { empleadoId: Number(employeeId), fecha: { gte: monday, lte: sunday } },
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
        diaSemana:  DIAS[ds.dayIndex] ?? "Lunes",
        },
    });
    }
});
};

const remove = async ({ employeeId, weekStartDate }) => {
const monday = new Date(weekStartDate + "T00:00:00");
const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
await prisma.horario.deleteMany({
    where: { empleadoId: Number(employeeId), fecha: { gte: monday, lte: sunday } },
});
};

module.exports = { getAll, create, update, remove };