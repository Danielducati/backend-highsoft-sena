const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ✅ Verificar conexión
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Error en configuración de email:", error);
  } else {
    console.log("✅ Email configurado correctamente");
  }
});

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
    console.error("❌ Error enviando email de bienvenida:", error);
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
    console.error("❌ Error enviando email de recuperación:", error);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
};