//backend-highsoft-sena\src\controllers\dashboard.controller.js

const prisma = require("../config/prisma");
const ERROR = require("../utils/errorMessages");

const VALID_PERIODS = ["7days", "30days", "90days", "year"];

function getDateFilter(period) {
  const ahora = new Date();
  const desde = new Date();

  if (period === "7days") {
    // Últimos 7 días: desde hace 7 días hasta hoy
    desde.setDate(ahora.getDate() - 7);
    desde.setHours(0, 0, 0, 0);
  } else if (period === "30days") {
    // Últimos 30 días: desde hace 30 días hasta hoy
    desde.setDate(ahora.getDate() - 30);
    desde.setHours(0, 0, 0, 0);
  } else if (period === "90days") {
    // Últimos 90 días: desde hace 90 días hasta hoy
    desde.setDate(ahora.getDate() - 90);
    desde.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    // Este año: desde el 1 de enero del año actual hasta hoy
    desde.setFullYear(ahora.getFullYear(), 0, 1);
    desde.setHours(0, 0, 0, 0);
  }

  return desde;
}

function calcChange(current, previous) {
  if (previous === 0) {
    return current > 0 ? "+100%" : "0%";
  }

  const pct = ((current - previous) / previous * 100).toFixed(1);
  return Number(pct) >= 0 ? `+${pct}%` : `${pct}%`;
}

