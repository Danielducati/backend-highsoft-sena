const appointmentsModel = require("../models/appointments");
const prisma = require("../config/prisma");
const { appointmentErrors } = require("../utils/errorMessages");

const getAll = async (req, res) => {
  try {

    const data = await appointmentsModel.getAll();

    res.json(data);

  } catch (err) {

    res.status(500).json({
      error: appointmentErrors.SERVER_ERROR
    });

  }
};

const getOne = async (req, res) => {

  try {

    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({
        error: appointmentErrors.INVALID_ID
      });
    }

    const data = await appointmentsModel.getById(id);

    if (!data) {
      return res.status(404).json({
        error: appointmentErrors.NOT_FOUND
      });
    }

    res.json(data);

  } catch (err) {

    res.status(500).json({
      error: appointmentErrors.SERVER_ERROR
    });

  }
};

const create = async (req, res) => {

  try {

    const { cliente, fecha, hora, notas, servicios, empleadoId } = req.body;

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

    if (empleadoId) {

      const empleado = await prisma.empleado.findUnique({
        where: { id: Number(empleadoId) }
      });

      if (!empleado) {
        return res.status(404).json({
          error: appointmentErrors.EMPLOYEE_NOT_FOUND
        });
      }

      const existingAppointment = await prisma.agendamientoCita.findFirst({
        where: {
          empleadoId: Number(empleadoId),
          fecha: new Date(fecha),
          hora: new Date(`1970-01-01T${hora}:00`),
          estado: {
            not: "Cancelada"
          }
        }
      });

      if (existingAppointment) {
        return res.status(400).json({
          error: appointmentErrors.TIME_ALREADY_BOOKED
        });
      }

    }

    const id = await appointmentsModel.create({
      cliente,
      fecha,
      hora,
      notas,
      servicios,
      empleadoId
    });

    res.status(201).json({
      ok: true,
      PK_id_cita: id
    });

  } catch (err) {

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
  remove
};