# Validación de Novedades en Creación de Citas

## 🎯 Funcionalidad

El sistema valida automáticamente que no se puedan crear citas cuando un empleado tiene una novedad activa que afecta el horario solicitado.

## 📋 Cómo Funciona

### 1. Validación Automática en Creación de Citas

Cuando se intenta crear una cita, el sistema:

1. **Identifica los empleados** asignados a los servicios
2. **Busca novedades activas** para cada empleado en la fecha seleccionada
3. **Valida solapamiento** entre el horario de la cita y las novedades
4. **Bloquea la cita** si hay conflicto

### 2. Estados de Novedades que Bloquean

Las novedades bloquean citas cuando están en estos estados:
- `"pendiente"` - Novedad registrada pero no aprobada
- `"Activo"` - Novedad activa
- `"Aprobada"` o `"aprobada"` - Novedad aprobada

**NO bloquean:**
- `"rechazada"` - Novedad rechazada
- `"resuelta"` - Novedad ya resuelta

### 3. Tipos de Bloqueo por Tipo de Novedad

#### 🔴 Bloqueo Total del Día (sin importar horario)
Estos tipos bloquean TODO el día, incluso si no tienen rango horario especificado:
- **Incapacidad**: El empleado no puede trabajar ese día
- **Permiso**: El empleado tiene permiso todo el día
- **Vacaciones**: El empleado está de vacaciones
- **Otro**: Otros tipos sin categorizar

**Comportamiento:**
- Si tienen rango horario: Se ignora, bloquea todo el día
- Si NO tienen rango horario: Bloquea todo el día

#### 🟡 Bloqueo Condicional (depende de si tiene horario)
Estos tipos bloquean según si tienen o no rango horario especificado:
- **Retraso**: Bloquea solo el rango horario especificado
- **Ausencia**: Bloquea el rango horario (si lo tiene) o todo el día (si no lo tiene)

**Comportamiento:**
- Si tienen rango horario: Bloquea solo ese rango (ej: 09:00 - 10:00)
- Si NO tienen rango horario: Bloquea todo el día

#### 🟢 Bloqueo Parcial (solo rango horario)
Estos tipos solo bloquean el rango horario especificado:
- **Percance**: Bloquea solo el rango horario

**Comportamiento:**
- Si tienen rango horario: Bloquea solo ese rango
- Si NO tienen rango horario: No bloquea (no debería pasar)

## 🔍 Ejemplos de Validación

### Ejemplo 1: Retraso con Horario Específico

**Novedad:**
- Tipo: Retraso
- Fecha: 2026-05-25
- Hora inicio: 09:00
- Hora fin: 10:00
- Estado: pendiente

**Intento de Cita:**
- Fecha: 2026-05-25
- Hora: 09:30
- Duración: 30 min (09:30 - 10:00)

**Resultado:** ❌ **BLOQUEADA**
```
Empleado Daniel Jaramillo tiene una retraso de 09:00 a 10:00
```

**Intento de Cita 2:**
- Fecha: 2026-05-25
- Hora: 10:00
- Duración: 30 min (10:00 - 10:30)

**Resultado:** ✅ **PERMITIDA** (no hay solapamiento)

### Ejemplo 2: Ausencia sin Horario Específico

**Novedad:**
- Tipo: Ausencia
- Fecha: 2026-05-25
- Hora inicio: null
- Hora fin: null
- Estado: aprobada

**Intento de Cita:**
- Fecha: 2026-05-25
- Hora: 14:00
- Duración: 60 min

**Resultado:** ❌ **BLOQUEADA**
```
Empleado Daniel Jaramillo no está disponible ese día por ausencia
```

### Ejemplo 3: Incapacidad (Varios Días)

**Novedad:**
- Tipo: Incapacidad
- Fecha inicio: 2026-05-25
- Fecha fin: 2026-05-27
- Estado: aprobada

**Intento de Cita:**
- Fecha: 2026-05-26
- Hora: 10:00

**Resultado:** ❌ **BLOQUEADA**
```
Empleado Daniel Jaramillo no está disponible ese día por incapacidad
```

### Ejemplo 4: Permiso (Varios Días)

**Novedad:**
- Tipo: Permiso
- Fecha inicio: 2026-05-25
- Fecha fin: 2026-05-26
- Estado: pendiente

**Intento de Cita:**
- Fecha: 2026-05-27
- Hora: 10:00

**Resultado:** ✅ **PERMITIDA** (fuera del rango de fechas)

## 🔧 Implementación Técnica

### Archivo: `src/utils/employeeAvailability.js`

#### Función Principal: `checkEmployeeAvailability`

```javascript
async function checkEmployeeAvailability(empleadoId, fecha, horaInicio, duracionMinutos)
```

**Parámetros:**
- `empleadoId`: ID del empleado a validar
- `fecha`: Fecha en formato YYYY-MM-DD
- `horaInicio`: Hora de inicio en formato HH:MM
- `duracionMinutos`: Duración del servicio en minutos

**Retorna:**
```javascript
{
  available: boolean,
  reason?: string,
  novedad?: {
    id: number,
    tipo: string,
    horaInicio?: string,
    horaFinal?: string,
    descripcion: string,
    bloqueaDia?: boolean
  }
}
```

#### Función para Múltiples Empleados: `checkMultipleEmployeesAvailability`

```javascript
async function checkMultipleEmployeesAvailability(asignaciones, fecha, horaInicio)
```

**Parámetros:**
- `asignaciones`: Array de `{empleadoId, servicioId}`
- `fecha`: Fecha en formato YYYY-MM-DD
- `horaInicio`: Hora de inicio en formato HH:MM

