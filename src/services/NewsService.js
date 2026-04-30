// src/services/NewsService.js
const prisma = require("../config/prisma");
const ScheduleService = require("./ScheduleService");

class NewsService {
  
  /**
   * Crea una novedad validando contra el horario base del empleado
   */
  async crearNovedad(data) {
    const { empleadoId, tipo, fechaInicio, fechaFin, horaInicio, horaFin, descripcion } = data;
    
    // 1. Validar que el empleado tenga horario base
    await this.validarHorarioBase(empleadoId, fechaInicio);
    
    // 2. Validar que la novedad esté dentro del horario laboral (si es parcial)
    if (horaInicio && horaFin) {
      await this.validarHorarioLaboral(empleadoId, fechaInicio, horaInicio, horaFin);
    }
    
    // 3. Detectar conflictos con citas existentes
    const conflictos = await this.detectarConflictosCitas(empleadoId, fechaInicio, fechaFin, horaInicio, horaFin);
    
    if (conflictos.length > 0) {
      return {
        success: false,
        conflict: true,
        message: 'Existen citas programadas en el horario de la novedad',
        conflictos
      };
    }
    
    // 4. Crear la novedad
    const novedad = await prisma.novedad.create({
      data: {
        empleadoId: Number(empleadoId),
        tipo,
        fechaInicio: new Date(fechaInicio),
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        horaInicio: horaInicio ? new Date(`1970-01-01T${horaInicio}:00`) : null,
        horaFin: horaFin ? new Date(`1970-01-01T${horaFin}:00`) : null,
        descripcion,
        estado: 'pendiente',
        tipoAfectacion: this.determinarTipoAfectacion(horaInicio, horaFin, fechaFin)
      }
    });
    
    // 5. Regenerar disponibilidad afectada
    await this.regenerarDisponibilidadAfectada(empleadoId, fechaInicio, fechaFin);
    
    return {
      success: true,
      novedadId: novedad.id
    };
  }
  
  /**
   * Valida que el empleado tenga un horario base definido
   */
  async validarHorarioBase(empleadoId, fecha) {
    const horario = await ScheduleService.obtenerHorarioEfectivo(empleadoId, fecha);
    
    if (!horario) {
      throw new Error('El empleado no tiene horario definido para esta fecha. Debe crear primero una plantilla de horario semanal.');
    }
    
    return horario;
  }
  
  /**
   * Valida que la novedad parcial esté dentro del horario laboral
   */
  async validarHorarioLaboral(empleadoId, fecha, horaInicio, horaFin) {
    const horarioBase = await ScheduleService.obtenerHorarioEfectivo(empleadoId, fecha);
    
    if (!horarioBase || !horarioBase.disponible) {
      throw new Error('El empleado no está disponible en esta fecha');
    }
    
    const inicioNovedad = new Date(`1970-01-01T${horaInicio}:00`);
    const finNovedad = new Date(`1970-01-01T${horaFin}:00`);
    
    if (inicioNovedad < horarioBase.horaInicio || finNovedad > horarioBase.horaFin) {
      throw new Error('La novedad debe estar dentro del horario laboral del empleado');
    }
  }
  
  /**
   * Detecta conflictos con citas existentes
   */
  async detectarConflictosCitas(empleadoId, fechaInicio, fechaFin, horaInicio, horaFin) {
    const fechaInicioObj = new Date(fechaInicio);
    const fechaFinObj = fechaFin ? new Date(fechaFin) : fechaInicioObj;
    
    const whereClause = {
      empleadoId: Number(empleadoId),
      cita: {
        fecha: { gte: fechaInicioObj, lte: fechaFinObj },
        estado: { in: ['Pendiente', 'Confirmada'] }
      }
    };
    
    // Si es novedad parcial, filtrar también por horas
    if (horaInicio && horaFin) {
      const horaInicioObj = new Date(`1970-01-01T${horaInicio}:00`);
      const horaFinObj = new Date(`1970-01-01T${horaFin}:00`);
      
      whereClause.cita.horario = {
        gte: horaInicioObj,
        lte: horaFinObj
      };
    }
    
    const citasConflicto = await prisma.agendamientoDetalle.findMany({
      where: whereClause,
      include: {
        cita: {
          include: { cliente: true }
        },
        servicio: true
      }
    });
    
    return citasConflicto.map(detalle => ({
      citaId: detalle.citaId,
      clienteNombre: detalle.cita.cliente 
        ? `${detalle.cita.cliente.nombre} ${detalle.cita.cliente.apellido}`
        : 'Sin cliente',
      fecha: detalle.cita.fecha.toISOString().split('T')[0],
      hora: detalle.cita.horario?.toISOString().slice(11, 16) || '--:--',
      servicio: detalle.servicio?.nombre || 'Servicio',
      precio: detalle.precio
    }));
  }
  
