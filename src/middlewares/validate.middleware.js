// src/middlewares/validate.middleware.js

const error = (res, message, status = 400) =>
  res.status(status).json({ error: message });

const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex    = /^[0-9+\-\s]{7,15}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const validDocTypes = ["CC", "TI", "CE", "PP", "NIT"];

// ── AUTH ──────────────────────────────────────────────────────
const validateLogin = (req, res, next) => {
  const { correo, contrasena } = req.body;
  if (!correo?.trim() || !contrasena?.trim())
    return error(res, "Correo y contraseña son requeridos");
  if (!emailRegex.test(correo))
    return error(res, "El correo no tiene un formato válido");
  if (contrasena.length < 6)
    return error(res, "La contraseña debe tener al menos 6 caracteres");
  next();
};

const validateRegister = (req, res, next) => {
  const { correo, contrasena, rolId } = req.body;
  if (!correo?.trim() || !contrasena?.trim() || !rolId)
    return error(res, "Correo, contraseña y rol son requeridos");
  if (!emailRegex.test(correo))
    return error(res, "El correo no tiene un formato válido");
  if (!passwordRegex.test(contrasena))
    return error(res, "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial");
  if (!Number.isInteger(Number(rolId)) || Number(rolId) <= 0)
    return error(res, "El rol debe ser un ID numérico válido");
  next();
};

// ── ROLES ─────────────────────────────────────────────────────
const validateCreateRole = (req, res, next) => {
  const { nombre, descripcion, permisosIds } = req.body;
  if (!nombre?.trim())
    return error(res, "El nombre del rol es obligatorio");
  if (nombre.trim().length < 3 || nombre.trim().length > 100)
    return error(res, "El nombre debe tener entre 3 y 100 caracteres");
  if (!descripcion?.trim())
    return error(res, "La descripción del rol es obligatoria");
  if (descripcion.trim().length < 10)
    return error(res, "La descripción debe tener al menos 10 caracteres");
  if (!Array.isArray(permisosIds) || permisosIds.length === 0)
    return error(res, "Debes asignar al menos un permiso al rol");
  if (!permisosIds.every(id => Number.isInteger(Number(id)) && Number(id) > 0))
    return error(res, "Los IDs de permisos deben ser números enteros positivos");
  next();
};

const validateUpdateRole = (req, res, next) => {
  const { nombre, descripcion, permisosIds } = req.body;
  if (nombre !== undefined) {
    if (!nombre.trim())
      return error(res, "El nombre del rol no puede estar vacío");
    if (nombre.trim().length < 3 || nombre.trim().length > 100)
      return error(res, "El nombre debe tener entre 3 y 100 caracteres");
  }
  if (descripcion !== undefined) {
    if (!descripcion.trim())
      return error(res, "La descripción no puede estar vacía");
    if (descripcion.trim().length < 10)
      return error(res, "La descripción debe tener al menos 10 caracteres");
  }
  if (permisosIds !== undefined) {
    if (!Array.isArray(permisosIds) || permisosIds.length === 0)
      return error(res, "Debes asignar al menos un permiso al rol");
    if (!permisosIds.every(id => Number.isInteger(Number(id)) && Number(id) > 0))
      return error(res, "Los IDs de permisos deben ser números enteros positivos");
  }
  next();
};

const validateRoleId = (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return error(res, "El ID del rol debe ser un número entero positivo");
  next();
};

// ── PERMISOS ──────────────────────────────────────────────────
const validateAssignPermissions = (req, res, next) => {
  const { permisosIds } = req.body;
  if (!Array.isArray(permisosIds) || permisosIds.length === 0)
    return error(res, "Debes enviar al menos un permiso en permisosIds");
  if (!permisosIds.every(id => Number.isInteger(Number(id)) && Number(id) > 0))
    return error(res, "Los IDs de permisos deben ser números enteros positivos");
  next();
};

const validatePermissionParams = (req, res, next) => {
  const roleId       = Number(req.params.roleId);
  const permissionId = Number(req.params.permissionId);
  if (!Number.isInteger(roleId) || roleId <= 0)
    return error(res, "El ID del rol debe ser un número entero positivo");
  if (!Number.isInteger(permissionId) || permissionId <= 0)
    return error(res, "El ID del permiso debe ser un número entero positivo");
  next();
};

const validateRoleIdParam = (req, res, next) => {
  const roleId = Number(req.params.roleId);
  if (!Number.isInteger(roleId) || roleId <= 0)
    return error(res, "El ID del rol debe ser un número entero positivo");
  next();
};

