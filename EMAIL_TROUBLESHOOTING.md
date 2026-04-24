# SOLUCIÓN DE PROBLEMAS DE EMAIL

## PROBLEMA IDENTIFICADO
Error: `ENETUNREACH 2607:f8b0:400c:c0c::6c:465`

Este error indica que el sistema está intentando conectarse a Gmail usando IPv6, pero tu red no tiene conectividad IPv6 o hay un problema de configuración.

## SOLUCIONES IMPLEMENTADAS

### 1. CONFIGURACIÓN MEJORADA
- ✅ Forzar uso de IPv4 (`family: 4`)
- ✅ Configuración de timeouts más largos
- ✅ Múltiples opciones de puerto (587 y 465)
- ✅ Configuración TLS mejorada

### 2. DIAGNÓSTICO AUTOMÁTICO
```bash
# Ejecutar diagnóstico completo
npm run test-email
```

### 3. CONFIGURACIÓN ALTERNATIVA
Si la configuración principal falla, usar:
```javascript
// En lugar de email.js, usar email-alternative.js
const { sendWelcomeEmail } = require('./config/email-alternative');
```

## PASOS PARA RESOLVER

### PASO 1: Verificar Variables de Entorno
```bash
# Verificar que estén configuradas
echo $EMAIL_USER
echo $EMAIL_PASSWORD
```

### PASO 2: Verificar App Password de Gmail
1. Ve a tu cuenta de Gmail
2. Configuración → Seguridad
3. Verificación en 2 pasos (debe estar activada)
4. Contraseñas de aplicaciones
5. Generar nueva contraseña para "Aplicación personalizada"
6. Usar esa contraseña en `EMAIL_PASSWORD`

### PASO 3: Ejecutar Diagnóstico
```bash
cd backend-highsoft-sena
npm run diagnose-email
```

### PASO 4: Probar Configuración Alternativa
Si el diagnóstico falla, editar los archivos que usan email:

```javascript
// Cambiar en los controladores que usan email
// DE:
const { sendWelcomeEmail } = require('../config/email');

// A:
const { sendWelcomeEmail } = require('../config/email-alternative');
```

## CONFIGURACIONES ESPECÍFICAS POR PROBLEMA

### Si tienes problemas de IPv6:
```javascript
// En email.js, asegurar que esté:
family: 4  // Fuerza IPv4
```

### Si tienes problemas de timeout:
```javascript
// Aumentar timeouts
connectionTimeout: 60000,
greetingTimeout: 30000,
socketTimeout: 60000
```

### Si tienes problemas de firewall:
```javascript
// Usar puerto 587 en lugar de 465
port: 587,
secure: false
```

## VERIFICACIÓN MANUAL

### 1. Test de conectividad básica:
```bash
# Windows
telnet smtp.gmail.com 587

# Linux/Mac
nc -zv smtp.gmail.com 587
```

### 2. Test con curl:
```bash
curl -v telnet://smtp.gmail.com:587
```

### 3. Verificar DNS:
```bash
nslookup smtp.gmail.com
```

## ALTERNATIVAS SI GMAIL NO FUNCIONA

### Opción 1: Usar otro proveedor
```javascript
// Configuración para Outlook
{
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: 'tu-email@outlook.com',
    pass: 'tu-contraseña'
  }
}
```

### Opción 2: Servicio de email externo
- SendGrid
- Mailgun
- Amazon SES

## LOGS Y DEBUGGING

### Activar logs detallados:
```javascript
const transporter = nodemailer.createTransport({
  // ... configuración
  logger: true,
  debug: true
});
```

### Verificar logs del sistema:
```bash
# Ver logs en tiempo real
tail -f /var/log/mail.log  # Linux
# O revisar logs de Node.js en consola
```

## CONTACTO DE SOPORTE

Si ninguna solución funciona:
1. Ejecutar `npm run diagnose-email` y guardar el output
2. Verificar configuración de red/firewall
3. Probar desde otra red (datos móviles)
4. Contactar al administrador de red si es entorno corporativo

## CONFIGURACIÓN FINAL RECOMENDADA

```javascript
// src/config/email.js (versión final)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // App Password de Gmail
  },
  tls: {
    rejectUnauthorized: false
  },
  family: 4, // Forzar IPv4
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000
});
```

## CHECKLIST DE VERIFICACIÓN

- [ ] Variables EMAIL_USER y EMAIL_PASSWORD configuradas
- [ ] EMAIL_PASSWORD es una App Password de Gmail (no contraseña normal)
- [ ] Verificación en 2 pasos activada en Gmail
- [ ] Conectividad a internet funcionando
- [ ] Puerto 587 no bloqueado por firewall
- [ ] Diagnóstico ejecutado: `npm run diagnose-email`
- [ ] Test de envío exitoso