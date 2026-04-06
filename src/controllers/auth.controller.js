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

    // Buscar cliente asociado al usuario
    const cliente = await prisma.cliente.findFirst({
      where: { fk_id_usuario: usuario.id },
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
        nombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : usuario.correo,
        foto:   cliente?.foto_perfil ?? null,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /auth/register ───────────────────────────────────────────────────────
// Registro público de clientes desde la app
const register = async (req, res) => {
  // Mapear los nombres de campos que vienen del frontend
  const { 
    email,           // del frontend: email
    password,        // del frontend: password
    fullName,        // del frontend: fullName
    apellido,        // del frontend: apellido
    phone,           // del frontend: phone
    tipocedula,      // del frontend: tipocedula
    cedula,          // del frontend: cedula (numero de documento)
  } = req.body;

  // Validar campos requeridos
  if (!email || !password || !fullName || !apellido) {
    return res.status(400).json({ 
      error: "Nombre, apellido, correo y contraseña son requeridos" 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      error: "La contraseña debe tener mínimo 6 caracteres" 
    });
  }

  try {
    // Verificar si el correo ya existe
    const existe = await prisma.usuario.findUnique({ where: { correo: email } });
    if (existe) {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }

    // Hashear la contraseña
    const hashed = await bcrypt.hash(password, 10);

    // Usar transacción para crear usuario y cliente juntos
    const resultado = await prisma.$transaction(async (tx) => {
      // Buscar rol Cliente
      const rolCliente = await tx.rol.findFirst({ where: { nombre: "Cliente" } });
      if (!rolCliente) {
        throw new Error("Rol Cliente no encontrado en la BD");
      }

      // Crear usuario
      const usuario = await tx.usuario.create({
        data: {
          correo: email,
          contrasena: hashed,
          estado: "Activo",
          rolId: rolCliente.id,
        },
      });

      // Crear cliente asociado
      // ⭐ Usar la relación Usuarios correctamente (connect en lugar de fk_id_usuario)
      const cliente = await tx.cliente.create({
        data: {
          nombre: fullName,
          apellido: apellido,
          correo: email,
          telefono: phone ?? null,
          tipo_documento: tipocedula ?? null,
          numero_documento: cedula ?? null,
          direccion: null,
          foto_perfil: "",
          Estado: "Activo",
          Usuarios: {
            connect: { id: usuario.id },  // ← Conectar al usuario creado
          },
        },
      });

      return { usuario, cliente };
    });

    res.status(201).json({ 
      ok: true, 
      mensaje: "Usuario registrado exitosamente",
      usuario: {
        id: resultado.usuario.id,
        correo: resultado.usuario.correo,
        nombre: `${resultado.cliente.nombre} ${resultado.cliente.apellido}`,
      }
    });
  } catch (err) {
    console.error("Error en register:", err);
    
    if (err.message.includes("Rol Cliente")) {
      return res.status(500).json({ 
        error: "Configura el rol 'Cliente' en la BD primero" 
      });
    }
    
    res.status(500).json({ error: err.message });
  }
};

// ── GET /auth/me ──────────────────────────────────────────────────────────────
const me = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ usuario: decoded });
  } catch (err) {
    console.error("Error en me:", err);
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

module.exports = { login, register, me };