**Retorna:**
```javascript
{
  available: boolean,
  conflicts: Array<{
    empleadoId: number,
    reason: string,
    novedad: object
  }>
}
```

### Integración en Controlador de Citas

**Archivo:** `src/controllers/appointments.controller.js`

```javascript
// Validar disponibilidad de empleados (novedades y solapamientos)
const availabilityCheck = await checkMultipleEmployeesAvailability(
  asignaciones,
  fecha,
  hora
);

if (!availabilityCheck.available) {
  const conflict = availabilityCheck.conflicts[0];
  return res.status(400).json({
    error: conflict.reason,
    novedadInfo: conflict.novedad,
  });
}
```

## 📊 Flujo de Validación

```
┌─────────────────────────────────────┐
│  Usuario intenta crear cita         │
│  - Fecha: 2026-05-25                │
│  - Hora: 09:30                      │
│  - Empleado: Daniel Jaramillo       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Backend: appointments.controller   │
│  - Valida campos requeridos         │
│  - Valida formato de fecha/hora     │
│  - Valida que empleado tenga horario│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  checkMultipleEmployeesAvailability │
│  - Busca novedades activas          │
│  - Valida solapamiento              │
└──────────────┬──────────────────────┘
               │
         ┌─────┴─────┐
         │           │
         ▼           ▼
    ✅ Disponible  ❌ Conflicto
         │           │
         │           ▼
         │      ┌─────────────────────┐
         │      │ Retorna error 400   │
         │      │ con mensaje claro   │
         │      └─────────────────────┘
         │
         ▼
    ┌─────────────────────┐
    │ Crea la cita        │
    │ Retorna 201 Created │
    └─────────────────────┘
```

## 🧪 Cómo Probar

### Prueba 1: Crear Novedad de Retraso y Validar Bloqueo

1. **Crear novedad:**
   - Tipo: Retraso
   - Fecha: Hoy
   - Hora inicio: 09:00
   - Hora fin: 10:00
   - Estado: pendiente

2. **Intentar crear cita:**
   - Fecha: Hoy
   - Hora: 09:30
   - Empleado: El mismo de la novedad

3. **Resultado esperado:**
   - ❌ Error 400
   - Mensaje: "Empleado tiene una retraso de 09:00 a 10:00"

4. **Intentar crear cita fuera del rango:**
   - Fecha: Hoy
   - Hora: 10:30
   - Empleado: El mismo de la novedad

5. **Resultado esperado:**
   - ✅ Cita creada exitosamente

### Prueba 2: Crear Novedad de Ausencia sin Horario

1. **Crear novedad:**
   - Tipo: Ausencia
   - Fecha: Mañana
   - Sin hora inicio/fin
   - Estado: aprobada

2. **Intentar crear cita:**
   - Fecha: Mañana
   - Cualquier hora
   - Empleado: El mismo de la novedad

3. **Resultado esperado:**
   - ❌ Error 400
   - Mensaje: "Empleado no está disponible ese día por ausencia"

### Prueba 3: Crear Novedad de Incapacidad (Varios Días)

1. **Crear novedad:**
   - Tipo: Incapacidad
   - Fecha inicio: Hoy
   - Fecha fin: Dentro de 3 días
   - Estado: aprobada

2. **Intentar crear cita:**
   - Fecha: Dentro de 2 días (dentro del rango)
   - Cualquier hora
   - Empleado: El mismo de la novedad

3. **Resultado esperado:**
   - ❌ Error 400
   - Mensaje: "Empleado no está disponible ese día por incapacidad"

## 🔒 Seguridad

### Backend (Validación Real)
- ✅ Valida en el servidor antes de crear la cita
- ✅ Consulta base de datos para novedades activas
- ✅ Calcula solapamiento de horarios
- ✅ Retorna error 400 con mensaje claro

### Frontend (UX)
- ⚠️ Actualmente NO valida antes de enviar
- 💡 Recomendación: Agregar validación en frontend para mejor UX
- 💡 Mostrar empleados no disponibles en el selector

## 📝 Archivos Involucrados

### Backend
- `src/utils/employeeAvailability.js` - Lógica de validación (MODIFICADO)
- `src/controllers/appointments.controller.js` - Integración de validación
- `src/controllers/news.controller.js` - Creación de novedades

### Base de Datos
- Tabla `novedad` - Almacena las novedades
- Tabla `horario` - Relaciona novedades con empleados
- Tabla `agendamientoCita` - Citas a validar

## 🚀 Deployment

### Backend (Railway)
```bash
cd backend-highsoft-sena
git add src/utils/employeeAvailability.js
git commit -m "fix: actualizar lógica de bloqueo de novedades según tipo"
git push
```

Railway desplegará automáticamente.

## ✅ Checklist de Verificación

- [x] Validación de novedades implementada
- [x] Integración en controlador de citas
- [x] Lógica de bloqueo por tipo actualizada
- [x] Retraso: bloquea solo rango horario
- [x] Ausencia: bloquea rango horario o día completo
- [x] Incapacidad/Permiso: bloquean día completo
- [x] Estados de novedad validados
- [x] Mensajes de error claros
- [x] Documentación creada
- [ ] Desplegado a Railway (pendiente)
- [ ] Probado en producción (pendiente)

## 💡 Mejoras Futuras

1. **Frontend**: Validar disponibilidad antes de enviar el formulario
2. **Frontend**: Mostrar empleados no disponibles en el selector
3. **Frontend**: Mostrar calendario con días bloqueados
4. **Backend**: Notificaciones cuando se rechaza una cita por novedad
5. **Backend**: Sugerencias de horarios alternativos
