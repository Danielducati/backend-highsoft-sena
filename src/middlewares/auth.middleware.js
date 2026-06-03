// src/middlewares/auth.middleware.js
const jwt    = require("jsonwebtoken");
const prisma = require("../config/prisma");

const JWT_SECRET = process.env.JWT_SECRET || "highlife_secret_2024";

// ── Verify JWT token ──────────────────────────────────────────
const verificarToken = (req, res, next) => {
const authHeader = req.headers.authorization;

if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Token requerido" });

const token = authHeader.split(" ")[1];

try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
} catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
}
};

const isSystemAdminRol = (rol) => {
  const r = (rol ?? "").toLowerCase();
  return r === "admin" || r === "administrador";
};

// ── Admin only (roles base del sistema) ─────────────────────────
const soloAdmin = (req, res, next) => {
  if (!isSystemAdminRol(req.usuario?.rol))
    return res.status(403).json({ error: "Acceso restringido a administradores" });
  next();
};

/** Admin del sistema O permiso específico del rol en BD */
const adminOrPermission = (permission) => async (req, res, next) => {
  if (!req.usuario)
    return res.status(401).json({ error: "No autenticado" });
  if (isSystemAdminRol(req.usuario.rol)) return next();
  return hasPermission(permission)(req, res, next);
};

async function roleHasPermission(rolId, permission) {
  if (!rolId) return false;
  const result = await prisma.rolPermiso.findFirst({
    where: { rolId, permiso: { nombre: permission } },
  });
  return Boolean(result);
}

/** Empleado que solo ve/gestiona sus propias citas (barbero), no gerente */
async function isScopedEmployeeUser(req) {
  const rol = (req.usuario?.rol ?? "").toLowerCase();
  if (["admin", "administrador", "cliente"].includes(rol)) return false;
  const canSeeAll =
    (await roleHasPermission(req.usuario.rolId, "empleados.ver")) ||
    (await roleHasPermission(req.usuario.rolId, "clientes.ver"));
  return !canSeeAll;
}

// ── One or more roles ─────────────────────────────────────────
const soloRoles = (...roles) => (req, res, next) => {
if (!req.usuario)
    return res.status(401).json({ error: "No autenticado" });

if (!roles.includes(req.usuario.rol))
    return res.status(403).json({
    error: `Acceso denegado. Se requiere: ${roles.join(" o ")}`,
    });

next();
};

// ── Check specific permission against DB (Prisma) ─────────────
const hasPermission = (permission) => async (req, res, next) => {
if (!req.usuario)
    return res.status(401).json({ error: "No autenticado" });

console.log(`🔐 [hasPermission] Verificando permiso: ${permission}`);
console.log(`🔐 [hasPermission] Usuario:`, req.usuario);
console.log(`🔐 [hasPermission] RolId:`, req.usuario.rolId);

try {
    const result = await prisma.rolPermiso.findFirst({
    where: {
        rolId:   req.usuario.rolId,
        permiso: { nombre: permission },
    },
    include: {
        permiso: true,
        rol: true,
    },
    });

    console.log(`🔐 [hasPermission] Resultado de búsqueda:`, result);

    if (!result) {
    console.log(`❌ [hasPermission] Permiso denegado: ${permission} para rol ${req.usuario.rol}`);
    return res.status(403).json({
        error: `No tienes permiso para realizar esta acción: ${permission}`,
    });
    }

    console.log(`✅ [hasPermission] Permiso concedido: ${permission}`);
    next();
} catch (err) {
    console.error(`❌ [hasPermission] Error:`, err);
    res.status(500).json({ error: err.message });
}
};

// Alias para no romper código existente
const tienePermiso = hasPermission;

module.exports = {
  verificarToken,
  soloAdmin,
  soloRoles,
  hasPermission,
  tienePermiso,
  adminOrPermission,
  roleHasPermission,
  isScopedEmployeeUser,
  isSystemAdminRol,
};