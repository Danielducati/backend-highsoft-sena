const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const prisma = require("../config/prisma");

const JWT_SECRET = process.env.JWT_SECRET || "highlife_secret_2024";

// ── POST /auth/login ──────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena)
    return res.status(400).json({ error: "Correo y contraseña son requeridos" });

  try {
    const usuario = await prisma.usuario.findUnique({
      where:   { correo },
      include: { rol: true },
    });

    if (!usuario || usuario.estado !== "Activo")
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const valida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!valida)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const empleado = await prisma.empleado.findFirst({
      where: { usuarioId: usuario.id },
    });

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol.nombre, rolId: usuario.rolId },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      usuario: {
        id:     usuario.id,
        correo: usuario.correo,
        rol:    usuario.rol.nombre,
        rolId:  usuario.rolId,
        nombre: empleado ? `${empleado.nombre} ${empleado.apellido}` : usuario.correo,
        foto:   empleado?.fotoPerfil ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /auth/register ───────────────────────────────────────────────────────
// Registro público de clientes desde la app
const register = async (req, res) => {
  const { correo, contrasena, nombre, apellido, telefono, tipo_documento, numero_documento } = req.body;

  if (!correo || !contrasena || !nombre || !apellido)
    return res.status(400).json({ error: "Nombre, apellido, correo y contraseña son requeridos" });

  try {
    // Verificar si el correo ya existe
    const existe = await prisma.usuario.findUnique({ where: { correo } });
    if (existe)
      return res.status(409).json({ error: "El correo ya está registrado" });

    const hashed = await bcrypt.hash(contrasena, 10);

    await prisma.$transaction(async (tx) => {
      // Buscar rol Cliente
      const rolCliente = await tx.rol.findFirst({ where: { nombre: "Cliente" } });
      if (!rolCliente) throw new Error("Rol Cliente no encontrado en la BD");

      const usuario = await tx.usuario.create({
        data: {
          correo,
          contrasena: hashed,
          estado:     "Activo",
          rolId:      rolCliente.id,
        },
      });

      await tx.cliente.create({
        data: {
          nombre,
          apellido,
          correo,
          telefono:        telefono        ?? null,
          tipoDocumento:   tipo_documento  ?? null,
          numeroDocumento: numero_documento ?? null,
          fotoPerfil:      "",
          estado:          "Activo",
          usuarioId:       usuario.id,
        },
      });
    });

    res.status(201).json({ ok: true, mensaje: "Usuario registrado exitosamente" });
  } catch (err) {
    if (err.message.includes("Rol Cliente"))
      return res.status(500).json({ error: "Configura el rol 'Cliente' en la BD primero" });
    res.status(500).json({ error: err.message });
  }
};

// ── GET /auth/me ──────────────────────────────────────────────────────────────
const me = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Token requerido" });

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    res.json({ usuario: decoded });
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

module.exports = { login, register, me };