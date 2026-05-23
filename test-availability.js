// Script de prueba para validar disponibilidad de empleados
// Ejecutar con: node test-availability.js

const { checkEmployeeAvailability } = require('./src/utils/employeeAvailability');

async function testAvailability() {
  console.log('🧪 Iniciando pruebas de disponibilidad...\n');

  try {
    // Test 1: Empleado sin novedades
    console.log('Test 1: Empleado sin novedades');
    const result1 = await checkEmployeeAvailability(1, '2026-05-30', '10:00', 60);
    console.log('Resultado:', result1);
    console.log('---\n');

    // Test 2: Empleado con novedad (ajusta el ID según tu base de datos)
    console.log('Test 2: Empleado con novedad');
    const result2 = await checkEmployeeAvailability(1, '2026-05-28', '10:00', 60);
    console.log('Resultado:', result2);
    console.log('---\n');

    // Test 3: Empleado con novedad en rango horario específico
    console.log('Test 3: Empleado con novedad en rango horario');
    const result3 = await checkEmployeeAvailability(1, '2026-05-28', '14:00', 60);
    console.log('Resultado:', result3);
    console.log('---\n');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    process.exit(0);
  }
}

testAvailability();
