const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F";

const TIMEFRAME_CONFIG = {
  "30S": { interval: "1m", range: "1d", aggregate: 1 },
  "1": { interval: "1m", range: "1d", aggregate: 1 },
  "5": { interval: "5m", range: "5d", aggregate: 1 },
  "15": { interval: "15m", range: "5d", aggregate: 1 },
  "30": { interval: "30m", range: "5d", aggregate: 1 },
  "60": { interval: "60m", range: "1mo", aggregate: 1 },
  "240": { interval: "60m", range: "1mo", aggregate: 4 },
};

module.exports = async (request, response) => {
  response.setHeader("Cache-Control", "no-store, max-age=0");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const timeframe = String(request.query.timeframe || "15").toUpperCase();
  const limit = clamp(Number(request.query.limit) || 500, 30, 1000);
  const config = TIMEFRAME_CONFIG[timeframe] || TIMEFRAME_CONFIG["15"];
  const url = new URL(YAHOO_CHART_URL);
  url.searchParams.set("range", config.range);
  url.searchParams.set("interval", config.interval);
  url.searchParams.set("includePrePost", "true");

  try {
    const upstream = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 TSR-Gold-Intelligence/1.0",
      },
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      response.status(502).json({ error: "MARKET_FEED_UNAVAILABLE", message: "Flux marché fallback indisponible." });
      return;
    }

    const candles = parseYahooCandles(payload);
    const aggregated = config.aggregate > 1 ? aggregateCandles(candles, config.aggregate) : candles;
    response.status(200).json({
      symbol: "XAUUSD",
      sourceSymbol: "GC=F",
      source: "Yahoo Finance Gold Futures OHLCV fallback",
      timeframe,
      candles: aggregated.slice(-limit),
    });
  } catch (error) {
    console.error("Market history fallback failed", error);
    response.status(503).json({ error: "MARKET_FEED_UNAVAILABLE", message: "Flux marché fallback indisponible." });
  }
};

function parseYahooCandles(payload) {
  const result = payload?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  return timestamps
    .map((timestamp, index) => ({
      time: new Date(timestamp * 1000).toISOString(),
      open: quote.open?.[index],
      high: quote.high?.[index],
      low: quote.low?.[index],
      close: quote.close?.[index],
      volume: quote.volume?.[index] || 0,
    }))
    .filter((candle) => [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite));
}

function aggregateCandles(candles, size) {
  const groups = [];
  for (let index = 0; index < candles.length; index += size) {
    const chunk = candles.slice(index, index + size);
    if (chunk.length < size) continue;
    groups.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((candle) => candle.high)),
      low: Math.min(...chunk.map((candle) => candle.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, candle) => sum + (Number(candle.volume) || 0), 0),
    });
  }
  return groups;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
