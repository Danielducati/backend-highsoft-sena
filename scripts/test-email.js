// scripts/test-email.js
require('dotenv').config();
const { testEmailConnection, verifyConnection } = require('../src/config/email');

async function runEmailDiagnostics() {
  console.log("🔍 DIAGNÓSTICO DE EMAIL - Highlife Spa");
  console.log("=====================================");
  
  // 1. Verificar variables de entorno
  console.log("\n1. 📋 Verificando variables de entorno...");
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  
  if (!emailUser) {
    console.error("❌ EMAIL_USER no está configurado");
    return;
  }
  
  if (!emailPassword) {
    console.error("❌ EMAIL_PASSWORD no está configurado");
    return;
  }
  
  console.log("✅ EMAIL_USER:", emailUser);
  console.log("✅ EMAIL_PASSWORD:", emailPassword ? "***configurado***" : "❌ no configurado");
  
  // 2. Verificar formato de email
  console.log("\n2. 📧 Verificando formato de email...");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(emailUser)) {
    console.log("✅ Formato de email válido");
  } else {
    console.error("❌ Formato de email inválido");
    return;
  }
  
  // 3. Verificar que sea Gmail
  console.log("\n3. 🔍 Verificando proveedor de email...");
  if (emailUser.includes('@gmail.com')) {
    console.log("✅ Email de Gmail detectado");
    console.log("💡 Asegúrate de usar una 'App Password', no tu contraseña normal");
    console.log("💡 Guía: https://support.google.com/accounts/answer/185833");
  } else {
    console.log("⚠️ No es Gmail, la configuración puede necesitar ajustes");
  }
  
  // 4. Test de conectividad
  console.log("\n4. 🌐 Probando conectividad...");
  const connectionResult = await verifyConnection(1);
  
  if (!connectionResult) {
    console.log("\n❌ POSIBLES SOLUCIONES:");
    console.log("1. Verificar conexión a internet");
    console.log("2. Verificar que EMAIL_PASSWORD sea una 'App Password' de Gmail");
    console.log("3. Revisar configuración de firewall/antivirus");
    console.log("4. Intentar desde otra red (problema de ISP)");
    console.log("5. Verificar que la autenticación de 2 factores esté habilitada en Gmail");
    return;
  }
  
  // 5. Test de envío
  console.log("\n5. 📤 Probando envío de email...");
  const sendResult = await testEmailConnection();
  
  if (sendResult) {
    console.log("\n🎉 ¡CONFIGURACIÓN EXITOSA!");
    console.log("El sistema de email está funcionando correctamente.");
  } else {
    console.log("\n❌ Error en el envío de email");
  }
  
  console.log("\n=====================================");
  console.log("Diagnóstico completado");
}

// Ejecutar diagnóstico
runEmailDiagnostics().catch(error => {
  console.error("❌ Error en diagnóstico:", error);
  process.exit(1);
});