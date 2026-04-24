// src/routes/schedules.routes.v2.js
const express = require("express");
const router = express.Router();
const {
  createTemplate,
  getEffectiveSchedule,
  getAvailability,
  regenerateAvailability
} = require("../controllers/schedules.controller.v2");

// Crear plantilla de horario semanal
router.post("/template", createTemplate);

// Obtener horario efectivo para una fecha específica
router.get("/effective/:empleadoId/:fecha", getEffectiveSchedule);

// Obtener disponibilidad para un rango de fechas
router.get("/availability/:empleadoId", getAvailability);

// Regenerar disponibilidad
router.post("/regenerate-availability", regenerateAvailability);

module.exports = router;