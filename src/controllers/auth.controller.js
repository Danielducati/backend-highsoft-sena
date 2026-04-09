const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { sendWelcomeEmail, sendResetPasswordEmail } = require("../config/email");

const JWT_SECRET = process.env.JWT_SECRET || "highlife_secret_2024";

// ── LOGIN ──────────────────────────────────────────
const login = async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena)
    return res.status(400).json({ error: "Correo y contraseña son requeridos" });

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { correo },
      include: { rol: true }, // 🔥 IMPORTANTE
    });

    if (!usuario || usuario.estado !== "Activo")
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const valida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!valida)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol.nombre },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    // 🔥 AQUÍ ESTÁ LA SOLUCIÓN REAL
    return res.json({
      token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol.nombre, // 👈 CLAVE PARA EL FRONT
      },
    });

  } catch (err) {
    console.error("❌ ERROR LOGIN:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── REGISTER ───────────────────────────────────────
const register = async (req, res) => {
  const { nombre, apellido, correo, contrasena, telefono, tipo_documento, numero_documento, direccion } = req.body;

  try {
    const existe = await prisma.usuario.findUnique({ where: { correo } });
    if (existe) {
      return res.status(409).json({ error: "El correo ya existe" });
    }

    const hashed = await bcrypt.hash(contrasena, 10);

    const rolCliente = await prisma.rol.findFirst({
      where: { nombre: "Cliente" },
    });

    if (!rolCliente) {
      return res.status(500).json({ error: "Rol Cliente no encontrado en la base de datos" });
    }

    await prisma.usuario.create({
      data: {
        correo,
        contrasena: hashed,
        estado: "Activo",
        rolId: rolCliente.id,
        Cliente: {
          create: {
            nombre,
            apellido,
            correo,
            telefono:         telefono         || null,
            tipo_documento:   tipo_documento   || null,
            numero_documento: numero_documento || null,
            direccion:        direccion        || null,
            foto_perfil:      "",
            Estado:           "Activo",
          },
        },
      },
    });

    try {
      await sendWelcomeEmail(correo, nombre);
      console.log("✅ Email de bienvenida enviado a:", correo);
    } catch (emailErr) {
      console.warn("⚠️ Email de bienvenida no se envió:", emailErr);
    }

    res.status(201).json({ message: "Usuario registrado exitosamente" });

  } catch (err) {
    console.error("❌ ERROR register:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── FORGOT PASSWORD ───────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ error: "Correo requerido" });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { correo },
    });

    if (!usuario) {
      return res.json({ 
        message: "Si el correo existe, recibirás un enlace de recuperación" 
      });
    }

    await prisma.resetPasswordToken.deleteMany({
      where: { usuarioId: usuario.id },
    });

    const resetToken = jwt.sign(
      { id: usuario.id, type: "reset" },
      JWT_SECRET,
      { expiresIn: "30m" }
    );

    await prisma.resetPasswordToken.create({
      data: {
        usuarioId: usuario.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await sendResetPasswordEmail(correo, resetLink);
      console.log("✅ Email de recuperación enviado a:", correo);
    } catch (emailErr) {
      console.error("❌ Error al enviar email:", emailErr);
      return res.status(500).json({ error: "Error al enviar email" });
    }

    res.json({ 
      message: "Correo de recuperación enviado",
      ...(process.env.NODE_ENV === "development" && { resetToken })
    });

  } catch (error) {
    console.error("❌ Error en forgotPassword:", error);
    res.status(500).json({ error: "Error en recuperación" });
  }
};

// ── VALIDATE RESET TOKEN ──────────────────────────
const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token requerido" });
    }

    const resetRecord = await prisma.resetPasswordToken.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetRecord) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.type || decoded.type !== "reset") {
      return res.status(400).json({ error: "Token inválido" });
    }

    res.json({ 
      ok: true,
      message: "Token válido",
      usuarioId: decoded.id
    });

  } catch (error) {
    console.error("❌ Error en validateResetToken:", error);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ error: "Token inválido" });
    }
    
    res.status(400).json({ error: "Token inválido o expirado" });
  }
};

// ── RESET PASSWORD ────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, nuevaPassword } = req.body;

    if (!token || !nuevaPassword) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener mínimo 6 caracteres" });
    }

    const resetRecord = await prisma.resetPasswordToken.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetRecord) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    if (!decoded.type || decoded.type !== "reset") {
      return res.status(400).json({ error: "Token inválido" });
    }

    const hashed = await bcrypt.hash(nuevaPassword, 10);

    await prisma.usuario.update({
      where: { id: decoded.id },
      data: { contrasena: hashed },
    });

    await prisma.resetPasswordToken.deleteMany({
      where: { usuarioId: decoded.id },
    });

    console.log("✅ Contraseña actualizada para usuario:", decoded.id);

    res.json({ 
      message: "Contraseña actualizada correctamente",
      ok: true
    });

  } catch (error) {
    console.error("❌ Error en resetPassword:", error);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }
    
    res.status(400).json({ error: "Error al actualizar contraseña" });
  }
};

module.exports = {
  login,
  register,
  forgotPassword,
  validateResetToken,
  resetPassword,
};