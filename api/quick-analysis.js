module.exports = async (request, response) => {
  response.setHeader("Cache-Control", "no-store, max-age=0");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(request).catch(() => ({}));
    const candles = normalizeCandles(body?.candles || []).slice(-220);
    if (candles.length < 30) {
      response.status(200).json(waitDecision([
        "Bougies OHLCV insuffisantes pour une analyse rapide.",
        "TradingView reste visible, mais l'analyse TSR attend un flux exploitable.",
        "Relancer quand /history ou le fallback marche.",
      ]));
      return;
    }

    response.status(200).json(analyzeQuickTsr(candles));
  } catch (error) {
    console.error("Quick TSR analysis failed", error);
    response.status(200).json(waitDecision([
      "Analyse rapide indisponible cote serveur.",
      "Relancer l'analyse dans quelques secondes.",
      "Le graphique live reste prioritaire.",
    ]));
  }
};

function analyzeQuickTsr(candles) {
  const last = candles[candles.length - 1];
  const recent = candles.slice(-36);
  const previous = candles.slice(-28, -1);
  const high = Math.max(...recent.map((candle) => candle.high));
  const low = Math.min(...recent.map((candle) => candle.low));
  const range = Math.max(0.1, high - low);
  const midpoint = low + range * 0.5;
  const avgRange = average(recent.slice(0, -1).map((candle) => candle.high - candle.low));
  const lastRange = Math.max(0.01, last.high - last.low);
  const previousHigh = Math.max(...previous.map((candle) => candle.high));
  const previousLow = Math.min(...previous.map((candle) => candle.low));
  const structure = getStructure(candles);
  const liquidity = getLiquidity(candles, last);
  const blocks = detectOrderBlocks(candles, last);
  const buyBlock = blocks.filter((block) => block.direction === "BUY").sort(rankBlock)[0] || null;
  const sellBlock = blocks.filter((block) => block.direction === "SELL").sort(rankBlock)[0] || null;
  const scan = scanCandle(last, candles[candles.length - 2]);
  const buyScore = scoreSide("BUY", { block: buyBlock, structure, liquidity, scan });
  const sellScore = scoreSide("SELL", { block: sellBlock, structure, liquidity, scan });
  const middleRange = Math.abs(last.close - midpoint) <= range * 0.16;
  const largeImpulse = avgRange > 0 && lastRange >= avgRange * 1.85;

  if (largeImpulse && !buyBlock?.near && !sellBlock?.near) {
    return waitDecision([
      "attendre retracement",
      `Grosse bougie de ${formatDistance(lastRange)} pts, prix loin des zones proches.`,
      "Attendre retest OB/FVG ou liquidite proche.",
    ]);
  }

  if (middleRange && Math.max(buyScore.total, sellScore.total) < 70 && !buyBlock?.near && !sellBlock?.near) {
    return waitDecision([
      "Prix au milieu du range.",
      "Aucune zone OB proche avec rejet clair.",
      "Attendre une zone haute/basse ou un sweep.",
    ]);
  }

  let direction = "ATTENTE";
  let block = null;
  const reasons = [];
  if (sellBlock?.near && (scan.bearishRejection || sellScore.total >= 65)) {
    direction = "SELL";
    block = sellBlock;
    reasons.push(`Prix dans un Order Block vendeur ${block.timeframe}`);
    reasons.push(scan.bearishRejection ? "Rejet sur resistance" : "Pression vendeuse prioritaire");
  } else if (buyBlock?.near && (scan.bullishRejection || buyScore.total >= 65)) {
    direction = "BUY";
    block = buyBlock;
    reasons.push(`Prix dans un Order Block acheteur ${block.timeframe}`);
    reasons.push(scan.bullishRejection ? "Rejet sur support" : "Pression acheteuse prioritaire");
  } else if (last.close > previousHigh && scan.closePosition >= 0.58 && buyScore.total >= 58) {
    direction = "BUY";
    block = buyBlock;
    reasons.push("Resistance cassee et cloture au-dessus");
  } else if (last.close < previousLow && scan.closePosition <= 0.42 && sellScore.total >= 58) {
    direction = "SELL";
    block = sellBlock;
    reasons.push("Support casse et cloture en dessous");
  } else if (sellScore.total >= 65 && sellScore.total >= buyScore.total + 6 && sellBlock) {
    direction = "SELL";
    block = sellBlock;
    reasons.push(`Order Block vendeur ${block.timeframe} le plus proche`);
  } else if (buyScore.total >= 65 && buyScore.total >= sellScore.total + 6 && buyBlock) {
    direction = "BUY";
    block = buyBlock;
    reasons.push(`Order Block acheteur ${block.timeframe} le plus proche`);
  }

  if (direction !== "BUY" && direction !== "SELL") {
    return waitDecision([
      `BUY ${buyScore.total}/100 · SELL ${sellScore.total}/100.`,
      structure.bias === "WAIT" ? "Structure visible en range." : `Structure ${structure.label.toLowerCase()}.`,
      "Attendre rejet, cassure cloturee ou retest OB/FVG.",
    ]);
  }

  if (direction === "BUY") {
    if (liquidity.sellSweep) reasons.push("Liquidite vendeuse balayee");
    if (structure.bias === "BUY") reasons.push("Structure M5/M1 haussiere");
  } else {
    if (liquidity.buySweep) reasons.push("Liquidite acheteuse balayee");
    if (structure.bias === "SELL") reasons.push("Structure M5/M1 baissiere");
  }

  const setup = block ? buildBlockSetup(direction, block, last) : buildBreakoutSetup(direction, last, range);
  return {
    direction,
    label: direction === "BUY" ? "🟢 BUY" : "🔴 SELL",
    ...setup,
    reasons: unique(reasons).slice(0, 3),
  };
}

