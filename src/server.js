const express = require('express');
const cors    = require('cors');
require("dotenv").config();

const app  = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ── Importar rutas ────────────────────────────────────────────
const appointmentRoutes = require('./routes/appointments.routes.js');
const employeeRoutes    = require('./routes/employees.routes.js');
const clientRoutes      = require('./routes/clients.routes.js');
const salesRoutes       = require('./routes/sales.routes.js');
const categoriesRoutes  = require('./routes/categories.routes.js');
const schedulesRoutes   = require('./routes/schedules.routes.js');
const quotationsRoutes  = require('./routes/quotations.routes.js');
const dashboardRoutes   = require('./routes/dashboard.routes.js');
const newsRoutes        = require('./routes/news.routes.js');
const servicesRoutes    = require('./routes/services.routes.js');
const usersRoutes       = require('./routes/users.routes.js');
const rolesRoutes       = require('./routes/roles.routes.js');
const authRouter        = require('./routes/auth.routes.js'); 
const permissionsRoutes = require("./routes/permissions.routes.js");
const uploadRoutes      = require("./routes/upload.routes.js");
const syncRoutes        = require("./routes/sync.routes.js");

// ── Registrar rutas ───────────────────────────────────────────
app.use('/appointments',     appointmentRoutes);
app.use('/api/appointments', appointmentRoutes);

app.use('/permisos',         permissionsRoutes);
app.use('/api/permisos',     permissionsRoutes);

app.use('/employees',        employeeRoutes);
app.use('/api/employees',    employeeRoutes);

app.use('/clients',          clientRoutes);
app.use('/api/clients',      clientRoutes);

app.use('/sales',            salesRoutes);
app.use('/api/sales',        salesRoutes);

app.use('/categories',       categoriesRoutes);
app.use('/api/categories',   categoriesRoutes);

app.use('/schedules',        schedulesRoutes);
app.use('/api/schedules',    schedulesRoutes);

app.use('/quotations',       quotationsRoutes);
app.use('/api/quotations',   quotationsRoutes);

app.use('/dashboard',        dashboardRoutes);
app.use('/api/dashboard',    dashboardRoutes);

app.use('/news',             newsRoutes);
app.use('/api/news',         newsRoutes);

app.use('/services',         servicesRoutes);
app.use('/api/services',     servicesRoutes);

app.use('/users',            usersRoutes);
app.use('/api/users',        usersRoutes);

app.use('/roles',            rolesRoutes);
app.use('/api/roles',        rolesRoutes);

app.use('/auth',             authRouter);
app.use('/api/auth',         authRouter);

app.use("/upload",           uploadRoutes);
app.use("/api/upload",       uploadRoutes);

app.use("/sync",             syncRoutes);
app.use("/api/sync",         syncRoutes);

// ── Iniciar servidor ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🔥 Backend corriendo en puerto ${PORT}`);
});

// ── Auto-cancelar citas vencidas ──────────────────────────────
// Corre cada hora y cancela citas Pendientes cuya fecha ya pasó
const prisma = require("./config/prisma");

async function cancelarCitasVencidas() {
  try {
    const ahora = new Date();
    // Fecha de hoy a medianoche UTC (para comparar solo por fecha)
    const hoy = new Date(Date.UTC(
      ahora.getUTCFullYear(),
      ahora.getUTCMonth(),
      ahora.getUTCDate()
    ));

    const resultado = await prisma.agendamientoCita.updateMany({
      where: {
        estado: "Pendiente",
        fecha: { lt: hoy }, // fecha anterior a hoy
      },
      data: { estado: "Cancelada" },
    });

    if (resultado.count > 0) {
      console.log(`⏰ Auto-canceladas ${resultado.count} cita(s) vencida(s)`);
    }
  } catch (err) {
    console.error("❌ Error al auto-cancelar citas:", err.message);
  }
}

// Ejecutar al iniciar y luego cada hora
cancelarCitasVencidas();
setInterval(cancelarCitasVencidas, 60 * 60 * 1000); // cada 1 hora