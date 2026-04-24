// src/services/ScheduleHistoryService.js
const prisma = require("../config/prisma");

class ScheduleHistoryService {
  
  /**
   * Guarda el horario actual en el historial antes de actualizarlo
   * @param {number} empleadoId - ID del empleado
   * @param {string} weekStartDate - Fecha de inicio de semana (YYYY-MM-DD)
   * @param {string} changeReason - Razón del cambio
   * @param {number} changedBy - ID del usuario que hace el cambio
   */
  async saveToHistory(empleadoId, weekStartDate, changeReason = null, changedBy = null) {
    try {
      // 1. Obtener el horario actual de esa semana
      const currentSchedule = await this.getCurrentWeekSchedule(empleadoId, weekStartDate);
      
      if (!currentSchedule || currentSchedule.length === 0) {
        console.log(`No hay horario existente para empleado ${empleadoId} en semana ${weekStartDate}`);
        return null;
      }

      // 2. Obtener el siguiente número de versión
      const nextVersion = await this.getNextVersionNumber(empleadoId, weekStartDate);

      // 3. Crear snapshot del horario
      const scheduleSnapshot = JSON.stringify({
        employeeId: empleadoId,
        weekStartDate: weekStartDate,
        daySchedules: currentSchedule.map(h => ({
          dayIndex: this.getDayIndex(h.fecha),
          fecha: h.fecha.toISOString().split('T')[0],
          startTime: h.horaInicio.toISOString().slice(11, 16),
          endTime: h.horaFinal.toISOString().slice(11, 16),
          diaSemana: h.diaSemana
        })),
        savedAt: new Date().toISOString()
      });

      // 4. Guardar en historial
      const historyRecord = await prisma.horarioHistorial.create({
        data: {
          empleadoId: Number(empleadoId),
          weekStartDate: new Date(weekStartDate),
          versionNumber: nextVersion,
          changeReason: changeReason,
          changedBy: changedBy,
          scheduleSnapshot: scheduleSnapshot
        }
      });

      console.log("📅 HISTORIAL DE HORARIO GUARDADO:", {
        id: historyRecord.id,
        empleadoId,
        weekStartDate,
        version: nextVersion,
        reason: changeReason
      });

      return historyRecord;

    } catch (error) {
      console.error("Error guardando historial de horario:", error);
      throw error;
    }
  }

  /**
   * Obtiene el horario actual de una semana específica
   */
  async getCurrentWeekSchedule(empleadoId, weekStartDate) {
    const monday = this.buildFecha(weekStartDate, 0);
    const sunday = this.buildFecha(weekStartDate, 6);

    return await prisma.horario.findMany({
      where: {
        empleadoId: Number(empleadoId),
        fecha: { gte: monday, lte: sunday }
      },
      orderBy: { fecha: 'asc' }
    });
  }

  /**
   * Obtiene el siguiente número de versión para un empleado y semana
   */
  async getNextVersionNumber(empleadoId, weekStartDate) {
    const lastVersion = await prisma.horarioHistorial.findFirst({
      where: { 
        empleadoId: Number(empleadoId), 
        weekStartDate: new Date(weekStartDate) 
      },
      orderBy: { versionNumber: 'desc' }
    });
    
    return (lastVersion?.versionNumber || 0) + 1;
  }

  /**
   * Obtiene el historial de cambios de un empleado
   */
  async getEmployeeHistory(empleadoId, limit = 10) {
    return await prisma.horarioHistorial.findMany({
      where: { empleadoId: Number(empleadoId) },
      include: { 
        empleado: { select: { nombre: true, apellido: true } },
        usuario: { select: { correo: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Obtiene el historial de una semana específica
   */
  async getWeekHistory(empleadoId, weekStartDate) {
    return await prisma.horarioHistorial.findMany({
      where: { 
        empleadoId: Number(empleadoId),
        weekStartDate: new Date(weekStartDate)
      },
      include: { 
        empleado: { select: { nombre: true, apellido: true } },
        usuario: { select: { correo: true } }
      },
      orderBy: { versionNumber: 'desc' }
    });
  }

  /**
   * Restaura un horario desde el historial
   */
  async restoreFromHistory(historyId, restoredBy = null) {
    const historyRecord = await prisma.horarioHistorial.findUnique({
      where: { id: historyId }
    });
    
    if (!historyRecord) {
      throw new Error('Registro de historial no encontrado');
    }

    const snapshot = JSON.parse(historyRecord.scheduleSnapshot);
    
    // Guardar el horario actual antes de restaurar
    await this.saveToHistory(
      historyRecord.empleadoId,
      historyRecord.weekStartDate.toISOString().split('T')[0],
      `Restaurado desde versión ${historyRecord.versionNumber}`,
      restoredBy
    );

    // TODO: Implementar lógica de restauración completa
    // Esto requeriría recrear los registros de Horario basados en el snapshot
    
    console.log(`Restaurando horario desde historial ID: ${historyId}`);
    return historyRecord;
  }

  /**
   * Compara dos versiones de horario
   */
  async compareVersions(historyId1, historyId2) {
    // TODO: Implementar comparación detallada
    console.log(`Comparando versiones ${historyId1} vs ${historyId2}`);
    return {
      changes: [],
      summary: "Comparación no implementada aún"
    };
  }

  // Funciones auxiliares
  buildFecha(weekStartDate, dayIndex) {
    const [y, m, d] = weekStartDate.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + dayIndex));
  }

  getDayIndex(fecha) {
    const dayOfWeek = fecha.getUTCDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lunes = 0, Domingo = 6
  }

  /**
   * Obtiene estadísticas del historial
   */
  async getHistoryStats(empleadoId) {
    const totalChanges = await prisma.horarioHistorial.count({
      where: { empleadoId: Number(empleadoId) }
    });

    const lastChange = await prisma.horarioHistorial.findFirst({
      where: { empleadoId: Number(empleadoId) },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, changeReason: true }
    });

    // Semana con más cambios
    const weekChanges = await prisma.horarioHistorial.groupBy({
      by: ['weekStartDate'],
      where: { empleadoId: Number(empleadoId) },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1
    });

    return {
      totalChanges,
      lastChange: lastChange ? {
        date: lastChange.createdAt,
        reason: lastChange.changeReason
      } : null,
      mostActiveWeek: weekChanges[0] ? {
        week: weekChanges[0].weekStartDate,
        changes: weekChanges[0]._count.id
      } : null,
      changeFrequency: totalChanges > 0 ? totalChanges / 30 : 0 // Promedio por mes
    };
  }
}

module.exports = new ScheduleHistoryService();