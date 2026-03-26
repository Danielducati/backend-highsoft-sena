const express = require("express");
const router = express.Router();
const { pool, sql } = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "highlife_secret_2024";

// ==========================================
// POST → LOGIN
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: "Correo y contraseña son requeridos" });
    }

    const connection = await pool;

    const result = await connection.request()
      .input("correo", sql.VarChar(100), correo)
      .query(`
        SELECT 
          u.PK_id_usuario AS id,
          u.Correo,
          u.Contrasena,
          u.Estado,
          r.Nombre AS rol
        FROM Usuarios u
        LEFT JOIN Roles r ON u.FK_id_rol = r.PK_id_rol
        WHERE u.Correo = @correo
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }

    const user = result.recordset[0];

    if (user.Estado !== "Activo") {
      return res.status(403).json({ error: "Usuario inactivo. Contacta al administrador." });
    }

    const passwordMatch = await bcrypt.compare(contrasena, user.Contrasena);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }

    const token = jwt.sign(
      { id: user.id, correo: user.Correo, rol: user.rol },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      usuario: {
        id: user.id,
        correo: user.Correo,
        rol: user.rol
      }
    });

  } catch (error) {
    console.error("ERROR login:", error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});


// ==========================================
// POST → REGISTRAR USUARIO + CLIENTE
// ==========================================
router.post("/register", async (req, res) => {
try {
    const {
    correo,
    contrasena,
    nombre,
    apellido,
    telefono,
    direccion,
    tipo_documento,
    numero_documento,
    } = req.body;

    if (!correo || !contrasena || !nombre || !apellido) {
    return res.status(400).json({ error: "Correo, contraseña, nombre y apellido son requeridos" });
    }

    const connection = await pool;

    const exists = await connection.request()
    .input("correo", sql.VarChar(100), correo)
    .query(`SELECT PK_id_usuario FROM Usuarios WHERE Correo = @correo`);

    if (exists.recordset.length > 0) {
    return res.status(409).json({ error: "El correo ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // 1️⃣ Insertar en Usuarios (rol 7 = Cliente)
    const usuarioResult = await connection.request()
    .input("correo", sql.VarChar(100), correo)
    .input("contrasena", sql.VarChar(256), hashedPassword)
    .query(`
        INSERT INTO Usuarios (Correo, Contrasena, Estado, FK_id_rol)
        OUTPUT INSERTED.PK_id_usuario AS id
        VALUES (@correo, @contrasena, 'Activo', 7)
    `);

    const id_usuario = usuarioResult.recordset[0].id;

    // 2️⃣ Insertar en Cliente
    await connection.request()
    .input("nombre", sql.VarChar(100), nombre)
    .input("apellido", sql.VarChar(100), apellido)
    .input("telefono", sql.VarChar(20), telefono || null)
    .input("direccion", sql.VarChar(190), direccion || null)
    .input("tipo_documento", sql.VarChar(30), tipo_documento || null)
    .input("numero_documento", sql.VarChar(20), numero_documento || null)
    .input("correo", sql.VarChar(100), correo)
    .input("id_usuario", sql.Int, id_usuario)
    .query(`
        INSERT INTO Cliente (nombre, apellido, tipo_documento, numero_documento, correo, telefono, direccion, Estado, fk_id_usuario)
        VALUES (@nombre, @apellido, @tipo_documento, @numero_documento, @correo, @telefono, @direccion, 'Activo', @id_usuario)
    `);

    res.status(201).json({ mensaje: "Usuario registrado exitosamente" });

} catch (error) {
    console.error("ERROR register:", error);
    res.status(500).json({ error: "Error al registrar usuario" });
}
});


// ==========================================
// MIDDLEWARE → VERIFICAR TOKEN
// ==========================================
const verificarToken = (req, res, next) => {
const authHeader = req.headers["authorization"];
const token = authHeader && authHeader.split(" ")[1];

if (!token) {
    return res.status(401).json({ error: "Token requerido" });
}

try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
} catch (error) {
    return res.status(403).json({ error: "Token inválido o expirado" });
}
};

module.exports = { router, verificarToken };