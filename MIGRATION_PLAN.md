# PLAN DE MIGRACIÓN: HORARIOS Y NOVEDADES

## FASE 1: PREPARACIÓN (1-2 días)

### 1.1 Backup de datos actuales
```sql
-- Backup de tablas existentes
SELECT * INTO Horarios_backup FROM Horarios;
SELECT * INTO Novedades_backup FROM Novedades;
```

### 1.2 Crear nuevas tablas
```sql
-- Ejecutar el nuevo schema de Prisma
-- Las nuevas tablas coexistirán con las actuales
```

### 1.3 Migrar datos existentes
```javascript
// Script de migración de datos
const migrarDatos = async () => {
  // 1. Crear plantillas base para empleados existentes
  const empleados = await prisma.empleado.findMany();
  
  for (const empleado of empleados) {
    // Analizar horarios existentes para crear plantilla
    const horariosExistentes = await prisma.horario.findMany({
      where: { empleadoId: empleado.id },
      orderBy: { fecha: 'asc' }
    });
    
    if (horariosExistentes.length > 0) {
      await crearPlantillaDesdeHorariosExistentes(empleado.id, horariosExistentes);
    }
  }
  
  // 2. Migrar novedades existentes
  const novedadesExistentes = await prisma.novedad.findMany();
  
  for (const novedad of novedadesExistentes) {
    await migrarNovedad(novedad);
  }
};
```

## FASE 2: IMPLEMENTACIÓN GRADUAL (3-5 días)

### 2.1 Desplegar nuevos servicios
- Subir `ScheduleService.js` y `NewsService.js`
- Subir controladores v2
- Configurar rutas v2 (paralelas a las existentes)

### 2.2 Actualizar frontend gradualmente
- Crear nuevos hooks para usar APIs v2
- Mantener compatibilidad con APIs v1
- Probar funcionalidad en paralelo

### 2.3 Migración de datos en producción
```bash
# Ejecutar script de migración
node scripts/migrate-schedules-news.js
```

## FASE 3: VALIDACIÓN Y SWITCH (2-3 días)

### 3.1 Validar integridad de datos
```javascript
// Script de validación
const validarMigracion = async () => {
  // Comparar datos antiguos vs nuevos
  // Verificar que no se perdió información
  // Validar reglas de negocio
};
```

### 3.2 Switch gradual
- Activar APIs v2 para usuarios de prueba
- Monitorear errores y performance
- Switch completo cuando esté estable

### 3.3 Cleanup
- Deprecar APIs v1
- Eliminar tablas antiguas después de período de gracia
- Actualizar documentación

## FASE 4: OPTIMIZACIÓN (1-2 días)

### 4.1 Índices de base de datos
```sql
-- Índices para optimizar consultas frecuentes
CREATE INDEX IX_DisponibilidadEmpleado_Fecha_Disponible 
ON DisponibilidadEmpleado (fecha, disponible);

CREATE INDEX IX_PlantillaHorario_Empleado_Activa 
ON PlantillaHorario (empleadoId, activa);
```

### 4.2 Cache y performance
- Implementar cache para consultas de disponibilidad
- Optimizar regeneración de disponibilidad
- Monitorear performance

## ROLLBACK PLAN

En caso de problemas críticos:

1. **Rollback inmediato**: Reactivar APIs v1
2. **Restaurar datos**: Desde backups si es necesario
3. **Análisis**: Identificar y corregir problemas
4. **Re-deploy**: Con correcciones aplicadas

## TESTING CHECKLIST

- [ ] Crear plantilla de horario semanal
- [ ] Validar horarios efectivos por fecha
- [ ] Crear novedades dentro del horario
- [ ] Crear novedades fuera del horario (debe fallar)
- [ ] Detectar conflictos con citas
- [ ] Resolver conflictos (cancelar/reasignar)
- [ ] Regenerar disponibilidad automáticamente
- [ ] Consultar disponibilidad por rangos
- [ ] Aprobar/rechazar novedades
- [ ] Validar impacto de novedades

## BENEFICIOS ESPERADOS

1. **Consistencia**: Horarios semanales como base, novedades como excepciones
2. **Validación**: No se pueden crear novedades fuera del horario laboral
3. **Conflictos**: Detección automática y resolución guiada
4. **Performance**: Consultas optimizadas de disponibilidad
5. **Escalabilidad**: Modelo preparado para crecimiento
6. **Mantenibilidad**: Lógica de negocio centralizada en servicios