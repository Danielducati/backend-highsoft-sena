-- CreateTable
CREATE TABLE "Roles" (
    "PK_id_rol" SERIAL NOT NULL,
    "Nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "Estado" VARCHAR(30) NOT NULL DEFAULT 'Activo',

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("PK_id_rol")
);

-- CreateTable
CREATE TABLE "Permisos" (
    "PK_id_permisos" SERIAL NOT NULL,
    "Nombre" VARCHAR(100) NOT NULL,

    CONSTRAINT "Permisos_pkey" PRIMARY KEY ("PK_id_permisos")
);

-- CreateTable
CREATE TABLE "Roles_Permisos" (
    "PK_id_roles_permisos" SERIAL NOT NULL,
    "FK_id_rol" INTEGER NOT NULL,
    "FK_id_permiso" INTEGER NOT NULL,

    CONSTRAINT "Roles_Permisos_pkey" PRIMARY KEY ("PK_id_roles_permisos")
);

-- CreateTable
CREATE TABLE "Usuarios" (
    "PK_id_usuario" SERIAL NOT NULL,
    "Correo" VARCHAR(100) NOT NULL,
    "Contrasena" VARCHAR(256) NOT NULL,
    "Estado" VARCHAR(30) NOT NULL DEFAULT 'Activo',
    "FK_id_rol" INTEGER NOT NULL,
    "foto_perfil" TEXT,
    "nombre" VARCHAR(100),
    "apellido" VARCHAR(100),
    "telefono" VARCHAR(20),

    CONSTRAINT "Usuarios_pkey" PRIMARY KEY ("PK_id_usuario")
);

-- CreateTable
CREATE TABLE "ResetPasswordToken" (
    "id" SERIAL NOT NULL,
    "FK_id_usuario" INTEGER NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResetPasswordToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "PK_id_empleado" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "tipo_documento" VARCHAR(30),
    "numero_documento" VARCHAR(20),
    "correo" VARCHAR(100),
    "telefono" VARCHAR(20),
    "ciudad" VARCHAR(40),
    "especialidad" VARCHAR(50),
    "direccion" VARCHAR(190),
    "foto_perfil" VARCHAR(500),
    "Estado" VARCHAR(30) NOT NULL DEFAULT 'Activo',
    "fk_id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("PK_id_empleado")
);

-- CreateTable
CREATE TABLE "Horarios" (
    "PK_id_horario" SERIAL NOT NULL,
    "FK_id_empleado" INTEGER NOT NULL,
    "hora_inicio" TIME(6) NOT NULL,
    "hora_final" TIME(6) NOT NULL,
    "fecha" DATE NOT NULL,
    "dia_semana" VARCHAR(20),

    CONSTRAINT "Horarios_pkey" PRIMARY KEY ("PK_id_horario")
);

-- CreateTable
CREATE TABLE "Novedades" (
    "PK_id_novedad" SERIAL NOT NULL,
    "FK_id_horario" INTEGER NOT NULL,
    "tipo_novedad" VARCHAR(100),
    "descripcion" VARCHAR(600),
    "fecha_inicio" DATE,
    "fecha_final" DATE,
    "hora_inicio" TIME(6),
    "hora_final" TIME(6),
    "Estado" VARCHAR(30) NOT NULL DEFAULT 'Activo',

    CONSTRAINT "Novedades_pkey" PRIMARY KEY ("PK_id_novedad")
);

-- CreateTable
CREATE TABLE "Categoria_servicios" (
    "PK_id_categoria_servicios" SERIAL NOT NULL,
    "Nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(600),
    "color" VARCHAR(20),
    "Estado" VARCHAR(30) NOT NULL DEFAULT 'Activo',

    CONSTRAINT "Categoria_servicios_pkey" PRIMARY KEY ("PK_id_categoria_servicios")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "PK_id_servicio" SERIAL NOT NULL,
    "FK_categoria_servicios" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(600),
    "Duracion" INTEGER,
    "Precio" DECIMAL(10,2),
    "Estado" VARCHAR(30) NOT NULL DEFAULT 'Activo',
    "imagen_servicio" VARCHAR(500),

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("PK_id_servicio")
);

-- CreateTable
CREATE TABLE "Empleado_Servicio" (
    "PK_id_Empleado_Servicio" SERIAL NOT NULL,
    "FK_id_servicio" INTEGER NOT NULL,
    "FK_id_empleado" INTEGER NOT NULL,

    CONSTRAINT "Empleado_Servicio_pkey" PRIMARY KEY ("PK_id_Empleado_Servicio")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "PK_id_cotizacion" SERIAL NOT NULL,
    "FK_id_cliente" INTEGER,
    "Fecha" DATE,
    "Valor" DECIMAL(10,2),
    "Iva" DECIMAL(10,2),
    "Subtotal" DECIMAL(10,2),
    "Descuento" DECIMAL(10,2),
    "Notas" VARCHAR(900),
    "Hora_inicio" TIME(6),
    "TOTAL" DECIMAL(12,2),
    "Estado" VARCHAR(30) NOT NULL DEFAULT 'Activo',

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("PK_id_cotizacion")
);

