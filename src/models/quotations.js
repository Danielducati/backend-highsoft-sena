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

// Serializa empleados asignados por servicio dentro del campo notas
// Formato: notas_usuario\n__EMPLEADOS__:{"servicioId":empleadoId,"name_servicioId":"nombre",...}
function encodeEmpleados(notas, servicios) {
  const map = {};
  for (const sv of servicios) {
    if (sv.empleado_id) {
      const svcId = sv.id_servicio || sv.serviceId;
      map[svcId]            = sv.empleado_id;
      map[`name_${svcId}`]  = sv.empleado_name ?? "";
    }
  }
  if (Object.keys(map).length === 0) return notas ?? null;
  const tag = `__EMPLEADOS__:${JSON.stringify(map)}`;
  return notas ? `${notas}\n${tag}` : tag;
}

function decodeEmpleados(notasRaw) {
  if (!notasRaw) return { notas: "", empleadosMap: {} };
  const idx = notasRaw.indexOf("__EMPLEADOS__:");
  if (idx === -1) return { notas: notasRaw, empleadosMap: {} };
  const notas = notasRaw.slice(0, idx).trimEnd();
  try {
    const empleadosMap = JSON.parse(notasRaw.slice(idx + "__EMPLEADOS__:".length));
    return { notas, empleadosMap };
  } catch {
    return { notas: notasRaw, empleadosMap: {} };
  }
}

function formatQuotation(c) {
  const { notas, empleadosMap } = decodeEmpleados(c.notas);
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
    notes:         notas,
    status:        ESTADO_MAP_REVERSE[c.estado] ?? "pending",
    items:         (c.detalles ?? []).map(d => {
      const empId   = empleadosMap[d.servicioId] ?? null;
      const empName = empId ? (empleadosMap[`name_${d.servicioId}`] ?? null) : null;
      return {
        serviceId:    d.servicioId,
        serviceName:  d.servicio?.nombre ?? "Servicio",
        price:        Number(d.precio    ?? 0),
        quantity:     d.cantidad ?? 1,
        empleadoId:   empId   ? Number(empId) : null,
        empleadoName: empName ?? null,
      };
    }),
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

const create = async ({ clienteId, clienteOcasional, fecha, horaInicio, notas, descuento = 0, servicios }) => {
  // Resolver clienteId — si viene cliente ocasional, crearlo primero
  let resolvedClienteId = clienteId ? Number(clienteId) : null;

  if (!resolvedClienteId && clienteOcasional?.firstName) {
    const bcrypt = require("bcryptjs");
    const prisma2 = require("../config/prisma");
    const correo = clienteOcasional.email || `ocasional_${Date.now()}@highlife.com`;

    // Buscar si ya existe por correo
    const existeCorreo = await prisma2.cliente.findFirst({ where: { correo } });
    if (existeCorreo) {
      resolvedClienteId = existeCorreo.PK_id_cliente;
    } else {
      const rolCliente = await prisma2.rol.findFirst({ where: { nombre: "Cliente" } });
      const hashed = await bcrypt.hash("cliente123", 10);
      const usuario = await prisma2.usuario.create({
        data: { correo, contrasena: hashed, estado: "Activo", rolId: rolCliente?.id ?? 3 },
      });
      const cliente = await prisma2.cliente.create({
        data: {
          nombre:    clienteOcasional.firstName,
          apellido:  clienteOcasional.lastName || "",
          correo:    clienteOcasional.email    || null,
          telefono:  clienteOcasional.phone    || null,
          foto_perfil: "",
          Estado:    "Activo",
          fk_id_usuario: usuario.id,
        },
      });
      resolvedClienteId = cliente.PK_id_cliente;
    }
  }

  const subtotal  = servicios.reduce((s, sv) => s + sv.precio * sv.cantidad, 0);
  const total     = subtotal - descuento;
  const notasFull = encodeEmpleados(notas, servicios);

  return prisma.$transaction(async (tx) => {
    const cot = await tx.cotizacion.create({
      data: {
        clienteId:  resolvedClienteId,
        fecha:      fecha ? new Date(fecha + "T12:00:00") : new Date(),
        horaInicio: horaInicio ? new Date(`1970-01-01T${horaInicio}:00`) : null,
        subtotal,
        iva:        0,
        valor:      subtotal,
        descuento,
        total,
        notas:      notasFull,
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
  const subtotal  = servicios.reduce((s, sv) => s + (sv.precio || sv.price) * (sv.cantidad || sv.quantity), 0);
  const total     = subtotal - descuento;
  const notasFull = encodeEmpleados(notas, servicios);

  return prisma.$transaction(async (tx) => {
    await tx.cotizacion.update({
      where: { id: Number(id) },
      data: {
        clienteId:  Number(clienteId),
        fecha:      fecha ? new Date(fecha + "T12:00:00") : undefined,
        horaInicio: horaInicio ? new Date(`1970-01-01T${horaInicio}:00`) : null,
        subtotal, iva: 0, valor: subtotal, descuento, total,
        notas: notasFull,
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