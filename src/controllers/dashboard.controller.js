// src/controllers/dashboard.controller.js
const prisma = require("../config/prisma");

function getDateFilter(period) {
  const desde = new Date();
  if      (period === "7days")  desde.setDate(desde.getDate() - 7);
  else if (period === "30days") desde.setDate(desde.getDate() - 30);
  else if (period === "90days") desde.setDate(desde.getDate() - 90);
  else if (period === "year")   desde.setFullYear(desde.getFullYear(), 0, 1);
  else                          desde.setDate(desde.getDate() - 30);
  return desde;
}

function calcChange(current, previous) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = ((current - previous) / previous * 100).toFixed(1);
  return Number(pct) >= 0 ? `+${pct}%` : `${pct}%`;
}

let ventaTableMissingLogged = false;

/** Si la tabla de ventas no existe en la BD (P2021), el dashboard sigue respondiendo con ceros. */
async function ventaFindManyOrEmpty(args) {
  try {
    return await prisma.venta.findMany(args);
  } catch (err) {
    const missing =
      err.code === "P2021" &&
      (err.meta?.modelName === "Venta" ||
        String(err.meta?.table ?? "").toLowerCase().includes("venta"));
    if (missing) {
      if (!ventaTableMissingLogged) {
        ventaTableMissingLogged = true;
        console.warn(
          "Dashboard: tabla de ventas no encontrada (%s); ventas en cero hasta que exista la tabla.",
          err.meta?.table ?? "Venta",
        );
      }
      return [];
    }
    throw err;
  }
}

const getStats = async (req, res) => {
  try {
    const period   = req.query.period || "30days";
    const desde    = getDateFilter(period);
    const anterior = new Date(desde.getTime() - (new Date() - desde));

    const [
      clientesActivos,
      citasActuales,
      serviciosCompletados,
      citasAnteriores,
      serviciosAnteriores,
      ventasActuales,
      ventasAnteriores,
    ] = await Promise.all([
      prisma.cliente.count({ where: { Estado: "Activo" } }),
      prisma.agendamientoCita.count({ where: { fecha: { gte: desde } } }),
      prisma.agendamientoCita.count({ where: { estado: "Completada", fecha: { gte: desde } } }),
      prisma.agendamientoCita.count({ where: { fecha: { gte: anterior, lt: desde } } }),
      prisma.agendamientoCita.count({ where: { estado: "Completada", fecha: { gte: anterior, lt: desde } } }),
      ventaFindManyOrEmpty({ where: { Fecha: { gte: desde } }, select: { Total: true } }),
      ventaFindManyOrEmpty({ where: { Fecha: { gte: anterior, lt: desde } }, select: { Total: true } }),
    ]);

    const ventasTotales  = ventasActuales.reduce((s, v) => s + Number(v.Total ?? 0), 0);
    const ventasAntTotal = ventasAnteriores.reduce((s, v) => s + Number(v.Total ?? 0), 0);

    // Sales por mes
    const ventasPorMes = await ventaFindManyOrEmpty({
      where:   { Fecha: { gte: desde } },
      select:  { Fecha: true, Total: true },
      orderBy: { Fecha: "asc" },
    });

    const salesMap = new Map();
    for (const v of ventasPorMes) {
      if (!v.Fecha) continue;
      const key   = v.Fecha.toISOString().slice(0, 7);
      const label = new Date(v.Fecha).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
      if (!salesMap.has(key)) salesMap.set(key, { month: label, ventas: 0, servicios: 0 });
      salesMap.get(key).ventas    += Number(v.Total ?? 0);
      salesMap.get(key).servicios += 1;
    }

    // Top 5 servicios
    const detalles = await prisma.agendamientoDetalle.findMany({
      where:   { cita: { fecha: { gte: desde } } },
      include: { servicio: true },
    });

    const servMap = new Map();
    for (const d of detalles) {
      const nombre = d.servicio?.nombre ?? "Otro";
      if (!servMap.has(nombre)) servMap.set(nombre, { name: nombre, value: 0, revenue: 0 });
      servMap.get(nombre).value   += 1;
      servMap.get(nombre).revenue += Number(d.precio ?? 0);
    }

    res.json({
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
    });

  } catch (err) {
    console.error("Error dashboard:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getStats };