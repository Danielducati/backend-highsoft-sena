# Sistema de Validación de Disponibilidad de Empleados

## 📋 Descripción General

El sistema valida automáticamente la disponibilidad de empleados al crear o modificar citas, considerando las novedades registradas (ausencias, permisos, incapacidades, etc.).

## 🎯 Funcionalidades

### 1. Validación Automática en Citas

Cuando se crea o actualiza una cita, el sistema:

1. ✅ Verifica que el empleado tenga horario registrado para esa fecha
2. ✅ Valida que no tenga novedades que bloqueen ese horario
3. ✅ Verifica que no haya solapamiento con otras citas existentes

### 2. Tipos de Novedades

#### Bloqueo Completo del Día
Estas novedades inhabilitan al empleado durante todo el día, sin importar el rango horario:

- **Incapacidad**: Ausencia por motivos médicos
- **Ausencia**: Ausencia general
- **Vacaciones**: Período de descanso

#### Bloqueo Parcial (Por Horario)
Estas novedades solo bloquean el rango horario específico:

- **Permiso**: Permiso temporal
- **Retraso**: Llegada tarde
- **Percance**: Imprevisto
- **Otro**: Otras novedades

### 3. Estados de Novedades que Bloquean

El sistema considera las siguientes novedades como bloqueantes:

- **Activo** (Pendiente de aprobación)
- **Aprobada** (Ya aprobada por administrador)

Las novedades **Rechazadas** o **Resueltas** NO bloquean al empleado.

## 🔧 Implementación Técnica

### Archivo Utilitario: `employeeAvailability.js`

```javascript
// Validar disponibilidad de un empleado
const result = await checkEmployeeAvailability(
  empleadoId,    // ID del empleado
  fecha,         // "YYYY-MM-DD"
  horaInicio,    // "HH:MM"
  duracionMinutos // Duración del servicio
);

// Resultado:
{
  available: true/false,
  reason: "Mensaje de error si no está disponible",
  novedad: { /* Información de la novedad */ }
}
```

### Endpoints Disponibles

#### 1. Obtener Novedades de un Empleado en una Fecha

```http
GET /api/news/employee/:employeeId/date/:date
```

**Ejemplo:**
```http
GET /api/news/employee/5/date/2026-05-25
```

**Respuesta:**
```json
{
  "employeeId": 5,
  "date": "2026-05-25",
  "hasNovedades": true,
  "novedades": [
    {
      "id": 12,
      "tipo": "permiso",
      "descripcion": "Cita médica",
      "fechaInicio": "2026-05-25",
      "fechaFinal": "2026-05-25",
      "horaInicio": "09:00",
      "horaFinal": "11:00",
      "estado": "Aprobada",
      "bloqueaDiaCompleto": false
    }
  ]
}
```

#### 2. Crear Cita (con validación automática)

```http
POST /api/appointments
```

**Body:**
```json
{
  "cliente": 10,
  "fecha": "2026-05-25",
  "hora": "10:00",
  "servicios": [
    {
      "servicio": 3,
      "empleado_usuario": 5
    }
  ]
}
```

**Respuesta de Error (si hay conflicto):**
```json
{
  "error": "Juan Pérez tiene una permiso de 09:00 a 11:00",
  "novedadInfo": {
    "id": 12,
    "tipo": "permiso",
    "horaInicio": "09:00",
    "horaFinal": "11:00",
    "descripcion": "Cita médica"
  }
}
```

## 📊 Flujo de Validación

```
┌─────────────────────────────────────┐
│  Usuario crea/actualiza cita       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Validar horario registrado         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Buscar novedades activas/aprobadas │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  ¿Tiene novedades?                  │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
      SÍ              NO
       │               │
       ▼               ▼
┌──────────────┐  ┌──────────────┐
│ ¿Bloquea día │  │ Validar      │
│  completo?   │  │ solapamiento │
└──────┬───────┘  │ con otras    │
       │          │ citas        │
   ┌───┴───┐      └──────┬───────┘
   │       │             │
  SÍ      NO             ▼
   │       │      ┌──────────────┐
   │       ▼      │ ✅ Cita      │
   │  ┌─────────┐ │ permitida    │
   │  │ Validar │ └──────────────┘
   │  │ rango   │
   │  │ horario │
   │  └────┬────┘
   │       │
   ▼       ▼
┌──────────────────┐
│ ❌ Rechazar cita │
│ (empleado no     │
│  disponible)     │
└──────────────────┘
```

