-- Ejecutar en la base de datos si no usas prisma migrate
ALTER TABLE "Usuarios"
ADD COLUMN IF NOT EXISTS "registro_via_google" BOOLEAN NOT NULL DEFAULT false;
