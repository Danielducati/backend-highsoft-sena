USE highsoft_bd;

-- ── Insertar Roles ────────────────────────────────────────────────────────
INSERT INTO Roles (Nombre, Estado)
VALUES 
('Admin',        'Activo'),
('Manicurista',  'Activo'),
('Estilista',    'Activo'),
('Barbero',      'Activo'),
('Masajista',    'Activo'),
('Cosmetóloga',  'Activo'),
('Cliente',      'Activo');

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
    ('dashboard.ver'),
    ('perfil.ver'),
    ('perfil.editar')
) v(Nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM Permisos p WHERE p.Nombre = v.Nombre
);

-- ── 2. TODOS los permisos para Admin ─────────────────────────────────────
INSERT INTO Roles_Permisos (FK_id_rol, FK_id_permiso)
SELECT r.PK_id_rol, p.PK_id_permisos
FROM Roles r
CROSS JOIN Permisos p
WHERE r.Nombre = 'Admin'
AND NOT EXISTS (
    SELECT 1
    FROM Roles_Permisos rp
    WHERE rp.FK_id_rol    = r.PK_id_rol
      AND rp.FK_id_permiso = p.PK_id_permisos
);

-- ── 3. Permisos para roles de Empleado ───────────────────────────────────
--      (Manicurista, Estilista, Barbero, Masajista, Cosmetóloga)
--      Acceso a: novedades, citas y perfil propio
INSERT INTO Roles_Permisos (FK_id_rol, FK_id_permiso)
SELECT r.PK_id_rol, p.PK_id_permisos
FROM Roles r
JOIN Permisos p ON (
       p.Nombre LIKE 'novedades.%'
    OR p.Nombre LIKE 'citas.%'
    OR p.Nombre LIKE 'perfil.%'
)
WHERE r.Nombre IN ('Manicurista', 'Estilista', 'Barbero', 'Masajista', 'Cosmetóloga')
AND NOT EXISTS (
    SELECT 1
    FROM Roles_Permisos rp
    WHERE rp.FK_id_rol    = r.PK_id_rol
      AND rp.FK_id_permiso = p.PK_id_permisos
);

-- ── 4. Permisos para Cliente ──────────────────────────────────────────────
--      Acceso a: ver/crear/editar citas y perfil propio
INSERT INTO Roles_Permisos (FK_id_rol, FK_id_permiso)
SELECT r.PK_id_rol, p.PK_id_permisos
FROM Roles r
JOIN Permisos p ON p.Nombre IN (
    'citas.ver',
    'citas.crear',
    'citas.editar',
    'perfil.ver',
    'perfil.editar'
)
WHERE r.Nombre = 'Cliente'
AND NOT EXISTS (
    SELECT 1
    FROM Roles_Permisos rp
    WHERE rp.FK_id_rol    = r.PK_id_rol
      AND rp.FK_id_permiso = p.PK_id_permisos
);

-- ── 5. Verificar permisos ─────────────────────────────────────────────────
SELECT 
    r.Nombre AS Rol,
    p.Nombre AS Permiso
FROM Roles_Permisos rp
JOIN Roles    r ON r.PK_id_rol      = rp.FK_id_rol
JOIN Permisos p ON p.PK_id_permisos = rp.FK_id_permiso
ORDER BY r.Nombre, p.Nombre;