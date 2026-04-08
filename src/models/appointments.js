// src/models/appointments.js
const prisma = require("../config/prisma");

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCita(cita) {
  const startTime = cita.horario
  ? cita.horario.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" })
  : "00:00";

  const servicios = (cita.detalles ?? []).map(d => ({
    serviceId:    String(d.servicioId),
    serviceName:  d.servicio?.nombre   ?? "Servicio",
    employeeId:   String(d.empleadoId ?? ""),
    employeeName: d.empleado
      ? `${d.empleado.nombre} ${d.empleado.apellido}`
      : "Empleado",
    duration:  d.servicio?.duracion ?? 60,
    price:     d.precio,
    startTime,
  }));

  return {
    PK_id_cita:       cita.id,
    cliente_id:       cita.clienteId,
    cliente_nombre:   cita.cliente
      ? `${cita.cliente.nombre} ${cita.cliente.apellido}`
      : "Sin cliente",
    cliente_telefono: cita.cliente?.telefono ?? "",
    Fecha:   cita.fecha.toISOString().split("T")[0],
    Horario: startTime,
    Estado:  cita.estado,
    Notas:   cita.notas ?? "",
    servicios: servicios.length > 0
      ? servicios
      : [{ serviceId:"", serviceName:"Sin servicio", employeeId:"", employeeName:"Empleado", duration:60, startTime }],
  };
}

const include = {
  cliente: true,
  detalles: {
    include: {
      servicio: true,
      empleado: true,
    },
  },
};

// ── Queries ───────────────────────────────────────────────────────────────────
const getAll = async () => {
  const citas = await prisma.agendamientoCita.findMany({
    include,
    orderBy: [{ fecha: "desc" }, { horario: "desc" }],
  });
  return citas.map(formatCita);
};

const getById = async (id) => {
  const cita = await prisma.agendamientoCita.findUnique({
    where: { id: Number(id) },
    include,
  });
  return cita ? formatCita(cita) : null;
};

const create = async ({ cliente, fecha, hora, notas, servicios, empleadoId }) => {
  return prisma.$transaction(async (tx) => {
    const cita = await tx.agendamientoCita.create({
      data: {
        clienteId: cliente ? Number(cliente) : null,
        fecha:     new Date(fecha),
        horario: new Date(`1970-01-01T${hora}:00`),
        notas:     notas ?? null,
        estado:    "Pendiente",
      },
    });

    for (const s of servicios ?? []) {
      const empId = s.empleado_usuario ? Number(s.empleado_usuario) : null;

      await tx.agendamientoDetalle.create({
        data: {
          citaId:     cita.id,
          servicioId: Number(s.servicio),
          empleadoId: empId,
          precio:     s.precio ?? null,
          detalle:    s.detalle ?? null,
        },
      });

      if (empId) {
        const existe = await tx.empleadoServicio.findFirst({
          where: { empleadoId: empId, servicioId: Number(s.servicio) },
        });
        if (!existe) {
          await tx.empleadoServicio.create({
            data: { empleadoId: empId, servicioId: Number(s.servicio) },
          });
        }
      }
    }

    return cita.id;
  });
};

const update = async (id, { cliente, fecha, hora, notas, servicios }) => {
  return prisma.$transaction(async (tx) => {
    await tx.agendamientoCita.update({
      where: { id: Number(id) },
      data: {
        clienteId: cliente ? Number(cliente) : null,
        fecha:     new Date(fecha),
        horario: new Date(`1970-01-01T${hora}:00`),
        notas:     notas ?? null,
      },
    });

    await tx.agendamientoDetalle.deleteMany({ where: { citaId: Number(id) } });

    for (const s of servicios ?? []) {
      await tx.agendamientoDetalle.create({
        data: {
          citaId:     Number(id),
          servicioId: Number(s.servicio),
          empleadoId: s.empleado_usuario ? Number(s.empleado_usuario) : null,
          precio:     s.precio ?? null,
          detalle:    s.detalle ?? null,
        },
      });
    }
  });
};

const updateStatus = async (id, status) => {
  const estadoMap = { pending: "Pendiente", completed: "Completada", cancelled: "Cancelada" };
  const estadoDB  = estadoMap[status];
  if (!estadoDB) throw new Error("Estado inválido");

  return prisma.agendamientoCita.update({
    where: { id: Number(id) },
    data:  { estado: estadoDB },
  });
};

const remove = async (id) => {
  return prisma.$transaction(async (tx) => {
    await tx.agendamientoDetalle.deleteMany({ where: { citaId: Number(id) } });
    await tx.agendamientoCita.delete({ where: { id: Number(id) } });
  });
};

module.exports = { getAll, getById, create, update, updateStatus, remove };