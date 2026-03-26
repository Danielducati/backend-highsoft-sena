// src/models/quotations.js
const prisma = require("../config/prisma");

const ESTADO_MAP = {
  pending:   "Pendiente",
  approved:  "Aprobada",
  rejected:  "Rechazada",
  cancelled: "Cancelada",
  expired:   "Expirada",
};

const ESTADO_MAP_REVERSE = {
  Pendiente: "pending",
  Aprobada:  "approved",
  Rechazada: "rejected",
  Cancelada: "cancelled",
  Expirada:  "expired",
};

function formatQuotation(c) {
  return {
    id:            c.id,
    FK_id_cliente: c.clienteId,
    clientName:    c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}` : "Sin cliente",
    clientEmail:   c.cliente?.correo ?? "",
    date:          c.fecha      ? c.fecha.toISOString().split("T")[0]       : null,
    startTime:     c.horaInicio ? c.horaInicio.toISOString().slice(11, 16)  : null,
    subtotal:      Number(c.subtotal  ?? 0),
    discount:      Number(c.descuento ?? 0),
    iva:           Number(c.iva       ?? 0),
    total:         Number(c.total     ?? 0),
    notes:         c.notas ?? "",
    status:        ESTADO_MAP_REVERSE[c.estado] ?? "pending",
    items:         (c.detalles ?? []).map(d => ({
      serviceId:   d.servicioId,
      serviceName: d.servicio?.nombre ?? "Servicio",
      price:       Number(d.precio    ?? 0),
      quantity:    d.cantidad ?? 1,
    })),
  };
}

const getAll = async () => {
  const data = await prisma.cotizacion.findMany({
    include: {
      cliente:  true,
      detalles: { include: { servicio: true } },
    },
    orderBy: { fecha: "desc" },
  });
  return data.map(formatQuotation);
};

const getById = async (id) => {
  const c = await prisma.cotizacion.findUnique({
    where:   { id: Number(id) },
    include: {
      cliente:  true,
      detalles: { include: { servicio: true } },
    },
  });
  return c ? formatQuotation(c) : null;
};

const create = async ({ clienteId, fecha, horaInicio, notas, descuento = 0, servicios }) => {
  const subtotal = servicios.reduce((s, sv) => s + sv.precio * sv.cantidad, 0);
  const iva      = subtotal * 0.19;
  const total    = subtotal + iva - descuento;

  return prisma.$transaction(async (tx) => {
    const cot = await tx.cotizacion.create({
      data: {
        clienteId:  Number(clienteId),
        fecha:      fecha ? new Date(fecha) : new Date(),
        horaInicio: horaInicio ? new Date(`1970-01-01T${horaInicio}:00`) : null,
        subtotal,
        iva,
        valor:      subtotal,
        descuento,
        total,
        notas:      notas ?? null,
        estado:     "Pendiente",
      },
    });

    for (const sv of servicios) {
      await tx.detalleCotizacion.create({
        data: {
          cotizacionId: cot.id,
          servicioId:   Number(sv.id_servicio),
          precio:       sv.precio,
          cantidad:     sv.cantidad,
        },
      });
    }

    return cot.id;
  });
};

const update = async (id, { clienteId, fecha, horaInicio, notas, descuento = 0, servicios }) => {
  const subtotal = servicios.reduce((s, sv) => s + (sv.precio || sv.price) * (sv.cantidad || sv.quantity), 0);
  const iva      = subtotal * 0.19;
  const total    = subtotal + iva - descuento;

  return prisma.$transaction(async (tx) => {
    await tx.cotizacion.update({
      where: { id: Number(id) },
      data: {
        clienteId:  Number(clienteId),
        fecha:      fecha ? new Date(fecha) : undefined,
        horaInicio: horaInicio ? new Date(`1970-01-01T${horaInicio}:00`) : null,
        subtotal, iva, valor: subtotal, descuento, total,
        notas: notas ?? null,
      },
    });

    await tx.detalleCotizacion.deleteMany({ where: { cotizacionId: Number(id) } });

    for (const sv of servicios) {
      await tx.detalleCotizacion.create({
        data: {
          cotizacionId: Number(id),
          servicioId:   Number(sv.id_servicio || sv.serviceId),
          precio:       sv.precio || sv.price,
          cantidad:     sv.cantidad || sv.quantity,
        },
      });
    }
  });
};

const updateEstado = async (id, status) => {
  const estado = ESTADO_MAP[status] ?? status;
  return prisma.cotizacion.update({
    where: { id: Number(id) },
    data:  { estado },
  });
};

module.exports = { getAll, getById, create, update, updateEstado };