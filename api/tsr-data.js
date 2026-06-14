const API_UNAVAILABLE_MESSAGE = "API locale indisponible — vérifiez que votre PC, npm start et Cloudflare Tunnel sont actifs.";

const ENDPOINTS = {
  health: { path: "/health", methods: ["GET"] },
  history: { path: "/history", methods: ["GET"] },
  replay: { path: "/replay", methods: ["GET"] },
  signals: { path: "/signals", methods: ["GET"] },
  logs: { path: "/logs", methods: ["POST"] },
};

module.exports = async function handler(request, response) {
  const apiUrl = process.env.NEXT_PUBLIC_TSR_DATA_API_URL;
  const apiKey = process.env.TSR_DATA_API_KEY;
  const endpointName = String(request.query.endpoint || "");
  const endpoint = ENDPOINTS[endpointName];

  if (!endpoint) {
    response.status(400).json({ error: "Invalid endpoint" });
    return;
  }

  if (!endpoint.methods.includes(request.method)) {
    response.setHeader("Allow", endpoint.methods.join(", "));
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!apiUrl || !apiKey) {
    response.status(503).json({
      error: "API_UNAVAILABLE",
      message: API_UNAVAILABLE_MESSAGE,
    });
    return;
  }

  try {
    const target = new URL(endpoint.path, ensureTrailingSlash(apiUrl));
    Object.entries(request.query).forEach(([key, value]) => {
      if (key === "endpoint") return;
      if (Array.isArray(value)) value.forEach((item) => target.searchParams.append(key, item));
      else if (value !== undefined) target.searchParams.set(key, value);
    });

    const upstream = await fetch(target, {
      method: request.method,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: request.method === "POST" ? JSON.stringify(request.body || {}) : undefined,
    });

    const text = await upstream.text();
    const payload = parseJson(text);

    if (upstream.status === 401) {
      response.status(401).json({
        error: "Unauthorized",
        message: "Unauthorized depuis TSR Data API. Le proxy Vercel envoie bien le header x-api-key.",
      });
      return;
    }

    response.status(upstream.status).json(payload || { ok: upstream.ok });
  } catch {
    response.status(503).json({
      error: "API_UNAVAILABLE",
      message: API_UNAVAILABLE_MESSAGE,
    });
  }
};

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
