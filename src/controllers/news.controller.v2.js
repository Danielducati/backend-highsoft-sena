// src/controllers/news.controller.v2.js
const NewsService = require("../services/NewsService");
const { newsErrors, generalErrors } = require("../utils/errorMessages");

/**
 * Crea una nueva novedad
 * POST /api/news
 */
const create = async (req, res) => {
  try {
    const { 
      empleadoId, 
      tipo, 
      fechaInicio, 
      fechaFin, 
      horaInicio, 
      horaFin, 
      descripcion,
      accionConflicto,
      nuevoEmpleadoId
    } = req.body;
    
    // Validaciones básicas
    if (!empleadoId || !tipo || !fechaInicio || !descripcion) {
      return res.status(400).json({
        error: "Campos requeridos: empleadoId, tipo, fechaInicio, descripcion"
      });
    }
    
    // Validar tipo de novedad
    const tiposValidos = ['incapacidad', 'permiso', 'ausencia', 'retraso', 'percance', 'otro'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        error: `Tipo de novedad inválido. Valores permitidos: ${tiposValidos.join(', ')}`
      });
    }
    
    // Validar horarios si se especifican
    if ((horaInicio && !horaFin) || (!horaInicio && horaFin)) {
      return res.status(400).json({
        error: "Debe especificar tanto horaInicio como horaFin, o ninguna"
      });
    }
    
    if (horaInicio && horaFin && horaInicio >= horaFin) {
      return res.status(400).json({
        error: "La hora de inicio debe ser menor que la hora de fin"
      });
    }
    
    // Intentar crear la novedad
    const resultado = await NewsService.crearNovedad({
      empleadoId,
      tipo,
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      descripcion
    });
    
    // Si hay conflictos y no se especificó acción
    if (!resultado.success && resultado.conflict && !accionConflicto) {
      return res.status(409).json({
        conflict: true,
        message: resultado.message,
        conflictos: resultado.conflictos,
        acciones: [
          { value: 'cancelar', label: 'Cancelar citas en conflicto' },
          { value: 'reasignar', label: 'Reasignar citas a otro empleado' },
          { value: 'mantener', label: 'Crear novedad y mantener citas' }
        ]
      });
    }
    
    // Si hay conflictos pero se especificó una acción
    if (!resultado.success && resultado.conflict && accionConflicto) {
      if (accionConflicto === 'mantener') {
        // Forzar creación ignorando conflictos
        const novedadForzada = await NewsService.crearNovedadForzada({
          empleadoId,
          tipo,
          fechaInicio,
          fechaFin,
          horaInicio,
          horaFin,
          descripcion
        });
        
        return res.status(201).json({
          success: true,
          novedadId: novedadForzada.novedadId,
          message: "Novedad creada. Las citas en conflicto se mantienen.",
          warning: "Existen citas programadas que pueden verse afectadas"
        });
      } else {
        // Crear novedad y resolver conflictos
        const novedadConResolucion = await NewsService.crearNovedadConResolucion({
          empleadoId,
          tipo,
          fechaInicio,
          fechaFin,
          horaInicio,
          horaFin,
          descripcion,
          accionConflicto,
          nuevoEmpleadoId
        });
        
        return res.status(201).json({
          success: true,
          novedadId: novedadConResolucion.novedadId,
          message: `Novedad creada y conflictos resueltos (${accionConflicto})`,
          citasAfectadas: novedadConResolucion.citasAfectadas
        });
      }
    }
    
    // Creación exitosa sin conflictos
    res.status(201).json({
      success: true,
      novedadId: resultado.novedadId,
      message: "Novedad creada exitosamente"
    });
    
  } catch (error) {
    console.error("Error creating news:", error);
    
    if (error.message.includes('horario definido')) {
      return res.status(400).json({
        error: error.message,
        suggestion: "Debe crear primero una plantilla de horario semanal para el empleado"
      });
    }
    
    if (error.message.includes('horario laboral')) {
      return res.status(400).json({
        error: error.message
      });
    }
    
    res.status(500).json({
      error: generalErrors.INTERNAL_ERROR
    });
  }
};

/**
 * Obtiene todas las novedades con información de disponibilidad
 * GET /api/news
 */
