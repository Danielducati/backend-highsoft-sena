# 🐛 Guía de Debugging - Validación de Disponibilidad

## Problema Reportado

Las novedades no están bloqueando a los empleados al crear citas.

## ✅ Correcciones Aplicadas

### 1. Estados de Novedades
**Problema**: El código buscaba estados `"Activo"` y `"Aprobada"`, pero las novedades se crean con estado `"pendiente"`.

**Solución**: Actualizado para buscar todos los estados:
```javascript
estado: {
  in: ["pendiente", "Activo", "Aprobada", "aprobada"]
}
```

### 2. Logs de Debugging
Agregados logs detallados en `src/utils/employeeAvailability.js` para rastrear:
- Parámetros de entrada
- Novedades encontradas
- Validación de solapamiento
- Resultado final

## 🔍 Cómo Verificar que Funciona

### Paso 1: Verificar Novedades en Base de Datos

```sql
-- Ver todas las novedades
SELECT 
  n.id,
  n.tipoNovedad,
  n.estado,
  n.fechaInicio,
  n.fechaFinal,
  n.horaInicio,
  n.horaFinal,
  h.empleadoId,
  e.nombre,
  e.apellido
FROM Novedades n
JOIN Horarios h ON n.FK_id_horario = h.PK_id_horario
JOIN Empleado e ON h.FK_id_empleado = e.PK_id_empleado
WHERE n.estado IN ('pendiente', 'Activo', 'Aprobada', 'aprobada')
ORDER BY n.fechaInicio DESC;
```

### Paso 2: Probar Endpoint de Consulta

```bash
# Consultar novedades de un empleado en una fecha
curl http://localhost:3000/api/news/employee/1/date/2026-05-28
```

**Respuesta esperada si hay novedades:**
```json
{
  "employeeId": 1,
  "date": "2026-05-28",
  "hasNovedades": true,
  "novedades": [
    {
      "id": 5,
      "tipo": "permiso",
      "descripcion": "Cita médica",
      "fechaInicio": "2026-05-28",
      "fechaFinal": "2026-05-28",
      "horaInicio": "09:00",
      "horaFinal": "11:00",
      "estado": "pendiente",
      "bloqueaDiaCompleto": false
    }
  ]
}
```

### Paso 3: Intentar Crear Cita con Empleado Bloqueado

```bash
# Crear cita en horario bloqueado
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "cliente": 1,
    "fecha": "2026-05-28",
    "hora": "10:00",
    "servicios": [
      {
        "servicio": 1,
        "empleado_usuario": 1
      }
    ]
  }'
```

**Respuesta esperada (ERROR):**
```json
{
  "error": "Juan Pérez tiene una permiso de 09:00 a 11:00",
  "novedadInfo": {
    "id": 5,
    "tipo": "permiso",
    "horaInicio": "09:00",
    "horaFinal": "11:00",
    "descripcion": "Cita médica"
  }
}
```

### Paso 4: Revisar Logs del Servidor

Al intentar crear la cita, deberías ver en la consola del servidor:

```
🔍 Validando disponibilidad: {
  empleadoId: 1,
  fecha: '2026-05-28',
  horaInicio: '10:00',
  duracionMinutos: 60,
  fechaDate: '2026-05-28T00:00:00.000Z'
}
⏰ Rango horario de la cita: { inicio: '10:00', fin: '11:00' }
📋 Novedades encontradas: 1
  - Novedad #5: {
    tipo: 'permiso',
    estado: 'pendiente',
    fechaInicio: '2026-05-28',
    fechaFinal: '2026-05-28',
    horaInicio: '09:00',
    horaFinal: '11:00'
  }
  🔍 Validando solapamiento: {
    novedadInicio: '09:00',
    novedadFin: '11:00',
    citaInicio: '10:00',
    citaFin: '11:00'
  }
  ❌ HAY SOLAPAMIENTO
```

## 🧪 Script de Prueba

Ejecutar el script de prueba:

```bash
cd backend-highsoft-sena
node test-availability.js
```

## 🔧 Casos de Prueba

### Caso 1: Novedad Bloquea Todo el Día