const getStats = async (req, res) => {
  try {

    const period = req.query.period || "30days";

    if (!VALID_PERIODS.includes(period)) {
      return res.status(400).json({
        error: ERROR.DASHBOARD.INVALID_PERIOD
      });
    }

    const ahora = new Date();
    const desde = getDateFilter(period);
    
    // Calcular período anterior con la misma duración
    const duracionMs = ahora.getTime() - desde.getTime();
    const anterior = new Date(desde.getTime() - duracionMs);
    anterior.setHours(0, 0, 0, 0);

    // Cargar estadísticas en paralelo
    const [
      clientesActivos,
      citasActuales,
      citasAnteriores,
      ventasActuales,
      ventasAnteriores,
      ventasPeriodoActual,
      ventasPeriodoAnterior
    ] = await Promise.all([

      prisma.cliente.count({
        where: { Estado: "Activo" }
      }),

      prisma.agendamientoCita.count({
        where: { fecha: { gte: desde } }
      }),

      prisma.agendamientoCita.count({
        where: { fecha: { gte: anterior, lt: desde } }
      }),

      prisma.venta.count({
        where: {
          Fecha: { gte: desde },
          Estado: "Activo"
        }
      }),

      prisma.venta.count({
        where: {
          Fecha: { gte: anterior, lt: desde },
          Estado: "Activo"
        }
      }),

      prisma.venta.findMany({
        where: { Fecha: { gte: desde } },
        select: { Total: true }
      }),

      prisma.venta.findMany({
        where: { Fecha: { gte: anterior, lt: desde } },
        select: { Total: true }
      })

    ]);

    const ventasTotales = ventasPeriodoActual.reduce(
      (s, v) => s + Number(v.Total ?? 0),
      0
    );

    const ventasAntTotal = ventasPeriodoAnterior.reduce(
      (s, v) => s + Number(v.Total ?? 0),
      0
    );

    const ventasPorMes = await prisma.venta.findMany({
      where: { Fecha: { gte: desde } },
      select: { Fecha: true, Total: true },
      orderBy: { Fecha: "asc" }
    });

    const salesMap = new Map();

    for (const v of ventasPorMes) {

      if (!v.Fecha) continue;

      const key = v.Fecha.toISOString().slice(0, 7);

      const label = new Date(v.Fecha).toLocaleDateString("es-ES", {
        month: "short",
        year: "2-digit"
      });

      if (!salesMap.has(key)) {
        salesMap.set(key, {
          month: label,
          ventas: 0,
          servicios: 0
        });
      }

      salesMap.get(key).ventas += Number(v.Total ?? 0);
      salesMap.get(key).servicios += 1;
    }

    // Canceladas en el período
    const citasCanceladas = await prisma.agendamientoCita.count({
      where: {
        fecha: { gte: desde },
        estado: { in: ["Cancelada", "cancelled"] }
      }
    });

    // Próximas 10 citas — desde ahora, combinando fecha + horario
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const upcomingRaw = await prisma.agendamientoCita.findMany({
      where: {
        fecha: { gte: hoy },
        estado: { notIn: ["Cancelada", "Completada"] }
      },
      orderBy: [{ fecha: "asc" }, { horario: "asc" }],
      take: 50, // traemos más para filtrar por hora luego
      include: {
        cliente: { select: { nombre: true, apellido: true } },
        detalles: {
          select: {
            detalle: true,
            empleado: { select: { nombre: true, apellido: true } },
            servicio: { select: { nombre: true } }
          }
        },
        cotizacion: {
          include: {
            detalles: {
              include: { servicio: { select: { nombre: true } } }
            }
          }
        }
      }
    });

    const pad = n => String(n).padStart(2, "0");
    const hoyStr = `${ahora.getFullYear()}-${pad(ahora.getMonth()+1)}-${pad(ahora.getDate())}`;

    // Comparar solo por fecha (sin hora) para evitar problemas de zona horaria
    const upcomingFiltradas = upcomingRaw.filter(c => {
      const fd = new Date(c.fecha);
      // Usar UTC para la fecha de la cita ya que SQL Server la guarda en UTC
      const fechaStr = `${fd.getUTCFullYear()}-${pad(fd.getUTCMonth()+1)}-${pad(fd.getUTCDate())}`;
      return fechaStr >= hoyStr;
    }).slice(0, 5);

    // Clientes nuevos del período — la tabla no tiene createdAt, se omite
    const clientesNuevos = 0;

    const detalles = await prisma.agendamientoDetalle.findMany({
      where: {
        cita: {
          fecha: { gte: desde }
        }
      },
      include: {
        servicio: true
      }
    });

    const servMap = new Map();

    for (const d of detalles) {

      const nombre = d.servicio?.nombre ?? "Otro";

      if (!servMap.has(nombre)) {
        servMap.set(nombre, {
          name: nombre,
          value: 0,
          revenue: 0
        });
      }

      servMap.get(nombre).value += 1;
      servMap.get(nombre).revenue += Number(d.precio ?? 0);
    }

    res.json({
      stats: {
        ventasTotales,
        ventasChange: calcChange(ventasTotales, ventasAntTotal),

        clientesActivos,

        citasDelPeriodo: citasActuales,
        citasChange: calcChange(citasActuales, citasAnteriores),

        ventasCompletadas: ventasActuales,
        ventasCountChange: calcChange(ventasActuales, ventasAnteriores)
      },

      salesData: [...salesMap.values()],

      servicesData: [...servMap.values()]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),

      cancelRate: {
        total: citasActuales,
        cancelled: citasCanceladas,
        rate: citasActuales > 0
          ? `${((citasCanceladas / citasActuales) * 100).toFixed(1)}%`
          : "0%"
      },

      upcomingAppointments: upcomingFiltradas.map(c => {
        const pad = n => String(n).padStart(2, "0");
        const fd = new Date(c.fecha);
        const fechaFormateada = `${fd.getUTCFullYear()}-${pad(fd.getUTCMonth()+1)}-${pad(fd.getUTCDate())}`;
        const horaFormateada = c.horario
          ? `${pad(new Date(c.horario).getUTCHours())}:${pad(new Date(c.horario).getUTCMinutes())}`
          : "—";

        // Recopilar TODOS los servicios de los detalles
        // Prioridad: nombre del servicio → campo detalle → nombre desde cotización
        const servicios = (c.detalles ?? [])
          .map(d => d.servicio?.nombre ?? d.detalle ?? null)
          .filter(Boolean);

        // Si no hay servicios en detalles, buscar en la cotización asociada
        const serviciosCotizacion = servicios.length === 0
          ? (c.cotizacion?.detalles ?? [])
              .map(d => d.servicio?.nombre)
              .filter(Boolean)
          : [];

        const todosServicios = servicios.length > 0 ? servicios : serviciosCotizacion;

        const empleados = (c.detalles ?? [])
          .map(d => d.empleado ? `${d.empleado.nombre} ${d.empleado.apellido}` : null)
          .filter(Boolean);

        return {
          id: c.id,
          fecha: fechaFormateada,
          hora: horaFormateada,
          clienteName: c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}` : "—",
          employeeName: empleados.length > 0 ? empleados[0] : "—",
          serviceName: todosServicios.length > 0
            ? todosServicios.join(", ")
            : (c.notas ? c.notas.substring(0, 40) : "—"),
          estado: c.estado,
        };
      }),

      clientesNuevos
    });

  } catch (err) {

    console.error("Error dashboard:", err);

    res.status(500).json({
      error: ERROR.DASHBOARD.ERROR_FETCHING_STATS
    });
  }
};

module.exports = { getStats, debugCitas };

// ── DEBUG: ver estructura real de las citas en la BD ──────────────────────────
async function debugCitas(req, res) {
  try {
    const prisma = require("../config/prisma");
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const citas = await prisma.agendamientoCita.findMany({
      where: { fecha: { gte: hoy }, estado: { notIn: ["Cancelada", "Completada"] } },
      take: 10,
      orderBy: [{ fecha: "asc" }],
      include: {
        cliente: { select: { nombre: true, apellido: true } },
        detalles: {
          select: {
            detalle: true,
            servicioId: true,
            empleadoId: true,
            empleado: { select: { nombre: true, apellido: true } },
            servicio: { select: { nombre: true } }
          }
        },
        cotizacion: {
          include: {
            detalles: { include: { servicio: { select: { nombre: true } } } }
          }
        }
      }
    });

    res.json(citas.map(c => ({
      id: c.id,
      fecha: c.fecha,
      cliente: c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}` : null,
      cotizacionId: c.cotizacionId,
      detalles_count: c.detalles.length,
      detalles: c.detalles.map(d => ({
        servicioId: d.servicioId,
        servicio_nombre: d.servicio?.nombre ?? null,
        detalle_texto: d.detalle ?? null,
        empleadoId: d.empleadoId,
        empleado: d.empleado ? `${d.empleado.nombre} ${d.empleado.apellido}` : null,
      })),
      cotizacion_detalles: (c.cotizacion?.detalles ?? []).map(d => ({
        servicio: d.servicio?.nombre ?? null
      }))
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}