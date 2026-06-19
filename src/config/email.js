const nodemailer = require("nodemailer");

// ── Selección de proveedor ──────────────────────────────────────────────────
// Prioridad: Brevo (HTTP, envía a cualquier correo) > Resend > nodemailer SMTP
const useBrevo  = !!process.env.BREVO_API_KEY;
const useResend = !useBrevo && !!process.env.RESEND_API_KEY;

if (useBrevo)       console.log("📧 Email: usando Brevo API (envía a cualquier correo)");
else if (useResend) console.log("📧 Email: usando Resend API");
else                console.log("📧 Email: usando nodemailer SMTP");

// ── Remitente ───────────────────────────────────────────────────────────────
const FROM_NAME  = "Highlife Spa";
const FROM_EMAIL = useBrevo
  ? (process.env.BREVO_FROM_EMAIL  || process.env.EMAIL_USER || "").trim()
  : useResend
    ? (process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev")
    : (process.env.EMAIL_USER        || "").trim();

// ── Transporter nodemailer (solo si no hay proveedor HTTP) ──────────────────
const transporter = (!useBrevo && !useResend)
  ? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: (process.env.EMAIL_USER     || "").trim(),
        pass: (process.env.EMAIL_PASSWORD || "").replace(/\s/g, ""),
      },
      tls: { rejectUnauthorized: false },
      family: 4,
      connectionTimeout: 60000,
      greetingTimeout:   30000,
      socketTimeout:     60000,
    })
  : null;

