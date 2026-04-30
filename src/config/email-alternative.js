// src/config/email-alternative.js
// Configuración alternativa para casos donde la principal no funciona
const nodemailer = require("nodemailer");

// Configuración simplificada que evita problemas de IPv6
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Configuraciones adicionales para mejorar compatibilidad
  pool: true,
  maxConnections: 1,
  rateDelta: 20000,
  rateLimit: 5,
  // Configuración de socket para forzar IPv4
  socketTimeout: 60000,
  logger: false,
  debug: false
});

// Función para enviar email con reintentos
const sendEmailWithRetry = async (mailOptions, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado exitosamente (intento ${i + 1}):`, result.messageId);
      return true;
    } catch (error) {
      console.error(`❌ Intento ${i + 1}/${retries} falló:`, error.message);
      
      if (i === retries - 1) {
        console.error("❌ Todos los intentos fallaron");
        return false;
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
};

// 📧 EMAIL DE BIENVENIDA (versión simplificada)
const sendWelcomeEmailSimple = async (to, name) => {
  if (!to || !name) {
    console.warn("⚠️ Email o nombre faltante");
    return false;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "¡Bienvenido a Highlife Spa & Bar!",
    text: `¡Hola ${name}!\n\nTu cuenta ha sido creada exitosamente en Highlife Spa & Bar.\n\nAhora puedes disfrutar de nuestros servicios premium.\n\nSaludos,\nEquipo Highlife Spa & Bar`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #78D1BD; text-align: center;">Highlife Spa & Bar</h1>
        <h2 style="color: #1a3a2a;">¡Bienvenido, ${name}!</h2>
        <p>Tu cuenta ha sido creada exitosamente en Highlife Spa & Bar.</p>
        <p>Ahora puedes disfrutar de nuestros servicios premium:</p>
        <ul>
          <li>💆 Reservar citas en nuestro spa</li>
          <li>🍹 Disfrutar de nuestro bar</li>
          <li>👑 Acceso a ofertas exclusivas</li>
          <li>⭐ Programa de fidelización</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/login" 
             style="background-color: #1a3a2a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Ir a Mi Cuenta
          </a>
        </div>
        <hr style="border: 1px solid #ede8e0; margin: 30px 0;">
        <p style="text-align: center; color: #6b7c6b; font-size: 12px;">
          © 2024 Highlife Spa & Bar. Todos los derechos reservados.
        </p>
      </div>
    `
  };

  return await sendEmailWithRetry(mailOptions);
};

// 📧 EMAIL DE RECUPERACIÓN (versión simplificada)
const sendResetPasswordEmailSimple = async (to, resetLink) => {
  if (!to || !resetLink) {
    console.warn("⚠️ Email o enlace faltante");
    return false;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Recupera tu contraseña - Highlife Spa & Bar",
    text: `Recibimos una solicitud para restablecer tu contraseña.\n\nHaz clic en el siguiente enlace para restablecer tu contraseña:\n${resetLink}\n\nEste enlace es válido solo por 30 minutos.\n\nSi no solicitaste cambiar tu contraseña, ignora este correo.\n\nSaludos,\nEquipo Highlife Spa & Bar`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a3a2a; text-align: center;">Recupera tu Contraseña</h1>
        <p>Recibimos una solicitud para restablecer tu contraseña en Highlife Spa & Bar.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #78D1BD; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Restablecer Contraseña
          </a>
        </div>
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; color: #856404;">
          <strong>⚠️ Importante:</strong> Este enlace es válido solo por 30 minutos. Si no solicitaste cambiar tu contraseña, ignora este correo.
        </div>
        <hr style="border: 1px solid #ede8e0; margin: 30px 0;">
        <p style="text-align: center; color: #6b7c6b; font-size: 12px;">
          © 2024 Highlife Spa & Bar. Todos los derechos reservados.
        </p>
      </div>
    `
  };

  return await sendEmailWithRetry(mailOptions);
};

// Test de conexión simplificado
const testConnectionSimple = async () => {
  try {
    await transporter.verify();
    console.log("✅ Conexión de email verificada (versión simplificada)");
    return true;
  } catch (error) {
    console.error("❌ Error en conexión simplificada:", error.message);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail: sendWelcomeEmailSimple,
  sendResetPasswordEmail: sendResetPasswordEmailSimple,
  testEmailConnection: testConnectionSimple
};