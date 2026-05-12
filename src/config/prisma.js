// src/config/prisma.js
// ─────────────────────────────────────────────────────────────────────────────
// Cliente Prisma singleton — importar este archivo en vez de mssql/pool
// ─────────────────────────────────────────────────────────────────────────────
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["error"],
});

prisma.$connect()
  .then(() => console.log("✅ Prisma conectado a PostgreSQL"))
  .catch(err => console.error("❌ Error Prisma:", err));

module.exports = prisma;
