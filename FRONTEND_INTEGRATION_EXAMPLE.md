# Integración Frontend - Validación de Disponibilidad de Empleados

## 🎨 Ejemplos de Integración con React/TypeScript

### 1. Hook Personalizado para Validar Disponibilidad

```typescript
// hooks/useEmployeeAvailability.ts
import { useState, useEffect } from 'react';

interface Novedad {
  id: number;
  tipo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFinal: string | null;
  horaInicio: string | null;
  horaFinal: string | null;
  estado: string;
  bloqueaDiaCompleto: boolean;
}

interface AvailabilityResponse {
  employeeId: number;
  date: string;
  hasNovedades: boolean;
  novedades: Novedad[];
}

export const useEmployeeAvailability = (employeeId: number | null, date: string | null) => {
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId || !date) {
      setAvailability(null);
      return;
    }

    const fetchAvailability = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/news/employee/${employeeId}/date/${date}`
        );

        if (!response.ok) {
          throw new Error('Error al verificar disponibilidad');
        }

        const data = await response.json();
        setAvailability(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [employeeId, date]);

  return { availability, loading, error };
};
```

### 2. Componente de Selector de Horario con Validación

```typescript
// components/TimeSlotSelector.tsx
import React, { useMemo } from 'react';
import { useEmployeeAvailability } from '../hooks/useEmployeeAvailability';

interface TimeSlotSelectorProps {
  employeeId: number;
  date: string;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
}