-- CreateTable
CREATE TABLE "Detalle_cotizacion" (
    "PK_id_detalle_cotizacion" SERIAL NOT NULL,
    "FK_id_cotizacion" INTEGER NOT NULL,
    "FK_id_servicio" INTEGER NOT NULL,
    "Precio" DECIMAL(10,2),
    "Cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Detalle_cotizacion_pkey" PRIMARY KEY ("PK_id_detalle_cotizacion")
);

-- CreateTable
CREATE TABLE "Agendamiento_citas" (
    "PK_id_cita" SERIAL NOT NULL,
    "FK_id_cliente" INTEGER,
    "FK_id_cotizacion" INTEGER,
    "Horario" TIME(6),
    "Fecha" DATE NOT NULL,
    "Estado" VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    "Notas" VARCHAR(300),

    CONSTRAINT "Agendamiento_citas_pkey" PRIMARY KEY ("PK_id_cita")
);

-- CreateTable
CREATE TABLE "Agendamiento_detalle" (
    "PK_id_agendamiento_detalle" SERIAL NOT NULL,
    "FK_id_agendamiento_cita" INTEGER NOT NULL,
    "FK_id_servicios" INTEGER NOT NULL,
    "FK_id_empleado" INTEGER,
    "Precio" DECIMAL(10,2),
    "Detalle" VARCHAR(500),

    CONSTRAINT "Agendamiento_detalle_pkey" PRIMARY KEY ("PK_id_agendamiento_detalle")
);

-- CreateTable
CREATE TABLE "Venta_detalle" (
    "PK_id_venta_detalle" SERIAL NOT NULL,
    "FK_id_venta" INTEGER NOT NULL,
    "FK_id_servicio" INTEGER,
    "FK_id_empleado" INTEGER,
    "Cantidad" INTEGER NOT NULL DEFAULT 1,
    "Precio" DECIMAL(12,2) NOT NULL,
    "Subtotal" DECIMAL(12,2) NOT NULL,
    "Detalle" VARCHAR(500),

    CONSTRAINT "Venta_detalle_pkey" PRIMARY KEY ("PK_id_venta_detalle")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "PK_id_cliente" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "tipo_documento" VARCHAR(30),
    "numero_documento" VARCHAR(20),
    "correo" VARCHAR(100),
    "telefono" VARCHAR(20),
    "direccion" VARCHAR(190),
    "foto_perfil" VARCHAR(500) NOT NULL,
    "Estado" VARCHAR(30) NOT NULL DEFAULT 'Activo',
    "fk_id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("PK_id_cliente")
);

-- CreateTable
CREATE TABLE "Venta" (
    "PK_id_venta" SERIAL NOT NULL,
    "FK_id_cliente" INTEGER,
    "FK_id_cita" INTEGER,
    "Iva" DECIMAL(10,2),
    "Fecha" DATE,
    "Total" DECIMAL(12,2),
    "descuento" DECIMAL(10,2),
    "metodo_pago" VARCHAR(40),
    "Estado" VARCHAR(30) NOT NULL DEFAULT 'Activo',

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("PK_id_venta")
);