  /**
   * Determina el tipo de afectación de la novedad
   */
  determinarTipoAfectacion(horaInicio, horaFin, fechaFin) {
    if (fechaFin) {
      return 'multiple_dias';
    } else if (horaInicio && horaFin) {
      return 'horas_especificas';
    } else {
      return 'dia_completo';
    }
  }
  
  /**
   * Regenera la disponibilidad para las fechas afectadas por la novedad
   */
  async regenerarDisponibilidadAfectada(empleadoId, fechaInicio, fechaFin) {
    const fechaInicioObj = new Date(fechaInicio);
    const fechaFinObj = fechaFin ? new Date(fechaFin) : fechaInicioObj;
    
    // Calcular días afectados
    const diasAfectados = Math.ceil((fechaFinObj - fechaInicioObj) / (1000 * 60 * 60 * 24)) + 1;
    
    await ScheduleService.regenerarDisponibilidad(empleadoId, fechaInicio, diasAfectados);
  }
  
  /**
   * Resuelve conflictos con citas (cancelar o reasignar)
   */
  async resolverConflictos(novedadId, accion, datosAdicionales = {}) {
    const novedad = await prisma.novedad.findUnique({
      where: { id: Number(novedadId) }
    });
    
    if (!novedad) {
      throw new Error('Novedad no encontrada');
    }
    
    const conflictos = await this.detectarConflictosCitas(
      novedad.empleadoId,
      novedad.fechaInicio,
      novedad.fechaFin,
      novedad.horaInicio?.toISOString().slice(11, 16),
      novedad.horaFin?.toISOString().slice(11, 16)
    );
    
    await prisma.$transaction(async (tx) => {
      for (const conflicto of conflictos) {
        switch (accion) {
          case 'cancelar':
            await tx.agendamientoCita.update({
              where: { id: conflicto.citaId },
              data: { estado: 'Cancelada' }
            });
            break;
            
          case 'reasignar':
            if (!datosAdicionales.nuevoEmpleadoId) {
              throw new Error('Debe especificar el nuevo empleado para reasignar');
            }
            
            await tx.agendamientoDetalle.updateMany({
              where: { 
                citaId: conflicto.citaId,
                empleadoId: novedad.empleadoId
              },
              data: { empleadoId: Number(datosAdicionales.nuevoEmpleadoId) }
            });
            break;
            
          default:
            throw new Error('Acción no válida');
        }
      }
      
      // Aprobar la novedad
      await tx.novedad.update({
        where: { id: novedadId },
        data: { estado: 'aprobada' }
      });
    });
    
    // Regenerar disponibilidad
    await this.regenerarDisponibilidadAfectada(
      novedad.empleadoId,
      novedad.fechaInicio,
      novedad.fechaFin
    );
  }
  
  /**
   * Obtiene la disponibilidad de un empleado para un rango de fechas
   */
  async obtenerDisponibilidad(empleadoId, fechaInicio, fechaFin) {
    return await prisma.disponibilidadEmpleado.findMany({
      where: {
        empleadoId: Number(empleadoId),
        fecha: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      },
      orderBy: { fecha: 'asc' }
    });
  }
}

module.exports = new NewsService();