const getAll = async (req, res) => {
  try {
    const { empleadoId, fechaInicio, fechaFin, estado } = req.query;
    
    const filtros = {};
    
    if (empleadoId) filtros.empleadoId = Number(empleadoId);
    if (estado) filtros.estado = estado;
    
    if (fechaInicio && fechaFin) {
      filtros.fechaInicio = { gte: new Date(fechaInicio) };
      filtros.OR = [
        { fechaFin: null, fechaInicio: { lte: new Date(fechaFin) } },
        { fechaFin: { lte: new Date(fechaFin) } }
      ];
    }
    
    const novedades = await prisma.novedad.findMany({
      where: filtros,
      include: {
        empleado: true,
        plantilla: {
          include: {
            diasSemana: true
          }
        }
      },
      orderBy: { fechaInicio: 'desc' }
    });
    
    const novedadesFormateadas = novedades.map(n => ({
      id: n.id,
      empleadoId: n.empleadoId,
      empleadoNombre: `${n.empleado.nombre} ${n.empleado.apellido}`,
      tipo: n.tipo,
      fechaInicio: n.fechaInicio.toISOString().split('T')[0],
      fechaFin: n.fechaFin?.toISOString().split('T')[0],
      horaInicio: n.horaInicio?.toISOString().slice(11, 16),
      horaFin: n.horaFin?.toISOString().slice(11, 16),
      descripcion: n.descripcion,
      estado: n.estado,
      tipoAfectacion: n.tipoAfectacion,
      plantillaAfectada: n.plantilla?.nombre
    }));
    
    res.json(novedadesFormateadas);
    
  } catch (error) {
    console.error("Error getting news:", error);
    res.status(500).json({
      error: generalErrors.INTERNAL_ERROR
    });
  }
};

/**
 * Actualiza el estado de una novedad
 * PATCH /api/news/:id/status
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    const estadosValidos = ['pendiente', 'aprobada', 'rechazada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`
      });
    }
    
    await prisma.novedad.update({
      where: { id: Number(id) },
      data: { estado }
    });
    
    // Si se aprueba, regenerar disponibilidad
    if (estado === 'aprobada') {
      const novedad = await prisma.novedad.findUnique({
        where: { id: Number(id) }
      });
      
      if (novedad) {
        await NewsService.regenerarDisponibilidadAfectada(
          novedad.empleadoId,
          novedad.fechaInicio,
          novedad.fechaFin
        );
      }
    }
    
    res.json({
      success: true,
      message: `Novedad ${estado} exitosamente`
    });
    
  } catch (error) {
    console.error("Error updating news status:", error);
    res.status(500).json({
      error: newsErrors.NEWS_INVALID_STATUS
    });
  }
};

/**
 * Obtiene el impacto de una novedad en la disponibilidad
 * GET /api/news/:id/impact
 */
const getImpact = async (req, res) => {
  try {
    const { id } = req.params;
    
    const novedad = await prisma.novedad.findUnique({
      where: { id: Number(id) },
      include: { empleado: true }
    });
    
    if (!novedad) {
      return res.status(404).json({
        error: "Novedad no encontrada"
      });
    }
    
    // Obtener conflictos con citas
    const conflictos = await NewsService.detectarConflictosCitas(
      novedad.empleadoId,
      novedad.fechaInicio,
      novedad.fechaFin,
      novedad.horaInicio?.toISOString().slice(11, 16),
      novedad.horaFin?.toISOString().slice(11, 16)
    );
    
    // Calcular días afectados
    const fechaInicio = new Date(novedad.fechaInicio);
    const fechaFin = novedad.fechaFin ? new Date(novedad.fechaFin) : fechaInicio;
    const diasAfectados = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
    
    res.json({
      novedadId: novedad.id,
      empleado: `${novedad.empleado.nombre} ${novedad.empleado.apellido}`,
      impacto: {
        diasAfectados,
        citasEnConflicto: conflictos.length,
        tipoAfectacion: novedad.tipoAfectacion,
        conflictos
      }
    });
    
  } catch (error) {
    console.error("Error getting news impact:", error);
    res.status(500).json({
      error: generalErrors.INTERNAL_ERROR
    });
  }
};

module.exports = {
  create,
  getAll,
  updateStatus,
  getImpact
};