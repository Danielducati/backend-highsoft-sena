BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Roles] (
    [PK_id_rol] INT NOT NULL IDENTITY(1,1),
    [Nombre] VARCHAR(100) NOT NULL,
    [descripcion] NVARCHAR(1000),
    [Estado] VARCHAR(30) NOT NULL CONSTRAINT [DF__Roles__Estado__37A5467C] DEFAULT 'Activo',
    CONSTRAINT [PK__Roles__D2CA7D1BB9AAD356] PRIMARY KEY CLUSTERED ([PK_id_rol])
);

-- CreateTable
CREATE TABLE [dbo].[Permisos] (
    [PK_id_permisos] INT NOT NULL IDENTITY(1,1),
    [Nombre] VARCHAR(100) NOT NULL,
    CONSTRAINT [PK__Permisos__19BC60251BE0F373] PRIMARY KEY CLUSTERED ([PK_id_permisos])
);

-- CreateTable
CREATE TABLE [dbo].[Roles_Permisos] (
    [PK_id_roles_permisos] INT NOT NULL IDENTITY(1,1),
    [FK_id_rol] INT NOT NULL,
    [FK_id_permiso] INT NOT NULL,
    CONSTRAINT [PK__Roles_Pe__E5C0B51065434034] PRIMARY KEY CLUSTERED ([PK_id_roles_permisos])
);

-- CreateTable
CREATE TABLE [dbo].[Usuarios] (
    [PK_id_usuario] INT NOT NULL IDENTITY(1,1),
    [Correo] VARCHAR(100) NOT NULL,
    [Contrasena] VARCHAR(256) NOT NULL,
    [Estado] VARCHAR(30) NOT NULL CONSTRAINT [DF__Usuarios__Estado__412EB0B6] DEFAULT 'Activo',
    [FK_id_rol] INT NOT NULL,
    [foto_perfil] VARCHAR(500),
    CONSTRAINT [PK__Usuarios__25C435054CC83E06] PRIMARY KEY CLUSTERED ([PK_id_usuario]),
    CONSTRAINT [UQ__Usuarios__60695A19DEE5BF97] UNIQUE NONCLUSTERED ([Correo])
);

-- CreateTable
CREATE TABLE [dbo].[Empleado] (
    [PK_id_empleado] INT NOT NULL IDENTITY(1,1),
    [nombre] VARCHAR(100) NOT NULL,
    [apellido] VARCHAR(100) NOT NULL,
    [tipo_documento] VARCHAR(30),
    [numero_documento] VARCHAR(20),
    [correo] VARCHAR(100),
    [telefono] VARCHAR(20),
    [ciudad] VARCHAR(40),
    [especialidad] VARCHAR(50),
    [direccion] VARCHAR(190),
    [foto_perfil] VARCHAR(500),
    [Estado] VARCHAR(30) NOT NULL CONSTRAINT [DF__Empleado__Estado__44FF419A] DEFAULT 'Activo',
    [fk_id_usuario] INT NOT NULL,
    CONSTRAINT [PK__Empleado__A5E3E03FE5C83B93] PRIMARY KEY CLUSTERED ([PK_id_empleado])
);

-- CreateTable
CREATE TABLE [dbo].[Horarios] (
    [PK_id_horario] INT NOT NULL IDENTITY(1,1),
    [FK_id_empleado] INT NOT NULL,
    [hora_inicio] TIME NOT NULL,
    [hora_final] TIME NOT NULL,
    [fecha] DATE NOT NULL,
    [dia_semana] VARCHAR(20),
    CONSTRAINT [PK__Horarios__986B40ECCBE6072E] PRIMARY KEY CLUSTERED ([PK_id_horario])
);

-- CreateTable
CREATE TABLE [dbo].[Novedades] (
    [PK_id_novedad] INT NOT NULL IDENTITY(1,1),
    [FK_id_horario] INT NOT NULL,
    [tipo_novedad] VARCHAR(100),
    [descripcion] VARCHAR(600),
    [fecha_inicio] DATE,
    [fecha_final] DATE,
    [hora_inicio] TIME,
    [hora_final] TIME,
    [Estado] VARCHAR(30) NOT NULL CONSTRAINT [DF__Novedades__Estad__4BAC3F29] DEFAULT 'Activo',
    CONSTRAINT [PK__Novedade__71364FA24C1C6C58] PRIMARY KEY CLUSTERED ([PK_id_novedad])
);

