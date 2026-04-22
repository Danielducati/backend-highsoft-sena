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

  // ── 1. Verificar roles necesarios ─────────────────────────────────────
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

  // ── 2. Admin ───────────────────────────────────────────────────────────
  const { creado: adminCreado } = await createUsuario(
    "admin@highlife.com", "admin123", rolAdmin.id
  );
  console.log(adminCreado ? "✔ Usuario admin creado" : "– Usuario admin ya existe");

  // ── 3. Empleados por especialidad ──────────────────────────────────────
  const empleadosDemoData = [
    { especialidad: "Manicurista", correo: "manicurista@highlife.com", contrasena: "manicurista123", nombre: "Valentina", apellido: "Ríos"     },
    { especialidad: "Estilista",   correo: "estilista@highlife.com",   contrasena: "estilista123",   nombre: "Camila",    apellido: "Torres"   },
    { especialidad: "Barbero",     correo: "barbero@highlife.com",     contrasena: "barbero123",     nombre: "Andrés",    apellido: "Gómez"    },
    { especialidad: "Masajista",   correo: "masajista@highlife.com",   contrasena: "masajista123",   nombre: "Sofía",     apellido: "Herrera"  },
    { especialidad: "Cosmetóloga", correo: "cosmetologa@highlife.com", contrasena: "cosmetologa123", nombre: "Isabella",  apellido: "Morales"  },
  ];

  const empleadosCreados = [];

  for (const demo of empleadosDemoData) {
    const rol = rolesEmp.find(r => r.nombre === demo.especialidad);
    const { usuario, creado } = await createUsuario(demo.correo, demo.contrasena, rol.id);

    let empleado = await prisma.empleado.findFirst({ where: { correo: demo.correo } });
    if (!empleado) {
      empleado = await prisma.empleado.create({
        data: {
          nombre:       demo.nombre,
          apellido:     demo.apellido,
          correo:       demo.correo,
          especialidad: demo.especialidad,
          telefono:     "3001234567",
          ciudad:       "Medellín",
          estado:       "Activo",
          usuarioId:    usuario.id,
        },
      });
    }
    empleadosCreados.push(empleado);
    console.log(creado ? `✔ Usuario ${demo.especialidad} creado` : `– Usuario ${demo.especialidad} ya existe`);
  }

  // ── 4. Clientes ────────────────────────────────────────────────────────
  const clientesData = [
    { correo: "cliente@highlife.com",   contrasena: "cliente123",   nombre: "Carlos",    apellido: "Ramírez"   },
    { correo: "cliente2@highlife.com",  contrasena: "cliente123",   nombre: "María",     apellido: "López"     },
    { correo: "cliente3@highlife.com",  contrasena: "cliente123",   nombre: "Juan",      apellido: "Martínez"  },
    { correo: "cliente4@highlife.com",  contrasena: "cliente123",   nombre: "Daniela",   apellido: "Vargas"    },
    { correo: "cliente5@highlife.com",  contrasena: "cliente123",   nombre: "Santiago",  apellido: "Pérez"     },
  ];

  const clientesCreados = [];

  for (const cli of clientesData) {
    const { usuario: usuarioCli, creado: cliCreado } = await createUsuario(
      cli.correo, cli.contrasena, rolCliente.id
    );
    let cliente = await prisma.cliente.findFirst({ where: { correo: cli.correo } });
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nombre:     cli.nombre,
          apellido:   cli.apellido,
          correo:     cli.correo,
          telefono:   "3109876543",
          fotoPerfil: "",
          Estado:     "Activo",
          Usuarios: { connect: { id: usuarioCli.id } },
        },
      });
    }
    clientesCreados.push(cliente);
    console.log(cliCreado ? `✔ Cliente ${cli.nombre} creado` : `– Cliente ${cli.nombre} ya existe`);
  }

  // ── 5. Categorías de servicios ─────────────────────────────────────────
  const categoriasData = [
    { nombre: "Cabello",     color: "#FF6B9D" },
    { nombre: "Uñas",        color: "#C44BC4" },
    { nombre: "Barbería",    color: "#4B7BEC" },
    { nombre: "Masajes",     color: "#26C281" },
    { nombre: "Cosmetología",color: "#F9CA24" },
  ];

  const categoriasCreadas = [];
  for (const cat of categoriasData) {
    let categoria = await prisma.categoriaServicio.findFirst({ where: { nombre: cat.nombre } });
    if (!categoria) {
      categoria = await prisma.categoriaServicio.create({
        data: { nombre: cat.nombre, color: cat.color, estado: "Activo" },
      });
    }
    categoriasCreadas.push(categoria);
  }
  console.log("✔ Categorías creadas");

  // ── 6. Servicios ───────────────────────────────────────────────────────
  const serviciosData = [
    { nombre: "Corte de cabello",       duracion: 30,  precio: 25000,  categoriaIdx: 0 },
    { nombre: "Tinte completo",         duracion: 120, precio: 90000,  categoriaIdx: 0 },
    { nombre: "Manicure clásica",       duracion: 45,  precio: 20000,  categoriaIdx: 1 },
    { nombre: "Uñas acrílicas",         duracion: 90,  precio: 60000,  categoriaIdx: 1 },
    { nombre: "Corte de barba",         duracion: 30,  precio: 18000,  categoriaIdx: 2 },
    { nombre: "Corte + barba",          duracion: 60,  precio: 35000,  categoriaIdx: 2 },
    { nombre: "Masaje relajante",       duracion: 60,  precio: 70000,  categoriaIdx: 3 },
    { nombre: "Masaje descontracturante",duracion: 90, precio: 95000,  categoriaIdx: 3 },
    { nombre: "Limpieza facial",        duracion: 60,  precio: 55000,  categoriaIdx: 4 },
    { nombre: "Tratamiento anti-acné",  duracion: 75,  precio: 80000,  categoriaIdx: 4 },
  ];

  const serviciosCreados = [];
  for (const srv of serviciosData) {
    let servicio = await prisma.servicio.findFirst({ where: { nombre: srv.nombre } });
    if (!servicio) {
      servicio = await prisma.servicio.create({
        data: {
          nombre:      srv.nombre,
          duracion:    srv.duracion,
          precio:      srv.precio,
          estado:      "Activo",
          categoriaId: categoriasCreadas[srv.categoriaIdx].id,
        },
      });
    }
    serviciosCreados.push(servicio);
  }
  console.log("✔ Servicios creados");

  // ── 7. Empleado_Servicio ───────────────────────────────────────────────
  const asignaciones = [
    { empleadoIdx: 0, servicioIdx: 2 }, // Valentina → Manicure clásica
    { empleadoIdx: 0, servicioIdx: 3 }, // Valentina → Uñas acrílicas
    { empleadoIdx: 1, servicioIdx: 0 }, // Camila    → Corte de cabello
    { empleadoIdx: 1, servicioIdx: 1 }, // Camila    → Tinte completo
    { empleadoIdx: 2, servicioIdx: 4 }, // Andrés    → Corte de barba
    { empleadoIdx: 2, servicioIdx: 5 }, // Andrés    → Corte + barba
    { empleadoIdx: 3, servicioIdx: 6 }, // Sofía     → Masaje relajante
    { empleadoIdx: 3, servicioIdx: 7 }, // Sofía     → Masaje descontracturante
    { empleadoIdx: 4, servicioIdx: 8 }, // Isabella  → Limpieza facial
    { empleadoIdx: 4, servicioIdx: 9 }, // Isabella  → Tratamiento anti-acné
  ];

  for (const asig of asignaciones) {
    const existe = await prisma.empleadoServicio.findFirst({
      where: {
        empleadoId: empleadosCreados[asig.empleadoIdx].id,
        servicioId: serviciosCreados[asig.servicioIdx].id,
      },
    });
    if (!existe) {
      await prisma.empleadoServicio.create({
        data: {
          empleadoId: empleadosCreados[asig.empleadoIdx].id,
          servicioId: serviciosCreados[asig.servicioIdx].id,
        },
      });
    }
  }
  console.log("✔ Servicios asignados a empleados");

  // ── 8. Cotizaciones y citas ────────────────────────────────────────────
  const hoy = new Date();
  const citasData = [
    { clienteIdx: 0, servicioIdx: 0, empleadoIdx: 1, diasOffset: 1,  hora: "09:00" },
    { clienteIdx: 1, servicioIdx: 2, empleadoIdx: 0, diasOffset: 1,  hora: "10:00" },
    { clienteIdx: 2, servicioIdx: 4, empleadoIdx: 2, diasOffset: 2,  hora: "11:00" },
    { clienteIdx: 3, servicioIdx: 6, empleadoIdx: 3, diasOffset: 2,  hora: "14:00" },
    { clienteIdx: 4, servicioIdx: 8, empleadoIdx: 4, diasOffset: 3,  hora: "15:00" },
    { clienteIdx: 0, servicioIdx: 1, empleadoIdx: 1, diasOffset: 4,  hora: "09:30" },
    { clienteIdx: 1, servicioIdx: 3, empleadoIdx: 0, diasOffset: 4,  hora: "11:00" },
    { clienteIdx: 2, servicioIdx: 5, empleadoIdx: 2, diasOffset: 5,  hora: "10:00" },
    { clienteIdx: 3, servicioIdx: 7, empleadoIdx: 3, diasOffset: 5,  hora: "13:00" },
    { clienteIdx: 4, servicioIdx: 9, empleadoIdx: 4, diasOffset: 6,  hora: "16:00" },
  ];

  for (const citaData of citasData) {
    const fechaCita = new Date(hoy);
    fechaCita.setDate(hoy.getDate() + citaData.diasOffset);
    fechaCita.setHours(0, 0, 0, 0);

    const servicio = serviciosCreados[citaData.servicioIdx];
    const cliente  = clientesCreados[citaData.clienteIdx];
    const empleado = empleadosCreados[citaData.empleadoIdx];
    const [horas, minutos] = citaData.hora.split(":").map(Number);
    const horaDate = new Date(1970, 0, 1, horas, minutos, 0);

    // Crear cotización
    const cotizacion = await prisma.cotizacion.create({
      data: {
        clienteId:  cliente.id,
        fecha:      fechaCita,
        subtotal:   servicio.precio,
        iva:        0,
        total:      servicio.precio,
        estado:     "Activo",
        horaInicio: horaDate,
      },
    });

    await prisma.detalleCotizacion.create({
      data: {
        cotizacionId: cotizacion.id,
        servicioId:   servicio.id,
        precio:       servicio.precio,
        cantidad:     1,
      },
    });

    // Crear cita
    const cita = await prisma.agendamientoCita.create({
      data: {
        clienteId:    cliente.id,
        cotizacionId: cotizacion.id,
        fecha:        fechaCita,
        horario:      horaDate,
        estado:       "Pendiente",
        notas:        `Cita de prueba - ${servicio.nombre}`,
      },
    });

    await prisma.agendamientoDetalle.create({
      data: {
        citaId:     cita.id,
        servicioId: servicio.id,
        empleadoId: empleado.id,
        precio:     servicio.precio,
        detalle:    servicio.nombre,
      },
    });
  }
  console.log("✔ Cotizaciones y citas creadas");

  // ── Resumen ────────────────────────────────────────────────────────────
  console.log("\n──────────────────────────────────────────────────────────────────");
  console.log("  Admin        admin@highlife.com          / admin123");
  console.log("  Manicurista  manicurista@highlife.com    / manicurista123");
  console.log("  Estilista    estilista@highlife.com      / estilista123");
  console.log("  Barbero      barbero@highlife.com        / barbero123");
  console.log("  Masajista    masajista@highlife.com      / masajista123");
  console.log("  Cosmetóloga  cosmetologa@highlife.com    / cosmetologa123");
  console.log("  Cliente 1    cliente@highlife.com        / cliente123");
  console.log("  Cliente 2    cliente2@highlife.com       / cliente123");
  console.log("  Cliente 3    cliente3@highlife.com       / cliente123");
  console.log("  Cliente 4    cliente4@highlife.com       / cliente123");
  console.log("  Cliente 5    cliente5@highlife.com       / cliente123");
  console.log("──────────────────────────────────────────────────────────────────");
  console.log("Cambia las contraseñas después del primer login\n");

  await prisma.$disconnect();
}

seed().catch(err => {
  console.error("Error en seed:", err.message);
  prisma.$disconnect();
  process.exit(1);
});