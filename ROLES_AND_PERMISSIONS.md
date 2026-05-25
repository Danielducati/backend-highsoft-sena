# 👥 Roles y Permisos - Sistema de Citas

## 📋 Roles del Sistema

### 1. 👨‍💼 Administrador / Admin

**Permisos en Citas:**
- ✅ Ver todas las citas
- ✅ Crear citas para cualquier cliente
- ✅ Asignar cualquier empleado a los servicios
- ✅ Actualizar cualquier cita
- ✅ Cancelar cualquier cita
- ✅ Eliminar citas (con restricciones)

**Permisos en Novedades:**
- ✅ Ver todas las novedades
- ✅ Crear novedades para cualquier empleado
- ✅ Aprobar/rechazar novedades
- ✅ Gestionar conflictos al aprobar
- ✅ Actualizar novedades
- ✅ Eliminar novedades

**Permisos en Empleados:**
- ✅ Ver todos los empleados
- ✅ Crear empleados
- ✅ Actualizar empleados
- ✅ Gestionar horarios

### 2. 👨‍🔧 Empleado

**Permisos en Citas:**
- ✅ Ver citas donde está asignado
- ✅ Crear citas para clientes (debe seleccionar cliente)
- ✅ Asignar cualquier empleado a los servicios (incluyéndose)
- ⚠️ NO puede crear citas para sí mismo como cliente
- ✅ Actualizar citas donde está asignado
- ✅ Cancelar citas donde está asignado

**Permisos en Novedades:**
- ✅ Ver solo sus propias novedades
- ✅ Crear novedades solo para sí mismo
- ❌ NO puede aprobar novedades
- ✅ Actualizar sus propias novedades (pendientes)
- ✅ Eliminar sus propias novedades (pendientes)

**Permisos en Empleados:**
- ✅ Ver su propio perfil
- ✅ Actualizar su propio perfil (limitado)

### 3. 👤 Cliente

**Permisos en Citas:**
- ✅ Ver solo sus propias citas
- ✅ Crear citas para sí mismo
- ✅ Seleccionar empleado para los servicios
- ⚠️ NO puede crear citas para otros clientes
- ✅ Actualizar sus propias citas (antes de completarse)
- ✅ Cancelar sus propias citas

**Permisos en Novedades:**
- ❌ NO puede ver novedades
- ❌ NO puede crear novedades

**Permisos en Empleados:**
- ✅ Ver lista de empleados disponibles
- ❌ NO puede ver detalles privados

## 🔧 Lógica de Creación de Citas por Rol

### Admin/Administrador

```javascript
POST /api/appointments
{
  "cliente": 5,              // Puede elegir cualquier cliente
  "fecha": "2026-05-28",
  "hora": "10:00",
  "servicios": [
    {
      "servicio": 1,
      "empleado_usuario": 3   // Puede elegir cualquier empleado
    }
  ]
}
```

### Empleado

```javascript
POST /api/appointments
{
  "cliente": 5,              // DEBE especificar un cliente válido
  "fecha": "2026-05-28",
  "hora": "10:00",
  "servicios": [
    {
      "servicio": 1,
      "empleado_usuario": 3   // Puede elegir cualquier empleado
    },
    {
      "servicio": 2,
      "empleado_usuario": 1   // Puede asignarse a sí mismo
    }
  ]
}
```

**⚠️ Errores Comunes:**

```javascript
// ❌ ERROR: No especifica cliente
{
  "fecha": "2026-05-28",
  "hora": "10:00",
  "servicios": [...]
}
// Respuesta: "Debes seleccionar un cliente para la cita"

// ❌ ERROR: Cliente no existe
{
  "cliente": 999,
  "fecha": "2026-05-28",
  ...
}
// Respuesta: "El cliente seleccionado no existe"
```

### Cliente

```javascript
POST /api/appointments
{
  // NO necesita especificar cliente (se usa automáticamente su ID)
  "fecha": "2026-05-28",
  "hora": "10:00",
  "servicios": [
    {
      "servicio": 1,
      "empleado_usuario": 3   // Puede elegir empleado
    }
  ]
}
```

**El sistema automáticamente:**
- Obtiene el `clienteId` del usuario autenticado
- Valida que tenga perfil de cliente
- Asigna la cita a ese cliente

## 🔍 Validaciones por Rol

### Al Crear Cita

#### Admin/Administrador
1. ✅ Validar que fecha no sea pasada
2. ✅ Validar formato de hora
3. ✅ Validar que servicios no estén vacíos
4. ✅ Validar disponibilidad de empleados (novedades)
5. ✅ Validar solapamiento de horarios

#### Empleado
1. ✅ Validar que especifique cliente
2. ✅ Validar que cliente exista
3. ✅ Validar que fecha no sea pasada
4. ✅ Validar formato de hora
5. ✅ Validar que servicios no estén vacíos
6. ✅ Validar disponibilidad de empleados (novedades)
7. ✅ Validar solapamiento de horarios

#### Cliente
1. ✅ Validar que tenga perfil de cliente
2. ✅ Validar que fecha no sea pasada
3. ✅ Validar formato de hora
4. ✅ Validar que servicios no estén vacíos
5. ✅ Validar disponibilidad de empleados (novedades)
6. ✅ Validar solapamiento de horarios

## 📊 Matriz de Permisos

