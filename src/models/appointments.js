// src/models/appointments.js
const prisma = require("../config/prisma");

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCita(cita) {
  // La hora se guarda en UTC sin offset (ej: 14:00 UTC = 14:00 hora ingresada)
  // Se lee con getUTCHours/getUTCMinutes para no aplicar conversión de zona horaria
  const startTime = cita.horario
    ? `${String(cita.horario.getUTCHours()).padStart(2, "0")}:${String(cita.horario.getUTCMinutes()).padStart(2, "0")}`
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

// Convierte "HH:mm" a un objeto Date con esa hora en UTC exacto
// para que no haya conversión de zona horaria al guardar en PostgreSQL TIME
function horaToUTC(hora) {
  const [h, m] = hora.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}

// Convierte "HH:mm" a un objeto Date con esa hora en UTC exacto
// para que no haya conversión de zona horaria al guardar en PostgreSQL TIME
function horaToUTC(hora) {
  const [h, m] = hora.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}
const getAll = async (clienteId = null, empleadoId = null) => {
  let where = {};
  if (clienteId)  where.clienteId = clienteId;
  if (empleadoId) where.detalles  = { some: { empleadoId } };

  const citas = await prisma.agendamientoCita.findMany({
    where,
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
    // Guardar la hora como UTC compensando UTC-5 (Colombia)
    // Si el usuario ingresa "14:00", guardamos "14:00 UTC" para que al leer
    // con timeZone Bogota siga siendo "14:00"
    const horarioUTC = new Date(`1970-01-01T${hora}:00.000Z`);

    const cita = await tx.agendamientoCita.create({
      data: {
        clienteId: cliente ? Number(cliente) : null,
        fecha:     new Date(fecha),
        horario:   horarioUTC,
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
    if (!hora || !/^\d{2}:\d{2}$/.test(hora)) {
      throw new Error(`Hora inválida recibida en update: "${hora}"`);
    }
    const horarioUTC = new Date(`1970-01-01T${hora}:00.000Z`);

    await tx.agendamientoCita.update({
      where: { id: Number(id) },
      data: {
        clienteId: cliente ? Number(cliente) : null,
        fecha:     new Date(fecha),
        horario:   horarioUTC,
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