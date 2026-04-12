//backend-highsoft-sena\src\controllers\appointments.controller.js
const appointmentsModel = require("../models/appointments");
const prisma = require("../config/prisma");
const { appointmentErrors } = require("../utils/errorMessages");

const getAll = async (req, res) => {
  try {
    let clienteId = null;

    if (req.usuario?.rol === "Cliente") {
      const clienteRecord = await prisma.cliente.findFirst({
        where: { fk_id_usuario: req.usuario.id },
        select: { PK_id_cliente: true }
      });

      if (!clienteRecord) {
        // El usuario cliente aún no tiene perfil de cliente asociado
        return res.json([]);
      }

      clienteId = clienteRecord.PK_id_cliente;
    }

    const data = await appointmentsModel.getAll(clienteId);
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: appointmentErrors.SERVER_ERROR });
  }
};

const getOne = async (req, res) => {

  try {

    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: appointmentErrors.INVALID_ID });
    }

    const data = await appointmentsModel.getById(id);

    if (!data) {
      return res.status(404).json({ error: appointmentErrors.NOT_FOUND });
    }

    // Si es Cliente, verificar que la cita le pertenece
    if (req.usuario?.rol === "Cliente") {
      const clienteRecord = await prisma.cliente.findFirst({
        where: { fk_id_usuario: req.usuario.id },
        select: { PK_id_cliente: true }
      });

      if (!clienteRecord || data.cliente_id !== clienteRecord.PK_id_cliente) {
        return res.status(403).json({ error: "No tienes permiso para ver esta cita" });
      }
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: appointmentErrors.SERVER_ERROR });
  }
};

const create = async (req, res) => {

  try {

    let { cliente, fecha, hora, notas, servicios } = req.body;

    // Si el usuario logueado es Cliente, forzar su propio clienteId
    if (req.usuario?.rol === "Cliente") {
      const clienteRecord = await prisma.cliente.findFirst({
        where: { fk_id_usuario: req.usuario.id },
        select: { PK_id_cliente: true }
      });

      if (!clienteRecord) {
        return res.status(400).json({ error: "No se encontró un perfil de cliente asociado a tu cuenta. Contacta al administrador." });
      }

      cliente = clienteRecord.PK_id_cliente;
    }

    if (!fecha || !hora || !Array.isArray(servicios) || servicios.length === 0) {
      return res.status(400).json({
        error: appointmentErrors.REQUIRED_FIELDS
      });
    }

    if (isNaN(Date.parse(fecha))) {
      return res.status(400).json({
        error: appointmentErrors.INVALID_DATE_FORMAT
      });
    }

    const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!horaRegex.test(hora)) {
      return res.status(400).json({
        error: appointmentErrors.INVALID_TIME_FORMAT
      });
    }

    const hoyStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Bogota"
    });

    if (fecha < hoyStr) {
      return res.status(400).json({
        error: appointmentErrors.PAST_DATE
      });
    }

    // Extraer empleados únicos del array de servicios
    const empleadoIds = [
      ...new Set(
        servicios
          .map(s => Number(s.empleado_usuario))
          .filter(id => !isNaN(id) && id > 0)
      )
    ];

    console.log("Empleados a validar:", empleadoIds);

    if (empleadoIds.length > 0) {

      // Traer duración de cada servicio
      const serviciosDB = await prisma.servicio.findMany({
        where: {
          id: { in: servicios.map(s => Number(s.servicio)) }
        },
        select: { id: true, duracion: true }
      });

      const duracionMap = Object.fromEntries(
        serviciosDB.map(s => [s.id, s.duracion || 60])
      );

      // Validar solapamiento por cada empleado
      for (const empId of empleadoIds) {

        // Servicios asignados a este empleado en la nueva cita
        const serviciosDelEmpleado = servicios.filter(
          s => Number(s.empleado_usuario) === empId
        );

        const duracionTotal = serviciosDelEmpleado.reduce(
          (sum, s) => sum + (duracionMap[Number(s.servicio)] || 60),
          0
        );

        const nuevaInicio = new Date(`1970-01-01T${hora}:00`);
        const nuevaFin    = new Date(nuevaInicio.getTime() + duracionTotal * 60000);

        console.log(`Empleado ${empId} → nuevaInicio: ${nuevaInicio}, nuevaFin: ${nuevaFin}`);

        // Citas existentes del empleado en esa fecha
        const citasEmpleado = await prisma.agendamientoCita.findMany({
          where: {
            fecha:  new Date(fecha),
            estado: { not: "Cancelada" },
            detalles: {
              some: { empleadoId: empId }
            }
          },
          include: {
            detalles: {
              where:   { empleadoId: empId },
              include: { servicio: true }
            }
          }
        });

        console.log(`Citas encontradas para empleado ${empId}:`, citasEmpleado.length);

        for (const cita of citasEmpleado) {

          const h = new Date(cita.horario);
          const inicioExistente = new Date(
            `1970-01-01T${String(h.getHours()).padStart(2, "0")}:${String(h.getMinutes()).padStart(2, "0")}:00`
          );

          for (const detalle of cita.detalles) {

            const duracionExistente = detalle.servicio?.duracion || 60;
            const finExistente      = new Date(inicioExistente.getTime() + duracionExistente * 60000);

            console.log(`  Cita existente #${cita.id} → inicio: ${inicioExistente}, fin: ${finExistente}`);

            const overlap = nuevaInicio < finExistente && nuevaFin > inicioExistente;

            if (overlap) {
              return res.status(400).json({
                error: appointmentErrors.TIME_ALREADY_BOOKED
              });
            }

          }

        }

      }

    }

    const id = await appointmentsModel.create({
      cliente,
      fecha,
      hora,
      notas,
      servicios
    });

    res.status(201).json({
      ok: true,
      PK_id_cita: id
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: appointmentErrors.SERVER_ERROR
    });

  }
};

