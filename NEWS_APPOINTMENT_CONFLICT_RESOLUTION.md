# Resolución de Conflictos de Citas al Aprobar Novedades

## Descripción General

Cuando se aprueba una novedad (retraso, ausencia, permiso, incapacidad, otro), el sistema verifica automáticamente si el empleado tiene citas programadas durante el período de la novedad. Si existen conflictos, se presenta un diálogo al usuario con opciones para resolverlos.

## Flujo de Trabajo

### 1. Detección de Conflictos (Backend)

Cuando se intenta aprobar una novedad (`estado: "aprobada"`), el backend:

1. Busca todas las citas del empleado en el rango de fechas de la novedad
2. Filtra solo las citas con estado `Pendiente` o `Confirmada`
3. Si la novedad tiene rango horario específico, valida solapamiento de horarios
4. Si la novedad es de día completo (sin horas), todas las citas del día se consideran en conflicto

**Endpoint:** `PATCH /news/:id/status`

**Respuesta de conflicto (409):**
```json
{
  "conflict": true,
  "message": "Esta novedad afecta citas existentes. ¿Qué deseas hacer?",
  "novedad": {
    "id": 123,
    "tipo": "ausencia",
    "empleado": "Juan Pérez",
    "fechaInicio": "2026-05-25",
    "fechaFinal": "2026-05-25",
    "horaInicio": "09:00",
    "horaFinal": "12:00"
  },
  "citasAfectadas": [
    {
      "citaId": 456,
      "detalleId": 789,
      "fecha": "2026-05-25",
      "hora": "10:00",
      "servicio": "Corte de cabello",
      "cliente": "María García",
      "clienteContacto": {
        "correo": "maria@example.com",
        "telefono": "3001234567"
      }
    }
  ],
  "empleadosDisponibles": [
    {
      "id": 2,
      "nombre": "Pedro López",
      "especialidad": "Barbero"
    }
  ],
  "opciones": [
    {
      "action": "cancel",
      "label": "Cancelar las citas afectadas",
      "description": "Las citas serán canceladas y los clientes deberán ser notificados"
    },
    {
      "action": "reassign",
      "label": "Reasignar a otro empleado",
      "description": "Selecciona un empleado disponible para reasignar los servicios",
      "requiresEmployeeId": true
    },
    {
      "action": "keep",
      "label": "Mantener las citas (no recomendado)",
      "description": "Las citas se mantendrán a pesar de la novedad"
    }
  ]
}
```

### 2. Presentación del Diálogo (Frontend)

El componente `NewsAppointmentConflictDialog` muestra:

- **Información de la novedad:** tipo, empleado, fechas, horario
- **Lista de citas afectadas:** con detalles del cliente, servicio, fecha/hora, contacto
- **Opciones de resolución:**
  - **Cancelar citas:** Cambia el estado de las citas a `Cancelada`
  - **Reasignar a otro empleado:** Muestra un selector con empleados disponibles
  - **Mantener citas:** No hace cambios (no recomendado)

### 3. Resolución del Conflicto

Una vez que el usuario selecciona una opción y confirma:

**Request:**
```json
{
  "status": "aprobada",
  "action": "reassign",
  "reassignToEmployeeId": 2
}
```

**Backend ejecuta la acción:**
- `cancel`: Actualiza `estado = "Cancelada"` en todas las citas afectadas
- `reassign`: Actualiza `empleadoId` en los detalles de agendamiento (`AgendamientoDetalle`)
- `keep`: No hace cambios en las citas

**Finalmente:** Aprueba la novedad (`estado = "aprobada"`)

## Validación de Solapamiento Horario

### Novedad con Rango Horario

Si la novedad tiene `horaInicio` y `horaFinal`, solo se consideran en conflicto las citas que se solapan con ese rango:

```javascript
// Ejemplo: Novedad de 09:00 a 12:00
// Cita 1: 08:00 (60 min) → 09:00 ✅ NO conflicto (termina cuando empieza la novedad)
// Cita 2: 10:00 (60 min) → 11:00 ❌ CONFLICTO (se solapa)
// Cita 3: 12:00 (60 min) → 13:00 ✅ NO conflicto (empieza cuando termina la novedad)
```

### Novedad de Día Completo

Si la novedad NO tiene `horaInicio` ni `horaFinal`, todas las citas del día se consideran en conflicto.

## Archivos Modificados

### Backend
- `src/controllers/news.controller.js` - Lógica de detección y resolución de conflictos
- `src/utils/errorMessages.js` - Mensaje de error `NEWS_CONFLICT_APPOINTMENTS`

### Frontend
- `src/features/news/services/newsApi.ts` - Tipos e interfaz para conflictos de aprobación
- `src/features/news/hooks/useNews.ts` - Estado y funciones para manejar conflictos
- `src/features/news/components/NewsAppointmentConflictDialog.tsx` - Diálogo de resolución
- `src/features/news/pages/NewsPage.tsx` - Integración del diálogo

## Tipos TypeScript

```typescript
// Cita afectada
interface AffectedAppointment {
  citaId: number;
  detalleId: number;
  fecha: string;
  hora: string;
  servicio: string;
  cliente: string;
  clienteContacto: {
    correo?: string;
    telefono?: string;
  };
}

// Respuesta de conflicto
interface ApprovalConflictResponse {
  conflict: true;
  message: string;
  novedad: {
    id: number;
    tipo: string;
    empleado: string;
    fechaInicio: string;
    fechaFinal: string;
    horaInicio?: string;
    horaFinal?: string;
  };
  citasAfectadas: AffectedAppointment[];
  empleadosDisponibles: AvailableEmployee[];
  opciones: ConflictOption[];
}

// Acción de resolución
type ConflictAction =
  | { action: "cancel" }
  | { action: "keep" }
  | { action: "reassign"; reassignToEmployeeId: string };
```

## Casos de Uso

### Caso 1: Ausencia de Día Completo
- Empleado: Juan Pérez
- Novedad: Ausencia el 2026-05-25 (día completo)
- Citas afectadas: 3 citas programadas ese día
- Acción: Reasignar todas las citas a Pedro López

### Caso 2: Retraso Parcial
- Empleado: María García
- Novedad: Retraso de 08:00 a 10:00
- Citas afectadas: 1 cita a las 09:00
- Acción: Cancelar la cita y notificar al cliente

### Caso 3: Incapacidad Multi-día
- Empleado: Carlos Ruiz
- Novedad: Incapacidad del 2026-05-25 al 2026-05-27
- Citas afectadas: 8 citas en esos 3 días
- Acción: Reasignar 5 citas a Pedro López y 3 citas a Ana Martínez

## Notas Importantes

1. **Solo se validan citas Pendientes o Confirmadas** - Las citas ya canceladas o completadas no se consideran
2. **La reasignación es por detalle** - Solo se reasignan los servicios del empleado con novedad, no toda la cita
3. **No hay notificación automática** - El sistema no envía correos/SMS automáticamente, el usuario debe notificar manualmente
4. **Logs en consola** - El backend registra cada paso del proceso para debugging

## Testing

Para probar la funcionalidad:

1. Crear un horario para un empleado
2. Crear una cita para ese empleado
3. Crear una novedad que cubra la fecha/hora de la cita
4. Intentar aprobar la novedad
5. Verificar que aparece el diálogo de conflicto
6. Seleccionar una opción y confirmar
7. Verificar que la acción se ejecutó correctamente
