const express = require("express");
const router  = express.Router();
const prisma  = require("../config/prisma");

function formatService(s) {
  return {
    id:          s.id,
    name:        s.nombre,
    descripcion: s.descripcion ?? "",
    duration:    s.duracion    ?? 0,
    price:       Number(s.precio ?? 0),
    category:    s.categoria?.nombre ?? "",
    categoryId:  s.categoriaId,
    imagen:      s.imagenServicio ?? "",
    estado:      s.estado,
  };
}

// GET /services — público para usuarios autenticados (sin permiso especial)
router.get("/", async (req, res) => {
  try {
    const soloActivos = req.query.all !== "true";
    const data = await prisma.servicio.findMany({
      where:   soloActivos ? { estado: "Activo" } : {},
      include: { categoria: true },
      orderBy: { nombre: "asc" },
    });
    res.json(data.map(formatService));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /services/:id
router.get("/:id", async (req, res) => {
  try {
    const s = await prisma.servicio.findUnique({
      where:   { id: Number(req.params.id) },
      include: { categoria: true },
    });
    if (!s) return res.status(404).json({ error: "Servicio no encontrado" });
    res.json(formatService(s));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /services
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion, Duracion, Precio, FK_categoria_servicios, imagen_servicio, Estado } = req.body;

    if (!nombre || !FK_categoria_servicios)
      return res.status(400).json({ error: "nombre y categoría son requeridos" });

    // Verificar nombre duplicado
    const existe = await prisma.servicio.findFirst({ where: { nombre } });
    if (existe)
      return res.status(409).json({ error: `Ya existe un servicio con el nombre "${nombre}"` });

    const s = await prisma.servicio.create({
      data: {
        nombre,
        descripcion:    descripcion     ?? null,
        duracion:       Duracion        ?? null,
        precio:         Precio          ?? null,
        categoriaId:    Number(FK_categoria_servicios),
        imagenServicio: imagen_servicio ?? null,
        estado:         Estado          ?? "Activo",
      },
      include: { categoria: true },
    });

    res.status(201).json({ ok: true, id: s.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /services/:id
router.put("/:id", async (req, res) => {
  try {
    const { nombre, descripcion, Duracion, Precio, FK_categoria_servicios, imagen_servicio, Estado } = req.body;

    // Verificar nombre duplicado si se está cambiando
    if (nombre) {
      const existe = await prisma.servicio.findFirst({
        where: { nombre, id: { not: Number(req.params.id) } },
      });
      if (existe)
        return res.status(409).json({ error: `Ya existe un servicio con el nombre "${nombre}"` });
    }

    const data = {};
    if (nombre                 !== undefined) data.nombre         = nombre;
    if (descripcion            !== undefined) data.descripcion    = descripcion;
    if (Duracion               !== undefined) data.duracion       = Duracion;
    if (Precio                 !== undefined) data.precio         = Precio;
    if (FK_categoria_servicios !== undefined) data.categoriaId    = Number(FK_categoria_servicios);
    if (imagen_servicio        !== undefined) data.imagenServicio = imagen_servicio;
    if (Estado                 !== undefined) data.estado         = Estado;

    await prisma.servicio.update({
      where: { id: Number(req.params.id) },
      data,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /services/:id — elimina si no tiene asociaciones, sino desactiva
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Verificar asociaciones
    const [citas, ventas, cotizaciones] = await Promise.all([
      prisma.agendamientoDetalle.count({ where: { servicioId: id } }),
      prisma.ventaDetalle.count({ where: { servicioId: id } }),
      prisma.detalleCotizacion.count({ where: { servicioId: id } }),
    ]);

    const total = citas + ventas + cotizaciones;

    if (total > 0) {
      return res.status(400).json({
        error: `No se puede eliminar. El servicio tiene ${total} registro(s) asociado(s)`,
      });
    }

    await prisma.servicio.delete({ where: { id } });
    res.json({ ok: true, mensaje: "Servicio eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;