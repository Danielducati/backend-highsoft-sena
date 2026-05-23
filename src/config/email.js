const nodemailer = require("nodemailer");

// ── Selección de proveedor ──────────────────────────────────────────────────
// Prioridad: Brevo (envía a cualquier correo) > Resend > nodemailer SMTP
const useBrevo  = !!process.env.BREVO_API_KEY;
const useResend = !useBrevo && !!process.env.RESEND_API_KEY;

let brevoClient  = null;
let resendClient = null;

if (useBrevo) {
  try {
    const SibApiV3Sdk = require("@getbrevo/brevo");
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );
    brevoClient = apiInstance;
    console.log("📧 Email: usando Brevo (envía a cualquier correo)");
  } catch (e) {
    console.error("❌ Error inicializando Brevo:", e.message);
  }
} else if (useResend) {
  try {
    const { Resend } = require("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
    console.log("📧 Email: usando Resend");
  } catch (e) {
    console.error("❌ Error inicializando Resend:", e.message);
  }
} else {
  console.log("📧 Email: usando nodemailer SMTP");
}

// ── Transporter nodemailer (fallback local) ─────────────────────────────────
const createTransporter = () => {
  const emailPass = (process.env.EMAIL_PASSWORD || "").replace(/\s/g, "");
  const emailUser = (process.env.EMAIL_USER || "").trim();
  console.log(`📧 SMTP user: ${emailUser || "❌ no definido"}`);
  console.log(`🔑 SMTP pass: ${emailPass ? `✅ ${emailPass.length} chars` : "❌ no definido"}`);
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: emailUser, pass: emailPass },
    tls: { rejectUnauthorized: false },
    family: 4,
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
};

const transporter = (!useBrevo && !useResend) ? createTransporter() : null;

// ── Verificar conexión ──────────────────────────────────────────────────────
const verifyConnection = async (retries = 3) => {
  if (useBrevo || useResend) {
    console.log("✅ Proveedor HTTP configurado (no requiere verificación SMTP)");
    return true;
  }
  for (let i = 0; i < retries; i++) {
    try {
      await transporter.verify();
      console.log("✅ SMTP configurado correctamente");
      return true;
    } catch (error) {
      console.error(`❌ Intento ${i + 1}/${retries}:`, error.message);
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return false;
};

verifyConnection();

// ── Remitente ───────────────────────────────────────────────────────────────
const FROM_NAME  = "Highlife Spa";
const FROM_EMAIL = useBrevo
  ? (process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER || "").trim()
  : useResend
    ? (process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev")
    : (process.env.EMAIL_USER || "").trim();

// ── Función interna de envío ────────────────────────────────────────────────
const sendMail = async ({ to, subject, html, text }) => {
  // ── Brevo ──
  if (useBrevo && brevoClient) {
    const SibApiV3Sdk = require("@getbrevo/brevo");
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.textContent = text;
    sendSmtpEmail.sender = { name: FROM_NAME, email: FROM_EMAIL };
    sendSmtpEmail.to = [{ email: to }];
    const result = await brevoClient.sendTransacEmail(sendSmtpEmail);
    return result;
  }

  // ── Resend ──
  if (useResend && resendClient) {
    const { data, error } = await resendClient.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message || JSON.stringify(error));
    return data;
  }

  // ── nodemailer SMTP ──
  return transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
};

// ── EMAIL DE BIENVENIDA ─────────────────────────────────────────────────────
const sendWelcomeEmail = async (to, name) => {
  if (!to || !name) {
    console.warn("⚠️ Email o nombre faltante");
    return false;
  }
  try {
    await sendMail({
      to,
      subject: "¡Bienvenido a Highlife Spa & Bar!",
      text: `¡Hola ${name}! Tu cuenta ha sido creada exitosamente en Highlife Spa & Bar.`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f5f0e8; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #1a3a2a 0%, #2a5a40 100%); color: white; padding: 40px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 40px 30px; }
              .content h2 { color: #1a3a2a; }
              .content p { color: #6b7c6b; line-height: 1.6; }
              .button { display: inline-block; background-color: #1a3a2a; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .footer { background-color: #f9f7f4; padding: 20px; text-align: center; color: #6b7c6b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✨ Highlife Spa & Bar</h1>
              </div>
              <div class="content">
                <h2>¡Bienvenido, ${name}!</h2>
                <p>Tu cuenta ha sido creada exitosamente. Ahora puedes disfrutar de todos nuestros servicios:</p>
                <ul style="color: #6b7c6b; line-height: 2;">
                  <li>💆 Reservar citas en nuestro spa</li>
                  <li>👑 Acceso a ofertas exclusivas</li>
                  <li>⭐ Programa de fidelización</li>
                </ul>
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || '#'}" class="button">Ir a Mi Cuenta</a>
                </div>
              </div>
              <div class="footer">
                <p>© 2025 Highlife Spa & Bar · highlifespa.bar@gmail.com</p>
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

// ── EMAIL DE RECUPERACIÓN ───────────────────────────────────────────────────
const sendResetPasswordEmail = async (to, resetLink) => {
  if (!to || !resetLink) {
    console.warn("⚠️ Email o enlace faltante");
    return false;
  }
  try {
    await sendMail({
      to,
      subject: "Recupera tu contraseña - Highlife Spa & Bar",
      text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}\n\nEste enlace es válido por 30 minutos.`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f5f0e8; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #1a3a2a 0%, #2a5a40 100%); color: white; padding: 40px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 40px 30px; }
              .content p { color: #6b7c6b; line-height: 1.6; }
              .button { display: inline-block; background-color: #1a3a2a; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; color: #856404; border-radius: 4px; }
              .footer { background-color: #f9f7f4; padding: 20px; text-align: center; color: #6b7c6b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Recuperar Contraseña</h1>
              </div>
              <div class="content">
                <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Highlife Spa & Bar</strong>.</p>
                <div style="text-align: center;">
                  <a href="${resetLink}" class="button">Restablecer Contraseña</a>
                </div>
                <div class="warning">
                  <strong>⚠️ Importante:</strong> Este enlace es válido solo por <strong>30 minutos</strong>. Si no solicitaste este cambio, ignora este correo.
                </div>
                <p style="font-size: 13px; color: #999;">Si el botón no funciona, copia y pega este enlace:<br>
                  <a href="${resetLink}" style="color: #1a3a2a; word-break: break-all;">${resetLink}</a>
                </p>
              </div>
              <div class="footer">
                <p>© 2025 Highlife Spa & Bar · highlifespa.bar@gmail.com</p>
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

// ── Test ────────────────────────────────────────────────────────────────────
const testEmailConnection = async () => {
  console.log("🧪 Probando conexión de email...");
  try {
    const ok = await verifyConnection(1);
    if (ok) console.log("✅ Conexión verificada");
    return ok;
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
  testEmailConnection,
  verifyConnection,
};
