// src/utils/employeeAvailability.js
const prisma = require("../config/prisma");

/**
 * Valida si un empleado está disponible en una fecha y hora específica
 * considerando sus novedades registradas.
 * 
 * @param {number} empleadoId - ID del empleado
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {string} horaInicio - Hora de inicio en formato HH:MM
 * @param {number} duracionMinutos - Duración del servicio en minutos
 * @returns {Promise<{available: boolean, reason?: string, novedad?: object}>}
 */
async function checkEmployeeAvailability(empleadoId, fecha, horaInicio, duracionMinutos) {
  try {
    const fechaDate = new Date(fecha + "T00:00:00.000Z");
    
    console.log(`🔍 Validando disponibilidad:`, {
      empleadoId,
      fecha,
      horaInicio,
      duracionMinutos,
      fechaDate: fechaDate.toISOString()
    });
    
    // Convertir hora de inicio y calcular hora de fin
    const nuevaInicio = new Date(`1970-01-01T${horaInicio}:00.000Z`);
    const nuevaFin = new Date(nuevaInicio.getTime() + duracionMinutos * 60000);

    console.log(`⏰ Rango horario de la cita:`, {
      inicio: nuevaInicio.toISOString().slice(11, 16),
      fin: nuevaFin.toISOString().slice(11, 16)
    });

    // Buscar novedades del empleado que afecten esta fecha
    // Estados que bloquean: "pendiente", "Activo", "Aprobada", "aprobada"
    const novedades = await prisma.novedad.findMany({
      where: {
        horario: {
          empleadoId: empleadoId,
        },
        estado: {
          in: ["pendiente", "Activo", "Aprobada", "aprobada"] // Incluir todas las variaciones
        },
        OR: [
          // Novedad con rango de fechas
          {
            fechaInicio: { lte: fechaDate },
            fechaFinal: { gte: fechaDate },
          },
          // Novedad sin fecha final (indefinida)
          {
            fechaInicio: { lte: fechaDate },
            fechaFinal: null,
          },
        ],
      },
      include: {
        horario: {
          include: {
            empleado: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
        },
      },
    });

    console.log(`📋 Novedades encontradas: ${novedades.length}`);
    novedades.forEach(n => {
      console.log(`  - Novedad #${n.id}:`, {
        tipo: n.tipoNovedad,
        estado: n.estado,
        fechaInicio: n.fechaInicio?.toISOString().split("T")[0],
        fechaFinal: n.fechaFinal?.toISOString().split("T")[0],
        horaInicio: n.horaInicio?.toISOString().slice(11, 16),
        horaFinal: n.horaFinal?.toISOString().slice(11, 16),
      });
    });

    // Si no hay novedades, el empleado está disponible
    if (novedades.length === 0) {
      console.log(`✅ Empleado disponible (sin novedades)`);
      return { available: true };
    }

    // Validar cada novedad
    for (const novedad of novedades) {
      const empleadoNombre = novedad.horario?.empleado 
        ? `${novedad.horario.empleado.nombre} ${novedad.horario.empleado.apellido}`
        : `Empleado #${empleadoId}`;

      // Si la novedad tiene rango horario específico, validar solapamiento
      if (novedad.horaInicio && novedad.horaFinal) {
        const hi = new Date(novedad.horaInicio);
        const hf = new Date(novedad.horaFinal);
        
        const novedadInicio = new Date(
          `1970-01-01T${String(hi.getUTCHours()).padStart(2, "0")}:${String(hi.getUTCMinutes()).padStart(2, "0")}:00.000Z`
        );
        const novedadFin = new Date(
          `1970-01-01T${String(hf.getUTCHours()).padStart(2, "0")}:${String(hf.getUTCMinutes()).padStart(2, "0")}:00.000Z`
        );

        console.log(`  🔍 Validando solapamiento:`, {
          novedadInicio: novedadInicio.toISOString().slice(11, 16),
          novedadFin: novedadFin.toISOString().slice(11, 16),
          citaInicio: nuevaInicio.toISOString().slice(11, 16),
          citaFin: nuevaFin.toISOString().slice(11, 16),
        });

        // Verificar solapamiento de horarios
        const overlap = nuevaInicio < novedadFin && nuevaFin > novedadInicio;
        
        console.log(`  ${overlap ? '❌ HAY SOLAPAMIENTO' : '✅ No hay solapamiento'}`);
        
        if (overlap) {
          return {
            available: false,
            reason: `${empleadoNombre} tiene una ${novedad.tipoNovedad || "novedad"} de ${novedadInicio.toISOString().slice(11, 16)} a ${novedadFin.toISOString().slice(11, 16)}`,
            novedad: {
              id: novedad.id,
              tipo: novedad.tipoNovedad,
              horaInicio: novedadInicio.toISOString().slice(11, 16),
              horaFinal: novedadFin.toISOString().slice(11, 16),
              descripcion: novedad.descripcion,
            },
          };
        }
      } else {
        // Sin rango horario específico → bloquea todo el día
        console.log(`  ❌ Novedad bloquea todo el día`);
        return {
          available: false,
          reason: `${empleadoNombre} no está disponible ese día por ${novedad.tipoNovedad || "una novedad"}`,
          novedad: {
            id: novedad.id,
            tipo: novedad.tipoNovedad,
            descripcion: novedad.descripcion,
            bloqueaDia: true,
          },
        };
      }
    }

    // Si llegamos aquí, no hubo conflictos
    console.log(`✅ Empleado disponible (sin conflictos)`);
    return { available: true };

  } catch (error) {
    console.error("❌ Error verificando disponibilidad del empleado:", error);
    throw error;
  }
}

/**
 * Valida disponibilidad de múltiples empleados para una cita
 * 
 * @param {Array<{empleadoId: number, servicioId: number}>} asignaciones - Array de empleados y servicios
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {string} horaInicio - Hora de inicio en formato HH:MM
 * @returns {Promise<{available: boolean, conflicts: Array}>}
 */
async function checkMultipleEmployeesAvailability(asignaciones, fecha, horaInicio) {
  try {
    // Obtener duraciones de los servicios
    const servicioIds = asignaciones.map(a => a.servicioId);
    const servicios = await prisma.servicio.findMany({
      where: { id: { in: servicioIds } },
      select: { id: true, duracion: true },
    });

    const duracionMap = Object.fromEntries(
      servicios.map(s => [s.id, s.duracion || 60])
    );

    const conflicts = [];

    // Agrupar por empleado para calcular duración total
    const empleadoMap = new Map();
    for (const asig of asignaciones) {
      if (!empleadoMap.has(asig.empleadoId)) {
        empleadoMap.set(asig.empleadoId, []);
      }
      empleadoMap.get(asig.empleadoId).push(asig.servicioId);
    }

    // Validar cada empleado
    for (const [empleadoId, servicioIds] of empleadoMap.entries()) {
      const duracionTotal = servicioIds.reduce(
        (sum, sId) => sum + (duracionMap[sId] || 60),
        0
      );

      const result = await checkEmployeeAvailability(
        empleadoId,
        fecha,
        horaInicio,
        duracionTotal
      );

      if (!result.available) {
        conflicts.push({
          empleadoId,
          ...result,
        });
      }
    }

    return {
      available: conflicts.length === 0,
      conflicts,
    };

  } catch (error) {
    console.error("Error validando múltiples empleados:", error);
    throw error;
  }
}

/**
 * Obtiene los tipos de novedad que bloquean completamente al empleado
 * vs los que solo bloquean parcialmente
 */
const TIPOS_NOVEDAD_BLOQUEANTES = {
  // Bloquean todo el día (sin importar hora) - solo si NO tienen rango horario
  BLOQUEO_COMPLETO: ["incapacidad", "permiso", "vacaciones", "otro"],
  
  // Bloquean según el rango horario especificado (si tienen horas) o todo el día (si no tienen horas)
  BLOQUEO_CONDICIONAL: ["retraso", "ausencia"],
  
  // Bloquean solo el rango horario especificado
  BLOQUEO_PARCIAL: ["percance"],
};

/**
 * Determina si un tipo de novedad bloquea todo el día o solo un rango horario
 */
function isFullDayBlock(tipoNovedad, tieneRangoHorario) {
  const tipo = (tipoNovedad || "").toLowerCase();
  
  // Si es de bloqueo completo, siempre bloquea todo el día
  if (TIPOS_NOVEDAD_BLOQUEANTES.BLOQUEO_COMPLETO.includes(tipo)) {
    return true;
  }
  
  // Si es de bloqueo condicional (retraso, ausencia), depende de si tiene rango horario
  if (TIPOS_NOVEDAD_BLOQUEANTES.BLOQUEO_CONDICIONAL.includes(tipo)) {
    return !tieneRangoHorario; // Bloquea todo el día solo si NO tiene rango horario
  }
  
  // Si es de bloqueo parcial, nunca bloquea todo el día
  return false;
}

module.exports = {
  checkEmployeeAvailability,
  checkMultipleEmployeesAvailability,
  isFullDayBlock,
  TIPOS_NOVEDAD_BLOQUEANTES,
};