## 🎨 Integración con Frontend

### Ejemplo de Uso en React

```typescript
// Verificar disponibilidad antes de mostrar horarios
const checkAvailability = async (employeeId: number, date: string) => {
  const response = await fetch(
    `/api/news/employee/${employeeId}/date/${date}`
  );
  const data = await response.json();
  
  if (data.hasNovedades) {
    // Mostrar advertencia o deshabilitar horarios
    data.novedades.forEach(novedad => {
      if (novedad.bloqueaDiaCompleto) {
        // Deshabilitar todo el día
        disableDay(date);
      } else {
        // Deshabilitar solo el rango horario
        disableTimeRange(novedad.horaInicio, novedad.horaFinal);
      }
    });
  }
};
```

## 🔍 Casos de Uso

### Caso 1: Incapacidad (Bloquea todo el día)

```
Novedad:
- Tipo: Incapacidad
- Fecha: 2026-05-25
- Sin rango horario específico

Resultado:
❌ No se pueden agendar citas con este empleado el 2026-05-25
```

### Caso 2: Permiso (Bloquea solo un rango)

```
Novedad:
- Tipo: Permiso
- Fecha: 2026-05-25
- Hora: 09:00 - 11:00

Resultado:
✅ Se pueden agendar citas antes de las 09:00
✅ Se pueden agendar citas después de las 11:00
❌ No se pueden agendar citas entre 09:00 y 11:00
```

### Caso 3: Múltiples Servicios

```
Cita:
- Fecha: 2026-05-25
- Hora: 10:00
- Servicios:
  * Servicio A (60 min) - Empleado 1
  * Servicio B (30 min) - Empleado 2

Validación:
1. Empleado 1: 10:00 - 11:00 ✅
2. Empleado 2: 10:00 - 10:30 ✅
```

## 🛠️ Mantenimiento

### Agregar Nuevo Tipo de Novedad Bloqueante

Editar `src/utils/employeeAvailability.js`:

```javascript
const TIPOS_NOVEDAD_BLOQUEANTES = {
  BLOQUEO_COMPLETO: ["incapacidad", "ausencia", "vacaciones", "nuevo_tipo"],
  BLOQUEO_PARCIAL: ["permiso", "retraso", "percance", "otro"],
};
```

### Cambiar Estados que Bloquean

Editar la consulta en `checkEmployeeAvailability`:

```javascript
estado: {
  in: ["Activo", "Aprobada", "aprobada", "nuevo_estado"]
}
```

## 📝 Notas Importantes

1. **Novedades Pendientes (Activo)**: Se consideran bloqueantes para evitar conflictos
2. **Novedades Rechazadas**: NO bloquean al empleado
3. **Validación en Tiempo Real**: Se valida tanto al crear como al actualizar citas
4. **Múltiples Empleados**: Se valida cada empleado individualmente
5. **Duración de Servicios**: Se considera la duración total de todos los servicios asignados al empleado

## 🐛 Troubleshooting

### Problema: Empleado aparece disponible pero tiene novedad

**Solución**: Verificar que el estado de la novedad sea "Activo" o "Aprobada"

### Problema: No se puede agendar ninguna cita con un empleado

**Solución**: Verificar si tiene una novedad sin fecha final (indefinida)

### Problema: Validación no funciona al actualizar cita

**Solución**: Asegurarse de que el endpoint de actualización incluya la validación

## 📚 Referencias

- Controlador de Citas: `src/controllers/appointments.controller.js`
- Controlador de Novedades: `src/controllers/news.controller.js`
- Utilidad de Disponibilidad: `src/utils/employeeAvailability.js`
- Rutas de Novedades: `src/routes/news.routes.js`