// ── USUARIOS ──────────────────────────────────────────────────
const validateCreateUser = (req, res, next) => {
  const { firstName, lastName, email, role, password } = req.body;
  if (!firstName?.trim() || firstName.trim().length < 2)
    return error(res, "El nombre es obligatorio y debe tener al menos 2 caracteres");
  if (!lastName?.trim() || lastName.trim().length < 2)
    return error(res, "El apellido es obligatorio y debe tener al menos 2 caracteres");
  if (!email?.trim() || !emailRegex.test(email))
    return error(res, "El correo no tiene un formato válido");
  if (!role?.trim())
    return error(res, "El rol es obligatorio");
  if (password !== undefined && password !== "") {
    if (!passwordRegex.test(password))
      return error(res, "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial");
  }
  next();
};

const validateUpdateUser = (req, res, next) => {
  const { firstName, lastName, email, phone, documentType, document } = req.body;
  if (firstName !== undefined && firstName.trim().length < 2)
    return error(res, "El nombre debe tener al menos 2 caracteres");
  if (lastName !== undefined && lastName.trim().length < 2)
    return error(res, "El apellido debe tener al menos 2 caracteres");
  if (email !== undefined && !emailRegex.test(email))
    return error(res, "El correo no tiene un formato válido");
  if (phone?.trim() && !phoneRegex.test(phone.trim()))
    return error(res, "El teléfono no tiene un formato válido");
  if (documentType?.trim() && !validDocTypes.includes(documentType.trim().toUpperCase()))
    return error(res, `Tipo de documento inválido. Opciones: ${validDocTypes.join(", ")}`);
  if (document?.trim()) {
    if (document.trim().length < 5 || document.trim().length > 20)
      return error(res, "El número de documento debe tener entre 5 y 20 caracteres");
  }
  next();
};

const validateUserId = (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return error(res, "El ID del usuario debe ser un número entero positivo");
  next();
};

const validateUserStatus = (req, res, next) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean")
    return error(res, "El campo isActive debe ser true o false");
  next();
};

// ── CLIENTES (usan firstName/lastName igual que el frontend) ──
const validateCreateClient = (req, res, next) => {
  const { firstName, lastName, email, phone, document, documentType } = req.body;
  if (!firstName?.trim() || firstName.trim().length < 2)
    return error(res, "El nombre es obligatorio y debe tener al menos 2 caracteres");
  if (!lastName?.trim() || lastName.trim().length < 2)
    return error(res, "El apellido es obligatorio y debe tener al menos 2 caracteres");
  if (email?.trim() && !emailRegex.test(email))
    return error(res, "El correo no tiene un formato válido");
  if (phone?.trim() && !phoneRegex.test(phone.trim()))
    return error(res, "El teléfono no tiene un formato válido");
  if (documentType?.trim() && !validDocTypes.includes(documentType.trim().toUpperCase()))
    return error(res, `Tipo de documento inválido. Opciones: ${validDocTypes.join(", ")}`);
  if (document?.trim()) {
    if (document.trim().length < 5 || document.trim().length > 20)
      return error(res, "El número de documento debe tener entre 5 y 20 caracteres");
  }
  next();
};

const validateUpdateClient = (req, res, next) => {
  const { firstName, lastName, email, phone, document, documentType } = req.body;
  if (firstName !== undefined && firstName.trim().length < 2)
    return error(res, "El nombre debe tener al menos 2 caracteres");
  if (lastName !== undefined && lastName.trim().length < 2)
    return error(res, "El apellido debe tener al menos 2 caracteres");
  if (email?.trim() && !emailRegex.test(email))
    return error(res, "El correo no tiene un formato válido");
  if (phone?.trim() && !phoneRegex.test(phone.trim()))
    return error(res, "El teléfono no tiene un formato válido");
  if (documentType?.trim() && !validDocTypes.includes(documentType.trim().toUpperCase()))
    return error(res, `Tipo de documento inválido. Opciones: ${validDocTypes.join(", ")}`);
  if (document?.trim()) {
    if (document.trim().length < 5 || document.trim().length > 20)
      return error(res, "El número de documento debe tener entre 5 y 20 caracteres");
  }
  next();
};

const validateClientId = (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return error(res, "El ID del cliente debe ser un número entero positivo");
  next();
};

module.exports = {
  validateLogin, validateRegister,
  validateCreateRole, validateUpdateRole, validateRoleId,
  validateAssignPermissions, validatePermissionParams, validateRoleIdParam,
  validateCreateUser, validateUpdateUser, validateUserId, validateUserStatus,
  validateCreateClient, validateUpdateClient, validateClientId,
};