-- Agregar columna FK_id_rol a la tabla Categoria_servicios
ALTER TABLE "Categoria_servicios" 
ADD COLUMN "FK_id_rol" INTEGER;

-- Agregar foreign key constraint
ALTER TABLE "Categoria_servicios"
ADD CONSTRAINT "Categoria_servicios_FK_id_rol_fkey" 
FOREIGN KEY ("FK_id_rol") 
REFERENCES "Roles"("PK_id_rol") 
ON UPDATE NO ACTION;

-- Comentario: Esta columna asocia cada categoría con un rol de empleado
COMMENT ON COLUMN "Categoria_servicios"."FK_id_rol" IS 'Rol asociado a esta categoría (Barbero, Cosmetóloga, etc.)';
