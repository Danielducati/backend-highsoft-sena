/** Nombre genérico o vacío (p. ej. cuentas creadas sin perfil completo) */
function isPlaceholderName(nombre, apellido = "") {
  const n = (nombre || "").trim().toLowerCase();
  if (!n || n === "usuario" || n === "user" || n === "cliente") return true;
  if (n === "google" && !(apellido || "").trim()) return true;
  return false;
}

/** Extrae nombre y apellido del token de Google y/o datos enviados por el frontend (Firebase) */
function parseGoogleProfile(payload, body = {}) {
  let nombre = String(body.nombre || payload.given_name || "").trim();
  let apellido = String(body.apellido || payload.family_name || "").trim();
  const fullName = String(
    body.displayName || payload.name || ""
  ).trim();
  const foto = String(body.foto || payload.picture || "").trim();

  if ((!nombre || isPlaceholderName(nombre, apellido)) && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      nombre = parts[0];
      apellido = apellido || "";
    } else if (parts.length > 1) {
      nombre = parts[0];
      apellido = apellido || parts.slice(1).join(" ");
    }
  }

  if (isPlaceholderName(nombre, apellido)) {
    const local = (payload.email || "").split("@")[0] || "";
    const fromEmail = local.replace(/[._+-]/g, " ").trim();
    if (fromEmail) {
      const parts = fromEmail.split(/\s+/).filter(Boolean);
      nombre = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
      apellido = apellido || parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
    } else {
      nombre = "Cliente";
    }
  }

  return {
    nombre: nombre.slice(0, 100),
    apellido: apellido.slice(0, 100),
    foto: foto.slice(0, 500),
  };
}

module.exports = { parseGoogleProfile, isPlaceholderName };