export const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  employeeId,
  date,
  selectedTime,
  onTimeSelect,
}) => {
  const { availability, loading } = useEmployeeAvailability(employeeId, date);

  // Generar slots de tiempo (cada 30 minutos de 8:00 a 20:00)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 8; hour < 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  // Determinar si un slot está bloqueado
  const isSlotBlocked = (time: string): boolean => {
    if (!availability?.hasNovedades) return false;

    return availability.novedades.some(novedad => {
      // Si bloquea todo el día
      if (novedad.bloqueaDiaCompleto) return true;

      // Si tiene rango horario específico
      if (novedad.horaInicio && novedad.horaFinal) {
        return time >= novedad.horaInicio && time < novedad.horaFinal;
      }

      return false;
    });
  };

  // Obtener mensaje de bloqueo
  const getBlockMessage = (time: string): string | null => {
    if (!availability?.hasNovedades) return null;

    const blockingNovedad = availability.novedades.find(novedad => {
      if (novedad.bloqueaDiaCompleto) return true;
      if (novedad.horaInicio && novedad.horaFinal) {
        return time >= novedad.horaInicio && time < novedad.horaFinal;
      }
      return false;
    });

    if (blockingNovedad) {
      if (blockingNovedad.bloqueaDiaCompleto) {
        return `No disponible: ${blockingNovedad.tipo}`;
      }
      return `${blockingNovedad.tipo}: ${blockingNovedad.horaInicio} - ${blockingNovedad.horaFinal}`;
    }

    return null;
  };

  if (loading) {
    return <div>Cargando disponibilidad...</div>;
  }

  return (
    <div className="time-slot-selector">
      <h3>Selecciona un horario</h3>
      
      {availability?.hasNovedades && (
        <div className="alert alert-warning">
          <strong>⚠️ Novedades registradas:</strong>
          <ul>
            {availability.novedades.map(novedad => (
              <li key={novedad.id}>
                {novedad.tipo}: {novedad.descripcion}
                {!novedad.bloqueaDiaCompleto && (
                  <span> ({novedad.horaInicio} - {novedad.horaFinal})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="time-slots-grid">
        {timeSlots.map(time => {
          const blocked = isSlotBlocked(time);
          const message = getBlockMessage(time);

          return (
            <button
              key={time}
              className={`time-slot ${selectedTime === time ? 'selected' : ''} ${blocked ? 'blocked' : ''}`}
              onClick={() => !blocked && onTimeSelect(time)}
              disabled={blocked}
              title={message || undefined}
            >
              {time}
              {blocked && <span className="blocked-icon">🚫</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

### 3. Validación al Crear Cita

```typescript
// components/AppointmentForm.tsx
import React, { useState } from 'react';
import { TimeSlotSelector } from './TimeSlotSelector';

interface Service {
  servicio: number;
  empleado_usuario: number;
}

export const AppointmentForm: React.FC = () => {
  const [cliente, setCliente] = useState<number | null>(null);
  const [fecha, setFecha] = useState<string>('');
  const [hora, setHora] = useState<string | null>(null);
  const [servicios, setServicios] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cliente,
          fecha,
          hora,
          servicios,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Mostrar error específico de disponibilidad
        if (data.novedadInfo) {
          setError(
            `${data.error}\n\nDetalles: ${data.novedadInfo.descripcion || 'Sin descripción'}`
          );
        } else {
          setError(data.error || 'Error al crear la cita');
        }
        return;
      }

      // Éxito
      alert('Cita creada exitosamente');
      // Redirigir o limpiar formulario
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos del formulario */}
      
      {error && (
        <div className="alert alert-danger">
          <strong>❌ Error:</strong>
          <pre>{error}</pre>
        </div>
      )}

      {/* Selector de empleado y fecha */}
      
      {servicios.length > 0 && fecha && (
        <TimeSlotSelector
          employeeId={servicios[0].empleado_usuario}
          date={fecha}
          selectedTime={hora}
          onTimeSelect={setHora}
        />
      )}

      <button type="submit" disabled={loading || !hora}>
        {loading ? 'Creando...' : 'Crear Cita'}
      </button>
    </form>
  );
};
```

### 4. Componente de Calendario con Indicadores

```typescript
// components/EmployeeCalendar.tsx
import React, { useState, useEffect } from 'react';
import { Calendar } from 'react-calendar';
import { useEmployeeAvailability } from '../hooks/useEmployeeAvailability';

interface EmployeeCalendarProps {
  employeeId: number;
  onDateSelect: (date: Date) => void;
}

export const EmployeeCalendar: React.FC<EmployeeCalendarProps> = ({
  employeeId,
  onDateSelect,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateString = selectedDate.toISOString().split('T')[0];
  
  const { availability } = useEmployeeAvailability(employeeId, dateString);

  // Función para determinar la clase CSS de cada día
  const tileClassName = ({ date }: { date: Date }) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Aquí podrías hacer una llamada para verificar si hay novedades
    // Por simplicidad, solo marcamos el día seleccionado
    if (dateStr === dateString && availability?.hasNovedades) {
      return 'has-novedad';
    }
    
    return null;
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    onDateSelect(date);
  };

  return (
    <div className="employee-calendar">
      <Calendar
        onChange={handleDateChange}
        value={selectedDate}
        tileClassName={tileClassName}
      />

      {availability?.hasNovedades && (
        <div className="novedad-info">
          <h4>Novedades para {dateString}:</h4>
          <ul>
            {availability.novedades.map(novedad => (
              <li key={novedad.id} className={`novedad-${novedad.tipo}`}>
                <strong>{novedad.tipo}</strong>: {novedad.descripcion}
                {!novedad.bloqueaDiaCompleto && (
                  <span> ({novedad.horaInicio} - {novedad.horaFinal})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

### 5. Estilos CSS Sugeridos

```css
/* styles/availability.css */

.time-slot-selector {
  padding: 20px;
}

.time-slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  margin-top: 20px;
}

.time-slot {
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.time-slot:hover:not(.blocked) {
  border-color: #007bff;
  background: #f0f8ff;
  transform: translateY(-2px);
}

.time-slot.selected {
  border-color: #007bff;
  background: #007bff;
  color: white;
}

.time-slot.blocked {
  background: #f8d7da;
  border-color: #dc3545;
  cursor: not-allowed;
  opacity: 0.6;
}

.blocked-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 12px;
}

.alert {
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 8px;
}

.alert-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
}

.alert-danger {
  background: #f8d7da;
  border: 1px solid #dc3545;
  color: #721c24;
}

.novedad-info {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.novedad-incapacidad {
  color: #dc3545;
}

.novedad-permiso {
  color: #ffc107;
}

.novedad-ausencia {
  color: #6c757d;
}

/* Estilos para el calendario */
.has-novedad {
  background: #fff3cd !important;
  border-radius: 50%;
}

.react-calendar__tile--active.has-novedad {
  background: #ffc107 !important;
}
```

## 🔄 Flujo de Usuario Completo

```
1. Usuario selecciona empleado
   ↓
2. Usuario selecciona fecha
   ↓
3. Sistema consulta: GET /api/news/employee/{id}/date/{date}
   ↓
4. Si hay novedades:
   - Mostrar alerta con información
   - Deshabilitar horarios bloqueados
   - Marcar visualmente horarios no disponibles
   ↓
5. Usuario selecciona horario disponible
   ↓
6. Usuario envía formulario
   ↓
7. Backend valida nuevamente (doble validación)
   ↓
8. Si hay conflicto:
   - Mostrar error detallado
   - Sugerir horarios alternativos
   ↓
9. Si todo OK:
   - Crear cita
   - Mostrar confirmación
```

## 📱 Ejemplo de Notificación Toast

```typescript
// utils/notifications.ts
import { toast } from 'react-toastify';

export const showAvailabilityError = (error: string, novedadInfo?: any) => {
  toast.error(
    <div>
      <strong>No disponible</strong>
      <p>{error}</p>
      {novedadInfo && (
        <small>
          {novedadInfo.tipo}: {novedadInfo.descripcion}
        </small>
      )}
    </div>,
    {
      position: 'top-right',
      autoClose: 5000,
    }
  );
};

// Uso en el componente
if (!response.ok) {
  showAvailabilityError(data.error, data.novedadInfo);
}
```

## 🎯 Mejores Prácticas

1. **Validación Doble**: Siempre validar en frontend Y backend
2. **Feedback Visual**: Usar colores y iconos para indicar disponibilidad
3. **Mensajes Claros**: Explicar por qué un horario no está disponible
4. **Carga Progresiva**: Mostrar loading states durante validaciones
5. **Manejo de Errores**: Capturar y mostrar errores de forma amigable
6. **Optimización**: Cachear resultados de disponibilidad cuando sea posible
7. **Accesibilidad**: Usar atributos ARIA para lectores de pantalla

## 🚀 Próximos Pasos

1. Implementar caché de disponibilidad con React Query o SWR
2. Agregar sugerencias de horarios alternativos
3. Mostrar vista de disponibilidad semanal
4. Implementar filtros por tipo de novedad
5. Agregar notificaciones push cuando cambie disponibilidad

---

**Nota**: Estos ejemplos asumen el uso de React con TypeScript. Adapta según tu stack tecnológico.