| Acción | Admin | Empleado | Cliente |
|--------|-------|----------|---------|
| **CITAS** |
| Ver todas las citas | ✅ | ❌ | ❌ |
| Ver propias citas | ✅ | ✅ | ✅ |
| Ver citas asignadas | ✅ | ✅ | ❌ |
| Crear cita para cualquier cliente | ✅ | ✅ | ❌ |
| Crear cita para sí mismo | ✅ | ❌ | ✅ |
| Actualizar cualquier cita | ✅ | ❌ | ❌ |
| Actualizar propias citas | ✅ | ✅ | ✅ |
| Cancelar cualquier cita | ✅ | ❌ | ❌ |
| Cancelar propias citas | ✅ | ✅ | ✅ |
| Eliminar citas | ✅ | ❌ | ❌ |
| **NOVEDADES** |
| Ver todas las novedades | ✅ | ❌ | ❌ |
| Ver propias novedades | ✅ | ✅ | ❌ |
| Crear novedad para cualquier empleado | ✅ | ❌ | ❌ |
| Crear novedad para sí mismo | ✅ | ✅ | ❌ |
| Aprobar/rechazar novedades | ✅ | ❌ | ❌ |
| Actualizar cualquier novedad | ✅ | ❌ | ❌ |
| Actualizar propias novedades | ✅ | ✅ | ❌ |
| Eliminar novedades | ✅ | ✅* | ❌ |
| **EMPLEADOS** |
| Ver todos los empleados | ✅ | ✅ | ✅** |
| Ver detalles de empleado | ✅ | ✅*** | ❌ |
| Crear empleados | ✅ | ❌ | ❌ |
| Actualizar empleados | ✅ | ✅*** | ❌ |
| Eliminar empleados | ✅ | ❌ | ❌ |
| Gestionar horarios | ✅ | ❌ | ❌ |

\* Solo sus propias novedades pendientes  
\** Solo lista básica para selección  
\*** Solo su propio perfil

## 🔐 Implementación de Seguridad

### Middleware de Autenticación

```javascript
// Verificar que el usuario esté autenticado
const authMiddleware = (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
};
```

### Verificación de Rol

```javascript
// En el controlador
const rolNorm = (req.usuario?.rol ?? "").toLowerCase();

if (rolNorm === "empleado") {
  // Lógica específica para empleados
} else if (rolNorm === "cliente") {
  // Lógica específica para clientes
} else if (["admin", "administrador"].includes(rolNorm)) {
  // Lógica específica para admins
}
```

## 🐛 Errores Comunes y Soluciones

### Error 1: "No se encontró un perfil de cliente asociado a tu cuenta"

**Causa:** Usuario empleado intenta crear cita sin especificar cliente

**Solución:** 
```javascript
// ✅ Correcto
{
  "cliente": 5,  // Especificar cliente
  "fecha": "2026-05-28",
  ...
}
```

### Error 2: "Debes seleccionar un cliente para la cita"

**Causa:** Empleado no envió el campo `cliente`

**Solución:** Asegurarse de que el frontend envíe el `cliente` cuando el usuario es empleado

### Error 3: "El cliente seleccionado no existe"

**Causa:** ID de cliente inválido

**Solución:** Validar que el cliente existe antes de enviar

### Error 4: "No tienes permiso para ver esta cita"

**Causa:** Cliente intenta ver cita de otro cliente

**Solución:** Solo mostrar citas propias del cliente

## 📝 Recomendaciones Frontend

### Para Formulario de Citas

```typescript
// Detectar rol del usuario
const userRole = getCurrentUserRole();

if (userRole === 'empleado') {
  // Mostrar selector de cliente (requerido)
  <ClientSelector required />
  
  // Mostrar selector de empleado (puede elegir cualquiera)
  <EmployeeSelector />
  
} else if (userRole === 'cliente') {
  // NO mostrar selector de cliente (automático)
  // Mostrar selector de empleado
  <EmployeeSelector />
  
} else if (userRole === 'admin') {
  // Mostrar ambos selectores
  <ClientSelector required />
  <EmployeeSelector />
}
```

### Validación en Frontend

```typescript
const validateAppointmentForm = (data, userRole) => {
  if (userRole === 'empleado' && !data.cliente) {
    return {
      valid: false,
      error: 'Debes seleccionar un cliente'
    };
  }
  
  if (!data.servicios || data.servicios.length === 0) {
    return {
      valid: false,
      error: 'Debes agregar al menos un servicio'
    };
  }
  
  return { valid: true };
};
```

## 🔄 Flujo de Creación de Cita por Rol

### Empleado Crea Cita

```
1. Empleado abre formulario
   ↓
2. Selecciona cliente (REQUERIDO)
   ↓
3. Selecciona fecha y hora
   ↓
4. Agrega servicios
   ↓
5. Selecciona empleado para cada servicio
   (puede asignarse a sí mismo)
   ↓
6. Sistema valida:
   - Cliente existe
   - Empleado tiene horario
   - No hay novedades bloqueantes
   - No hay solapamiento
   ↓
7. Cita creada ✅
```

### Cliente Crea Cita

```
1. Cliente abre formulario
   ↓
2. Sistema obtiene automáticamente su clienteId
   ↓
3. Selecciona fecha y hora
   ↓
4. Agrega servicios
   ↓
5. Selecciona empleado para cada servicio
   ↓
6. Sistema valida:
   - Empleado tiene horario
   - No hay novedades bloqueantes
   - No hay solapamiento
   ↓
7. Cita creada ✅
```

---

**Última actualización:** Mayo 22, 2026
