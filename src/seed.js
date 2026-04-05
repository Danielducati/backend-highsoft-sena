// src/seed.js
// Crea usuarios de prueba: admin, empleado y cliente
// Uso: node src/seed.js
// Es seguro correrlo varias veces — no duplica datos

const prisma = require("./config/prisma");
const bcrypt = require("bcryptjs");

async function createUsuario(correo, contrasena, rolId) {
  const existe = await prisma.usuario.findUnique({ where: { correo } });
  if (existe) return { usuario: existe, creado: false };
  const hashed = await bcrypt.hash(contrasena, 10);
  const usuario = await prisma.usuario.create({
    data: { correo, contrasena: hashed, estado: "Activo", rolId },
  });
  return { usuario, creado: true };
}

async function seed() {
  console.log("Iniciando seed...\n");

  // 1. Verificar roles necesarios
  const rolAdmin    = await prisma.rol.findFirst({ where: { nombre: "Admin" } });
  const rolEmpleado = await prisma.rol.findFirst({ where: { nombre: "Empleado" } });
  const rolCliente  = await prisma.rol.findFirst({ where: { nombre: "Cliente" } });

  if (!rolAdmin || !rolEmpleado || !rolCliente) {
    console.error("Faltan roles en la BD. Corre primero el seed completo de permisos.");
    await prisma.$disconnect();
    process.exit(1);
  }

  // 2. Admin
  const { creado: adminCreado } = await createUsuario(
    "admin@highlife.com", "admin123", rolAdmin.id
  );
  console.log(adminCreado ? "Usuario admin creado" : "Usuario admin ya existe");

  // 3. Empleado
  const { usuario: usuarioEmp, creado: empCreado } = await createUsuario(
    "empleado@highlife.com", "empleado123", rolEmpleado.id
  );
  if (empCreado) {
    const empExiste = await prisma.empleado.findFirst({ where: { correo: "empleado@highlife.com" } });
    if (!empExiste) {
      await prisma.empleado.create({
        data: {
          nombre: "Empleado", apellido: "Demo",
          correo: "empleado@highlife.com",
          especialidad: "Estilista",
          estado: "Activo",
          usuarioId: usuarioEmp.id,
        },
      });
    }
    console.log("Usuario empleado creado");
  } else {
    console.log("Usuario empleado ya existe");
  }

  // 4. Cliente
  const { usuario: usuarioCli, creado: cliCreado } = await createUsuario(
    "cliente@highlife.com", "cliente123", rolCliente.id
  );
  if (cliCreado) {
    const cliExiste = await prisma.cliente.findFirst({ where: { correo: "cliente@highlife.com" } });
    if (!cliExiste) {
      await prisma.cliente.create({
        data: {
          nombre: "Cliente", apellido: "Demo",
          correo: "cliente@highlife.com",
          fotoPerfil: "",
          estado: "Activo",
          usuarioId: usuarioCli.id,
        },
      });
    }
    console.log("Usuario cliente creado");
  } else {
    console.log("Usuario cliente ya existe");
  }

  // Resumen
  console.log("\n─────────────────────────────────────────────────");
  console.log("  Admin     admin@highlife.com    / admin123");
  console.log("  Empleado  empleado@highlife.com / empleado123");
  console.log("  Cliente   cliente@highlife.com  / cliente123");
  console.log("─────────────────────────────────────────────────");
  console.log("Cambia las contrasenas despues del primer login\n");

  await prisma.$disconnect();
}

seed().catch(err => {
  console.error("Error en seed:", err.message);
  prisma.$disconnect();
  process.exit(1);
});