-- CreateTable
CREATE TABLE [dbo].[Categoria_servicios] (
    [PK_id_categoria_servicios] INT NOT NULL IDENTITY(1,1),
    [Nombre] VARCHAR(100) NOT NULL,
    [descripcion] VARCHAR(600),
    [color] VARCHAR(20),
    [Estado] VARCHAR(30) NOT NULL CONSTRAINT [DF__Categoria__Estad__4F7CD00D] DEFAULT 'Activo',
    CONSTRAINT [PK__Categori__446700829FAA1635] PRIMARY KEY CLUSTERED ([PK_id_categoria_servicios])
);

-- CreateTable
CREATE TABLE [dbo].[Servicio] (
    [PK_id_servicio] INT NOT NULL IDENTITY(1,1),
    [FK_categoria_servicios] INT NOT NULL,
    [nombre] VARCHAR(100) NOT NULL,
    [descripcion] VARCHAR(600),
    [Duracion] INT,
    [Precio] DECIMAL(10,2),
    [Estado] VARCHAR(30) NOT NULL CONSTRAINT [DF__Servicio__Estado__52593CB8] DEFAULT 'Activo',
    [imagen_servicio] VARCHAR(500),
    CONSTRAINT [PK__Servicio__51339527BC790A2B] PRIMARY KEY CLUSTERED ([PK_id_servicio])
);

-- CreateTable
CREATE TABLE [dbo].[Empleado_Servicio] (
    [PK_id_Empleado_Servicio] INT NOT NULL IDENTITY(1,1),
    [FK_id_servicio] INT NOT NULL,
    [FK_id_empleado] INT NOT NULL,
    CONSTRAINT [PK__Empleado__6B8E590D185B66F5] PRIMARY KEY CLUSTERED ([PK_id_Empleado_Servicio])
);

-- CreateTable
CREATE TABLE [dbo].[Cotizacion] (
    [PK_id_cotizacion] INT NOT NULL IDENTITY(1,1),
    [FK_id_cliente] INT,
    [Fecha] DATE,
    [Valor] DECIMAL(10,2),
    [Iva] DECIMAL(10,2),
    [Subtotal] DECIMAL(10,2),
    [Descuento] DECIMAL(10,2),
    [Notas] VARCHAR(900),
    [Hora_inicio] TIME,
    [TOTAL] DECIMAL(12,2),
    [Estado] VARCHAR(30) NOT NULL CONSTRAINT [DF__Cotizacio__Estad__5DCAEF64] DEFAULT 'Activo',
    CONSTRAINT [PK__Cotizaci__399E29356F4EEFB9] PRIMARY KEY CLUSTERED ([PK_id_cotizacion])
);

-- CreateTable
CREATE TABLE [dbo].[Detalle_cotizacion] (
    [PK_id_detalle_cotizacion] INT NOT NULL IDENTITY(1,1),
    [FK_id_cotizacion] INT NOT NULL,
    [FK_id_servicio] INT NOT NULL,
    [Precio] DECIMAL(10,2),
    [Cantidad] INT NOT NULL CONSTRAINT [DF__Detalle_c__Canti__619B8048] DEFAULT 1,
    CONSTRAINT [PK__Detalle___842B068F08A3F746] PRIMARY KEY CLUSTERED ([PK_id_detalle_cotizacion])
);

-- CreateTable
CREATE TABLE [dbo].[Agendamiento_citas] (
    [PK_id_cita] INT NOT NULL IDENTITY(1,1),
    [FK_id_cliente] INT,
    [FK_id_cotizacion] INT,
    [Horario] TIME,
    [Fecha] DATE NOT NULL,
    [Estado] VARCHAR(30) NOT NULL CONSTRAINT [DF__Agendamie__Estad__66603565] DEFAULT 'Pendiente',
    [Notas] VARCHAR(300),
    CONSTRAINT [PK__Agendami__A7193F8588D4B757] PRIMARY KEY CLUSTERED ([PK_id_cita])
);

