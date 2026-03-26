// src/models/news.js
const prisma = require("../config/prisma");

const TIPO_MAP = {
  incapacidad: "Incapacidad", retraso: "Retraso", permiso: "Permiso",
  percance: "Percance", ausencia: "Ausencia", otro: "Otro",
};
const TIPO_MAP_INV = Object.fromEntries(Object.entries(TIPO_MAP).map(([k, v]) => [v.toLowerCase(), k]));

const ESTADO_MAP = {
  pendiente: "Activo", aprobada: "Aprobada", rechazada: "Rechazada", resuelta: "Resuelta",
};
const ESTADO_MAP_INV = {
  activo: "pendiente", aprobada: "aprobada", rechazada: "rechazada", resuelta: "resuelta",
};

function formatNovedad(n) {
  const emp = n.horario?.empleado;
  return {
    id:           n.id,
    employeeId:   String(emp?.id ?? ""),
    employeeName: emp ? `${emp.nombre} ${emp.apellido}` : "Sin empleado",
    type:         TIPO_MAP_INV[n.tipoNovedad?.toLowerCase()] ?? "otro",
    date:         n.fechaInicio ? n.fechaInicio.toISOString().split("T")[0] : "",
    fechaFinal:   n.fechaFinal  ? n.fechaFinal.toISOString().split("T")[0]  : null,
    startTime:    n.horaInicio  ? n.horaInicio.toISOString().slice(11, 16)  : null,
    endTime:      n.horaFinal   ? n.horaFinal.toISOString().slice(11, 16)   : null,
    description:  n.descripcion ?? "",
    status:       ESTADO_MAP_INV[n.estado?.toLowerCase()] ?? "pendiente",
    createdAt:    n.fechaInicio ? n.fechaInicio.toISOString() : "",
  };
}

const getAll = async () => {
  const data = await prisma.novedad.findMany({
    include: { horario: { include: { empleado: true } } },
    orderBy: { fechaInicio: "desc" },
  });
  return data.map(formatNovedad);
};

const create = async ({ employeeId, type, date, fechaFinal, startTime, endTime, description, status }) => {
  let horario = await prisma.horario.findFirst({
    where: { empleadoId: Number(employeeId), fecha: new Date(date) },
  });
  if (!horario) {
    horario = await prisma.horario.create({
      data: {
        empleadoId: Number(employeeId),
        fecha:      new Date(date),
        horaInicio: new Date(`1970-01-01T${startTime || "08:00"}:00`),
        horaFinal:  new Date(`1970-01-01T${endTime   || "17:00"}:00`),
        diaSemana:  new Date(date).toLocaleDateString("es-ES", { weekday: "long" }),
      },
    });
  }
  const n = await prisma.novedad.create({
    data: {
      horarioId:   horario.id,
      tipoNovedad: TIPO_MAP[type]    ?? "Otro",
      descripcion: description,
      fechaInicio: new Date(date),
      fechaFinal:  fechaFinal ? new Date(fechaFinal) : null,
      horaInicio:  startTime  ? new Date(`1970-01-01T${startTime}:00`) : null,
      horaFinal:   endTime    ? new Date(`1970-01-01T${endTime}:00`)   : null,
      estado:      ESTADO_MAP[status] ?? "Activo",
    },
  });
  return n.id;
};

const update = async (id, { type, date, fechaFinal, startTime, endTime, description, status }) => {
  await prisma.novedad.update({
    where: { id: Number(id) },
    data: {
      tipoNovedad: type        ? TIPO_MAP[type]    : undefined,
      descripcion: description ?? undefined,
      fechaInicio: date        ? new Date(date)    : undefined,
      fechaFinal:  fechaFinal  ? new Date(fechaFinal) : null,
      horaInicio:  startTime   ? new Date(`1970-01-01T${startTime}:00`) : null,
      horaFinal:   endTime     ? new Date(`1970-01-01T${endTime}:00`)   : null,
      estado:      status      ? ESTADO_MAP[status] : undefined,
    },
  });
};

const updateEstado = async (id, status) => {
  const estado = ESTADO_MAP[status];
  if (!estado) throw new Error("Estado inválido");
  await prisma.novedad.update({ where: { id: Number(id) }, data: { estado } });
};

const remove = async (id) => {
  await prisma.novedad.delete({ where: { id: Number(id) } });
};

module.exports = { getAll, create, update, updateEstado, remove };