function detectOrderBlocks(candles, last) {
  const frames = [
    { timeframe: "H1", size: 54, weight: 22 },
    { timeframe: "M15", size: 48, weight: 16 },
    { timeframe: "M5", size: 36, weight: 14 },
    { timeframe: "M1", size: 28, weight: 13 },
  ];
  const blocks = [];
  for (const frame of frames) {
    const segment = candles.slice(-frame.size);
    for (const direction of ["BUY", "SELL"]) {
      for (let index = segment.length - 1; index >= 3 && blocks.length < 24; index -= 1) {
        const current = segment[index];
        const scan = scanCandle(current, segment[index - 1]);
        const impulse = direction === "BUY"
          ? current.close > current.open && scan.bodyRatio >= 0.48 && scan.closePosition >= 0.62
          : current.close < current.open && scan.bodyRatio >= 0.48 && scan.closePosition <= 0.38;
        if (!impulse) continue;
        const search = segment.slice(Math.max(0, index - 8), index);
        const opposite = [...search].reverse().find((candle) => direction === "BUY" ? candle.close < candle.open : candle.close > candle.open);
        if (!opposite) continue;
        blocks.push(createBlock(direction, frame, opposite, last));
        if (frame.timeframe === "M1" || frame.timeframe === "M5") {
          if (blocks.filter((block) => block.timeframe === frame.timeframe && block.direction === direction).length >= 4) break;
        } else {
          break;
        }
      }
    }
  }
  return blocks.filter((block) => !block.broken).sort(rankBlock);
}

function createBlock(direction, frame, candle, last) {
  const height = Math.max(candle.high - candle.low, Math.abs(candle.close - candle.open), 0.35);
  const pad = height * (frame.timeframe === "M1" || frame.timeframe === "M5" ? 0.08 : 0.14);
  const top = Math.max(candle.open, candle.close) + pad;
  const bottom = Math.min(candle.open, candle.close) - pad;
  const distance = zoneDistance(top, bottom, last.close);
  const nearLimit = Math.max(2.5, Math.abs(last.close) * 0.0008, height * 2.2);
  const inside = last.high >= bottom && last.low <= top;
  const reacted = direction === "BUY"
    ? inside && last.close >= last.open
    : inside && last.close <= last.open;
  const broken = direction === "BUY" ? last.close < bottom - height * 0.45 : last.close > top + height * 0.45;
  return {
    direction,
    timeframe: frame.timeframe,
    top,
    bottom,
    distance,
    near: inside || reacted || distance <= nearLimit,
    reacted,
    broken,
    score: frame.weight + (inside ? 28 : distance <= nearLimit ? 18 : 0) + (reacted ? 14 : 0),
  };
}

function buildBlockSetup(direction, block, last) {
  const top = Math.max(block.top, block.bottom);
  const bottom = Math.min(block.top, block.bottom);
  const entry = direction === "BUY" ? Math.min(Math.max(last.close, bottom), top) : Math.max(Math.min(last.close, top), bottom);
  const risk = Math.max(1.2, Math.abs(top - bottom) * 0.85);
  const sign = direction === "BUY" ? 1 : -1;
  const sl = direction === "BUY" ? bottom - risk * 0.55 : top + risk * 0.55;
  const distance = Math.abs(entry - sl);
  return {
    entry: `${formatPrice(bottom)} - ${formatPrice(top)}`,
    sl: formatPrice(sl),
    tp1: formatPrice(entry + sign * distance * 1.25),
    tp2: formatPrice(entry + sign * distance * 1.85),
    tp3: formatPrice(entry + sign * distance * 2.55),
  };
}

