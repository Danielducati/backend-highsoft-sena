const nodemailer = require("nodemailer");

// Configuración principal con múltiples opciones de fallback
const createTransporter = () => {
  // Configuración principal (Gmail con IPv4 forzado)
  const primaryConfig = {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    },
    // Forzar IPv4 para evitar problemas de conectividad IPv6
    family: 4,
    // Timeout más largo para conexiones lentas
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000
  };

  // Configuración alternativa (puerto 465 con SSL)
  const alternativeConfig = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    },
    family: 4,
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000
  };

  // Intentar configuración principal primero
  try {
    return nodemailer.createTransport(primaryConfig);
  } catch (error) {
    console.warn("⚠️ Configuración principal falló, intentando alternativa...");
    return nodemailer.createTransport(alternativeConfig);
  }
};

const transporter = createTransporter();

// ✅ Verificar conexión con reintentos
const verifyConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await transporter.verify();
      console.log("✅ Email configurado correctamente");
      return true;
    } catch (error) {
      console.error(`❌ Intento ${i + 1}/${retries} - Error en configuración de email:`, error.message);
      
      if (i === retries - 1) {
        console.error("❌ No se pudo establecer conexión con el servidor de email después de", retries, "intentos");
        console.error("💡 Posibles soluciones:");
        console.error("   1. Verificar que EMAIL_USER y EMAIL_PASSWORD estén configurados correctamente");
        console.error("   2. Asegurarse de usar una 'App Password' de Gmail, no la contraseña normal");
        console.error("   3. Verificar conectividad a internet");
        console.error("   4. Revisar configuración de firewall/antivirus");
        return false;
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Verificar conexión al inicializar
verifyConnection();

// 📧 EMAIL DE BIENVENIDA
const sendWelcomeEmail = async (to, name) => {
  if (!to || !name) {
    console.warn("⚠️ Email o nombre faltante");
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Highlife Spa" <${process.env.EMAIL_USER}>`,
      to,
      subject: "¡Bienvenido a Highlife Spa & Bar!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; background-color: #f5f0e8; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
              .header { background: linear-gradient(135deg, #78D1BD 0%, #5FBFAA 100%); color: white; padding: 40px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 32px; }
              .content { padding: 40px 20px; }
              .content h2 { color: #1a3a2a; font-size: 24px; margin-bottom: 20px; }
              .content p { color: #6b7c6b; line-height: 1.6; margin-bottom: 15px; }
              .button { display: inline-block; background-color: #1a3a2a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
              .footer { background-color: #f9f7f4; padding: 20px; text-align: center; color: #6b7c6b; font-size: 12px; border-top: 1px solid #ede8e0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Highlife Spa & Bar</h1>
              </div>
              <div class="content">
                <h2>¡Bienvenido, ${name}!</h2>
                <p>Tu cuenta ha sido creada exitosamente en Highlife Spa & Bar.</p>
                <p>Ahora puedes disfrutar de nuestros servicios premium:</p>
                <ul style="color: #6b7c6b; line-height: 1.8;">
                  <li>💆 Reservar citas en nuestro spa</li>
                  <li>🍹 Disfrutar de nuestro bar</li>
                  <li>👑 Acceso a ofertas exclusivas</li>
                  <li>⭐ Programa de fidelización</li>
                </ul>
                <a href="${process.env.FRONTEND_URL}/login" class="button">Ir a Mi Cuenta</a>
                <p style="margin-top: 30px; border-top: 1px solid #ede8e0; padding-top: 20px; font-size: 13px;">
                  Si tienes preguntas, contáctanos en: <strong>info@highlifespa.com</strong>
                </p>
              </div>
              <div class="footer">
                <p>© 2024 Highlife Spa & Bar. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("✅ Email de bienvenida enviado a:", to);
    return true;
  } catch (error) {
    console.error("❌ Error enviando email de bienvenida:", error.message);
    return false;
  }
};

// 📧 EMAIL DE RECUPERACIÓN
const sendResetPasswordEmail = async (to, resetLink) => {
  if (!to || !resetLink) {
    console.warn("⚠️ Email o enlace faltante");
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Highlife Spa" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Recupera tu contraseña - Highlife Spa & Bar",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; background-color: #f5f0e8; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
              .header { background: linear-gradient(135deg, #1a3a2a 0%, #2a5a40 100%); color: white; padding: 40px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 32px; }
              .content { padding: 40px 20px; }
              .content h2 { color: #1a3a2a; font-size: 24px; margin-bottom: 20px; }
              .content p { color: #6b7c6b; line-height: 1.6; margin-bottom: 15px; }
              .button { display: inline-block; background-color: #78D1BD; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; text-align: center; }
              .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; color: #856404; border-radius: 4px; }
              .footer { background-color: #f9f7f4; padding: 20px; text-align: center; color: #6b7c6b; font-size: 12px; border-top: 1px solid #ede8e0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Recupera tu Contraseña</h1>
              </div>
              <div class="content">
                <p>Recibimos una solicitud para restablecer tu contraseña en Highlife Spa & Bar.</p>
                <p style="text-align: center;">
                  <a href="${resetLink}" class="button">Restablecer Contraseña</a>
                </p>
                <div class="warning">
                  <strong>⚠️ Importante:</strong> Este enlace es válido solo por 30 minutos. Si no solicitaste cambiar tu contraseña, ignora este correo.
                </div>
                <p style="margin-top: 30px; border-top: 1px solid #ede8e0; padding-top: 20px; font-size: 13px;">
                  Si tienes preguntas, contáctanos en: <strong>info@highlifespa.com</strong>
                </p>
              </div>
              <div class="footer">
                <p>© 2024 Highlife Spa & Bar. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("✅ Email de recuperación enviado a:", to);
    return true;
  } catch (error) {
    console.error("❌ Error enviando email de recuperación:", error.message);
    return false;
  }
};

// 🧪 Función de prueba para verificar el envío de emails
const testEmailConnection = async () => {
  console.log("🧪 Probando conexión de email...");
  
  try {
    await transporter.verify();
    console.log("✅ Conexión de email verificada exitosamente");
    
    // Enviar email de prueba (opcional)
    if (process.env.NODE_ENV === 'development') {
      const testResult = await transporter.sendMail({
        from: `"Highlife Spa Test" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Enviar a sí mismo
        subject: "🧪 Test de configuración de email",
        text: "Si recibes este email, la configuración está funcionando correctamente.",
        html: `
          <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #78D1BD;">🧪 Test de Email</h2>
            <p>Si recibes este email, la configuración está funcionando correctamente.</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `
      });
      
      console.log("✅ Email de prueba enviado:", testResult.messageId);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error en test de email:", error.message);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
  testEmailConnection,
  verifyConnection
};