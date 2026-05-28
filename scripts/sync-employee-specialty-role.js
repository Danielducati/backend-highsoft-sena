// Script para sincronizar especialidades de empleados con roles de usuarios
const prisma = require('../src/config/prisma');

// Mapeo entre especialidades (categorías) y roles
const ESPECIALIDAD_A_ROL = {
  "Barbería": "Barbero",
  "Cosmetología": "Cosmetóloga",
  "Estilismo": "Estilista",
  "Cabello": "Estilista",
  "Manicura": "Manicurista",
  "Uñas": "Manicurista",
  "Masajes": "Masajista",
};

const ROL_A_ESPECIALIDAD = {
  "Barbero": "Barbería",
  "Cosmetóloga": "Cosmetología",
  "Estilista": "Estilismo",
  "Manicurista": "Manicura",
  "Masajista": "Masajes",
};

async function syncEmployeeSpecialtyWithRole() {
  console.log('🔄 Iniciando sincronización de especialidades y roles...\n');

  try {
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

    console.log(`📊 Total de empleados encontrados: ${empleados.length}\n`);

    let sincronizados = 0;
    let sinCambios = 0;
    let errores = 0;

    for (const empleado of empleados) {
      if (!empleado.usuario) {
        console.log(`⚠️  Empleado ${empleado.id} (${empleado.nombre} ${empleado.apellido}) no tiene usuario asociado`);
        errores++;
        continue;
      }

      const rolActual = empleado.usuario.rol.nombre;
      const especialidadActual = empleado.especialidad;
      const especialidadEsperada = ROL_A_ESPECIALIDAD[rolActual] || rolActual;

      console.log(`👤 ${empleado.nombre} ${empleado.apellido}:`);
      console.log(`   Rol actual: ${rolActual}`);
      console.log(`   Especialidad actual: ${especialidadActual || '(vacía)'}`);
      console.log(`   Especialidad esperada: ${especialidadEsperada}`);

      // Si la especialidad no coincide con el rol, actualizarla
      if (especialidadActual !== especialidadEsperada) {
        try {
          await prisma.empleado.update({
            where: { id: empleado.id },
            data: { especialidad: especialidadEsperada }
          });
          console.log(`   ✅ Actualizado: ${especialidadActual || '(vacía)'} → ${especialidadEsperada}\n`);
          sincronizados++;
        } catch (error) {
          console.log(`   ❌ Error al actualizar: ${error.message}\n`);
          errores++;
        }
      } else {
        console.log(`   ✓ Ya está sincronizado\n`);
        sinCambios++;
      }
    }

    console.log('\n📈 Resumen de la sincronización:');
    console.log(`   ✅ Sincronizados: ${sincronizados}`);
    console.log(`   ✓ Sin cambios: ${sinCambios}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📊 Total procesados: ${empleados.length}`);

  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
syncEmployeeSpecialtyWithRole()
  .then(() => {
    console.log('\n✅ Sincronización completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
