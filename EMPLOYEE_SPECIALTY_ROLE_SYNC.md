# Sincronización de Especialidad de Empleado con Rol de Usuario

## Problema Identificado
El módulo de empleados tenía un campo `especialidad` que no estaba sincronizado con el campo `rol` del módulo de usuarios. Esto causaba inconsistencias donde:
- Un empleado podía tener especialidad "Barbería" pero rol "Estilista"
- Cambiar el rol en usuarios no actualizaba la especialidad en empleados
- Cambiar la especialidad en empleados no actualizaba el rol en usuarios

## Solución Implementada

### 1. Sincronización en Creación de Empleados (`employees.js` - `create()`)

**Cambios:**
- Si se proporciona `especialidad`, busca el rol correspondiente y lo asigna al usuario
- Si se proporciona `idRol` pero no especialidad, usa el nombre del rol como especialidad
- Garantiza que especialidad y rol siempre estén alineados desde la creación

**Ejemplo:**
```javascript
// Si creas un empleado con especialidad "Barbero"
// → El usuario tendrá rol "Barbero"

// Si creas un empleado con rol "Cosmetóloga"
// → El empleado tendrá especialidad "Cosmetóloga"
```

### 2. Sincronización en Actualización de Empleados (`employees.js` - `update()`)

**Cambios:**
- Cuando se actualiza la `especialidad` de un empleado, busca el rol correspondiente
- Actualiza el `rolId` del usuario para que coincida con la especialidad
- Mantiene la sincronización bidireccional

**Ejemplo:**
```javascript
// Si cambias la especialidad de "Barbero" a "Estilista"
// → El rol del usuario también cambia a "Estilista"
```

### 3. Sincronización en Actualización de Usuarios (`users.js` - `update()`)

**Cambios:**
- Cuando se crea un perfil de empleado desde usuarios, la especialidad se establece como el nombre del rol
- Cuando se actualiza el rol de un usuario que tiene perfil de empleado, la especialidad se actualiza automáticamente
- Garantiza que el cambio de rol en usuarios se refleje en la especialidad del empleado

**Ejemplo:**
```javascript
// Si cambias el rol de un usuario de "Manicurista" a "Masajista"
// → La especialidad del empleado también cambia a "Masajista"
```

## Mapeo de Roles y Especialidades

Los roles de empleado que se sincronizan son:
- **Barbero** ↔ Barbero
- **Cosmetóloga** ↔ Cosmetóloga
- **Estilista** ↔ Estilista
- **Manicurista** ↔ Manicurista
- **Masajista** ↔ Masajista

**Nota:** Los roles "Administrador" y "Cliente" no tienen especialidad asociada.

## Flujo de Sincronización

### Módulo de Empleados → Módulo de Usuarios
1. Usuario actualiza especialidad en módulo de empleados
2. Backend busca el rol correspondiente a esa especialidad
3. Actualiza el `rolId` del usuario en la tabla `Usuario`
4. Ambos módulos quedan sincronizados

### Módulo de Usuarios → Módulo de Empleados
1. Usuario actualiza rol en módulo de usuarios
2. Backend verifica si existe perfil de empleado
3. Actualiza la `especialidad` del empleado con el nombre del nuevo rol
4. Ambos módulos quedan sincronizados

## Archivos Modificados

### Backend
- `src/models/employees.js`
  - Función `create()`: Sincroniza especialidad → rol al crear
  - Función `update()`: Sincroniza especialidad → rol al actualizar

- `src/models/users.js`
  - Función `update()`: Sincroniza rol → especialidad al actualizar

## Beneficios

1. **Consistencia de datos**: Especialidad y rol siempre están alineados
2. **Sincronización bidireccional**: Los cambios en cualquier módulo se reflejan en el otro
3. **Experiencia de usuario mejorada**: No hay confusión sobre el rol/especialidad de un empleado
4. **Integridad de datos**: Evita inconsistencias en la base de datos

## Pruebas Recomendadas

1. **Crear empleado con especialidad**
   - Verificar que el rol del usuario coincida con la especialidad

2. **Actualizar especialidad en módulo de empleados**
   - Verificar que el rol del usuario se actualice automáticamente

3. **Actualizar rol en módulo de usuarios**
   - Verificar que la especialidad del empleado se actualice automáticamente

4. **Cambiar entre diferentes roles de empleado**
   - Verificar que la sincronización funcione para todos los roles (Barbero, Cosmetóloga, Estilista, Manicurista, Masajista)

## Notas Técnicas

- La sincronización se realiza dentro de transacciones de Prisma para garantizar atomicidad
- Si no se encuentra un rol correspondiente a la especialidad, no se actualiza el rol del usuario
- La sincronización solo aplica a roles de empleado (no Admin ni Cliente)
- Los cambios son retrocompatibles con datos existentes

---

**Fecha de implementación:** Mayo 28, 2026
**Estado:** ✅ Completado
