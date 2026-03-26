// src/models/dashboard.js
const prisma = require("../config/prisma");

function getDateRange(period) {
const desde = new Date();
const periodos = { "7days": 7, "30days": 30, "90days": 90, "year": 365 };
desde.setDate(desde.getDate() - (periodos[period] ?? 30));
return desde;
}

function calcChange(current, previous) {
if (!previous || previous === 0) return current > 0 ? "+100%" : "0%";
const pct = ((current - previous) / previous * 100).toFixed(1);
return Number(pct) >= 0 ? `+${pct}%` : `${pct}%`;
}

const getStats = async (period = "30days") => {
const periodos = { "7days": 7, "30days": 30, "90days": 90, "year": 365 };
const dias     = periodos[period] ?? 30;
const desde    = new Date(); desde.setDate(desde.getDate() - dias);
const anterior = new Date(); anterior.setDate(anterior.getDate() - dias * 2);

const [
    clientesActivos,
    citasActuales, serviciosCompletados, ventasActuales,
    citasAnteriores, serviciosAnteriores, ventasAnteriores,
    ventasPorMes, detalles,
] = await Promise.all([
    prisma.cliente.count({ where: { estado: "Activo" } }),

    prisma.agendamientoCita.count({ where: { fecha: { gte: desde } } }),
    prisma.agendamientoCita.count({ where: { estado: "Completada", fecha: { gte: desde } } }),
    prisma.venta.findMany({ where: { fecha: { gte: desde } }, select: { total: true } }),

    prisma.agendamientoCita.count({ where: { fecha: { gte: anterior, lt: desde } } }),
    prisma.agendamientoCita.count({ where: { estado: "Completada", fecha: { gte: anterior, lt: desde } } }),
    prisma.venta.findMany({ where: { fecha: { gte: anterior, lt: desde } }, select: { total: true } }),

    prisma.venta.findMany({
    where:   { fecha: { gte: desde } },
    select:  { fecha: true, total: true },
    orderBy: { fecha: "asc" },
    }),

    prisma.agendamientoDetalle.findMany({
    where:   { cita: { fecha: { gte: desde } } },
    include: { servicio: true },
    }),
]);

const ventasTotales  = ventasActuales.reduce((s, v) => s + Number(v.total ?? 0), 0);
const ventasAntTotal = ventasAnteriores.reduce((s, v) => s + Number(v.total ?? 0), 0);

// Agrupar ventas por mes
const salesMap = new Map();
for (const v of ventasPorMes) {
    if (!v.fecha) continue;
    const key   = v.fecha.toISOString().slice(0, 7);
    const label = v.fecha.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
    if (!salesMap.has(key)) salesMap.set(key, { month: label, ventas: 0, servicios: 0 });
    salesMap.get(key).ventas    += Number(v.total ?? 0);
    salesMap.get(key).servicios += 1;
}

// Top 5 servicios
const servMap = new Map();
for (const d of detalles) {
    const nombre = d.servicio?.nombre ?? "Otro";
    if (!servMap.has(nombre)) servMap.set(nombre, { name: nombre, value: 0, revenue: 0 });
    servMap.get(nombre).value   += 1;
    servMap.get(nombre).revenue += Number(d.precio ?? 0);
}

return {
    stats: {
    ventasTotales,
    ventasChange:         calcChange(ventasTotales, ventasAntTotal),
    clientesActivos,
    citasDelPeriodo:      citasActuales,
    citasChange:          calcChange(citasActuales, citasAnteriores),
    serviciosCompletados,
    serviciosChange:      calcChange(serviciosCompletados, serviciosAnteriores),
    },
    salesData:    [...salesMap.values()],
    servicesData: [...servMap.values()].sort((a, b) => b.value - a.value).slice(0, 5),
};
};

module.exports = { getStats };