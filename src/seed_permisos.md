use highsoft_bd;
INSERT INTO Roles (Nombre, Estado)
VALUES 
('Admin','Activo'),
('Empleado','Activo'),
('Cliente','Activo')

-- ── 1. Insertar permisos solo si no existen ──────────────────────────────
INSERT INTO Permisos (Nombre)
SELECT v.Nombre
FROM (VALUES
('citas.ver'),
('citas.crear'),
('citas.editar'),
('citas.eliminar'),
('clientes.ver'),
('clientes.crear'),
('clientes.editar'),
('clientes.eliminar'),
('empleados.ver'),
('empleados.crear'),
('empleados.editar'),
('empleados.eliminar'),
('ventas.ver'),
('ventas.crear'),
('ventas.eliminar'),
('servicios.ver'),
('servicios.crear'),
('servicios.editar'),
('servicios.eliminar'),
('categorias.ver'),
('categorias.crear'),
('categorias.editar'),
('categorias.eliminar'),
('novedades.ver'),
('novedades.crear'),
('novedades.editar'),
('novedades.eliminar'),
('horarios.ver'),
('horarios.crear'),
('horarios.editar'),
('horarios.eliminar'),
('cotizaciones.ver'),
('cotizaciones.crear'),
('cotizaciones.editar'),
('cotizaciones.eliminar'),
('roles.ver'),
('roles.crear'),
('roles.editar'),
('roles.eliminar'),
('usuarios.ver'),
('usuarios.crear'),
('usuarios.editar'),
('usuarios.eliminar'),
('dashboard.ver')
) v(Nombre)
WHERE NOT EXISTS (
    SELECT 1
    FROM Permisos p
    WHERE p.Nombre = v.Nombre
);

-------------------------------------------------------------

-- ── 2. TODOS los permisos para Admin ──────────────────────
INSERT INTO Roles_Permisos (FK_id_rol, FK_id_permiso)
SELECT r.PK_id_rol, p.PK_id_permisos
FROM Roles r
CROSS JOIN Permisos p
WHERE r.Nombre = 'Admin'
AND NOT EXISTS (
    SELECT 1
    FROM Roles_Permisos rp
    WHERE rp.FK_id_rol = r.PK_id_rol
    AND rp.FK_id_permiso = p.PK_id_permisos
);

-------------------------------------------------------------

-- ── 3. Permisos para Empleado ─────────────────────────────
INSERT INTO Roles_Permisos (FK_id_rol, FK_id_permiso)
SELECT r.PK_id_rol, p.PK_id_permisos
FROM Roles r
JOIN Permisos p ON (
       p.Nombre LIKE 'citas.%'
    OR p.Nombre LIKE 'ventas.%'
    OR p.Nombre LIKE 'horarios.%'
    OR p.Nombre = 'clientes.ver'
    OR p.Nombre = 'servicios.ver'
    OR p.Nombre = 'dashboard.ver'
)
WHERE r.Nombre = 'Empleado'
AND NOT EXISTS (
    SELECT 1
    FROM Roles_Permisos rp
    WHERE rp.FK_id_rol = r.PK_id_rol
    AND rp.FK_id_permiso = p.PK_id_permisos
);

-------------------------------------------------------------

-- ── 4. Permisos para Cliente ──────────────────────────────
INSERT INTO Roles_Permisos (FK_id_rol, FK_id_permiso)
SELECT r.PK_id_rol, p.PK_id_permisos
FROM Roles r
JOIN Permisos p ON (
       p.Nombre = 'citas.ver'
    OR p.Nombre = 'citas.crear'
    OR p.Nombre = 'servicios.ver'
    OR p.Nombre = 'categorias.ver'
)
WHERE r.Nombre = 'Cliente'
AND NOT EXISTS (
    SELECT 1
    FROM Roles_Permisos rp
    WHERE rp.FK_id_rol = r.PK_id_rol
    AND rp.FK_id_permiso = p.PK_id_permisos
);

-------------------------------------------------------------

-- ── 5. Verificar permisos ─────────────────────────────────
SELECT r.Nombre AS Rol, p.Nombre AS Permiso
FROM Roles_Permisos rp
JOIN Roles r ON r.PK_id_rol = rp.FK_id_rol
JOIN Permisos p ON p.PK_id_permisos = rp.FK_id_permiso
ORDER BY r.Nombre, p.Nombre;