const update = async (req, res) => {

  try {

    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({
        error: appointmentErrors.INVALID_ID
      });
    }

    await appointmentsModel.update(id, req.body);

    res.json({
      ok: true
    });

  } catch (err) {

    res.status(500).json({
      error: appointmentErrors.SERVER_ERROR
    });

  }
};

const updateStatus = async (req, res) => {

  try {

    const id = Number(req.params.id);
    const { status } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        error: appointmentErrors.INVALID_ID
      });
    }

    if (!status) {
      return res.status(400).json({
        error: appointmentErrors.INVALID_STATUS
      });
    }

    await appointmentsModel.updateStatus(id, status);

    res.json({
      ok: true
    });

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }
};

const cancel = async (req, res) => {

  try {

    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({
        error: appointmentErrors.INVALID_ID
      });
    }

    await appointmentsModel.updateStatus(id, "Cancelada");

    res.json({
      ok: true
    });

  } catch (err) {

    res.status(500).json({
      error: appointmentErrors.SERVER_ERROR
    });

  }
};

const remove = async (req, res) => {

  try {

    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({
        error: appointmentErrors.INVALID_ID
      });
    }

    const cita = await prisma.agendamientoCita.findUnique({
      where: { id }
    });

    if (!cita) {
      return res.status(404).json({
        error: appointmentErrors.NOT_FOUND
      });
    }

    if (cita.estado === "Completada") {
      return res.status(400).json({
        error: appointmentErrors.COMPLETED_DELETE
      });
    }

    if (cita.estado === "Cancelada") {
      return res.status(400).json({
        error: appointmentErrors.CANCELLED_DELETE
      });
    }

    const ventas = await prisma.venta.count({
      where: { FK_id_cita: id }
    });

    if (ventas > 0) {
      return res.status(400).json({
        error: appointmentErrors.HAS_SALES(ventas)
      });
    }

    await appointmentsModel.remove(id);

    res.json({
      ok: true
    });

  } catch (err) {

    res.status(500).json({
      error: appointmentErrors.SERVER_ERROR
    });

  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  updateStatus,
  cancel,
  cancelMiCita,
  remove,
};

async function cancelMiCita(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: appointmentErrors.INVALID_ID });
    }

    const clienteRecord = await prisma.cliente.findFirst({
      where: { fk_id_usuario: req.usuario.id },
      select: { PK_id_cliente: true },
    });

    if (!clienteRecord) {
      return res.status(403).json({ error: "No tienes un perfil de cliente asociado" });
    }

    const cita = await prisma.agendamientoCita.findUnique({ where: { id } });
    if (!cita) {
      return res.status(404).json({ error: appointmentErrors.NOT_FOUND });
    }

    if (cita.clienteId !== clienteRecord.PK_id_cliente) {
      return res.status(403).json({ error: "No tienes permiso para cancelar esta cita" });
    }

    await appointmentsModel.updateStatus(id, "cancelled");
    res.json({ ok: true });

  } catch (err) {
    console.error("Error cancelMiCita:", err);
    res.status(500).json({ error: appointmentErrors.SERVER_ERROR });
  }
}