function buildBreakoutSetup(direction, last, range) {
  const sign = direction === "BUY" ? 1 : -1;
  const risk = Math.max(1.2, range * 0.08, Math.abs(last.close - last.open) * 0.9);
  const entryLow = direction === "BUY" ? last.close - risk * 0.25 : last.close - risk * 0.05;
  const entryHigh = direction === "BUY" ? last.close + risk * 0.05 : last.close + risk * 0.25;
  return {
    entry: `${formatPrice(Math.min(entryLow, entryHigh))} - ${formatPrice(Math.max(entryLow, entryHigh))}`,
    sl: formatPrice(last.close - sign * risk),
    tp1: formatPrice(last.close + sign * risk * 1.25),
    tp2: formatPrice(last.close + sign * risk * 1.85),
    tp3: formatPrice(last.close + sign * risk * 2.55),
  };
}

function scoreSide(direction, context) {
  let total = 0;
  const { block, structure, liquidity, scan } = context;
  if (block) total += block.timeframe === "H1" ? 25 : block.timeframe === "M15" ? 18 : 14;
  if (block?.near) total += 22;
  if (block?.reacted) total += 18;
  if (structure.bias === direction) total += 20;
  if (direction === "BUY" ? liquidity.sellSweep : liquidity.buySweep) total += 12;
  if (direction === "BUY" ? scan.bullishRejection : scan.bearishRejection) total += 16;
  if (direction === "BUY" ? scan.bullish : scan.bearish) total += 8;
  return { total: clamp(Math.round(total), 0, 100) };
}

function getStructure(candles) {
  const recent = candles.slice(-18);
  const previous = candles.slice(-36, -18);
  const recentHigh = Math.max(...recent.map((candle) => candle.high));
  const recentLow = Math.min(...recent.map((candle) => candle.low));
  const previousHigh = Math.max(...previous.map((candle) => candle.high));
  const previousLow = Math.min(...previous.map((candle) => candle.low));
  if (recentHigh > previousHigh && recentLow > previousLow) return { bias: "BUY", label: "Haussier" };
  if (recentHigh < previousHigh && recentLow < previousLow) return { bias: "SELL", label: "Baissier" };
  return { bias: "WAIT", label: "Range" };
}

function getLiquidity(candles, last) {
  const segment = candles.slice(-80);
  const previousHigh = Math.max(...segment.slice(0, -1).map((candle) => candle.high));
  const previousLow = Math.min(...segment.slice(0, -1).map((candle) => candle.low));
  return {
    buySweep: last.high > previousHigh && last.close < previousHigh,
    sellSweep: last.low < previousLow && last.close > previousLow,
  };
}

function scanCandle(candle) {
  const size = Math.max(0.0001, candle.high - candle.low);
  const body = Math.abs(candle.close - candle.open);
  const upper = candle.high - Math.max(candle.open, candle.close);
  const lower = Math.min(candle.open, candle.close) - candle.low;
  const closePosition = (candle.close - candle.low) / size;
  return {
    bodyRatio: body / size,
    closePosition,
    bullish: candle.close > candle.open && body / size >= 0.4,
    bearish: candle.close < candle.open && body / size >= 0.4,
    bullishRejection: lower / size >= 0.42 && closePosition >= 0.55,
    bearishRejection: upper / size >= 0.42 && closePosition <= 0.45,
  };
}

function waitDecision(reasons) {
  return { direction: "ATTENTE", label: "⏳ ATTENTE", entry: "--", sl: "--", tp1: "--", tp2: "--", tp3: "--", reasons };
}

function normalizeCandles(candles) {
  return candles
    .map((candle) => ({
      time: candle.time,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume) || 0,
    }))
    .filter((candle) => [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite));
}

function readJsonBody(request) {
  if (request.body && typeof request.body === "object") return Promise.resolve(request.body);
  if (typeof request.body === "string") {
    try {
      return Promise.resolve(request.body ? JSON.parse(request.body) : {});
    } catch (error) {
      return Promise.reject(error);
    }
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function rankBlock(a, b) {
  return (b.score - b.distance * 1.6) - (a.score - a.distance * 1.6);
}

function zoneDistance(top, bottom, price) {
  if (price >= bottom && price <= top) return 0;
  return price > top ? price - top : bottom - price;
}

function average(values) {
  const filtered = values.filter(Number.isFinite);
  return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : 0;
}

function formatPrice(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : "--";
}

function formatDistance(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "--";
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
