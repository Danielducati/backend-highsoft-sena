// src/seed.js
// Crea usuarios de prueba: admin, un empleado por cada especialidad y cliente
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
  const rolesEmpleado = ["Manicurista", "Estilista", "Barbero", "Masajista", "Cosmetóloga"];

  const rolAdmin   = await prisma.rol.findFirst({ where: { nombre: "Admin" } });
  const rolCliente = await prisma.rol.findFirst({ where: { nombre: "Cliente" } });
  const rolesEmp   = await prisma.rol.findMany({
    where: { nombre: { in: rolesEmpleado } },
  });

  if (!rolAdmin || !rolCliente || rolesEmp.length !== rolesEmpleado.length) {
    console.error("Faltan roles en la BD. Corre primero el seed completo de permisos.");
    await prisma.$disconnect();
    process.exit(1);
  }

  // 2. Admin
  const { creado: adminCreado } = await createUsuario(
    "admin@highlife.com", "admin123", rolAdmin.id
  );
  console.log(adminCreado ? "✔ Usuario admin creado" : "– Usuario admin ya existe");

  // 3. Un empleado de prueba por cada especialidad
  const empleadosDemoData = [
    { especialidad: "Manicurista",  correo: "manicurista@highlife.com",  contrasena: "manicurista123"  },
    { especialidad: "Estilista",    correo: "estilista@highlife.com",    contrasena: "estilista123"    },
    { especialidad: "Barbero",      correo: "barbero@highlife.com",      contrasena: "barbero123"      },
    { especialidad: "Masajista",    correo: "masajista@highlife.com",    contrasena: "masajista123"    },
    { especialidad: "Cosmetóloga",  correo: "cosmetologa@highlife.com",  contrasena: "cosmetologa123"  },
  ];

  for (const demo of empleadosDemoData) {
    const rol = rolesEmp.find(r => r.nombre === demo.especialidad);
    const { usuario, creado } = await createUsuario(demo.correo, demo.contrasena, rol.id);

    if (creado) {
      const empExiste = await prisma.empleado.findFirst({ where: { correo: demo.correo } });
      if (!empExiste) {
        await prisma.empleado.create({
          data: {
            nombre:       demo.especialidad,
            apellido:     "Demo",
            correo:       demo.correo,
            especialidad: demo.especialidad,
            estado:       "Activo",
            usuarioId:    usuario.id,
          },
        });
      }
      console.log(`✔ Usuario ${demo.especialidad} creado`);
    } else {
      console.log(`– Usuario ${demo.especialidad} ya existe`);
    }
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
          nombre:    "Cliente",
          apellido:  "Demo",
          correo:    "cliente@highlife.com",
          fotoPerfil: "",
          Estado:    "Activo",
          Usuarios: {
            connect: { id: usuarioCli.id }
          },
        },
      });
    }
    console.log("✔ Usuario cliente creado");
  } else {
    console.log("– Usuario cliente ya existe");
  }

  // Resumen
  console.log("\n──────────────────────────────────────────────────────────────────");
  console.log("  Admin        admin@highlife.com          / admin123");
  console.log("  Manicurista  manicurista@highlife.com    / manicurista123");
  console.log("  Estilista    estilista@highlife.com      / estilista123");
  console.log("  Barbero      barbero@highlife.com        / barbero123");
  console.log("  Masajista    masajista@highlife.com      / masajista123");
  console.log("  Cosmetóloga  cosmetologa@highlife.com    / cosmetologa123");
  console.log("  Cliente      cliente@highlife.com        / cliente123");
  console.log("──────────────────────────────────────────────────────────────────");
  console.log("Cambia las contraseñas después del primer login\n");

  await prisma.$disconnect();
}

seed().catch(err => {
  console.error("Error en seed:", err.message);
  prisma.$disconnect();
  process.exit(1);
});