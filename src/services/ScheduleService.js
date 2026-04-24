// src/services/ScheduleService.js
const prisma = require("../config/prisma");

class ScheduleService {
  
  /**
   * Crea una plantilla de horario semanal para un empleado
   * @param {Object} data - { empleadoId, nombre, diasSemana: [{ diaSemana, horaInicio, horaFin }] }
   */
  async crearPlantillaSemanal(data) {
    const { empleadoId, nombre, diasSemana, fechaInicio } = data;
    
    // Validar que no haya solapamientos
    await this.validarSolapamientos(empleadoId, fechaInicio);
    
    return await prisma.$transaction(async (tx) => {
      // Desactivar plantillas anteriores
      await tx.plantillaHorario.updateMany({
        where: { empleadoId: Number(empleadoId), activa: true },
        data: { activa: false, fechaFin: new Date(fechaInicio) }
      });
      
      // Crear nueva plantilla
      const plantilla = await tx.plantillaHorario.create({
        data: {
          empleadoId: Number(empleadoId),
          nombre,
          fechaInicio: new Date(fechaInicio),
          activa: true
        }
      });
      
      // Crear días de la semana
      for (const dia of diasSemana) {
        await tx.diaPlantilla.create({
          data: {
            plantillaId: plantilla.id,
            diaSemana: dia.diaSemana,
            horaInicio: new Date(`1970-01-01T${dia.horaInicio}:00`),
            horaFin: new Date(`1970-01-01T${dia.horaFin}:00`),
            activo: true
          }
        });
      }
      
      // Regenerar disponibilidad para las próximas 12 semanas
      await this.regenerarDisponibilidad(empleadoId, fechaInicio, 84); // 12 semanas
      
      return plantilla;
    });
  }
  
  /**
   * Obtiene el horario efectivo de un empleado para una fecha específica
   */
  async obtenerHorarioEfectivo(empleadoId, fecha) {
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay();
    
    // Buscar plantilla activa
    const plantilla = await prisma.plantillaHorario.findFirst({
      where: {
        empleadoId: Number(empleadoId),
        activa: true,
        fechaInicio: { lte: fechaObj },
        OR: [
          { fechaFin: null },
          { fechaFin: { gte: fechaObj } }
        ]
      },
      include: {
        diasSemana: {
          where: { diaSemana, activo: true }
        }
      }
    });
    
    if (!plantilla || plantilla.diasSemana.length === 0) {
      return null; // No trabaja este día
    }
    
    const diaPlantilla = plantilla.diasSemana[0];
    
    // Verificar si hay novedades que afecten este día
    const novedades = await prisma.novedad.findMany({
      where: {
        empleadoId: Number(empleadoId),
        fechaInicio: { lte: fechaObj },
        OR: [
          { fechaFin: null, fechaInicio: fechaObj },
          { fechaFin: { gte: fechaObj } }
        ],
        estado: { in: ['aprobada', 'pendiente'] }
      }
    });
    
    // Aplicar novedades
    let horarioEfectivo = {
      horaInicio: diaPlantilla.horaInicio,
      horaFin: diaPlantilla.horaFin,
      disponible: true,
      novedades: []
    };
    
    for (const novedad of novedades) {
      horarioEfectivo = this.aplicarNovedad(horarioEfectivo, novedad);
    }
    
    return horarioEfectivo;
  }
  
  /**
   * Aplica una novedad al horario base
   */
  aplicarNovedad(horarioBase, novedad) {
    switch (novedad.tipoAfectacion) {
      case 'dia_completo':
        return {
          ...horarioBase,
          disponible: false,
          motivo: `${novedad.tipo}: ${novedad.descripcion}`,
          novedades: [...horarioBase.novedades, novedad]
        };
        
      case 'horas_especificas':
        // Lógica más compleja para horarios parciales
        return this.aplicarNovedadParcial(horarioBase, novedad);
        
      default:
        return horarioBase;
    }
  }
  
  /**
   * Regenera la tabla de disponibilidad para un rango de fechas
   */
  async regenerarDisponibilidad(empleadoId, fechaInicio, dias = 84) {
    const fechaInicioObj = new Date(fechaInicio);
    
    await prisma.$transaction(async (tx) => {
      // Limpiar disponibilidad existente
      await tx.disponibilidadEmpleado.deleteMany({
        where: {
          empleadoId: Number(empleadoId),
          fecha: { gte: fechaInicioObj }
        }
      });
      
      // Generar disponibilidad día por día
      for (let i = 0; i < dias; i++) {
        const fecha = new Date(fechaInicioObj);
        fecha.setDate(fecha.getDate() + i);
        
        const horarioEfectivo = await this.obtenerHorarioEfectivo(empleadoId, fecha);
        
        await tx.disponibilidadEmpleado.create({
          data: {
            empleadoId: Number(empleadoId),
            fecha,
            horaInicio: horarioEfectivo?.horaInicio || null,
            horaFin: horarioEfectivo?.horaFin || null,
            disponible: horarioEfectivo?.disponible || false,
            motivo: horarioEfectivo?.motivo || null
          }
        });
      }
    });
  }
  
  /**
   * Valida que no haya solapamientos de horarios
   */
  async validarSolapamientos(empleadoId, fechaInicio) {
    const plantillaExistente = await prisma.plantillaHorario.findFirst({
      where: {
        empleadoId: Number(empleadoId),
        activa: true,
        fechaInicio: { lte: new Date(fechaInicio) },
        OR: [
          { fechaFin: null },
          { fechaFin: { gte: new Date(fechaInicio) } }
        ]
      }
    });
    
    if (plantillaExistente) {
      throw new Error('Ya existe una plantilla activa para este período');
    }
  }
}

module.exports = new ScheduleService();