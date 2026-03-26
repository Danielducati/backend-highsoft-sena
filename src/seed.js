// src/seed.js
// Crea el primer usuario administrador directamente en la BD
// Uso: node src/seed.js
// Solo necesitas correrlo UNA VEZ en cada instalación nueva

const prisma = require("./config/prisma");
const bcrypt = require("bcryptjs");

async function seed() {
console.log("🌱 Iniciando seed...");

// 1. Crear rol Admin si no existe
let rolAdmin = await prisma.rol.findFirst({ where: { nombre: "Admin" } });
if (!rolAdmin) {
    rolAdmin = await prisma.rol.create({ data: { nombre: "Admin" } });
    console.log("✅ Rol Admin creado");
} else {
    console.log("ℹ️  Rol Admin ya existe (id:", rolAdmin.id, ")");
}

// 2. Verificar si ya existe el admin
const existe = await prisma.usuario.findUnique({
    where: { correo: "admin@highlife.com" }
});

if (existe) {
    console.log("ℹ️  El usuario admin ya existe, no se creó de nuevo");
    console.log("   Correo:     admin@highlife.com");
    console.log("   Contraseña: admin123");
    await prisma.$disconnect();
    return;
}

// 3. Crear usuario admin
const hashed = await bcrypt.hash("admin123", 10);

await prisma.usuario.create({
    data: {
    correo:     "admin@highlife.com",
    contrasena: hashed,
    estado:     "Activo",
    rolId:      rolAdmin.id,
    },
});

console.log("✅ Usuario admin creado exitosamente");
console.log("─────────────────────────────────");
console.log("   Correo:     admin@highlife.com");
console.log("   Contraseña: admin123");
console.log("─────────────────────────────────");
console.log("⚠️  Cambia la contraseña después del primer login");

await prisma.$disconnect();
}

seed().catch(err => {
console.error("❌ Error en seed:", err.message);
prisma.$disconnect();
process.exit(1);
});