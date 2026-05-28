// src/controllers/sync.controller.js
const prisma = require("../config/prisma");

// Mapeo entre roles y especialidades - AHORA SON IGUALES
const ROL_A_ESPECIALIDAD = {
  "Barbero": "Barbero",
  "Cosmetóloga": "Cosmetóloga",
  "Estilista": "Estilista",
  "Manicurista": "Manicurista",
  "Masajista": "Masajista",
};

/**
 * Sincroniza las especialidades de todos los empleados con sus roles de usuario
 * GET /api/sync/employee-specialty-role
 */
const syncEmployeeSpecialtyWithRole = async (req, res) => {
  try {
    console.log('🔄 Iniciando sincronización de especialidades y roles...');

    // Obtener todos los empleados con sus usuarios
    const empleados = await prisma.empleado.findMany({
      include: {
        usuario: {
          include: {
            rol: true
          }
        }
      }
    });

    console.log(`📊 Total de empleados encontrados: ${empleados.length}`);

    const resultados = {
      total: empleados.length,
      sincronizados: 0,
      sinCambios: 0,
      errores: 0,
      detalles: []
    };

    for (const empleado of empleados) {
      if (!empleado.usuario) {
        resultados.errores++;
        resultados.detalles.push({
          id: empleado.id,
          nombre: `${empleado.nombre} ${empleado.apellido}`,
          estado: 'error',
          mensaje: 'No tiene usuario asociado'
        });
        continue;
      }

      const rolActual = empleado.usuario.rol.nombre;
      const especialidadActual = empleado.especialidad;
      const especialidadEsperada = ROL_A_ESPECIALIDAD[rolActual] || rolActual;

      // Si la especialidad no coincide con el rol, actualizarla
      if (especialidadActual !== especialidadEsperada) {
        try {
          await prisma.empleado.update({
            where: { id: empleado.id },
            data: { especialidad: especialidadEsperada }
          });
          
          resultados.sincronizados++;
          resultados.detalles.push({
            id: empleado.id,
            nombre: `${empleado.nombre} ${empleado.apellido}`,
            estado: 'actualizado',
            rolActual,
            especialidadAnterior: especialidadActual || '(vacía)',
            especialidadNueva: especialidadEsperada
          });
        } catch (error) {
          resultados.errores++;
          resultados.detalles.push({
            id: empleado.id,
            nombre: `${empleado.nombre} ${empleado.apellido}`,
            estado: 'error',
            mensaje: error.message
          });
        }
      } else {
        resultados.sinCambios++;
        resultados.detalles.push({
          id: empleado.id,
          nombre: `${empleado.nombre} ${empleado.apellido}`,
          estado: 'sin_cambios',
          rol: rolActual,
          especialidad: especialidadActual
        });
      }
    }

    console.log('✅ Sincronización completada:', resultados);

    res.json({
      mensaje: 'Sincronización completada exitosamente',
      ...resultados
    });

  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
    res.status(500).json({ 
      error: 'Error durante la sincronización',
      detalles: error.message 
    });
  }
};

module.exports = { syncEmployeeSpecialtyWithRole };