**Novedad:**
- Tipo: Incapacidad
- Fecha: 2026-05-28
- Sin horaInicio ni horaFinal

**Prueba:**
```bash
# Intentar crear cita a cualquier hora
POST /api/appointments
{
  "fecha": "2026-05-28",
  "hora": "14:00",  # Cualquier hora
  "servicios": [{ "empleado_usuario": 1 }]
}
```

**Resultado Esperado:**
```json
{
  "error": "Juan Pérez no está disponible ese día por incapacidad"
}
```

### Caso 2: Novedad Bloquea Solo un Rango

**Novedad:**
- Tipo: Permiso
- Fecha: 2026-05-28
- horaInicio: 09:00
- horaFinal: 11:00

**Prueba A (dentro del rango):**
```bash
POST /api/appointments
{
  "fecha": "2026-05-28",
  "hora": "10:00",  # Dentro del rango bloqueado
  "servicios": [{ "empleado_usuario": 1 }]
}
```

**Resultado Esperado:** ❌ Rechazado

**Prueba B (fuera del rango):**
```bash
POST /api/appointments
{
  "fecha": "2026-05-28",
  "hora": "14:00",  # Fuera del rango bloqueado
  "servicios": [{ "empleado_usuario": 1 }]
}
```

**Resultado Esperado:** ✅ Permitido

### Caso 3: Múltiples Empleados

**Escenario:**
- Empleado 1: Tiene permiso de 09:00 a 11:00
- Empleado 2: Sin novedades

**Prueba:**
```bash
POST /api/appointments
{
  "fecha": "2026-05-28",
  "hora": "10:00",
  "servicios": [
    { "servicio": 1, "empleado_usuario": 1 },  # Bloqueado
    { "servicio": 2, "empleado_usuario": 2 }   # Disponible
  ]
}
```

**Resultado Esperado:** ❌ Rechazado (por Empleado 1)

## 🐛 Problemas Comunes

### Problema 1: Novedades no se encuentran

**Síntoma:** Logs muestran "Novedades encontradas: 0"

**Posibles causas:**
1. Estado de novedad no coincide (verificar mayúsculas/minúsculas)
2. Fecha de novedad no coincide con fecha de cita
3. Novedad no tiene horario asociado

**Solución:**
```sql
-- Verificar estado de novedades
SELECT id, estado, fechaInicio, FK_id_horario 
FROM Novedades 
WHERE FK_id_horario IN (
  SELECT PK_id_horario 
  FROM Horarios 
  WHERE FK_id_empleado = 1
);
```

### Problema 2: Solapamiento no se detecta

**Síntoma:** Logs muestran "No hay solapamiento" cuando debería haber

**Posibles causas:**
1. Formato de hora incorrecto
2. Zona horaria diferente
3. Comparación de fechas incorrecta

**Solución:** Revisar logs de "Validando solapamiento" y verificar que las horas sean correctas.

### Problema 3: Validación no se ejecuta

**Síntoma:** No aparecen logs de validación

**Posibles causas:**
1. Código no actualizado
2. Servidor no reiniciado
3. Ruta incorrecta

**Solución:**
```bash
# Reiniciar servidor
npm run dev

# Verificar que el archivo se cargó
node -c src/utils/employeeAvailability.js
```

## 📊 Checklist de Verificación

- [ ] Novedades existen en base de datos con estado correcto
- [ ] Endpoint de consulta retorna novedades correctamente
- [ ] Logs de validación aparecen en consola
- [ ] Citas se rechazan cuando hay conflicto
- [ ] Citas se permiten cuando no hay conflicto
- [ ] Validación funciona con múltiples empleados
- [ ] Validación funciona al actualizar citas

## 🔄 Reiniciar Servidor

Después de los cambios, asegúrate de reiniciar el servidor:

```bash
# Detener servidor (Ctrl+C)
# Iniciar nuevamente
npm run dev
```

## 📞 Soporte

Si después de seguir estos pasos el problema persiste:

1. Capturar logs completos del servidor
2. Capturar respuesta del endpoint de consulta
3. Capturar query SQL de novedades
4. Verificar versión de Node.js y dependencias

---

**Última actualización:** Mayo 22, 2026
