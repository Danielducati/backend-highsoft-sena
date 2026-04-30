// src/routes/news.routes.v2.js
const express = require("express");
const router = express.Router();
const {
  create,
  getAll,
  updateStatus,
  getImpact
} = require("../controllers/news.controller.v2");

// Crear novedad
router.post("/", create);

// Obtener todas las novedades
router.get("/", getAll);

// Actualizar estado de novedad
router.patch("/:id/status", updateStatus);

// Obtener impacto de una novedad
router.get("/:id/impact", getImpact);

module.exports = router;