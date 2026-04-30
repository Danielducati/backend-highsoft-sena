# EJEMPLOS DE USO: NUEVA ARQUITECTURA

## 1. CREAR HORARIO SEMANAL BASE

```javascript
// POST /api/v2/schedules/template
{
  "empleadoId": 123,
  "nombre": "Horario Regular",
  "fechaInicio": "2024-01-01",
  "diasSemana": [
    { "diaSemana": 1, "horaInicio": "08:00", "horaFin": "17:00" }, // Lunes
    { "diaSemana": 2, "horaInicio": "08:00", "horaFin": "17:00" }, // Martes
    { "diaSemana": 3, "horaInicio": "08:00", "horaFin": "17:00" }, // Miércoles
    { "diaSemana": 4, "horaInicio": "08:00", "horaFin": "17:00" }, // Jueves
    { "diaSemana": 5, "horaInicio": "08:00", "horaFin": "17:00" }  // Viernes
  ]
}

// Respuesta:
{
  "success": true,
  "plantillaId": 456,
  "message": "Plantilla de horario creada exitosamente"
}
```

## 2. CREAR NOVEDAD DENTRO DEL HORARIO

```javascript
// POST /api/v2/news
{
  "empleadoId": 123,
  "tipo": "permiso",
  "fechaInicio": "2024-01-15",
  "horaInicio": "14:00",
  "horaFin": "17:00",
  "descripcion": "Cita médica"
}

// Respuesta exitosa:
{
  "success": true,
  "novedadId": 789,
  "message": "Novedad creada exitosamente"
}
```

## 3. CREAR NOVEDAD CON CONFLICTOS

```javascript
// POST /api/v2/news
{
  "empleadoId": 123,
  "tipo": "incapacidad",
  "fechaInicio": "2024-01-16",
  "descripcion": "Incapacidad médica"
}

// Respuesta con conflicto (409):
{
  "conflict": true,
  "message": "Existen citas programadas en el horario de la novedad",
  "conflictos": [
    {
      "citaId": 101,
      "clienteNombre": "Juan Pérez",
      "fecha": "2024-01-16",
      "hora": "10:00",
      "servicio": "Corte de cabello",
      "precio": 25000
    }
  ],
  "acciones": [
    { "value": "cancelar", "label": "Cancelar citas en conflicto" },
    { "value": "reasignar", "label": "Reasignar citas a otro empleado" },
    { "value": "mantener", "label": "Crear novedad y mantener citas" }
  ]
}
```

## 4. RESOLVER CONFLICTOS

```javascript
// POST /api/v2/news (segunda llamada con resolución)
{
  "empleadoId": 123,
  "tipo": "incapacidad",
  "fechaInicio": "2024-01-16",
  "descripcion": "Incapacidad médica",
  "accionConflicto": "reasignar",
  "nuevoEmpleadoId": 124
}

// Respuesta:
{
  "success": true,
  "novedadId": 790,
  "message": "Novedad creada y conflictos resueltos (reasignar)",
  "citasAfectadas": [
    {
      "citaId": 101,
      "accion": "reasignada",
      "nuevoEmpleado": "María García"
    }
  ]
}
```

## 5. CONSULTAR DISPONIBILIDAD

```javascript
// GET /api/v2/schedules/availability/123?fechaInicio=2024-01-15&fechaFin=2024-01-19

// Respuesta:
{
  "empleadoId": "123",
  "periodo": {
    "fechaInicio": "2024-01-15",
    "fechaFin": "2024-01-19"
  },
  "disponibilidad": [
    {
      "fecha": "2024-01-15",
      "horaInicio": "08:00",
      "horaFin": "14:00", // Reducido por permiso 14:00-17:00
      "disponible": true,
      "motivo": null
    },
    {
      "fecha": "2024-01-16",
      "horaInicio": null,
      "horaFin": null,
      "disponible": false,
      "motivo": "Novedad: Incapacidad médica"
    },
    {
      "fecha": "2024-01-17",
      "horaInicio": "08:00",
      "horaFin": "17:00",
      "disponible": true,
      "motivo": null
    }
  ]
}
```

## 6. VALIDACIONES AUTOMÁTICAS

### Novedad fuera del horario laboral:
```javascript
// POST /api/v2/news
{
  "empleadoId": 123,
  "tipo": "retraso",
  "fechaInicio": "2024-01-15",
  "horaInicio": "19:00", // Fuera del horario 08:00-17:00
  "horaFin": "20:00",
  "descripcion": "Retraso por tráfico"
}

// Respuesta error (400):
{
  "error": "La novedad debe estar dentro del horario laboral del empleado"
}
```

### Empleado sin horario base:
```javascript
// POST /api/v2/news
{
  "empleadoId": 999, // Empleado sin plantilla de horario
  "tipo": "permiso",
  "fechaInicio": "2024-01-15",
  "descripcion": "Permiso personal"
}

// Respuesta error (400):
{
  "error": "El empleado no tiene horario definido para esta fecha. Debe crear primero una plantilla de horario semanal.",
  "suggestion": "Debe crear primero una plantilla de horario semanal para el empleado"
}
```

## 7. FLUJO COMPLETO DE AGENDAMIENTO

```javascript
// 1. Consultar disponibilidad antes de agendar
// GET /api/v2/schedules/availability/123?fechaInicio=2024-01-20&fechaFin=2024-01-20

// 2. Verificar horario efectivo para hora específica
// GET /api/v2/schedules/effective/123/2024-01-20

// 3. Crear cita solo si hay disponibilidad
// POST /api/appointments (lógica existente mejorada)

// 4. Si se crea una novedad posterior, se detectan conflictos automáticamente
```

## 8. REPORTES Y ANÁLISIS

```javascript
// Obtener impacto de una novedad
// GET /api/v2/news/790/impact

// Respuesta:
{
  "novedadId": 790,
  "empleado": "Juan Pérez",
  "impacto": {
    "diasAfectados": 1,
    "citasEnConflicto": 3,
    "tipoAfectacion": "dia_completo",
    "conflictos": [
      {
        "citaId": 101,
        "clienteNombre": "María García",
        "fecha": "2024-01-16",
        "hora": "10:00",
        "servicio": "Corte de cabello"
      }
    ]
  }
}
```

## VENTAJAS DE LA NUEVA ARQUITECTURA

1. **Validación automática**: No se pueden crear novedades inválidas
2. **Detección de conflictos**: Automática y precisa
3. **Resolución guiada**: El sistema sugiere acciones
4. **Consultas optimizadas**: Disponibilidad precalculada
5. **Escalabilidad**: Modelo preparado para crecimiento
6. **Trazabilidad**: Historial completo de cambios
7. **Flexibilidad**: Soporte para múltiples tipos de novedades
8. **Integridad**: Datos consistentes en todo momento