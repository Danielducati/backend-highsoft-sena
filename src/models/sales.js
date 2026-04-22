// src/models/sales.js
const prisma = require("../config/prisma");

function formatVenta(v) {
  const primerItem = v.Venta_detalle?.[0];

  return {
    id:          v.PK_id_venta_encabezado,
    Cliente:     v.Cliente
                  ? `${v.Cliente.nombre} ${v.Cliente.apellido}`
                  : "—",
    Servicio:    (v.Venta_detalle ?? []).map(d => d.servicio?.nombre ?? "").filter(Boolean).join(", ") || "—",
    Cantidad:    primerItem?.cantidad        ?? 1,
    Precio:      Number(primerItem?.precio   ?? 0),
    Subtotal:    (v.Venta_detalle ?? []).reduce((s, d) => s + Number(d.subtotal ?? 0), 0),
    metodo_pago: v.metodo_pago  ?? "",
    descuento:   Number(v.descuento ?? 0),
    Total:       Number(v.Total     ?? 0),
    Iva:         Number(v.Iva       ?? 0),
    Fecha:       v.Fecha?.toISOString().split("T")[0] ?? null,
    Estado:      v.Estado ?? "Activo",
    clienteId:   v.FK_id_cliente,
    citaId:      v.FK_id_cita,
    items:       (v.Venta_detalle ?? []).map(d => ({
      id:         d.id,
      servicioId: d.servicioId,
      nombre:     d.servicio?.nombre ?? "Servicio",
      precio:     Number(d.precio),
      cantidad:   d.cantidad,
      subtotal:   Number(d.subtotal),
      empleadoId: d.empleadoId ?? null,
      empleado:   d.empleado
                    ? `${d.empleado.nombre} ${d.empleado.apellido}`
                    : null,
    })),
  };
}

const include = {
  Cliente: true,
  Venta_detalle: {
    include: { servicio: true, empleado: true },
  },
};

const getAll = async () => {
  const ventas = await prisma.venta.findMany({
    include,
    orderBy: { Fecha: "desc" },
  });
  return ventas.map(formatVenta);
};

const getById = async (id) => {
  const v = await prisma.venta.findUnique({
    where: { PK_id_venta_encabezado: Number(id) },
    include,
  });
  return v ? formatVenta(v) : null;
};

