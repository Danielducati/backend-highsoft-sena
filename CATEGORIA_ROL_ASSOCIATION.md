# Asociación de Categorías con Roles de Empleados

## Resumen
Se agregó la funcionalidad para asociar cada categoría de servicios con un rol de empleado (especialidad). Esto permite vincular categorías como "Barbería" con el rol "Barbero", "Cosmetología" con "Cosmetóloga", etc.

## Cambios Realizados

### 1. Base de Datos (Schema Prisma)

**Archivo:** `prisma/schema.prisma`

- Agregado campo `rolId` a la tabla `CategoriaServicio`
- Agregada relación con la tabla `Rol`

```prisma
model CategoriaServicio {
  id          Int        @id @default(autoincrement())
  nombre      String
  descripcion String?
  color       String?
  estado      String     @default("Activo")
  rolId       Int?       @map("FK_id_rol")
  rol         Rol?       @relation(fields: [rolId], references: [id])
  servicios   Servicio[]
}

model Rol {
  id            Int                 @id @default(autoincrement())
  nombre        String
  descripcion   String?
  estado        String              @default("Activo")
  rolesPermisos RolPermiso[]
  usuarios      Usuario[]
  categorias    CategoriaServicio[]  // Nueva relación
}
```

**Migración SQL:** `prisma/migrations/add_rol_to_categoria.sql`

```sql
ALTER TABLE "Categoria_servicios" 
ADD COLUMN "FK_id_rol" INTEGER;

ALTER TABLE "Categoria_servicios"
ADD CONSTRAINT "Categoria_servicios_FK_id_rol_fkey" 
FOREIGN KEY ("FK_id_rol") 
REFERENCES "Roles"("PK_id_rol") 
ON UPDATE NO ACTION;
```

### 2. Backend

#### Modelo de Categorías (`src/models/categories.js`)

**Cambios:**
- `getAll()`: Incluye relación con `rol` y retorna `rolId` y `rolNombre`
- `getById()`: Incluye relación con `rol` y retorna `rolId` y `rolNombre`
- `create()`: Acepta y guarda `rolId`
- `update()`: Acepta y actualiza `rolId`

```javascript
const getAll = async ({ soloActivos = true }) => {
  const categorias = await prisma.categoriaServicio.findMany({
    where: soloActivos ? { estado: "Activo" } : {},
    include: {
      _count: { select: { servicios: true } },
      rol: true  // ← Nueva inclusión
    },
    orderBy: { nombre: "asc" },
  });

  return categorias.map(cat => ({
    id:            cat.id,
    nombre:        cat.nombre,
    descripcion:   cat.descripcion,
    color:         cat.color,
    estado:        cat.estado,
    rolId:         cat.rolId,        // ← Nuevo campo
    rolNombre:     cat.rol?.nombre,  // ← Nuevo campo
    servicesCount: cat._count.servicios,
  }));
};
```

### 3. Frontend

#### Tipos (`src/features/categories/types/index.ts`)

```typescript
export interface Category {
  id: number;
  name: string;
  description: string;
  servicesCount: number;
  isActive: boolean;
  color: string;
  rolId?: number | null;      // ← Nuevo campo
  rolNombre?: string;         // ← Nuevo campo
}

export interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  rolId?: string;             // ← Nuevo campo
}
```

#### Formulario (`src/features/categories/components/CategoryFormDialog.tsx`)

**Cambios:**
- Agregado selector de rol con carga dinámica de roles de empleados
- Filtra roles para mostrar solo: Barbero, Cosmetóloga, Estilista, Manicurista, Masajista
- Permite seleccionar "Sin rol asociado"

```tsx
{/* Rol Asociado */}
<div className="space-y-2">
  <Label htmlFor="cat-role" className="text-gray-900">
    Rol Asociado (Especialidad)
  </Label>
  <Select
    value={formData.rolId || ""}
    onValueChange={(value) => setFormData({ ...formData, rolId: value })}
  >
    <SelectTrigger className="rounded-lg border-gray-200">
      <SelectValue placeholder="Selecciona un rol..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">Sin rol asociado</SelectItem>
      {roles.map((rol) => (
        <SelectItem key={rol.id} value={String(rol.id)}>
          {rol.nombre}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <p className="text-xs text-gray-500">
    Asocia esta categoría con un rol de empleado (Barbero, Cosmetóloga, etc.)
  </p>
</div>
```

#### Hook (`src/features/categories/hooks/useCategories.ts`)

**Cambios:**
- `EMPTY_FORM` incluye `rolId: ""`
- `handleEdit()` carga el `rolId` de la categoría al editar

#### Servicio (`src/features/categories/services/categoriesService.ts`)

**Cambios:**
- `fetchCategoriesApi()`: Mapea `rolId` y `rolNombre` en la respuesta
- `createCategoryApi()`: Envía `rolId` al crear
- `updateCategoryApi()`: Envía `rolId` al actualizar

```typescript
body: JSON.stringify({
  nombre:      formData.name,
  descripcion: formData.description,
  color:       formData.color,
  rolId:       formData.rolId && formData.rolId !== "" 
                 ? Number(formData.rolId) 
                 : null,
})
```

## Uso

### 1. Ejecutar la Migración

```bash
# Aplicar la migración SQL manualmente en la base de datos
psql -U usuario -d database < prisma/migrations/add_rol_to_categoria.sql

# O usar Prisma Migrate (si está configurado)
npx prisma migrate dev --name add_rol_to_categoria
```

### 2. Generar Cliente de Prisma

```bash
npx prisma generate
```

### 3. Reiniciar Backend

El backend debe reiniciarse para cargar el nuevo schema de Prisma.

### 4. Usar en el Frontend

1. Ir al módulo de Categorías
2. Crear o editar una categoría
3. Seleccionar un rol asociado del dropdown
4. Guardar

## Beneficios

1. **Vinculación clara**: Cada categoría puede estar asociada a un rol específico de empleado
2. **Filtrado inteligente**: Se pueden filtrar servicios por especialidad del empleado
3. **Asignación automática**: Los empleados pueden ver solo los servicios de su especialidad
4. **Flexibilidad**: Las categorías pueden no tener rol asociado si no aplica

## Ejemplo de Uso

- **Categoría:** Barbería → **Rol:** Barbero
- **Categoría:** Cosmetología → **Rol:** Cosmetóloga
- **Categoría:** Masajes → **Rol:** Masajista
- **Categoría:** Uñas → **Rol:** Manicurista
- **Categoría:** Cabello → **Rol:** Estilista

---

**Fecha de implementación:** Mayo 28, 2026
**Estado:** ✅ Completado
