# Changelog - Sistema de Validación de Disponibilidad de Empleados

## 📅 Fecha: Mayo 22, 2026

## ✨ Nuevas Funcionalidades

### 1. Utilidad de Validación de Disponibilidad
**Archivo**: `src/utils/employeeAvailability.js`

- ✅ Función `checkEmployeeAvailability()`: Valida si un empleado está disponible en una fecha/hora específica
- ✅ Función `checkMultipleEmployeesAvailability()`: Valida múltiples empleados simultáneamente
- ✅ Función `isFullDayBlock()`: Determina si una novedad bloquea todo el día o solo un rango horario
- ✅ Constante `TIPOS_NOVEDAD_BLOQUEANTES`: Define qué tipos de novedades bloquean completamente vs parcialmente

**Características**:
- Valida novedades con estado "Activo" y "Aprobada"
- Considera duración de servicios para calcular solapamientos
- Diferencia entre bloqueo completo del día vs bloqueo por horario
- Retorna información detallada del conflicto

### 2. Nuevo Endpoint de Consulta
**Ruta**: `GET /api/news/employee/:employeeId/date/:date`

Permite consultar las novedades de un empleado en una fecha específica antes de intentar crear una cita.

**Respuesta**:
```json
{
  "employeeId": 5,
  "date": "2026-05-25",
  "hasNovedades": true,
  "novedades": [...]
}
```

## 🔧 Mejoras en Funcionalidades Existentes

### 1. Controlador de Citas (`appointments.controller.js`)

#### Método `create()`
- ✅ Integración con `checkMultipleEmployeesAvailability()`
- ✅ Validación mejorada de novedades (antes solo validaba "Activo", ahora también "Aprobada")
- ✅ Mensajes de error más descriptivos con información de la novedad
- ✅ Código más limpio y mantenible

**Antes**:
```javascript
// Validación duplicada y solo para estado "Activo"
const horariosConNovedad = await prisma.horario.findMany({
  where: {
    novedades: { some: { estado: "Activo" } }
  }
});
```

**Después**:
```javascript
// Validación centralizada y para múltiples estados
const availabilityCheck = await checkMultipleEmployeesAvailability(
  asignaciones, fecha, hora
);
```

#### Método `update()` - **NUEVO**
- ✅ Ahora valida disponibilidad al actualizar citas
- ✅ Previene mover citas a horarios donde el empleado tiene novedades
- ✅ Valida tanto cambios de fecha como de hora y servicios

### 2. Controlador de Novedades (`news.controller.js`)

#### Nuevo Método `getEmployeeNewsForDate()`
- ✅ Consulta novedades de un empleado en una fecha específica
- ✅ Incluye información de si bloquea el día completo
- ✅ Útil para validaciones en el frontend

### 3. Controlador de Horarios (`schedules.controller.js`)

#### Método `getAvailableTimeSlots()`
- ✅ Ahora considera novedades con estado "Activo" además de "Aprobada"
- ✅ Maneja novedades sin fecha final (indefinidas)
- ✅ Excluye empleados con novedades de las franjas disponibles

**Antes**:
```javascript
where: {
  estado: "aprobada",
  fechaFinal: { gte: monday }
}
```

**Después**:
```javascript
where: {
  estado: { in: ["Aprobada", "aprobada", "Activo"] },
  OR: [
    { fechaFinal: { gte: monday } },
    { fechaFinal: null }
  ]
}
```

## 📝 Archivos Modificados

1. ✅ `src/controllers/appointments.controller.js`
   - Agregado import de `checkMultipleEmployeesAvailability`
   - Refactorizado método `create()` para usar nueva utilidad
   - Mejorado método `update()` con validación de disponibilidad

2. ✅ `src/controllers/news.controller.js`
   - Agregado método `getEmployeeNewsForDate()`
   - Actualizado export del módulo

3. ✅ `src/controllers/schedules.controller.js`
   - Mejorada consulta de novedades en `getAvailableTimeSlots()`
   - Agregado soporte para novedades sin fecha final

4. ✅ `src/routes/news.routes.js`
   - Agregada ruta `GET /employee/:employeeId/date/:date`

