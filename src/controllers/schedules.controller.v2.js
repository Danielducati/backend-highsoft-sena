// src/controllers/schedules.controller.v2.js
const ScheduleService = require("../services/ScheduleService");
const { scheduleErrors } = require("../utils/errorMessages");

/**
 * Crea una plantilla de horario semanal
 * POST /api/schedules/template
 */
const createTemplate = async (req, res) => {
  try {
    const { empleadoId, nombre, diasSemana, fechaInicio } = req.body;
    
    // Validaciones
    if (!empleadoId || !nombre || !diasSemana || !fechaInicio) {
      return res.status(400).json({
        error: "Campos requeridos: empleadoId, nombre, diasSemana, fechaInicio"
      });
    }
    
    if (!Array.isArray(diasSemana) || diasSemana.length === 0) {
      return res.status(400).json({
        error: "Debe especificar al menos un día de la semana"
      });
    }
    
    // Validar formato de días
    for (const dia of diasSemana) {
      if (!dia.diaSemana || !dia.horaInicio || !dia.horaFin) {
        return res.status(400).json({
          error: "Cada día debe tener: diaSemana, horaInicio, horaFin"
        });
      }
      
      if (dia.horaInicio >= dia.horaFin) {
        return res.status(400).json({
          error: "La hora de inicio debe ser menor que la hora de fin"
        });
      }
    }
    
    const plantilla = await ScheduleService.crearPlantillaSemanal({
      empleadoId,
      nombre,
      diasSemana,
      fechaInicio
    });
    
    res.status(201).json({
      success: true,
      plantillaId: plantilla.id,
      message: "Plantilla de horario creada exitosamente"
    });
    
  } catch (error) {
    console.error("Error creating schedule template:", error);
    res.status(400).json({
      error: error.message || scheduleErrors.SERVER_ERROR
    });
  }
};

/**
 * Obtiene el horario efectivo de un empleado para una fecha
 * GET /api/schedules/effective/:empleadoId/:fecha
 */
const getEffectiveSchedule = async (req, res) => {
  try {
    const { empleadoId, fecha } = req.params;
    
    const horario = await ScheduleService.obtenerHorarioEfectivo(empleadoId, fecha);
    
    if (!horario) {
      return res.status(404).json({
        error: "No se encontró horario para el empleado en esta fecha"
      });
    }
    
    res.json({
      empleadoId,
      fecha,
      horario: {
        horaInicio: horario.horaInicio.toISOString().slice(11, 16),
        horaFin: horario.horaFin.toISOString().slice(11, 16),
        disponible: horario.disponible,
        motivo: horario.motivo,
        novedades: horario.novedades
      }
    });
    
  } catch (error) {
    console.error("Error getting effective schedule:", error);
    res.status(500).json({
      error: scheduleErrors.SERVER_ERROR
    });
  }
};

/**
 * Obtiene la disponibilidad de un empleado para un rango de fechas
 * GET /api/schedules/availability/:empleadoId?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
 */
const getAvailability = async (req, res) => {
  try {
    const { empleadoId } = req.params;
    const { fechaInicio, fechaFin } = req.query;
    
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: "Debe especificar fechaInicio y fechaFin"
      });
    }
    
    const disponibilidad = await ScheduleService.obtenerDisponibilidad(
      empleadoId, 
      fechaInicio, 
      fechaFin
    );
    
    res.json({
      empleadoId,
      periodo: { fechaInicio, fechaFin },
      disponibilidad: disponibilidad.map(d => ({
        fecha: d.fecha.toISOString().split('T')[0],
        horaInicio: d.horaInicio?.toISOString().slice(11, 16),
        horaFin: d.horaFin?.toISOString().slice(11, 16),
        disponible: d.disponible,
        motivo: d.motivo
      }))
    });
    
  } catch (error) {
    console.error("Error getting availability:", error);
    res.status(500).json({
      error: scheduleErrors.SERVER_ERROR
    });
  }
};

/**
 * Regenera la disponibilidad de un empleado
 * POST /api/schedules/regenerate-availability
 */
const regenerateAvailability = async (req, res) => {
  try {
    const { empleadoId, fechaInicio, dias = 84 } = req.body;
    
    if (!empleadoId || !fechaInicio) {
      return res.status(400).json({
        error: "Campos requeridos: empleadoId, fechaInicio"
      });
    }
    
    await ScheduleService.regenerarDisponibilidad(empleadoId, fechaInicio, dias);
    
    res.json({
      success: true,
      message: `Disponibilidad regenerada para ${dias} días`
    });
    
  } catch (error) {
    console.error("Error regenerating availability:", error);
    res.status(500).json({
      error: scheduleErrors.SERVER_ERROR
    });
  }
};

module.exports = {
  createTemplate,
  getEffectiveSchedule,
  getAvailability,
  regenerateAvailability
};