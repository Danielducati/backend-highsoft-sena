// Script para agregar el campo rolId a la tabla Categoria_servicios
const prisma = require('../src/config/prisma');

async function addRolToCategoria() {
  console.log('🔄 Agregando campo rolId a Categoria_servicios...\n');

  try {
    // Ejecutar la migración SQL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Categoria_servicios" 
      ADD COLUMN IF NOT EXISTS "FK_id_rol" INTEGER;
    `);
    
    console.log('✅ Columna FK_id_rol agregada exitosamente');

    // Agregar la foreign key constraint
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'Categoria_servicios_FK_id_rol_fkey'
        ) THEN
          ALTER TABLE "Categoria_servicios"
          ADD CONSTRAINT "Categoria_servicios_FK_id_rol_fkey" 
          FOREIGN KEY ("FK_id_rol") 
          REFERENCES "Roles"("PK_id_rol") 
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    
    console.log('✅ Foreign key constraint agregada exitosamente');
    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Ejecuta: npx prisma generate');
    console.log('2. Reinicia el backend');
    console.log('3. Descomenta el código del formulario en CategoryFormDialog.tsx');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.error('\nDetalles:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
addRolToCategoria()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
