# 🔄 Flujo de Aprobación de Novedades con Citas Existentes

## 📋 Descripción

Cuando se aprueba una novedad, el sistema verifica automáticamente si hay citas existentes con ese empleado en el rango de fechas/horas de la novedad. Si hay conflictos, se presentan opciones para resolverlos.

## 🎯 Flujo de Trabajo

```
┌─────────────────────────────────────┐
│  Admin aprueba novedad              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Sistema busca citas existentes     │
│  del empleado en ese rango          │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
   NO HAY           HAY CITAS
    CITAS          AFECTADAS
       │               │
       ▼               ▼
┌──────────────┐  ┌──────────────────┐
│ ✅ Aprobar   │  │ ⚠️ Mostrar       │
│ directamente │  │ conflicto y      │
└──────────────┘  │ opciones         │
                  └──────┬───────────┘
                         │
                  ┌──────┴──────┐
                  │ Admin elige │
                  │ una opción  │
                  └──────┬──────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    CANCELAR        REASIGNAR        MANTENER
      CITAS          A OTRO          (no recom.)
         │           EMPLEADO            │
         ▼               │               ▼
┌────────────────┐       ▼        ┌─────────────┐
│ Citas →        │  ┌──────────┐  │ Citas se    │
│ "Cancelada"    │  │ Cambiar  │  │ mantienen   │
│                │  │ empleado │  │ con warning │
│ Notificar      │  │ en       │  └─────────────┘
│ clientes       │  │ detalles │
└────────────────┘  └──────────┘
```

## 🔧 Implementación Técnica

### Endpoint: `PATCH /api/news/:id/status`

#### Primera Llamada (Sin `action`)

**Request:**
```json
{
  "status": "aprobada"
}
```

**Response 409 (Conflict):**
```json
{
  "conflict": true,
  "message": "Esta novedad afecta citas existentes. ¿Qué deseas hacer?",
  "novedad": {
    "id": 5,
    "tipo": "permiso",
    "empleado": "Juan Pérez",
    "fechaInicio": "2026-05-28",
    "fechaFinal": "2026-05-28",
    "horaInicio": "09:00",
    "horaFinal": "11:00"
  },
  "citasAfectadas": [
    {
      "citaId": 15,
      "detalleId": 23,
      "fecha": "2026-05-28",
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
    },
    {
      "id": 3,
      "nombre": "Ana Martínez",
      "especialidad": "Estilista"
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

#### Segunda Llamada (Con `action`)

**Opción 1: Cancelar Citas**
```json
{
  "status": "aprobada",
  "action": "cancel"
}
```

**Opción 2: Reasignar a Otro Empleado**
```json
{
  "status": "aprobada",
  "action": "reassign",
  "reassignToEmployeeId": 2
}
```

**Opción 3: Mantener Citas**
```json
{
  "status": "aprobada",
  "action": "keep"
}
```

**Response 200 (Success):**
```json
{
  "ok": true,
  "message": "Estado de novedad actualizado exitosamente"
}
```

## 🎨 Ejemplo de Interfaz Frontend

### Componente de Aprobación con Conflictos

```typescript
// components/NovedadApprovalDialog.tsx
import React, { useState } from 'react';

interface CitaAfectada {
  citaId: number;
  fecha: string;
  hora: string;
  servicio: string;
  cliente: string;
  clienteContacto: {
    correo?: string;
    telefono?: string;
  };
}

interface EmpleadoDisponible {
  id: number;
  nombre: string;
  especialidad?: string;
}

interface ConflictResponse {
  conflict: true;
  message: string;
  citasAfectadas: CitaAfectada[];
  empleadosDisponibles: EmpleadoDisponible[];
  opciones: Array<{
    action: string;
    label: string;
    description: string;
    requiresEmployeeId?: boolean;
  }>;
}

