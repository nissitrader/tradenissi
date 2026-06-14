const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 4000);
const DATA_ROOT = process.env.TSR_DATA_DIR || "J:\\tsr-trading-data";
const API_KEY = process.env.TSR_DATA_API_KEY;
const ALLOWED_ORIGIN = "https://tradenissi.vercel.app";
const ALLOWED_TIMEFRAMES = new Set(["H4", "H1", "M30", "M15", "M5", "M1", "30S", "30s", "240", "60", "30", "15", "5", "1"]);

if (!API_KEY) {
  console.error("TSR_DATA_API_KEY is required.");
  process.exit(1);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    applyCors(request, response);

    if (request.method === "OPTIONS") {
      response.writeHead(isAllowedOrigin(request) ? 204 : 403);
      response.end();
      return;
    }

    if (!isAuthorized(request)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      await handleHealth(response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/history") {
      await handleHistory(url, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/replay") {
      await handleReplay(url, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/signals") {
      await handleSignals(url, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/logs") {
      await handleLogs(request, response);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, getErrorStatus(error), { error: sanitizeError(error) });
  }
});

server.listen(PORT, () => {
  console.log(`tsr-data-api listening on http://localhost:${PORT}`);
});

function applyCors(request, response) {
  if (!isAllowedOrigin(request)) return;
  response.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,x-api-key");
  response.setHeader("Access-Control-Max-Age", "600");
}

function isAllowedOrigin(request) {
  return request.headers.origin === ALLOWED_ORIGIN;
}

function isAuthorized(request) {
  const receivedKey = request.headers["x-api-key"];
  if (typeof receivedKey !== "string" || !receivedKey) return false;
  const expected = Buffer.from(API_KEY);
  const actual = Buffer.from(receivedKey);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

async function handleHealth(response) {
  const available = await canAccessDataRoot();
  sendJson(response, 200, {
    ok: true,
    service: "tsr-data-api",
    port: PORT,
    data: available ? "available" : "unavailable",
  });
}

async function handleHistory(url, response) {
  const query = getMarketQuery(url);
  const records = await loadMarketRecords("history", query);
  sendJson(response, 200, {
    symbol: query.symbol,
    timeframe: normalizeTimeframe(query.timeframe),
    date: query.date || null,
    count: records.length,
    candles: limitRecords(records, query.limit),
  });
}

async function handleReplay(url, response) {
  const query = getMarketQuery(url);
  const records = await loadMarketRecords("replay", query);
  sendJson(response, 200, {
    symbol: query.symbol,
    timeframe: normalizeTimeframe(query.timeframe),
    date: query.date || null,
    count: records.length,
    candles: limitRecords(records, query.limit || 1000),
  });
}

async function handleSignals(url, response) {
  await assertDataRootAvailable();
  const date = sanitizeDate(url.searchParams.get("date"));
  const mode = sanitizeText(url.searchParams.get("mode"), 80);
  const candidates = [
    ["signals", "signals.json"],
    ["signals", "signals.jsonl"],
    ["signals", "signals.csv"],
    ["signals.json"],
    ["signals.jsonl"],
    ["signals.csv"],
  ];
  const signals = await readFirstExisting(candidates);
  const filtered = signals.filter((signal) => {
    const dateMatch = !date || String(signal.time || signal.date || "").startsWith(date);
    const modeMatch = !mode || String(signal.mode || "").toLowerCase() === mode.toLowerCase();
    return dateMatch && modeMatch;
  });
  sendJson(response, 200, { count: filtered.length, signals: filtered });
}

async function handleLogs(request, response) {
  await assertDataRootAvailable();
  const body = await readBody(request);
  const payload = JSON.parse(body || "{}");
  const logEntry = {
    receivedAt: new Date().toISOString(),
    source: "tradenissi",
    type: sanitizeText(payload.type || "replay", 40),
    payload,
  };
  const logsDir = safeResolve("logs");
  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(safeResolve("logs", "tsr-events.jsonl"), `${JSON.stringify(logEntry)}\n`, "utf8");
  sendJson(response, 201, { ok: true, stored: true });
}

function getMarketQuery(url) {
  const symbol = sanitizeSymbol(url.searchParams.get("symbol") || "XAUUSD");
  const timeframe = normalizeTimeframe(url.searchParams.get("timeframe") || "M15");
  const date = sanitizeDate(url.searchParams.get("date"));
  const limit = sanitizeLimit(url.searchParams.get("limit"));
  return { symbol, timeframe, date, limit };
}

async function loadMarketRecords(kind, query) {
  await assertDataRootAvailable();
  const fileBase = query.date ? `${query.symbol}_${query.timeframe}_${query.date}` : `${query.symbol}_${query.timeframe}`;
  const candidates = [
    [kind, query.symbol, query.timeframe, query.date || "", "candles.json"].filter(Boolean),
    [kind, query.symbol, query.timeframe, `${query.date || "candles"}.json`],
    [kind, `${fileBase}.json`],
    [kind, `${fileBase}.jsonl`],
    [kind, `${fileBase}.csv`],
    ["history", query.symbol, query.timeframe, query.date || "", "candles.json"].filter(Boolean),
    ["history", `${fileBase}.json`],
    ["history", `${fileBase}.jsonl`],
    ["history", `${fileBase}.csv`],
    [`${fileBase}.json`],
    [`${fileBase}.jsonl`],
    [`${fileBase}.csv`],
  ];
  const records = await readFirstExisting(candidates);
  return filterCandles(records, query.date);
}

async function readFirstExisting(candidates) {
  for (const candidate of candidates) {
    try {
      const filePath = safeResolve(...candidate);
      const content = await fs.readFile(filePath, "utf8");
      return parseDataFile(filePath, content);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return [];
}

function parseDataFile(filePath, content) {
  content = content.replace(/^\uFEFF/, "");
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json") {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.candles)) return parsed.candles;
    if (Array.isArray(parsed.history)) return parsed.history;
    if (Array.isArray(parsed.signals)) return parsed.signals;
    if (Array.isArray(parsed.data)) return parsed.data;
    return [parsed];
  }
  if (ext === ".jsonl") {
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  if (ext === ".csv") return parseCsv(content);
  return [];
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce((record, header, index) => {
      const value = values[index]?.trim() || "";
      const numeric = Number(value);
      record[header] = Number.isFinite(numeric) && value !== "" ? numeric : value;
      return record;
    }, {});
  });
}

function filterCandles(records, date) {
  return records
    .map(normalizeCandle)
    .filter(Boolean)
    .filter((record) => !date || String(record.time).startsWith(date));
}

function normalizeCandle(record) {
  const time = record.time || record.date || record.datetime || record.timestamp;
  const open = Number(record.open ?? record.o);
  const high = Number(record.high ?? record.h);
  const low = Number(record.low ?? record.l);
  const close = Number(record.close ?? record.c);
  const volume = Number(record.volume ?? record.v ?? 0);
  if (!time || ![open, high, low, close].every(Number.isFinite)) return null;
  return { time: new Date(time).toISOString(), open, high, low, close, volume };
}

function limitRecords(records, limit) {
  const safeLimit = limit || 500;
  return records.slice(-safeLimit);
}

async function canAccessDataRoot() {
  try {
    await fs.access(DATA_ROOT);
    return true;
  } catch {
    return false;
  }
}

async function assertDataRootAvailable() {
  if (!(await canAccessDataRoot())) {
    const error = new Error("Data storage unavailable");
    error.statusCode = 503;
    throw error;
  }
}

function safeResolve(...segments) {
  const base = path.resolve(DATA_ROOT);
  const target = path.resolve(base, ...segments);
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) {
    throw new Error("Invalid data request");
  }
  return target;
}

function sanitizeSymbol(value) {
  if (value !== "XAUUSD") throw new Error("Unsupported symbol");
  return value;
}

function normalizeTimeframe(value) {
  if (!ALLOWED_TIMEFRAMES.has(value)) throw new Error("Unsupported timeframe");
  const map = { "240": "H4", "60": "H1", "30": "M30", "15": "M15", "5": "M5", "1": "M1", "30s": "30S" };
  return map[value] || value;
}

function sanitizeDate(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid date");
  return value;
}

function sanitizeLimit(value) {
  if (!value) return null;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new Error("Invalid limit");
  return limit;
}

function sanitizeText(value, maxLength) {
  return String(value || "").replace(/[^\w\s:./-]/g, "").slice(0, maxLength);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sanitizeError(error) {
  if (error.statusCode === 503) return "Data storage unavailable";
  if (["Unsupported symbol", "Unsupported timeframe", "Invalid date", "Invalid limit", "Invalid data request", "Payload too large"].includes(error.message)) {
    return error.message;
  }
  return "Internal server error";
}

function getErrorStatus(error) {
  if (error.statusCode) return error.statusCode;
  if (["Unsupported symbol", "Unsupported timeframe", "Invalid date", "Invalid limit", "Invalid data request", "Payload too large"].includes(error.message)) {
    return 400;
  }
  if (error instanceof SyntaxError) return 400;
  return 500;
}