const getAvailableAppointments = async () => {
  const citas = await prisma.agendamientoCita.findMany({
    where: {
      estado: { in: ["Pendiente", "Confirmada", "Confirmado"] },
      // Solo citas que NO tienen venta asociada
      Venta: { none: {} },
    },
    include: {
      cliente:  true,
      detalles: { include: { servicio: true, empleado: true } }, // ✅ agrega empleado
    },
    orderBy: { fecha: "desc" },
  });

  return citas.map(c => ({
    id:          c.id,
    clienteId:   c.clienteId,
    clientName:  c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido}` : "Sin cliente",
    clientPhone: c.cliente?.telefono ?? "",
    date:        c.fecha.toISOString().split("T")[0],

    // ✅ Hora corregida
    time: c.horario
      ? `${String(c.horario.getHours()).padStart(2, "0")}:${String(c.horario.getMinutes()).padStart(2, "0")}`
      : "00:00",

    status:  c.estado,
    service: c.detalles.map(d => d.servicio?.nombre ?? "").join(", "),

    // ✅ Precio corregido
    price: c.detalles.reduce((s, d) => {
      const precio = d.precio !== null ? Number(d.precio) : Number(d.servicio?.precio ?? 0);
      return s + precio;
    }, 0),

    // ✅ items que el frontend necesita para handleAppointmentSelect
    items: c.detalles.map(d => ({
      servicioId: d.servicioId,
      nombre:     d.servicio?.nombre ?? "Servicio",
      precio:     d.precio !== null ? Number(d.precio) : Number(d.servicio?.precio ?? 0),
      cantidad:   1,
      empleadoId: d.empleadoId ?? null,
    })),
  }));
};

const create = async ({ tipo, clienteId, citaId, servicios, descuento, metodoPago, clienteOcasional }) => {
  return prisma.$transaction(async (tx) => {
    let resolvedClienteId = clienteId ? Number(clienteId) : null;
    let items = servicios ?? [];

    // Si viene cliente ocasional y no hay clienteId, crear cliente temporal
    if (!resolvedClienteId && clienteOcasional?.firstName) {
      const { firstName, lastName, documentType, document, email, phone } = clienteOcasional;

      // Buscar si ya existe por documento
      if (documentType && document) {
        const existeDoc = await tx.cliente.findFirst({
          where: { tipo_documento: documentType, numero_documento: document },
        });
        if (existeDoc) {
          resolvedClienteId = existeDoc.PK_id_cliente;
        }
      }

      // Buscar si ya existe por correo
      if (!resolvedClienteId && email) {
        const existeCorreo = await tx.cliente.findFirst({ where: { correo: email } });
        if (existeCorreo) resolvedClienteId = existeCorreo.PK_id_cliente;
      }

      // Crear cliente temporal si no existe
      if (!resolvedClienteId) {
        const bcrypt = require("bcryptjs");
        const passBase = document || "cliente123";
        const hashed  = await bcrypt.hash(passBase, 10);

        const usuario = await tx.usuario.create({
          data: {
            correo:     email || `ocasional_${Date.now()}@highlife.com`,
            contrasena: hashed,
            estado:     "Activo",
            rolId:      3,
          },
        });

        const cliente = await tx.cliente.create({
          data: {
            nombre:           firstName,
            apellido:         lastName     || "",
            tipo_documento:   documentType || null,
            numero_documento: document     || null,
            correo:           email        || null,
            telefono:         phone        || null,
            foto_perfil:      "",
            Estado:           "Activo",
            fk_id_usuario:    usuario.id,
          },
        });
        resolvedClienteId = cliente.PK_id_cliente;
      }
    }

    if (tipo === "cita" && citaId) {
      const detalles = await tx.agendamientoDetalle.findMany({
        where:   { citaId: Number(citaId) },
        include: { servicio: true },
      });
      items = detalles.map(d => ({
        id:         d.servicioId,
        precio:     d.precio !== null ? Number(d.precio) : Number(d.servicio?.precio ?? 0),
        qty:        1,
        empleadoId: d.empleadoId ?? null,
      }));

      if (!resolvedClienteId) {
        const cita = await tx.agendamientoCita.findUnique({ where: { id: Number(citaId) } });
        resolvedClienteId = cita?.clienteId ?? null;
      }
    }

    const subtotal = items.reduce((s, i) => s + Number(i.precio ?? 0) * (i.qty ?? 1), 0);
    const total    = subtotal - Number(descuento ?? 0);

    const venta = await tx.venta.create({
      data: {
        FK_id_cliente: resolvedClienteId,
        FK_id_cita:    citaId ? Number(citaId) : null,
        Fecha:         new Date(),
        Iva:           0,
        descuento:     descuento ?? 0,
        Total:         total,
        metodo_pago:   metodoPago ?? null,
        Estado:        "Activo",
      },
    });

    for (const item of items) {
      const precio   = Number(item.precio ?? 0);
      const cantidad = item.qty ?? 1;

      const empleadoId = item.empleadoId ? Number(item.empleadoId) : null;

      await tx.ventaDetalle.create({
        data: {
          FK_id_venta: venta.PK_id_venta_encabezado,
          servicioId:  Number(item.id),
          empleadoId,
          precio,
          cantidad,
          subtotal:    precio * cantidad,
        },
      });
    }

    if (tipo === "cita" && citaId) {
      await tx.agendamientoCita.update({
        where: { id: Number(citaId) },
        data:  { estado: "Completada" },
      });
    }

    return venta.PK_id_venta_encabezado;
  });
};

const remove = async (id) => {
  return prisma.$transaction(async (tx) => {
    await tx.ventaDetalle.deleteMany({ where: { FK_id_venta: Number(id) } });
    await tx.venta.delete({ where: { PK_id_venta_encabezado: Number(id) } });
  });
};

module.exports = { getAll, getById, getAvailableAppointments, create, remove };