// ── Verificar conexión ──────────────────────────────────────────────────────
const verifyConnection = async (retries = 3) => {
  if (useBrevo || useResend) {
    console.log("✅ Proveedor HTTP configurado");
    return true;
  }
  for (let i = 0; i < retries; i++) {
    try {
      await transporter.verify();
      console.log("✅ SMTP configurado correctamente");
      return true;
    } catch (err) {
      console.error(`❌ Intento ${i + 1}/${retries}:`, err.message);
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return false;
};

verifyConnection();

// ── Envío via Brevo HTTP API ────────────────────────────────────────────────
const sendViaBrevo = async ({ to, subject, html, text }) => {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method:  "POST",
    headers: {
      "accept":       "application/json",
      "content-type": "application/json",
      "api-key":      process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender:      { name: FROM_NAME, email: FROM_EMAIL },
      to:          [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || JSON.stringify(data));
  }
  return data;
};

// ── Envío via Resend HTTP API ───────────────────────────────────────────────
const sendViaResend = async ({ to, subject, html, text }) => {
  const { Resend } = require("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
};

// ── Función interna de envío ────────────────────────────────────────────────
const sendMail = async (opts) => {
  if (useBrevo)  return sendViaBrevo(opts);
  if (useResend) return sendViaResend(opts);
  return transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to:   opts.to,
    subject: opts.subject,
    html:    opts.html,
    text:    opts.text,
  });
};

// ── EMAIL DE BIENVENIDA ─────────────────────────────────────────────────────
const sendWelcomeEmail = async (to, name) => {
  if (!to || !name) { console.warn("⚠️ Email o nombre faltante"); return false; }
  try {
    await sendMail({
      to,
      subject: "¡Bienvenido a Highlife Spa & Bar!",
      text: `¡Hola ${name}! Tu cuenta ha sido creada exitosamente en Highlife Spa & Bar.`,
      html: `
        <!DOCTYPE html><html><head><style>
          body{font-family:Arial,sans-serif;background:#f5f0e8;margin:0;padding:0}
          .c{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden}
          .h{background:linear-gradient(135deg,#1a3a2a,#2a5a40);color:#fff;padding:40px 20px;text-align:center}
          .h h1{margin:0;font-size:28px}
          .b{padding:40px 30px}
          .b h2{color:#1a3a2a}
          .b p,.b li{color:#6b7c6b;line-height:1.8}
          .btn{display:inline-block;background:#1a3a2a;color:#fff!important;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0}
          .f{background:#f9f7f4;padding:20px;text-align:center;color:#6b7c6b;font-size:12px}
        </style></head><body>
          <div class="c">
            <div class="h"><h1>✨ Highlife Spa & Bar</h1></div>
            <div class="b">
              <h2>¡Bienvenido, ${name}!</h2>
              <p>Tu cuenta ha sido creada exitosamente. Ahora puedes disfrutar de:</p>
              <ul>
                <li>💆 Reservar citas en nuestro spa</li>
                <li>👑 Acceso a ofertas exclusivas</li>
                <li>⭐ Programa de fidelización</li>
              </ul>
              <div style="text-align:center">
                <a href="${process.env.FRONTEND_URL || '#'}" class="btn">Ir a Mi Cuenta</a>
              </div>
            </div>
            <div class="f"><p>© 2025 Highlife Spa & Bar · highlifespa.bar@gmail.com</p></div>
          </div>
        </body></html>`,
    });
    console.log("✅ Email de bienvenida enviado a:", to);
    return true;
  } catch (err) {
    console.error("❌ Error enviando email de bienvenida:", err.message);
    return false;
  }
};

// ── EMAIL DE RECUPERACIÓN ───────────────────────────────────────────────────
const sendResetPasswordEmail = async (to, resetLink) => {
  if (!to || !resetLink) { console.warn("⚠️ Email o enlace faltante"); return false; }
  try {
    await sendMail({
      to,
      subject: "Recupera tu contraseña - Highlife Spa & Bar",
      text: `Restablece tu contraseña aquí: ${resetLink}\n\nVálido por 30 minutos.`,
      html: `
        <!DOCTYPE html><html><head><style>
          body{font-family:Arial,sans-serif;background:#f5f0e8;margin:0;padding:0}
          .c{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden}
          .h{background:linear-gradient(135deg,#1a3a2a,#2a5a40);color:#fff;padding:40px 20px;text-align:center}
          .h h1{margin:0;font-size:28px}
          .b{padding:40px 30px}
          .b p{color:#6b7c6b;line-height:1.6}
          .btn{display:inline-block;background:#1a3a2a;color:#fff!important;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0}
          .warn{background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;color:#856404;border-radius:4px}
          .f{background:#f9f7f4;padding:20px;text-align:center;color:#6b7c6b;font-size:12px}
        </style></head><body>
          <div class="c">
            <div class="h"><h1>🔐 Recuperar Contraseña</h1></div>
            <div class="b">
              <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Highlife Spa & Bar</strong>.</p>
              <div style="text-align:center">
                <a href="${resetLink}" class="btn">Restablecer Contraseña</a>
              </div>
              <div class="warn">
                <strong>⚠️ Importante:</strong> Este enlace es válido solo por <strong>30 minutos</strong>.
                Si no solicitaste este cambio, ignora este correo.
              </div>
              <p style="font-size:13px;color:#999">Si el botón no funciona, copia este enlace:<br>
                <a href="${resetLink}" style="color:#1a3a2a;word-break:break-all">${resetLink}</a>
              </p>
            </div>
            <div class="f"><p>© 2025 Highlife Spa & Bar · highlifespa.bar@gmail.com</p></div>
          </div>
        </body></html>`,
    });
    console.log("✅ Email de recuperación enviado a:", to);
    return true;
  } catch (err) {
    console.error("❌ Error enviando email de recuperación:", err.message);
    return false;
  }
};

// ── EMAIL DE CONFIRMACIÓN DE CITA ──────────────────────────────────────────
const sendAppointmentConfirmationEmail = async (to, { clientName, fecha, hora, servicios, notas }) => {
  if (!to) { console.warn("⚠️ Email del cliente faltante para confirmación de cita"); return false; }
  try {
    // Formatear fecha legible
    const [y, m, d] = fecha.split("-");
    const fechaLegible = new Date(Number(y), Number(m) - 1, Number(d))
      .toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Formatear hora
    const [h, min] = hora.split(":");
    const horaLegible = `${h}:${min}`;

    // Lista de servicios
    const serviciosHtml = Array.isArray(servicios) && servicios.length > 0
      ? servicios.map(s =>
          `<tr>
            <td style="padding:8px 12px;color:#1a3a2a;border-bottom:1px solid #f0ede8">${s.nombre || s.serviceName || "Servicio"}</td>
            <td style="padding:8px 12px;color:#6b7c6b;border-bottom:1px solid #f0ede8;text-align:right">${s.empleado || s.employeeName || ""}</td>
          </tr>`
        ).join("")
      : `<tr><td colspan="2" style="padding:8px 12px;color:#6b7c6b">Servicios por confirmar</td></tr>`;

    await sendMail({
      to,
      subject: `✅ Confirmación de cita — Highlife Spa & Bar`,
      text: `Hola ${clientName}, tu cita ha sido confirmada para el ${fechaLegible} a las ${horaLegible}.`,
      html: `
        <!DOCTYPE html><html><head><style>
          body{font-family:Arial,sans-serif;background:#f5f0e8;margin:0;padding:0}
          .c{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
          .h{background:linear-gradient(135deg,#1a3a2a,#2a5a40);color:#fff;padding:36px 24px;text-align:center}
          .h h1{margin:0 0 6px;font-size:26px;letter-spacing:-0.5px}
          .h p{margin:0;opacity:0.8;font-size:13px}
          .b{padding:36px 30px}
          .b h2{color:#1a3a2a;margin:0 0 6px}
          .b p{color:#6b7c6b;line-height:1.7;margin:0 0 20px}
          .card{background:#f9f7f4;border-radius:10px;padding:20px 24px;margin:20px 0;border:1px solid #ece9e3}
          .card-row{display:flex;gap:8px;align-items:flex-start;margin-bottom:12px}
          .card-row:last-child{margin-bottom:0}
          .card-label{font-size:11px;color:#8a9e8d;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;min-width:70px;padding-top:1px}
          .card-value{font-size:14px;color:#1a3a2a;font-weight:600}
          table{width:100%;border-collapse:collapse;margin-top:8px}
          th{text-align:left;padding:8px 12px;font-size:11px;color:#8a9e8d;text-transform:uppercase;letter-spacing:0.08em;background:#f0ede8}
          .badge{display:inline-block;background:#edf7f4;color:#1a5c3a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
          .note{background:#fffbf0;border-left:3px solid #c8a96e;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;color:#7a6030;font-size:13px}
          .footer{background:#f9f7f4;padding:20px 24px;text-align:center;color:#8a9e8d;font-size:12px;border-top:1px solid #ece9e3}
          .footer a{color:#1a3a2a;text-decoration:none}
        </style></head><body>
          <div class="c">
            <div class="h">
              <h1>✨ Highlife Spa & Bar</h1>
              <p>Confirmación de cita</p>
            </div>
            <div class="b">
              <h2>¡Hola, ${clientName}!</h2>
              <p>Tu cita ha sido <strong style="color:#1a5c3a">confirmada exitosamente</strong>. Aquí tienes los detalles:</p>

              <div class="card">
                <div class="card-row">
                  <span class="card-label">📅 Fecha</span>
                  <span class="card-value">${fechaLegible.charAt(0).toUpperCase() + fechaLegible.slice(1)}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">🕐 Hora</span>
                  <span class="card-value">${horaLegible}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">📍 Lugar</span>
                  <span class="card-value">Highlife Spa & Bar · Laureles, Unicentro</span>
                </div>
              </div>

              <p style="font-size:13px;font-weight:600;color:#1a3a2a;margin-bottom:4px">Servicios agendados</p>
              <table>
                <thead><tr>
                  <th>Servicio</th>
                  <th style="text-align:right">Profesional</th>
                </tr></thead>
                <tbody>${serviciosHtml}</tbody>
              </table>

              ${notas ? `<div class="note"><strong>📝 Notas:</strong> ${notas}</div>` : ""}

              <p style="margin-top:24px;font-size:13px;color:#6b7c6b">
                Si necesitas cancelar o reprogramar tu cita, por favor contáctanos con al menos <strong>24 horas de anticipación</strong>.
              </p>
            </div>
            <div class="footer">
              <p>© 2025 Highlife Spa & Bar · <a href="mailto:highlifespa.bar@gmail.com">highlifespa.bar@gmail.com</a></p>
              <p style="margin-top:4px">📞 +57 323 2875383 · 📍 Laureles, Unicentro, Medellín</p>
            </div>
          </div>
        </body></html>`,
    });
    console.log("✅ Email de confirmación de cita enviado a:", to);
    return true;
  } catch (err) {
    console.error("❌ Error enviando email de confirmación de cita:", err.message);
    return false;
  }
};

// ── Test ────────────────────────────────────────────────────────────────────
const testEmailConnection = async () => {
  try {
    const ok = await verifyConnection(1);
    if (ok) console.log("✅ Conexión verificada");
    return ok;
  } catch (err) {
    console.error("❌ Error:", err.message);
    return false;
  }
};

module.exports = { sendWelcomeEmail, sendResetPasswordEmail, sendAppointmentConfirmationEmail, testEmailConnection, verifyConnection };
