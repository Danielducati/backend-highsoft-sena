# Fix: Error al conectar con el servidor - Módulo de Novedades

## 🐛 Problema Identificado

El módulo de novedades mostraba "Error al conectar con el servidor" con un error 500 en el endpoint `GET /news`.

## 🔍 Causa Raíz

El archivo `src/routes/news.routes.js` **NO tenía el middleware de autenticación** (`verificarToken`) aplicado a las rutas.

Esto causaba que en el controlador `news.controller.js`, cuando se intentaba acceder a:
```javascript
const rol = (req.usuario?.rol ?? "").toLowerCase();
```

La variable `req.usuario` era `undefined`, lo que generaba errores al intentar:
1. Acceder a `req.usuario.id` 
2. Acceder a `req.usuario.rol`
3. Hacer consultas a la base de datos con valores undefined

## ✅ Solución Aplicada

Se agregó el middleware `verificarToken` a todas las rutas en `src/routes/news.routes.js`:

```javascript
const { verificarToken } = require("../middlewares/auth.middleware");

router.get("/",                                verificarToken, ctrl.getAll);
router.get("/employee/:employeeId/date/:date", verificarToken, ctrl.getEmployeeNewsForDate);
router.post("/",                               verificarToken, ctrl.create);
router.put("/:id",                             verificarToken, ctrl.update);
router.patch("/:id/status",                    verificarToken, ctrl.updateStatus);
router.delete("/:id",                          verificarToken, ctrl.remove);
```

## 📋 Archivos Modificados

1. ✅ `backend-highsoft-sena/src/routes/news.routes.js` - Agregado middleware de autenticación

## 🚀 Próximos Pasos

### 1. Hacer commit de los cambios
```bash
cd backend-highsoft-sena
git add src/routes/news.routes.js
git commit -m "fix: agregar middleware de autenticación a rutas de novedades"
git push
```

### 2. Desplegar a Railway

Railway debería detectar automáticamente el push y redesplegar. Si no:
1. Ve a tu proyecto en Railway
2. Haz clic en "Deploy" o espera el auto-deploy
3. Verifica los logs para confirmar que el deploy fue exitoso

### 3. Verificar la Solución

Una vez desplegado:
1. Abre el módulo de novedades en el frontend
2. Verifica que cargue la lista de novedades sin errores
3. Prueba crear una nueva novedad
4. Prueba cambiar el estado de una novedad

## 🔧 Otros Cambios Pendientes de Deploy

Estos cambios también están en el código local pero necesitan ser desplegados:

1. **Validación de disponibilidad de empleados** (`src/utils/employeeAvailability.js`)
2. **Validación en creación de citas** (`src/controllers/appointments.controller.js`)
3. **Resolución de conflictos al aprobar novedades** (`src/controllers/news.controller.js`)
4. **Normalización de respuesta /auth/me** (`src/controllers/auth.controller.js`)

## 📝 Notas

- El error ocurría porque el frontend enviaba el token de autenticación, pero el backend no lo estaba validando ni extrayendo la información del usuario
- Esto es diferente de otros módulos (appointments, employees, etc.) que SÍ tienen el middleware aplicado correctamente
- La solución es simple pero crítica: sin autenticación, el controlador no puede saber qué usuario está haciendo la petición

## ⚠️ Importante

Después de desplegar, si sigues viendo errores:
1. Verifica los logs de Railway para ver el error específico
2. Confirma que el token JWT se está enviando correctamente desde el frontend
3. Verifica que la variable de entorno `JWT_SECRET` esté configurada en Railway