-- CreateTable
CREATE TABLE [dbo].[Agendamiento_detalle] (
    [PK_id_agendamiento_detalle] INT NOT NULL IDENTITY(1,1),
    [FK_id_agendamiento_cita] INT NOT NULL,
    [FK_id_servicios] INT NOT NULL,
    [FK_id_empleado] INT,
    [Precio] DECIMAL(10,2),
    [Detalle] VARCHAR(500),
    CONSTRAINT [Agendamiento_detalle_pkey] PRIMARY KEY CLUSTERED ([PK_id_agendamiento_detalle])
);

-- CreateTable
CREATE TABLE [dbo].[Venta_detalle] (
    [PK_id_venta_detalle] INT NOT NULL IDENTITY(1,1),
    [FK_id_venta] INT NOT NULL,
    [FK_id_servicio] INT,
    [FK_id_empleado] INT,
    [Cantidad] INT NOT NULL CONSTRAINT [DF__Venta_det__Canti__74AE54BC] DEFAULT 1,
    [Precio] DECIMAL(12,2) NOT NULL,
    [Subtotal] DECIMAL(12,2) NOT NULL,
    [Detalle] VARCHAR(500),
    CONSTRAINT [PK__Venta_de__75C4F4FBCB662B45] PRIMARY KEY CLUSTERED ([PK_id_venta_detalle])
);

-- CreateTable
CREATE TABLE [dbo].[Cliente] (
    [PK_id_cliente] INT NOT NULL IDENTITY(1,1),
    [nombre] VARCHAR(100) NOT NULL,
    [apellido] VARCHAR(100) NOT NULL,
    [tipo_documento] VARCHAR(30),
    [numero_documento] VARCHAR(20),
    [correo] VARCHAR(100),
    [telefono] VARCHAR(20),
    [direccion] VARCHAR(190),
    [foto_perfil] VARCHAR(500) NOT NULL,
    [Estado] VARCHAR(30) NOT NULL CONSTRAINT [DF__Cliente__Estado__59FA5E80] DEFAULT 'Activo',
    [fk_id_usuario] INT NOT NULL,
    CONSTRAINT [PK__Cliente__A3A81B3F7FC261F0] PRIMARY KEY CLUSTERED ([PK_id_cliente])
);

-- CreateTable
CREATE TABLE [dbo].[sysdiagrams] (
    [name] NVARCHAR(128) NOT NULL,
    [principal_id] INT NOT NULL,
    [diagram_id] INT NOT NULL IDENTITY(1,1),
    [version] INT,
    [definition] VARBINARY(max),
    CONSTRAINT [PK__sysdiagr__C2B05B61A5801D09] PRIMARY KEY CLUSTERED ([diagram_id]),
    CONSTRAINT [UK_principal_name] UNIQUE NONCLUSTERED ([principal_id],[name])
);

-- CreateTable
CREATE TABLE [dbo].[Venta] (
    [PK_id_venta] INT NOT NULL IDENTITY(1,1),
    [FK_id_cliente] INT,
    [FK_id_cita] INT,
    [Iva] DECIMAL(10,2),
    [Fecha] DATE,
    [Total] DECIMAL(12,2),
    [descuento] DECIMAL(10,2),
    [metodo_pago] VARCHAR(40),
    [Estado] VARCHAR(30) NOT NULL CONSTRAINT [Venta_Estado_df] DEFAULT 'Activo',
    CONSTRAINT [PK__Venta__F4EE36C61F0519FF] PRIMARY KEY CLUSTERED ([PK_id_venta])
);