## 📄 Archivos Nuevos

1. ✅ `src/utils/employeeAvailability.js`
   - Utilidad centralizada para validación de disponibilidad

2. ✅ `EMPLOYEE_AVAILABILITY_VALIDATION.md`
   - Documentación completa del sistema

3. ✅ `CHANGELOG_EMPLOYEE_AVAILABILITY.md`
   - Este archivo

## 🎯 Tipos de Novedades Soportados

### Bloqueo Completo del Día
- Incapacidad
- Ausencia
- Vacaciones

### Bloqueo Parcial (Por Horario)
- Permiso
- Retraso
- Percance
- Otro

## 🔒 Estados de Novedades que Bloquean

- ✅ **Activo** (Pendiente de aprobación)
- ✅ **Aprobada** (Ya aprobada)
- ❌ **Rechazada** (No bloquea)
- ❌ **Resuelta** (No bloquea)

## 🧪 Casos de Prueba Recomendados

### Test 1: Crear cita con empleado con incapacidad
```
Dado: Empleado tiene incapacidad el 2026-05-25
Cuando: Se intenta crear cita el 2026-05-25 a las 10:00
Entonces: Debe rechazar con mensaje "no está disponible ese día"
```

### Test 2: Crear cita con empleado con permiso parcial
```
Dado: Empleado tiene permiso de 09:00 a 11:00 el 2026-05-25
Cuando: Se intenta crear cita el 2026-05-25 a las 10:00
Entonces: Debe rechazar con mensaje "tiene una permiso de 09:00 a 11:00"
```

### Test 3: Crear cita fuera del rango de permiso
```
Dado: Empleado tiene permiso de 09:00 a 11:00 el 2026-05-25
Cuando: Se intenta crear cita el 2026-05-25 a las 14:00
Entonces: Debe permitir la cita
```

### Test 4: Actualizar cita a horario con novedad
```
Dado: Cita existente el 2026-05-25 a las 08:00
Y: Empleado tiene permiso de 10:00 a 12:00
Cuando: Se intenta mover la cita a las 11:00
Entonces: Debe rechazar con mensaje de conflicto
```

### Test 5: Múltiples empleados con novedades
```
Dado: Empleado A tiene permiso de 09:00 a 10:00
Y: Empleado B está disponible
Cuando: Se crea cita con ambos empleados a las 09:30
Entonces: Debe rechazar por conflicto con Empleado A
```

## 🚀 Próximos Pasos Sugeridos

1. **Frontend**: Implementar validación visual en el calendario
2. **Notificaciones**: Alertar a empleados cuando se intenta agendar en su horario bloqueado
3. **Reportes**: Dashboard de disponibilidad de empleados
4. **Historial**: Registrar intentos de agendamiento rechazados
5. **Configuración**: Permitir personalizar tipos de novedades bloqueantes

## 📊 Impacto

### Beneficios
- ✅ Previene conflictos de agendamiento
- ✅ Mejora experiencia del usuario con mensajes claros
- ✅ Código más mantenible y reutilizable
- ✅ Validación consistente en crear y actualizar
- ✅ Soporte para múltiples tipos de novedades

### Compatibilidad
- ✅ Totalmente compatible con código existente
- ✅ No requiere cambios en base de datos
- ✅ No rompe funcionalidad actual
- ✅ Mejora funcionalidad existente sin cambios disruptivos

## 🐛 Bugs Corregidos

1. ✅ Novedades "Aprobadas" no bloqueaban al empleado (solo "Activo")
2. ✅ No se validaba disponibilidad al actualizar citas
3. ✅ Novedades sin fecha final no se consideraban correctamente
4. ✅ Código duplicado de validación en múltiples lugares

## 📞 Soporte

Para preguntas o problemas, revisar:
- `EMPLOYEE_AVAILABILITY_VALIDATION.md` - Documentación completa
- `src/utils/employeeAvailability.js` - Código fuente comentado
- Logs del servidor para debugging

---

**Desarrollado por**: Kiro AI Assistant  
**Fecha**: Mayo 22, 2026  
**Versión**: 1.0.0
