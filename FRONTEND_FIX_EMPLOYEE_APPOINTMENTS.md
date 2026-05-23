# 🔧 Fix: Empleados No Pueden Crear Citas

## 🐛 Problema

Cuando un empleado intenta crear una cita, recibe el error:
> "No se encontró un perfil de cliente asociado a tu cuenta"

## 🔍 Causa Raíz

El formulario NO está mostrando el selector de cliente para empleados. Esto se debe a que:

1. El componente `AppointmentFormDialog` verifica `userRole === "client"` para decidir si mostrar el selector
2. Si `userRole` no es exactamente `"client"`, debería mostrar el selector
3. Pero parece que `userRole` tiene un valor inesperado o no se está pasando correctamente

## ✅ Solución

### Opción 1: Verificar el valor de `userRole`

1. Abre la consola del navegador (F12)
2. Ejecuta: `localStorage.getItem('user')`
3. Verifica el campo `rol` en el objeto JSON
4. Debe ser uno de: `"admin"`, `"employee"`, `"client"`, `"empleado"`, `"cliente"`, `"administrador"`

### Opción 2: Fix en el Componente

Editar `frontend-highsoft-sena/src/features/appointments/components/AppointmentFormDialog.tsx`

**Línea 88, cambiar:**

```typescript
{userRole === "client" ? (
```

**Por:**

```typescript
{userRole === "client" || userRole === "cliente" ? (
```

O mejor aún, usar una lógica más robusta:

```typescript
{(userRole && ["client", "cliente"].includes(userRole.toLowerCase())) ? (
```

### Opción 3: Normalizar el Rol en el Hook

Editar `frontend-highsoft-sena/src/features/appointments/hooks/useAppointments.ts`

**Al inicio del hook, agregar:**

```typescript
// Normalizar userRole
const normalizedRole = userRole?.toLowerCase();
const isClient = normalizedRole === "client" || normalizedRole === "cliente";
const isEmployee = normalizedRole === "employee" || normalizedRole === "empleado";
const isAdmin = normalizedRole === "admin" || normalizedRole === "administrador";
```

**Y usar estas variables en lugar de comparar directamente `userRole`**

## 🧪 Cómo Probar

### 1. Verificar que el selector de cliente aparece

Cuando un empleado abre el formulario de nueva cita, debe ver:

```
┌─────────────────────────────────┐
│ Cliente *                       │
│ ┌─────────────────────────────┐ │
│ │ Selecciona un cliente    ▼  │ │ ← Debe aparecer este selector
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 2. Seleccionar un cliente

1. Click en el selector
2. Elegir un cliente de la lista
3. Agregar servicios
4. Click en "Crear Cita"

### 3. Verificar en logs del servidor

Deberías ver:

```
📝 [CREATE APPOINTMENT] Body recibido: {
  "cliente": 5,           ← Debe tener un número
  "fecha": "2026-05-23",
  ...
}
👤 [CREATE APPOINTMENT] Rol del usuario: empleado
🔍 [CREATE APPOINTMENT] Validando cliente para empleado...
🔍 [CREATE APPOINTMENT] Verificando que cliente existe: 5
✅ [CREATE APPOINTMENT] Cliente válido: María García
```

## 🔍 Debugging

### Paso 1: Verificar userRole en el componente

Agregar console.log en `AppointmentFormDialog.tsx` línea 70:

```typescript
export function AppointmentFormDialog({
  isOpen, onOpenChange, editingAppointment, formData, setFormData,
  selectedServices, currentService, setCurrentService,
  services, employees, clients, getEmployeesByCategory,
  onAddService, onRemoveService, onClientChange, onStartTimeChange, onSubmit, onCancel, userRole,
  myEmployeeProfile,
  employeesForService = [],
  loadEmployeesForService,
}: Props) {
  // ← AGREGAR AQUÍ
  console.log('[AppointmentFormDialog] userRole:', userRole);
  console.log('[AppointmentFormDialog] formData.clientId:', formData.clientId);
  console.log('[AppointmentFormDialog] clients:', clients.length);
```

### Paso 2: Verificar payload antes de enviar

Agregar console.log en `useAppointments.ts` línea 365:

```typescript
const payload = {
  cliente:   Number(formData.clientId),
  fecha:     formData.date.toISOString().split("T")[0],
  hora:      startTime,
  notas:     formData.notes || null,
  servicios: selectedServices.map(s => ({
    servicio:         Number(s.serviceId),
    empleado_usuario: Number(s.employeeId),
    precio:           null,
    detalle:          s.serviceName,
  })),
};

// ← AGREGAR AQUÍ
console.log('[CREATE APPOINTMENT] Payload a enviar:', JSON.stringify(payload, null, 2));
console.log('[CREATE APPOINTMENT] userRole:', userRole);
console.log('[CREATE APPOINTMENT] isEmployee:', userRole === "employee");
```

### Paso 3: Verificar endpoint

Agregar console.log en `appointmentsService.ts` línea 135:

```typescript
export async function createAppointment(payload: any, isClient = false, isEmployee = false) {
  const endpoint = isClient   ? `${API_BASE}/appointments/mis-citas`         :
                   isEmployee ? `${API_BASE}/appointments/mis-citas-empleado` :
                                `${API_BASE}/appointments`;
  
  // ← AGREGAR AQUÍ
  console.log('[appointmentsService] createAppointment:', {
    endpoint,
    isClient,
    isEmployee,
    payload
  });
  
  const res = await fetch(endpoint, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(payload),
  });
```

## 📋 Checklist de Verificación

- [ ] `userRole` tiene el valor correcto (`"employee"` o `"empleado"`)
- [ ] El selector de cliente aparece en el formulario
- [ ] Se puede seleccionar un cliente de la lista
- [ ] `formData.clientId` tiene un valor cuando se selecciona
- [ ] El payload incluye `cliente` con un número válido
- [ ] El backend recibe el `cliente` en el body
- [ ] La cita se crea exitosamente

## 🚨 Si Nada Funciona

Si después de todo esto sigue sin funcionar, el problema puede ser:

1. **Caché del navegador**: Hacer hard refresh (Ctrl+Shift+R)
2. **Código no actualizado**: Verificar que el frontend se recompiló
3. **Token expirado**: Cerrar sesión y volver a iniciar
4. **Rol incorrecto en BD**: Verificar en la base de datos que el usuario tiene rol "empleado"

### Verificar rol en base de datos:

```sql
SELECT u.id, u.correo, r.nombre as rol
FROM Usuarios u
JOIN Roles r ON u.FK_id_rol = r.PK_id_rol
WHERE u.correo = 'tu_email@example.com';
```

---

**Última actualización:** Mayo 22, 2026
