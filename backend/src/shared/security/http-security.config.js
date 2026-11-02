const localOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

function parseOrigins(value) {
  return [...new Set((value || "").split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
    .map(origin => {
      const url = new URL(origin);
      if (!/^https?:$/.test(url.protocol) || url.origin !== origin) {
        throw new Error("CORS_ORIGINS debe contener solo orígenes HTTP(S), sin rutas");
      }
      return url.origin;
    }))];
}

export function loadCorsOptions(env = process.env) {
  const configuredOrigins = parseOrigins(env.CORS_ORIGINS);
  const origins = configuredOrigins.length
    ? configuredOrigins
    : env.NODE_ENV === "production"
      ? (() => { throw new Error("CORS_ORIGINS es obligatorio en producción"); })()
      : localOrigins;
  const allowedOrigins = new Set(origins);

  return {
    credentials: false,
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    }
  };
}

export function loadLoginRateLimit(env = process.env) {
  const max = Number(env.LOGIN_RATE_LIMIT_MAX || 5);
  const timeWindow = Number(env.LOGIN_RATE_LIMIT_WINDOW_MS || 60_000);
  if (!Number.isSafeInteger(max) || max < 1 || !Number.isSafeInteger(timeWindow) || timeWindow < 1_000) {
    throw new Error("La configuración del límite de inicio de sesión no es válida");
  }
  return { max, timeWindow };
}