export const NovedadApprovalDialog: React.FC<{
  novedadId: number;
  onSuccess: () => void;
}> = ({ novedadId, onSuccess }) => {
  const [conflict, setConflict] = useState<ConflictResponse | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/news/${novedadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'aprobada' }),
      });

      if (response.status === 409) {
        // Hay conflicto
        const data = await response.json();
        setConflict(data);
      } else if (response.ok) {
        // Aprobado sin conflictos
        alert('Novedad aprobada exitosamente');
        onSuccess();
      }
    } catch (error) {
      alert('Error al aprobar novedad');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveConflict = async () => {
    if (!selectedAction) {
      alert('Selecciona una opción');
      return;
    }

    if (selectedAction === 'reassign' && !selectedEmployeeId) {
      alert('Selecciona un empleado para reasignar');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/news/${novedadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'aprobada',
          action: selectedAction,
          reassignToEmployeeId: selectedEmployeeId,
        }),
      });

      if (response.ok) {
        alert('Novedad aprobada y conflictos resueltos');
        onSuccess();
      } else {
        alert('Error al resolver conflictos');
      }
    } catch (error) {
      alert('Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (!conflict) {
    return (
      <div className="approval-dialog">
        <h3>¿Aprobar esta novedad?</h3>
        <button onClick={handleApprove} disabled={loading}>
          {loading ? 'Verificando...' : 'Aprobar'}
        </button>
      </div>
    );
  }

  return (
    <div className="conflict-resolution-dialog">
      <div className="alert alert-warning">
        <h3>⚠️ {conflict.message}</h3>
      </div>

      <div className="affected-appointments">
        <h4>Citas Afectadas ({conflict.citasAfectadas.length})</h4>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Contacto</th>
            </tr>
          </thead>
          <tbody>
            {conflict.citasAfectadas.map((cita) => (
              <tr key={cita.citaId}>
                <td>{cita.fecha}</td>
                <td>{cita.hora}</td>
                <td>{cita.cliente}</td>
                <td>{cita.servicio}</td>
                <td>
                  {cita.clienteContacto.telefono && (
                    <div>📱 {cita.clienteContacto.telefono}</div>
                  )}
                  {cita.clienteContacto.correo && (
                    <div>📧 {cita.clienteContacto.correo}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="resolution-options">
        <h4>Selecciona una opción:</h4>

        {conflict.opciones.map((opcion) => (
          <div key={opcion.action} className="option-card">
            <label>
              <input
                type="radio"
                name="action"
                value={opcion.action}
                checked={selectedAction === opcion.action}
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <div>
                <strong>{opcion.label}</strong>
                <p>{opcion.description}</p>
              </div>
            </label>

            {opcion.requiresEmployeeId && selectedAction === opcion.action && (
              <div className="employee-selector">
                <label>Selecciona empleado:</label>
                <select
                  value={selectedEmployeeId || ''}
                  onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
                >
                  <option value="">-- Selecciona --</option>
                  {conflict.empleadosDisponibles.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} {emp.especialidad && `(${emp.especialidad})`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="actions">
        <button onClick={() => setConflict(null)}>Cancelar</button>
        <button
          onClick={handleResolveConflict}
          disabled={loading || !selectedAction}
          className="btn-primary"
        >
          {loading ? 'Procesando...' : 'Confirmar y Aprobar'}
        </button>
      </div>
    </div>
  );
};
```

### Estilos CSS

```css
.conflict-resolution-dialog {
  max-width: 800px;
  padding: 20px;
}

.affected-appointments {
  margin: 20px 0;
}

.affected-appointments table {
  width: 100%;
  border-collapse: collapse;
}

.affected-appointments th,
.affected-appointments td {
  padding: 10px;
  border: 1px solid #ddd;
  text-align: left;
}

.affected-appointments th {
  background: #f8f9fa;
  font-weight: bold;
}

.resolution-options {
  margin: 20px 0;
}

.option-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  cursor: pointer;
  transition: all 0.2s;
}

.option-card:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.option-card label {
  display: flex;
  align-items: start;
  cursor: pointer;
}

.option-card input[type="radio"] {
  margin-right: 10px;
  margin-top: 5px;
}

.employee-selector {
  margin-top: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.employee-selector select {
  width: 100%;
  padding: 8px;
  margin-top: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

## 📊 Casos de Uso

### Caso 1: Novedad sin Citas Afectadas

**Escenario:**
- Empleado tiene novedad para el 2026-05-30
- No hay citas programadas para esa fecha

**Flujo:**
1. Admin aprueba novedad
2. Sistema verifica: 0 citas afectadas
3. ✅ Novedad aprobada directamente

### Caso 2: Novedad con Citas - Cancelar

**Escenario:**
- Empleado tiene permiso de 09:00 a 11:00 el 2026-05-28
- Hay 2 citas a las 10:00 y 10:30

**Flujo:**
1. Admin aprueba novedad
2. Sistema detecta 2 citas afectadas
3. Admin selecciona "Cancelar citas"
4. ✅ Citas → estado "Cancelada"
5. ⚠️ Notificar clientes manualmente

### Caso 3: Novedad con Citas - Reasignar

**Escenario:**
- Empleado 1 tiene incapacidad todo el día
- Hay 3 citas programadas
- Empleado 2 está disponible

**Flujo:**
1. Admin aprueba novedad
2. Sistema muestra 3 citas y empleados disponibles
3. Admin selecciona "Reasignar" → Empleado 2
4. ✅ Servicios reasignados al Empleado 2
5. ℹ️ Clientes mantienen sus citas (con otro empleado)

### Caso 4: Novedad Parcial

**Escenario:**
- Empleado tiene permiso de 09:00 a 11:00
- Hay citas a las 08:00, 10:00 y 14:00

**Flujo:**
1. Admin aprueba novedad
2. Sistema detecta solo la cita de 10:00 (en conflicto)
3. Las citas de 08:00 y 14:00 NO se afectan
4. Admin decide qué hacer solo con la cita de 10:00

## 🔔 Notificaciones Recomendadas

Después de resolver conflictos, se recomienda:

### Si se cancelaron citas:
```
Asunto: Cita Cancelada - [Fecha]

Estimado/a [Cliente],

Lamentamos informarte que tu cita programada para el [Fecha] a las [Hora] 
con [Empleado] ha sido cancelada debido a [Motivo].

Por favor, contáctanos para reprogramar tu cita.

Teléfono: [Teléfono]
WhatsApp: [WhatsApp]
```

### Si se reasignó empleado:
```
Asunto: Cambio en tu Cita - [Fecha]

Estimado/a [Cliente],

Tu cita del [Fecha] a las [Hora] se mantiene confirmada.

Cambio: Ahora serás atendido/a por [Nuevo Empleado] en lugar de [Empleado Original].

Si tienes alguna pregunta, contáctanos.
```

## 🐛 Troubleshooting

### Problema: No detecta citas afectadas

**Solución:** Verificar que las citas tengan estado "Pendiente" o "Confirmada"

### Problema: Reasignación no funciona

**Solución:** Verificar que el empleado destino exista y esté activo

### Problema: Conflicto no se muestra

**Solución:** Revisar logs del servidor para ver si hay errores en la consulta

---

**Última actualización:** Mayo 22, 2026