-- AddForeignKey
ALTER TABLE [dbo].[Roles_Permisos] ADD CONSTRAINT [FK_RolesPermisos_Permiso] FOREIGN KEY ([FK_id_permiso]) REFERENCES [dbo].[Permisos]([PK_id_permisos]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Roles_Permisos] ADD CONSTRAINT [FK_RolesPermisos_Rol] FOREIGN KEY ([FK_id_rol]) REFERENCES [dbo].[Roles]([PK_id_rol]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Usuarios] ADD CONSTRAINT [FK_Usuarios_Rol] FOREIGN KEY ([FK_id_rol]) REFERENCES [dbo].[Roles]([PK_id_rol]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Empleado] ADD CONSTRAINT [FK_Empleado_Usuario] FOREIGN KEY ([fk_id_usuario]) REFERENCES [dbo].[Usuarios]([PK_id_usuario]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Horarios] ADD CONSTRAINT [FK_Horarios_Empleado] FOREIGN KEY ([FK_id_empleado]) REFERENCES [dbo].[Empleado]([PK_id_empleado]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Novedades] ADD CONSTRAINT [FK_Novedades_Horario] FOREIGN KEY ([FK_id_horario]) REFERENCES [dbo].[Horarios]([PK_id_horario]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Servicio] ADD CONSTRAINT [FK_Servicio_Categoria] FOREIGN KEY ([FK_categoria_servicios]) REFERENCES [dbo].[Categoria_servicios]([PK_id_categoria_servicios]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Empleado_Servicio] ADD CONSTRAINT [FK_EmpleadoServicio_Empleado] FOREIGN KEY ([FK_id_empleado]) REFERENCES [dbo].[Empleado]([PK_id_empleado]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Empleado_Servicio] ADD CONSTRAINT [FK_EmpleadoServicio_Servicio] FOREIGN KEY ([FK_id_servicio]) REFERENCES [dbo].[Servicio]([PK_id_servicio]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Cotizacion] ADD CONSTRAINT [FK_Cotizacion_Cliente] FOREIGN KEY ([FK_id_cliente]) REFERENCES [dbo].[Cliente]([PK_id_cliente]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Detalle_cotizacion] ADD CONSTRAINT [FK_DetalleCotizacion_Cotizacion] FOREIGN KEY ([FK_id_cotizacion]) REFERENCES [dbo].[Cotizacion]([PK_id_cotizacion]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Detalle_cotizacion] ADD CONSTRAINT [FK_DetalleCotizacion_Servicio] FOREIGN KEY ([FK_id_servicio]) REFERENCES [dbo].[Servicio]([PK_id_servicio]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Agendamiento_citas] ADD CONSTRAINT [FK_Agendamiento_Cliente] FOREIGN KEY ([FK_id_cliente]) REFERENCES [dbo].[Cliente]([PK_id_cliente]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Agendamiento_citas] ADD CONSTRAINT [FK_Agendamiento_Cotizacion] FOREIGN KEY ([FK_id_cotizacion]) REFERENCES [dbo].[Cotizacion]([PK_id_cotizacion]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Agendamiento_detalle] ADD CONSTRAINT [FK_Agendamiento_Servicio] FOREIGN KEY ([FK_id_servicios]) REFERENCES [dbo].[Servicio]([PK_id_servicio]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Agendamiento_detalle] ADD CONSTRAINT [FK_AgendDetalle_Agendamiento] FOREIGN KEY ([FK_id_agendamiento_cita]) REFERENCES [dbo].[Agendamiento_citas]([PK_id_cita]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Agendamiento_detalle] ADD CONSTRAINT [Agendamiento_detalle_FK_id_empleado_fkey] FOREIGN KEY ([FK_id_empleado]) REFERENCES [dbo].[Empleado]([PK_id_empleado]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Venta_detalle] ADD CONSTRAINT [FK_VentaDetalle] FOREIGN KEY ([FK_id_venta]) REFERENCES [dbo].[Venta]([PK_id_venta]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Venta_detalle] ADD CONSTRAINT [FK_VentaDetalle_Empleado] FOREIGN KEY ([FK_id_empleado]) REFERENCES [dbo].[Empleado]([PK_id_empleado]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Venta_detalle] ADD CONSTRAINT [FK_VentaDetalle_Servicio] FOREIGN KEY ([FK_id_servicio]) REFERENCES [dbo].[Servicio]([PK_id_servicio]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Cliente] ADD CONSTRAINT [FK_Cliente_Usuario] FOREIGN KEY ([fk_id_usuario]) REFERENCES [dbo].[Usuarios]([PK_id_usuario]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Venta] ADD CONSTRAINT [FK_Venta_Cita] FOREIGN KEY ([FK_id_cita]) REFERENCES [dbo].[Agendamiento_citas]([PK_id_cita]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Venta] ADD CONSTRAINT [FK_Venta_Cliente] FOREIGN KEY ([FK_id_cliente]) REFERENCES [dbo].[Cliente]([PK_id_cliente]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