-- CreateTable
CREATE TABLE "Horario_Historial" (
    "PK_id_horario_historial" SERIAL NOT NULL,
    "FK_id_empleado" INTEGER NOT NULL,
    "week_start_date" DATE NOT NULL,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "change_reason" VARCHAR(500),
    "changed_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schedule_snapshot" TEXT NOT NULL,

    CONSTRAINT "Horario_Historial_pkey" PRIMARY KEY ("PK_id_horario_historial")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_Correo_key" ON "Usuarios"("Correo");

-- CreateIndex
CREATE UNIQUE INDEX "ResetPasswordToken_token_key" ON "ResetPasswordToken"("token");

-- CreateIndex
CREATE INDEX "ResetPasswordToken_FK_id_usuario_idx" ON "ResetPasswordToken"("FK_id_usuario");

-- CreateIndex
CREATE INDEX "ResetPasswordToken_expiresAt_idx" ON "ResetPasswordToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Horario_Historial_FK_id_empleado_week_start_date_idx" ON "Horario_Historial"("FK_id_empleado", "week_start_date");

-- CreateIndex
CREATE INDEX "Horario_Historial_created_at_idx" ON "Horario_Historial"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Horario_Historial_FK_id_empleado_week_start_date_version_nu_key" ON "Horario_Historial"("FK_id_empleado", "week_start_date", "version_number");

-- AddForeignKey
ALTER TABLE "Roles_Permisos" ADD CONSTRAINT "Roles_Permisos_FK_id_permiso_fkey" FOREIGN KEY ("FK_id_permiso") REFERENCES "Permisos"("PK_id_permisos") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Roles_Permisos" ADD CONSTRAINT "Roles_Permisos_FK_id_rol_fkey" FOREIGN KEY ("FK_id_rol") REFERENCES "Roles"("PK_id_rol") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Usuarios" ADD CONSTRAINT "Usuarios_FK_id_rol_fkey" FOREIGN KEY ("FK_id_rol") REFERENCES "Roles"("PK_id_rol") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ResetPasswordToken" ADD CONSTRAINT "ResetPasswordToken_FK_id_usuario_fkey" FOREIGN KEY ("FK_id_usuario") REFERENCES "Usuarios"("PK_id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empleado" ADD CONSTRAINT "Empleado_fk_id_usuario_fkey" FOREIGN KEY ("fk_id_usuario") REFERENCES "Usuarios"("PK_id_usuario") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Horarios" ADD CONSTRAINT "Horarios_FK_id_empleado_fkey" FOREIGN KEY ("FK_id_empleado") REFERENCES "Empleado"("PK_id_empleado") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Novedades" ADD CONSTRAINT "Novedades_FK_id_horario_fkey" FOREIGN KEY ("FK_id_horario") REFERENCES "Horarios"("PK_id_horario") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_FK_categoria_servicios_fkey" FOREIGN KEY ("FK_categoria_servicios") REFERENCES "Categoria_servicios"("PK_id_categoria_servicios") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Empleado_Servicio" ADD CONSTRAINT "Empleado_Servicio_FK_id_empleado_fkey" FOREIGN KEY ("FK_id_empleado") REFERENCES "Empleado"("PK_id_empleado") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Empleado_Servicio" ADD CONSTRAINT "Empleado_Servicio_FK_id_servicio_fkey" FOREIGN KEY ("FK_id_servicio") REFERENCES "Servicio"("PK_id_servicio") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_FK_id_cliente_fkey" FOREIGN KEY ("FK_id_cliente") REFERENCES "Cliente"("PK_id_cliente") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Detalle_cotizacion" ADD CONSTRAINT "Detalle_cotizacion_FK_id_cotizacion_fkey" FOREIGN KEY ("FK_id_cotizacion") REFERENCES "Cotizacion"("PK_id_cotizacion") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Detalle_cotizacion" ADD CONSTRAINT "Detalle_cotizacion_FK_id_servicio_fkey" FOREIGN KEY ("FK_id_servicio") REFERENCES "Servicio"("PK_id_servicio") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Agendamiento_citas" ADD CONSTRAINT "Agendamiento_citas_FK_id_cliente_fkey" FOREIGN KEY ("FK_id_cliente") REFERENCES "Cliente"("PK_id_cliente") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Agendamiento_citas" ADD CONSTRAINT "Agendamiento_citas_FK_id_cotizacion_fkey" FOREIGN KEY ("FK_id_cotizacion") REFERENCES "Cotizacion"("PK_id_cotizacion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Agendamiento_detalle" ADD CONSTRAINT "Agendamiento_detalle_FK_id_servicios_fkey" FOREIGN KEY ("FK_id_servicios") REFERENCES "Servicio"("PK_id_servicio") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Agendamiento_detalle" ADD CONSTRAINT "Agendamiento_detalle_FK_id_agendamiento_cita_fkey" FOREIGN KEY ("FK_id_agendamiento_cita") REFERENCES "Agendamiento_citas"("PK_id_cita") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Agendamiento_detalle" ADD CONSTRAINT "Agendamiento_detalle_FK_id_empleado_fkey" FOREIGN KEY ("FK_id_empleado") REFERENCES "Empleado"("PK_id_empleado") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Venta_detalle" ADD CONSTRAINT "Venta_detalle_FK_id_venta_fkey" FOREIGN KEY ("FK_id_venta") REFERENCES "Venta"("PK_id_venta") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Venta_detalle" ADD CONSTRAINT "Venta_detalle_FK_id_empleado_fkey" FOREIGN KEY ("FK_id_empleado") REFERENCES "Empleado"("PK_id_empleado") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Venta_detalle" ADD CONSTRAINT "Venta_detalle_FK_id_servicio_fkey" FOREIGN KEY ("FK_id_servicio") REFERENCES "Servicio"("PK_id_servicio") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_fk_id_usuario_fkey" FOREIGN KEY ("fk_id_usuario") REFERENCES "Usuarios"("PK_id_usuario") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_FK_id_cita_fkey" FOREIGN KEY ("FK_id_cita") REFERENCES "Agendamiento_citas"("PK_id_cita") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_FK_id_cliente_fkey" FOREIGN KEY ("FK_id_cliente") REFERENCES "Cliente"("PK_id_cliente") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Horario_Historial" ADD CONSTRAINT "Horario_Historial_FK_id_empleado_fkey" FOREIGN KEY ("FK_id_empleado") REFERENCES "Empleado"("PK_id_empleado") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Horario_Historial" ADD CONSTRAINT "Horario_Historial_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "Usuarios"("PK_id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;
