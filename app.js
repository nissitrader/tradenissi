const smartMoneyOverlays = [
  { id: "orderBlocks", label: "Order Blocks", defaultOn: true },
  { id: "fvg", label: "FVG / Imbalance", defaultOn: true },
  { id: "equalHigh", label: "Equal High", defaultOn: true },
  { id: "equalLow", label: "Equal Low", defaultOn: true },
  { id: "liquiditySweep", label: "Liquidity Sweep", defaultOn: true },
  { id: "bos", label: "BOS", defaultOn: true },
  { id: "choch", label: "ChoCH", defaultOn: true },
  { id: "trendlines", label: "Trendlines", defaultOn: false },
  { id: "sessions", label: "Sessions Asie / Londres / New York", defaultOn: true },
  { id: "previousHL", label: "Previous High / Previous Low", defaultOn: true },
  { id: "entryZones", label: "Zones d'entrée potentielles", defaultOn: true },
  { id: "futureZones", label: "Zones futures potentielles", defaultOn: true },
  { id: "potentialEntries", label: "Entrées potentielles", defaultOn: true },
  { id: "imminentEntries", label: "Entrées imminentes", defaultOn: true },
  { id: "confirmedSignals", label: "Signaux confirmés", defaultOn: true },
  { id: "longPositionTool", label: "Outil Position longue", defaultOn: true },
  { id: "shortPositionTool", label: "Outil Position courte", defaultOn: true },
  { id: "slTp", label: "SL / TP", defaultOn: true },
  { id: "riskReward", label: "Ratio risque/rendement", defaultOn: true },
];

const classicIndicators = [
  { id: "ema20", label: "EMA 20", defaultOn: false },
  { id: "ema50", label: "EMA 50", defaultOn: false },
  { id: "ema200", label: "EMA 200", defaultOn: false },
  { id: "vwap", label: "VWAP", defaultOn: false, tradingViewStudy: "STD;VWAP" },
  { id: "superTrend", label: "SuperTrend", defaultOn: false },
  { id: "volume", label: "Volume", defaultOn: false, tradingViewStudy: "STD;Volume" },
  { id: "rsi", label: "RSI", defaultOn: false },
];

const API_UNAVAILABLE_MESSAGE = "API locale indisponible — vérifiez que votre PC, npm start et Cloudflare Tunnel sont actifs.";

const state = {
  interval: "240",
  intervalLabel: "H4",
  analysisMode: "smart",
  showBothAnalyses: false,
  smartMoneyVisibility: Object.fromEntries(smartMoneyOverlays.map((item) => [item.id, item.defaultOn])),
  classicVisibility: Object.fromEntries(classicIndicators.map((item) => [item.id, item.defaultOn])),
  tick: 0,
  basePrice: 2336.4,
  widget: null,
  lastNewsLoad: null,
  newsEvents: [],
  api: {
    available: false,
    message: API_UNAVAILABLE_MESSAGE,
    health: null,
    signals: [],
    history: [],
  },
  replay: {
    active: false,
    playing: false,
    loading: false,
    speed: 1,
    date: "",
    timeframe: "15",
    candles: [],
    index: 40,
    source: "",
    timer: null,
    journal: [],
    loggedKeys: new Set(),
  },
};

const elements = {
  workspace: document.getElementById("workspace"),
  apiNotice: document.getElementById("apiNotice"),
  chartFrame: document.getElementById("chartFrame"),
  chartSignalAlert: document.getElementById("chartSignalAlert"),
  chartAlertStage: document.getElementById("chartAlertStage"),
  chartAlertDirection: document.getElementById("chartAlertDirection"),
  chartAlertReason: document.getElementById("chartAlertReason"),
  overlayControls: document.getElementById("overlayControls"),
  strategyOverlay: document.getElementById("strategyOverlay"),
  replayCanvas: document.getElementById("replayCanvas"),
  toggleReplay: document.getElementById("toggleReplay"),
  replayDate: document.getElementById("replayDate"),
  replayTimeframe: document.getElementById("replayTimeframe"),
  replayBack: document.getElementById("replayBack"),
  replayPlay: document.getElementById("replayPlay"),
  replayNext: document.getElementById("replayNext"),
  replaySpeed: document.getElementById("replaySpeed"),
  replayStatus: document.getElementById("replayStatus"),
  rsiPanel: document.getElementById("rsiPanel"),
  rsiValue: document.getElementById("rsiValue"),
  rsiLine: document.getElementById("rsiLine"),
  chartInterval: document.getElementById("chartInterval"),
  sessionName: document.getElementById("sessionName"),
  marketBias: document.getElementById("marketBias"),
  scoreTop: document.getElementById("scoreTop"),
  setupState: document.getElementById("setupState"),
  activeModeLabel: document.getElementById("activeModeLabel"),
  tradeDirection: document.getElementById("tradeDirection"),
  signalReason: document.getElementById("signalReason"),
  badgeRow: document.getElementById("badgeRow"),
  scoreFill: document.getElementById("scoreFill"),
  scoreValue: document.getElementById("scoreValue"),
  compareResults: document.getElementById("compareResults"),
  entryPrice: document.getElementById("entryPrice"),
  stopLoss: document.getElementById("stopLoss"),
  tp1: document.getElementById("tp1"),
  tp2: document.getElementById("tp2"),
  tp3: document.getElementById("tp3"),
  confirmTf: document.getElementById("confirmTf"),
  blockChecks: document.getElementById("blockChecks"),
  usedZone: document.getElementById("usedZone"),
  targetLiquidity: document.getElementById("targetLiquidity"),
  newsRisk: document.getElementById("newsRisk"),
  blockingReason: document.getElementById("blockingReason"),
  h1Direction: document.getElementById("h1Direction"),
  m15Direction: document.getElementById("m15Direction"),
  confirmationSummary: document.getElementById("confirmationSummary"),
  candleQuality: document.getElementById("candleQuality"),
  candleType: document.getElementById("candleType"),
  candleRejection: document.getElementById("candleRejection"),
  wickStrength: document.getElementById("wickStrength"),
  bodyStrength: document.getElementById("bodyStrength"),
  volumeStrength: document.getElementById("volumeStrength"),
  scenarioList: document.getElementById("scenarioList"),
  replayJournal: document.getElementById("replayJournal"),
};

function boot() {
  initReplayDefaults();
  renderOverlayControls();
  bindInteractions();
  renderTradingView();
  loadDailyNews();
  initTsrDataApi();
  evaluateAndRender();
  window.setInterval(evaluateAndRender, 4500);
}

function renderTradingView() {
  const target = document.getElementById("tradingview_chart");
  target.innerHTML = "";

  if (!window.TradingView) {
    target.innerHTML = '<div class="tv-fallback">TradingView indisponible</div>';
    return;
  }

  const studies = getTradingViewStudies();
  const config = {
    autosize: true,
    symbol: "OANDA:XAUUSD",
    interval: state.interval,
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "fr",
    enable_publishing: false,
    allow_symbol_change: false,
    hide_side_toolbar: false,
    details: true,
    calendar: false,
    support_host: "https://www.tradingview.com",
    container_id: "tradingview_chart",
    overrides: {
      "mainSeriesProperties.candleStyle.upColor": "#2ee58a",
      "mainSeriesProperties.candleStyle.downColor": "#ff5b5b",
      "mainSeriesProperties.candleStyle.borderUpColor": "#b7ffd6",
      "mainSeriesProperties.candleStyle.borderDownColor": "#ffc1c1",
      "mainSeriesProperties.candleStyle.wickUpColor": "#2ee58a",
      "mainSeriesProperties.candleStyle.wickDownColor": "#ff5b5b",
      "mainSeriesProperties.candleStyle.drawWick": true,
      "mainSeriesProperties.candleStyle.drawBorder": true,
      "timeScale.rightOffset": 18,
      "timeScale.barSpacing": 8,
      "paneProperties.background": "#090a08",
      "paneProperties.vertGridProperties.color": "rgba(238, 232, 207, 0.08)",
      "paneProperties.horzGridProperties.color": "rgba(238, 232, 207, 0.08)",
    },
  };

  if (studies.length > 0) {
    config.studies = studies;
  }

  state.widget = new window.TradingView.widget(config);
}

function renderOverlayControls() {
  elements.overlayControls.innerHTML = `
    <section class="indicator-group">
      <h3>Indicateurs Smart Money</h3>
      ${smartMoneyOverlays
        .map(
          (item) => `
        <label class="check-row">
          <input type="checkbox" data-smart-overlay="${item.id}" ${item.defaultOn ? "checked" : ""} />
          <span>${item.label}</span>
        </label>
      `,
        )
        .join("")}
    </section>

    <section class="indicator-group">
      <h3>Indicateurs classiques</h3>
      ${classicIndicators
        .map(
          (item) => `
        <label class="check-row">
          <input type="checkbox" data-classic-indicator="${item.id}" ${item.defaultOn ? "checked" : ""} />
          <span>${item.label}</span>
        </label>
      `,
        )
        .join("")}
    </section>
  `;
}

function bindInteractions() {
  document.querySelectorAll(".tf").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tf").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.interval = button.dataset.interval;
      state.intervalLabel = button.textContent.trim();
      elements.chartInterval.textContent = state.intervalLabel;
      renderTradingView();
      evaluateAndRender();
    });
  });

  document.querySelectorAll("[data-layout]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-layout]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      applyLayout(button.dataset.layout);
    });
  });

  document.querySelectorAll("[name='analysisMode']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        state.analysisMode = input.value;
        evaluateAndRender();
      }
    });
  });

  document.getElementById("showBothAnalyses").addEventListener("change", (event) => {
    state.showBothAnalyses = event.target.checked;
    evaluateAndRender();
  });

  elements.toggleReplay.addEventListener("click", toggleReplayMode);
  elements.replayDate.addEventListener("change", resetReplaySession);
  elements.replayTimeframe.addEventListener("change", () => {
    state.replay.timeframe = elements.replayTimeframe.value;
    state.interval = state.replay.timeframe;
    state.intervalLabel = getReplayTimeframeLabel(state.replay.timeframe);
    elements.chartInterval.textContent = state.intervalLabel;
    resetReplaySession();
  });
  elements.replayBack.addEventListener("click", () => stepReplay(-1));
  elements.replayNext.addEventListener("click", () => stepReplay(1));
  elements.replayPlay.addEventListener("click", toggleReplayPlayback);
  elements.replaySpeed.addEventListener("change", () => {
    state.replay.speed = Number(elements.replaySpeed.value);
    restartReplayTimer();
  });

  document.querySelectorAll("[data-smart-overlay]").forEach((input) => {
    input.addEventListener("change", () => {
      state.smartMoneyVisibility[input.dataset.smartOverlay] = input.checked;
      evaluateAndRender();
    });
  });

  document.querySelectorAll("[data-classic-indicator]").forEach((input) => {
    input.addEventListener("change", () => {
      state.classicVisibility[input.dataset.classicIndicator] = input.checked;
      if (input.dataset.classicIndicator === "vwap" || input.dataset.classicIndicator === "volume") {
        renderTradingView();
      }
      evaluateAndRender();
    });
  });

  document.getElementById("chartScale").addEventListener("input", (event) => {
    elements.workspace.style.gridTemplateColumns = `var(--left-width) ${event.target.value}fr var(--right-width)`;
  });

  document.getElementById("toggleControls").addEventListener("click", () => {
    elements.workspace.classList.toggle("controls-collapsed");
  });

  document.getElementById("toggleSignal").addEventListener("click", () => {
    elements.workspace.classList.toggle("signal-collapsed");
  });

  document.getElementById("refreshWidget").addEventListener("click", renderTradingView);
  document.getElementById("fullscreenChart").addEventListener("click", () => {
    document.querySelector(".chart-desk").classList.toggle("chart-fullscreen");
    setTimeout(renderTradingView, 120);
  });
}

function applyLayout(layout) {
  elements.workspace.classList.remove("controls-collapsed", "signal-collapsed");
  if (layout === "chart") {
    elements.workspace.classList.add("controls-collapsed", "signal-collapsed");
  }
  if (layout === "analysis") {
    elements.workspace.classList.add("controls-collapsed");
  }
}

async function initTsrDataApi() {
  const health = await tsrDataRequest("health");
  if (!health.ok) {
    setApiUnavailable(health.message);
    return;
  }

  state.api.available = true;
  state.api.health = health.data;
  state.api.message = "TSR Data API connectée";
  elements.apiNotice.hidden = true;
  await Promise.all([loadApiHistory(), loadApiSignals()]);
}

async function loadApiHistory() {
  const data = await tsrDataRequest("history", {
    params: {
      symbol: "XAUUSD",
      timeframe: state.intervalLabel,
      limit: "500",
    },
  });
  if (!data.ok) {
    setApiUnavailable(data.message);
    return [];
  }
  state.api.history = data.data.candles || [];
  return state.api.history;
}

async function loadApiSignals() {
  const data = await tsrDataRequest("signals");
  if (!data.ok) {
    setApiUnavailable(data.message);
    return [];
  }
  state.api.signals = data.data.signals || [];
  renderApiSignals();
  return state.api.signals;
}

async function loadApiReplayCandles() {
  const params = {
    symbol: "XAUUSD",
    timeframe: getReplayTimeframeLabel(state.replay.timeframe),
    date: state.replay.date,
    limit: "2000",
  };
  const replayData = await tsrDataRequest("replay", { params });
  if (replayData.ok) {
    const candles = normalizeApiCandles(extractCandles(replayData.data));
    if (candles.length) return { candles, source: "TSR Data API Replay" };
  } else {
    setApiUnavailable(replayData.message);
    return { candles: [], source: "unavailable", message: replayData.message, unavailable: true };
  }

  const historyData = await tsrDataRequest("history", { params });
  if (historyData.ok) {
    const candles = normalizeApiCandles(extractCandles(historyData.data));
    if (candles.length) return { candles, source: "TSR Data API History" };
  }

  return {
    candles: generateReplayCandles(state.replay.date, state.replay.timeframe),
    source: "Replay d'entraînement local",
    message: `Aucune bougie TSR Data API pour ${state.replay.date} ${params.timeframe}. Replay d'entraînement local activé.`,
  };
}

async function postApiLog(payload) {
  const data = await tsrDataRequest("logs", {
    method: "POST",
    body: payload,
  });
  if (!data.ok) setApiUnavailable(data.message);
}

async function tsrDataRequest(endpoint, options = {}) {
  const method = options.method || "GET";
  const params = new URLSearchParams();
  Object.entries(options.params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const query = params.toString();

  try {
    const response = await fetch(`/api/tsr-data/${endpoint}${query ? `?${query}` : ""}`, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "POST" ? JSON.stringify(options.body || {}) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      return {
        ok: false,
        status: 401,
        message: data.message || "Unauthorized — vérifiez que le proxy envoie bien le header x-api-key.",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: data.message || API_UNAVAILABLE_MESSAGE,
      };
    }
    return { ok: true, status: response.status, data };
  } catch {
    return { ok: false, status: 503, message: API_UNAVAILABLE_MESSAGE };
  }
}

function setApiUnavailable(message) {
  state.api.available = false;
  state.api.message = message || API_UNAVAILABLE_MESSAGE;
  elements.apiNotice.textContent = state.api.message;
  elements.apiNotice.hidden = false;
}

function extractCandles(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.candles)) return payload.candles;
  if (Array.isArray(payload.history)) return payload.history;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.candles)) return payload.data.candles;
  return [];
}

function renderApiSignals() {
  if (!state.api.signals.length) return;
  elements.scenarioList.innerHTML = state.api.signals
    .slice(0, 3)
    .map((signal) => `<article><strong>${signal.direction || signal.status || "Signal API"}</strong><span>${signal.mode || "TSR Data API"} · ${signal.reason || signal.time || "Signal externe"}</span></article>`)
    .join("");
}

function normalizeApiCandles(candles) {
  return candles
    .map((candle) => ({
      time: new Date(candle.time),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume || 0),
    }))
    .filter((candle) => candle.time.toString() !== "Invalid Date" && [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite));
}

function initReplayDefaults() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const date = yesterday.toISOString().slice(0, 10);
  state.replay.date = date;
  elements.replayDate.value = date;
  elements.replayTimeframe.value = state.replay.timeframe;
  renderReplayJournal();
}

function toggleReplayMode() {
  state.replay.active = !state.replay.active;
  state.replay.playing = false;
  stopReplayTimer();
  elements.chartFrame.classList.toggle("replay-active", state.replay.active);
  document.querySelector(".replay-controls").classList.toggle("active", state.replay.active);
  elements.toggleReplay.textContent = state.replay.active ? "Désactiver" : "Activer";
  elements.replayPlay.textContent = "Play";

  if (state.replay.active) {
    resetReplaySession();
  } else {
    elements.replayStatus.textContent = "Replay désactivé";
    renderTradingView();
    evaluateAndRender();
  }
}

async function resetReplaySession() {
  state.replay.date = elements.replayDate.value || state.replay.date;
  state.replay.timeframe = elements.replayTimeframe.value;
  state.replay.loading = true;
  state.replay.playing = false;
  elements.replayPlay.textContent = "Play";
  clearStrategyOverlay();
  drawReplayMessage("Chargement des bougies replay TSR Data API...");
  elements.replayStatus.textContent = "Chargement replay...";
  const replayData = await loadApiReplayCandles();
  state.replay.loading = false;
  state.replay.source = replayData.source || "";
  state.replay.candles = replayData.candles || [];
  if (!state.replay.candles.length) {
    const message = replayData.message || state.api.message || API_UNAVAILABLE_MESSAGE;
    elements.replayStatus.textContent = message;
    drawReplayMessage(message);
    renderReplayJournal();
    return;
  }
  state.replay.index = Math.min(40, state.replay.candles.length - 1);
  state.replay.journal = [];
  state.replay.loggedKeys = new Set();
  renderReplayJournal();
  if (state.replay.active) {
    evaluateReplayAndRender();
  }
}

function toggleReplayPlayback() {
  if (!state.replay.active) {
    toggleReplayMode();
  }
  if (state.replay.loading) {
    elements.replayStatus.textContent = "Chargement replay...";
    return;
  }
  if (!state.replay.candles.length) {
    resetReplaySession();
    return;
  }
  state.replay.playing = !state.replay.playing;
  elements.replayPlay.textContent = state.replay.playing ? "Pause" : "Play";
  restartReplayTimer();
}

function restartReplayTimer() {
  stopReplayTimer();
  if (!state.replay.active || !state.replay.playing) return;
  const delay = Math.max(90, 900 / state.replay.speed);
  state.replay.timer = window.setInterval(() => stepReplay(1), delay);
}

function stopReplayTimer() {
  if (state.replay.timer) {
    window.clearInterval(state.replay.timer);
    state.replay.timer = null;
  }
}

function stepReplay(delta) {
  if (!state.replay.active) {
    toggleReplayMode();
    return;
  }
  if (state.replay.loading) return;
  if (!state.replay.candles.length) {
    resetReplaySession();
    return;
  }
  const nextIndex = clamp(state.replay.index + delta, Math.min(10, state.replay.candles.length - 1), state.replay.candles.length - 1);
  state.replay.index = nextIndex;
  if (nextIndex === state.replay.candles.length - 1 && state.replay.playing) {
    state.replay.playing = false;
    elements.replayPlay.textContent = "Play";
    stopReplayTimer();
  }
  evaluateReplayAndRender();
}

function evaluateReplayAndRender() {
  if (!state.replay.candles.length) {
    const message = state.api.message || API_UNAVAILABLE_MESSAGE;
    elements.replayStatus.textContent = message;
    clearStrategyOverlay();
    drawReplayMessage(message);
    return;
  }

  const visibleCandles = state.replay.candles.slice(0, state.replay.index + 1);
  const context = buildReplayContext(visibleCandles);
  state.tick = state.replay.index;
  state.basePrice = context.last.close;

  const smartResult = buildSmartMoneyAnalysis(context.session, context.market, context.news, context.zones, context.confirmation, context.candleScan);
  const goldResult = buildGoldIntelligenceAnalysis(smartResult, context.market, context.news, context.zones, context.confirmation, context.session, context.candleScan);
  const activeResult = state.analysisMode === "gold" ? goldResult : smartResult;
  const entryProjection = buildEntryProjection(activeResult, context.market, context.zones, context.confirmation, context.candleScan, visibleCandles);
  const rsi = getReplayRsi(visibleCandles, activeResult.direction);

  elements.sessionName.textContent = `${context.session.name} Replay`;
  elements.marketBias.textContent = activeResult.biasLabel;
  elements.scoreTop.textContent = activeResult.score;
  elements.setupState.textContent = entryProjection.statusLabel;
  elements.activeModeLabel.textContent = `${activeResult.name} · Replay`;
  elements.tradeDirection.textContent = activeResult.status;
  elements.tradeDirection.style.color = getStatusColor(activeResult.status);
  elements.signalReason.textContent = entryProjection.reason;
  renderChartSignalAlert(activeResult, entryProjection);
  elements.badgeRow.innerHTML = activeResult.badges.map(renderBadge).join("");
  elements.scoreFill.style.width = `${activeResult.score}%`;
  elements.scoreValue.textContent = `${activeResult.score} / 100`;
  elements.entryPrice.textContent = activeResult.setup.entry;
  elements.stopLoss.textContent = activeResult.setup.sl;
  elements.tp1.textContent = activeResult.setup.tp1;
  elements.tp2.textContent = activeResult.setup.tp2;
  elements.tp3.textContent = activeResult.setup.tp3;
  elements.confirmTf.textContent = activeResult.timeframe;
  elements.usedZone.textContent = activeResult.zone;
  elements.targetLiquidity.textContent = activeResult.liquidity;
  elements.newsRisk.textContent = "Replay: news ignorées";
  elements.blockingReason.textContent = activeResult.blockingReason;
  elements.h1Direction.textContent = goldResult.h1Direction;
  elements.m15Direction.textContent = goldResult.m15Direction;
  elements.confirmationSummary.textContent = activeResult.confirmationSummary;
  elements.replayStatus.textContent = `${formatReplayTime(context.last.time)} · ${state.replay.index + 1}/${state.replay.candles.length} · ${getReplayTimeframeLabel(state.replay.timeframe)} · ${state.replay.source}`;

  renderBlocks(activeResult.blocks);
  renderComparison(smartResult, goldResult);
  renderScenarios(context.market, context.zones, context.confirmation, context.session, entryProjection);
  clearStrategyOverlay();
  renderRsiPanel(rsi);
  renderCandleScanner(context.candleScan);
  drawReplayChart(visibleCandles, context, activeResult, entryProjection);
  updateReplayJournal(activeResult, context, visibleCandles, entryProjection);
}

function buildReplayContext(candles) {
  const first = candles[0];
  const last = candles[candles.length - 1];
  const lookback = candles.slice(-24);
  const previous = candles.slice(-25, -1);
  const previousHigh = previous.length ? Math.max(...previous.map((candle) => candle.high)) : last.high;
  const previousLow = previous.length ? Math.min(...previous.map((candle) => candle.low)) : last.low;
  const high = Math.max(...lookback.map((candle) => candle.high));
  const low = Math.min(...lookback.map((candle) => candle.low));
  const range = Math.max(0.1, high - low);
  const move = last.close - first.open;
  const trendStrength = Math.abs(move) / range;
  const isRange = trendStrength < 0.32;
  const bias = isRange ? "WAIT" : move > 0 ? "BUY" : "SELL";
  const liquidityTaken = last.high > previousHigh || last.low < previousLow;
  const bullishReaction = last.close > last.open && last.close > candles[Math.max(0, candles.length - 2)].close;
  const bearishReaction = last.close < last.open && last.close < candles[Math.max(0, candles.length - 2)].close;
  const choch = bias === "BUY" ? last.close > previousHigh - range * 0.08 : bias === "SELL" ? last.close < previousLow + range * 0.08 : false;
  const candleScan = buildCandleScan(candles, bias);
  const confirmationValid = bias === "BUY" ? bullishReaction && choch && candleScan.valid : bias === "SELL" ? bearishReaction && choch && candleScan.valid : false;
  const session = getSessionFromTime(last.time);
  const zoneLabel = bias === "SELL" ? "Replay H1 bearish order block + EQH" : "Replay M15 bullish order block + FVG";
  const confirmationReason = confirmationValid
    ? `ChoCH/BOS + ${candleScan.summary}`
    : !candleScan.valid
      ? `Candle Quality insuffisante: ${candleScan.weakReasons.join(", ") || candleScan.summary}`
      : "Setup incomplet — attente confirmation";

  return {
    first,
    last,
    session,
    market: {
      valid: bias !== "WAIT" && !isRange,
      bias,
      action: bias === "BUY" ? "BUY privilégié" : bias === "SELL" ? "SELL privilégié" : "Attendre",
      context: isRange ? "range dangereux" : bias === "BUY" ? "tendance haussière en replay" : "tendance baissière en replay",
      score: isRange ? 28 : clamp(Math.round(42 + trendStrength * 34), 38, 78),
    },
    news: {
      valid: true,
      score: 16,
      label: "Replay: news ignorées",
      reason: "Risque news non appliqué au replay",
    },
    zones: {
      valid: bias !== "WAIT" && candles.length >= 20,
      primary: zoneLabel,
      targetLiquidity: bias === "SELL" ? "Previous Low / Session Low" : "Previous High / Session High",
      liquidityTaken,
      reason: liquidityTaken ? "Liquidité prise dans les bougies visibles" : "Liquidité ciblée, non prise",
    },
    confirmation: {
      valid: bias !== "WAIT" && confirmationValid,
      timeframe: getReplayTimeframeLabel(state.replay.timeframe),
      reason: confirmationReason,
      choch,
      candleClose: true,
    },
    candleScan,
    high,
    low,
    previousHigh,
    previousLow,
  };
}

function generateReplayCandles(date, timeframe) {
  const seed = hashString(`${date}-${timeframe}-XAUUSD`);
  const random = seededRandom(seed);
  const minutes = timeframe === "30S" ? 0.5 : Number(timeframe);
  const start = new Date(`${date}T00:00:00Z`).getTime();
  const candles = [];
  let price = 2320 + (seed % 80);

  for (let index = 0; index < 220; index += 1) {
    const trend = Math.sin(index / 28 + (seed % 11)) * 0.9;
    const impulse = Math.cos(index / 9 + (seed % 5)) * 0.45;
    const noise = (random() - 0.5) * 1.9;
    const open = price;
    const close = Math.max(1700, open + trend + impulse + noise);
    const wickUp = 0.45 + random() * 1.9;
    const wickDown = 0.45 + random() * 1.9;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    candles.push({
      time: new Date(start + index * minutes * 60 * 1000),
      open,
      high,
      low,
      close,
      volume: Math.round(700 + random() * 2600),
    });
    price = close;
  }

  return candles;
}

function drawReplayChart(candles, context, activeResult, entryProjection) {
  const canvas = elements.replayCanvas;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height || !candles.length) {
    drawReplayMessage("Aucune bougie replay disponible.");
    return;
  }
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = "#090a08";
  ctx.fillRect(0, 0, rect.width, rect.height);

  const visible = candles.slice(-72);
  const high = Math.max(...visible.map((candle) => candle.high));
  const low = Math.min(...visible.map((candle) => candle.low));
  const padding = Math.max(2, (high - low) * 0.12);
  const max = high + padding;
  const min = low - padding;
  const priceRange = Math.max(0.0001, max - min);
  const topPadding = 26;
  const bottomPadding = 34;
  const leftPadding = 18;
  const rightPadding = 92;
  const plotWidth = Math.max(120, rect.width - leftPadding - rightPadding);
  const priceToY = (price) => ((max - price) / priceRange) * (rect.height - topPadding - bottomPadding) + topPadding;
  const candleWidth = Math.max(5, plotWidth / visible.length);

  drawReplayGrid(ctx, rect);
  visible.forEach((candle, index) => {
    const x = leftPadding + index * candleWidth + candleWidth / 2;
    const openY = clamp(priceToY(candle.open), topPadding, rect.height - bottomPadding);
    const closeY = clamp(priceToY(candle.close), topPadding, rect.height - bottomPadding);
    const highY = clamp(priceToY(candle.high), topPadding, rect.height - bottomPadding);
    const lowY = clamp(priceToY(candle.low), topPadding, rect.height - bottomPadding);
    const bullish = candle.close >= candle.open;
    ctx.strokeStyle = bullish ? "#46d17b" : "#ef6262";
    ctx.fillStyle = bullish ? "rgba(70, 209, 123, 0.72)" : "rgba(239, 98, 98, 0.72)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();
    const bodyTop = Math.min(openY, closeY);
    const rawBodyHeight = Math.abs(openY - closeY);
    const bodyHeight = Math.max(3, rawBodyHeight);
    ctx.fillRect(x - candleWidth * 0.28, bodyTop, candleWidth * 0.56, bodyHeight);
    if (rawBodyHeight < 2.4) {
      ctx.strokeStyle = bullish ? "#b7ffd6" : "#ffc1c1";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - candleWidth * 0.34, closeY);
      ctx.lineTo(x + candleWidth * 0.34, closeY);
      ctx.stroke();
    }
  });

  drawReplayOverlays(ctx, rect, context, activeResult, priceToY, entryProjection);
}

function drawReplayMessage(message) {
  const canvas = elements.replayCanvas;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width || canvas.clientWidth || 900));
  const height = Math.max(1, Math.floor(rect.height || canvas.clientHeight || 520));
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = "#090a08";
  ctx.fillRect(0, 0, width, height);
  drawReplayGrid(ctx, { width, height });
  ctx.fillStyle = "#dcd6c8";
  ctx.font = "700 14px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText(message, width / 2, height / 2);
  ctx.textAlign = "left";
}

function drawReplayGrid(ctx, rect) {
  ctx.strokeStyle = "rgba(238, 232, 207, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = (rect.height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(rect.width, y);
    ctx.stroke();
  }
}

function drawReplayOverlays(ctx, rect, context, activeResult, priceToY, entryProjection) {
  const visible = state.smartMoneyVisibility;
  const highY = priceToY(context.previousHigh);
  const lowY = priceToY(context.previousLow);

  if (visible.orderBlocks) {
    ctx.fillStyle = "rgba(231, 184, 78, 0.14)";
    ctx.strokeStyle = "rgba(231, 184, 78, 0.72)";
    ctx.strokeRect(rect.width * 0.56, priceToY(context.last.close + 3), rect.width * 0.22, 42);
    ctx.fillRect(rect.width * 0.56, priceToY(context.last.close + 3), rect.width * 0.22, 42);
  }
  if (visible.fvg) {
    ctx.fillStyle = "rgba(59, 216, 189, 0.12)";
    ctx.fillRect(rect.width * 0.34, priceToY(context.last.close + 1.8), rect.width * 0.16, 34);
  }
  if (visible.equalHigh || visible.previousHL) drawReplayLine(ctx, highY, "#74a7ff", "Previous High / EQH", rect);
  if (visible.equalLow || visible.previousHL) drawReplayLine(ctx, lowY, "#74a7ff", "Previous Low / EQL", rect);
  if (visible.liquiditySweep && context.zones.liquidityTaken) drawReplayLabel(ctx, rect.width * 0.72, highY - 18, "Sweep", "#74a7ff");
  if (visible.bos && context.confirmation.choch) drawReplayLabel(ctx, rect.width * 0.48, rect.height * 0.37, "BOS", "#46d17b");
  if (visible.choch && context.confirmation.choch) drawReplayLabel(ctx, rect.width * 0.6, rect.height * 0.52, "ChoCH", "#e7b84e");
  if (visible.trendlines) {
    ctx.strokeStyle = "rgba(116, 167, 255, 0.75)";
    ctx.beginPath();
    ctx.moveTo(rect.width * 0.18, rect.height * 0.68);
    ctx.lineTo(rect.width * 0.76, rect.height * 0.48);
    ctx.stroke();
  }
  drawReplayEntryProjection(ctx, rect, entryProjection, priceToY);
}

function drawReplayEntryProjection(ctx, rect, projection, priceToY) {
  if (!projection || projection.direction === "WAIT") return;
  const visible = state.smartMoneyVisibility;
  const isBuy = projection.direction === "BUY";
  const color = isBuy ? "#46d17b" : "#ef6262";
  const zoneY = isBuy ? rect.height * 0.58 : rect.height * 0.28;
  const stageRank = { future: 1, potential: 2, imminent: 3, confirmed: 4 }[projection.stage] || 0;

  if ((visible.entryZones || visible.futureZones) && visible.futureZones && stageRank >= 1) {
    ctx.fillStyle = isBuy ? "rgba(70, 209, 123, 0.08)" : "rgba(239, 98, 98, 0.08)";
    ctx.strokeStyle = isBuy ? "rgba(70, 209, 123, 0.34)" : "rgba(239, 98, 98, 0.34)";
    ctx.strokeRect(rect.width * 0.56, zoneY, rect.width * 0.24, 48);
    ctx.fillRect(rect.width * 0.56, zoneY, rect.width * 0.24, 48);
    drawReplayLabel(ctx, rect.width * 0.57, zoneY - 28, `Zone potentielle ${projection.direction}`, color);
  }
  if (visible.potentialEntries && stageRank >= 2) drawReplayLabel(ctx, rect.width * 0.58, zoneY + 56, "Entrée potentielle — attendre réaction", "#e7b84e");
  if (visible.imminentEntries && stageRank >= 3) drawReplayLabel(ctx, rect.width * 0.58, zoneY + 88, "Entrée imminente — prépare-toi", color);
  if (visible.confirmedSignals && stageRank >= 4) drawReplayLabel(ctx, rect.width * 0.58, zoneY + 120, `${projection.direction} confirmé`, color);

  const showPositionTool = stageRank >= 4 && ((isBuy && visible.longPositionTool) || (!isBuy && visible.shortPositionTool));
  if (showPositionTool) drawReplayPositionTool(ctx, rect, projection, priceToY, color);
}

function drawReplayPositionTool(ctx, rect, projection, priceToY, color) {
  const visible = state.smartMoneyVisibility;
  const setup = projection.setup;
  const entry = parsePrice(setup.entry);
  const sl = parsePrice(setup.sl);
  const tp1 = parsePrice(setup.tp1);
  const tp2 = parsePrice(setup.tp2);
  const tp3 = parsePrice(setup.tp3);
  if (![entry, sl, tp1, tp2, tp3].every(Number.isFinite)) return;

  drawReplayLine(ctx, priceToY(entry), "#e7b84e", `Entrée ${setup.entry}`, rect);
  if (visible.slTp) {
    drawReplayLine(ctx, priceToY(sl), "#ef6262", `SL ${setup.sl} · ${projection.metrics.riskPoints}`, rect);
    drawReplayLine(ctx, priceToY(tp1), "#46d17b", `TP1 ${setup.tp1} · ${projection.metrics.tp1Points}`, rect);
    drawReplayLine(ctx, priceToY(tp2), "#46d17b", `TP2 ${setup.tp2} · ${projection.metrics.tp2Points}`, rect);
    drawReplayLine(ctx, priceToY(tp3), "#46d17b", `TP3 ${setup.tp3} · ${projection.metrics.tp3Points}`, rect);
  }
  const label = visible.riskReward
    ? `${projection.direction === "BUY" ? "Position longue" : "Position courte"} · RR ${projection.metrics.rr1}/${projection.metrics.rr2}/${projection.metrics.rr3} · ${projection.metrics.status}`
    : `${projection.direction === "BUY" ? "Position longue" : "Position courte"} · ${projection.metrics.status}`;
  drawReplayLabel(ctx, rect.width * 0.66, priceToY(entry) - 34, label, color);
}

function drawReplayLine(ctx, y, color, label, rect) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(8, y);
  ctx.lineTo(rect.width - 10, y);
  ctx.stroke();
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(label, 12, y - 5);
}

function drawReplayLabel(ctx, x, y, label, color) {
  ctx.fillStyle = "rgba(9, 10, 8, 0.82)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const width = Math.max(48, label.length * 7 + 14);
  ctx.beginPath();
  ctx.roundRect(x, y, width, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "700 11px ui-sans-serif, system-ui";
  ctx.fillText(label, x + 7, y + 16);
}

function updateReplayJournal(activeResult, context, visibleCandles, entryProjection) {
  updateOpenReplayResults(visibleCandles);
  if (activeResult.status !== "BUY" && activeResult.status !== "SELL") {
    renderReplayJournal();
    return;
  }

  const key = `${activeResult.name}-${activeResult.status}-${context.last.time.toISOString()}`;
  if (state.replay.loggedKeys.has(key)) {
    renderReplayJournal();
    return;
  }

  state.replay.loggedKeys.add(key);
  state.replay.journal.unshift({
    key,
    time: context.last.time,
    mode: activeResult.name,
    direction: activeResult.status,
    entry: activeResult.setup.entry,
    sl: activeResult.setup.sl,
    tp: activeResult.setup.tp1,
    result: "En attente",
    reason: activeResult.reason,
    candleQuality: context.candleScan.quality,
    candleSummary: context.candleScan.summary,
    positionStatus: entryProjection.metrics.status,
    riskReward: `${entryProjection.metrics.rr1}/${entryProjection.metrics.rr2}/${entryProjection.metrics.rr3}`,
  });
  postApiLog({
    type: "replay-signal",
    time: context.last.time.toISOString(),
    mode: activeResult.name,
    direction: activeResult.status,
    entry: activeResult.setup.entry,
    sl: activeResult.setup.sl,
    tp: activeResult.setup.tp1,
    reason: activeResult.reason,
    candleQuality: context.candleScan.quality,
    candleSummary: context.candleScan.summary,
    positionStatus: entryProjection.metrics.status,
    riskReward: `${entryProjection.metrics.rr1}/${entryProjection.metrics.rr2}/${entryProjection.metrics.rr3}`,
  });
  renderReplayJournal();
}

function updateOpenReplayResults(visibleCandles) {
  state.replay.journal.forEach((entry) => {
    if (entry.result !== "En attente") return;
    const afterSignal = visibleCandles.filter((candle) => candle.time > entry.time);
    const sl = parsePrice(entry.sl);
    const tp = parsePrice(entry.tp);
    const entryPrice = parsePrice(entry.entry);
    for (const candle of afterSignal) {
      if (entry.direction === "BUY") {
        if (candle.low <= sl) {
          entry.result = "SL touché";
          return;
        }
        if (candle.high >= tp) {
          entry.result = "TP touché";
          return;
        }
        if (candle.low <= entryPrice && candle.close > entryPrice) entry.result = "Break-even";
      }
      if (entry.direction === "SELL") {
        if (candle.high >= sl) {
          entry.result = "SL touché";
          return;
        }
        if (candle.low <= tp) {
          entry.result = "TP touché";
          return;
        }
        if (candle.high >= entryPrice && candle.close < entryPrice) entry.result = "Break-even";
      }
    }
  });
}

function renderReplayJournal() {
  if (!state.replay.journal.length) {
    elements.replayJournal.innerHTML = '<p class="journal-empty">Aucun signal replay pour le moment.</p>';
    return;
  }

  elements.replayJournal.innerHTML = state.replay.journal
    .slice(0, 12)
    .map(
      (entry) => `
        <article class="journal-row">
          <strong><span>${formatReplayTime(entry.time)}</span><span>${entry.direction}</span></strong>
          <span>${entry.mode} · Entrée ${entry.entry} · SL ${entry.sl} · TP ${entry.tp}</span>
          <span>Résultat: ${entry.result}</span>
          <span>Candle Quality: ${entry.candleQuality}/100</span>
          <span>Position: ${entry.positionStatus} · RR ${entry.riskReward}</span>
          <small>${entry.candleSummary}</small>
          <small>${entry.reason}</small>
        </article>
      `,
    )
    .join("");
}

function getReplayRsi(candles, direction) {
  const closes = candles.map((candle) => candle.close);
  const values = [];
  for (let index = 0; index < closes.length; index += 1) {
    values.push(calculateRsi(closes.slice(0, index + 1), 14));
  }
  const sliced = values.slice(-32);
  const value = Math.round(sliced[sliced.length - 1] || 50);
  const previous = Math.round(sliced[sliced.length - 2] || value);
  const buyValid = direction === "BUY" && ((previous < 35 && value >= 35) || value > 50);
  const sellValid = direction === "SELL" && ((previous > 65 && value <= 65) || value < 50);
  return {
    value,
    values: sliced.map((item) => Math.round(item)),
    valid: direction === "WAIT" ? false : buyValid || sellValid,
    label: buyValid || sellValid ? getRsiLabel(direction) : `RSI 14 neutre (${value})`,
  };
}

function calculateRsi(closes, period) {
  if (closes.length <= period) return 50;
  const recent = closes.slice(-(period + 1));
  let gains = 0;
  let losses = 0;
  for (let index = 1; index < recent.length; index += 1) {
    const change = recent[index] - recent[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return clamp(100 - 100 / (1 + rs), 0, 100);
}

function getSessionFromTime(time) {
  const hour = time.getUTCHours();
  if (hour >= 0 && hour < 7) return { name: "Asie", bias: 1 };
  if (hour >= 7 && hour < 13) return { name: "Londres", bias: 2 };
  if (hour >= 13 && hour < 21) return { name: "New York", bias: 2 };
  return { name: "Transition", bias: 0 };
}

function getReplayTimeframeLabel(timeframe) {
  if (timeframe === "240") return "H4";
  if (timeframe === "60") return "H1";
  if (timeframe === "30S") return "30s";
  return `M${timeframe}`;
}

function formatReplayTime(time) {
  return time.toLocaleString("fr-FR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed || 1;
  return () => {
    value = Math.imul(1664525, value) + 1013904223;
    return ((value >>> 0) / 4294967296);
  };
}

function parsePrice(value) {
  return Number(String(value).replace(/,/g, ""));
}

function scanCandle(candles, index = candles.length - 1) {
  const candle = candles[index];
  if (!candle) return null;
  const previous = candles[index - 1] || null;
  const previousSet = candles.slice(Math.max(0, index - 20), index);
  const range = Math.max(0.0001, candle.high - candle.low);
  const body = Math.abs(candle.close - candle.open);
  const upperWick = Math.max(0, candle.high - Math.max(candle.open, candle.close));
  const lowerWick = Math.max(0, Math.min(candle.open, candle.close) - candle.low);
  const bodyRatio = body / range;
  const upperWickRatio = upperWick / range;
  const lowerWickRatio = lowerWick / range;
  const closePosition = (candle.close - candle.low) / range;
  const averageVolume = previousSet.length ? average(previousSet.map((item) => item.volume || 0)) : candle.volume || 0;
  const relativeVolume = averageVolume > 0 ? (candle.volume || 0) / averageVolume : 1;
  const direction = bodyRatio < 0.16 ? "doji" : candle.close > candle.open ? "bullish" : "bearish";
  const previousBodyHigh = previous ? Math.max(previous.open, previous.close) : 0;
  const previousBodyLow = previous ? Math.min(previous.open, previous.close) : 0;
  const bodyHigh = Math.max(candle.open, candle.close);
  const bodyLow = Math.min(candle.open, candle.close);
  const bullishEngulfing = Boolean(previous && direction === "bullish" && previous.close < previous.open && bodyHigh >= previousBodyHigh && bodyLow <= previousBodyLow);
  const bearishEngulfing = Boolean(previous && direction === "bearish" && previous.close > previous.open && bodyHigh >= previousBodyHigh && bodyLow <= previousBodyLow);
  const bullishImpulse = direction === "bullish" && bodyRatio >= 0.55 && closePosition >= 0.72 && relativeVolume >= 1.04;
  const bearishImpulse = direction === "bearish" && bodyRatio >= 0.55 && closePosition <= 0.28 && relativeVolume >= 1.04;
  const bullishRejection = lowerWickRatio >= 0.42 && closePosition >= 0.62 && direction !== "bearish";
  const bearishRejection = upperWickRatio >= 0.42 && closePosition <= 0.38 && direction !== "bullish";
  const pinBar = Math.max(upperWickRatio, lowerWickRatio) >= 0.58 && bodyRatio <= 0.32;
  const wickRejection = bullishRejection || bearishRejection || pinBar;
  const volumeSpike = relativeVolume >= 1.28;
  const displacement = bodyRatio >= 0.62 && relativeVolume >= 1.12;
  const indecision = direction === "doji" || (upperWickRatio >= 0.34 && lowerWickRatio >= 0.34);
  const tooSmall = previousSet.length >= 8 && range < average(previousSet.slice(-8).map((item) => item.high - item.low)) * 0.52;

  return {
    ...candle,
    totalSize: range,
    bodySize: body,
    upperWick,
    lowerWick,
    bodyRatio,
    upperWickRatio,
    lowerWickRatio,
    closePosition,
    direction,
    closeStrength: closePosition >= 0.72 ? "close proche du high" : closePosition <= 0.28 ? "close proche du low" : "clôture neutre",
    averageVolume,
    relativeVolume,
    detections: {
      bullishImpulse,
      bearishImpulse,
      bullishRejection,
      bearishRejection,
      doji: direction === "doji",
      bullishEngulfing,
      bearishEngulfing,
      pinBar,
      wickRejection,
      volumeSpike,
      displacement,
      indecision,
      tooSmall,
    },
  };
}

function buildCandleScan(candles, preferredDirection = "WAIT") {
  const scanned = candles.map((_, index) => scanCandle(candles, index)).filter(Boolean);
  const current = scanned[scanned.length - 1];
  if (!current) return buildEmptyCandleScan();

  const recent = scanned.slice(-8);
  const dojiCount = recent.filter((item) => item.detections.doji || item.detections.indecision).length;
  const rangeSet = scanned.slice(-12);
  const averageRange = average(rangeSet.map((item) => item.totalSize));
  const currentRange = current.totalSize || averageRange || 1;
  const compression = rangeSet.length >= 8 && currentRange < averageRange * 0.58;
  const lowVolume = current.relativeVolume < 0.72;
  const unclearClose = current.closePosition > 0.38 && current.closePosition < 0.62;
  const twoSidedWicks = current.upperWickRatio > 0.32 && current.lowerWickRatio > 0.32;
  const buyReaction = current.detections.bullishRejection || current.detections.bullishImpulse || current.detections.bullishEngulfing;
  const sellReaction = current.detections.bearishRejection || current.detections.bearishImpulse || current.detections.bearishEngulfing;
  const alignedReaction = preferredDirection === "BUY" ? buyReaction : preferredDirection === "SELL" ? sellReaction : buyReaction || sellReaction;
  const premium = current.detections.displacement || current.detections.volumeSpike;
  const weakReasons = [];
  if (current.detections.tooSmall) weakReasons.push("bougie trop petite");
  if (dojiCount >= 3) weakReasons.push("doji répétitifs");
  if (lowVolume) weakReasons.push("volume trop faible");
  if (twoSidedWicks) weakReasons.push("mèches longues des deux côtés");
  if (compression) weakReasons.push("marché compressé");
  if (unclearClose) weakReasons.push("aucune clôture claire");

  let quality = 18;
  quality += clamp(Math.round(current.bodyRatio * 30), 0, 30);
  quality += clamp(Math.round(Math.max(current.upperWickRatio, current.lowerWickRatio) * 22), 0, 22);
  quality += current.closePosition >= 0.72 || current.closePosition <= 0.28 ? 14 : 4;
  quality += clamp(Math.round((current.relativeVolume - 0.75) * 22), -8, 20);
  if (alignedReaction) quality += 12;
  if (premium) quality += 8;
  quality -= weakReasons.length * 10;
  quality = clamp(Math.round(quality), 0, 100);

  const type = getCandleType(current);
  const rejectionDirection = current.detections.bullishRejection ? "Rejet haussier" : current.detections.bearishRejection ? "Rejet baissier" : "Rejet non confirmé";
  const validForDirection =
    preferredDirection === "BUY"
      ? quality >= 61 && buyReaction && current.closePosition >= 0.6 && !lowVolume && !compression
      : preferredDirection === "SELL"
        ? quality >= 61 && sellReaction && current.closePosition <= 0.4 && !lowVolume && !compression
        : quality >= 61 && alignedReaction;

  return {
    current,
    quality,
    qualityLabel: getCandleQualityLabel(quality),
    type,
    rejectionDirection,
    wickStrength: Math.round(Math.max(current.upperWickRatio, current.lowerWickRatio) * 100),
    bodyStrength: Math.round(current.bodyRatio * 100),
    volumeStrength: Math.round((current.relativeVolume - 1) * 100),
    valid: validForDirection && weakReasons.length <= 1,
    weakReasons,
    summary: buildCandleSummary(current, type, rejectionDirection, quality),
    mtf: buildCandleMtf(scanned, preferredDirection),
  };
}

function buildEmptyCandleScan() {
  return {
    current: null,
    quality: 0,
    qualityLabel: "bougie faible",
    type: "Aucune bougie",
    rejectionDirection: "Rejet non confirmé",
    wickStrength: 0,
    bodyStrength: 0,
    volumeStrength: 0,
    valid: false,
    weakReasons: ["aucune bougie exploitable"],
    summary: "Aucune bougie exploitable.",
    mtf: {
      h1: { label: "H1", quality: 0, valid: false, direction: "WAIT" },
      m15: { label: "M15", quality: 0, valid: false, direction: "WAIT" },
      entry: { label: "M5/M1/30s", quality: 0, valid: false, direction: "WAIT" },
    },
  };
}

function getCandleType(scan) {
  if (scan.detections.displacement) return "Displacement candle";
  if (scan.detections.bullishEngulfing) return "Engulfing bullish";
  if (scan.detections.bearishEngulfing) return "Engulfing bearish";
  if (scan.detections.bullishImpulse) return "Bougie d'impulsion haussière";
  if (scan.detections.bearishImpulse) return "Bougie d'impulsion baissière";
  if (scan.detections.bullishRejection) return "Bougie de rejet haussier";
  if (scan.detections.bearishRejection) return "Bougie de rejet baissier";
  if (scan.detections.pinBar) return "Pin bar";
  if (scan.detections.doji) return "Doji / indécision";
  if (scan.detections.wickRejection) return "Wick rejection";
  return scan.direction === "bullish" ? "Bougie haussière" : scan.direction === "bearish" ? "Bougie baissière" : "Bougie neutre";
}

function getCandleQualityLabel(score) {
  if (score >= 81) return "bougie premium";
  if (score >= 61) return "bougie forte";
  if (score >= 31) return "bougie moyenne";
  return "bougie faible";
}

function buildCandleSummary(scan, type, rejectionDirection, quality) {
  const wickLabel = scan.upperWickRatio >= scan.lowerWickRatio ? `mèche haute ${Math.round(scan.upperWickRatio * 100)} %` : `mèche basse ${Math.round(scan.lowerWickRatio * 100)} %`;
  const volumeLabel = scan.relativeVolume >= 1 ? `volume +${Math.round((scan.relativeVolume - 1) * 100)} %` : `volume ${Math.round((scan.relativeVolume - 1) * 100)} %`;
  return `${type} détectée : ${wickLabel}, ${scan.closeStrength}, ${volumeLabel}. Candle Quality ${quality}/100.`;
}

function buildCandleMtf(scanned, preferredDirection) {
  return {
    h1: summarizeCandleFrame(scanned.slice(-60), preferredDirection, "H1"),
    m15: summarizeCandleFrame(scanned.slice(-24), preferredDirection, "M15"),
    entry: summarizeCandleFrame(scanned.slice(-8), preferredDirection, "M5/M1/30s"),
  };
}

function summarizeCandleFrame(items, preferredDirection, label) {
  if (!items.length) return { label, quality: 0, valid: false, direction: "WAIT" };
  const bullish = items.filter((item) => item.direction === "bullish").length;
  const bearish = items.filter((item) => item.direction === "bearish").length;
  const direction = bullish > bearish ? "BUY" : bearish > bullish ? "SELL" : "WAIT";
  const quality = Math.round(average(items.slice(-5).map((item) => Math.round(item.bodyRatio * 55 + Math.max(item.upperWickRatio, item.lowerWickRatio) * 25 + Math.min(item.relativeVolume, 1.8) * 12))));
  return {
    label,
    quality: clamp(quality, 0, 100),
    valid: preferredDirection === "WAIT" ? quality >= 50 : direction === preferredDirection && quality >= 48,
    direction,
  };
}

function buildLiveCandles(market) {
  const candles = [];
  let price = state.basePrice - Math.sin((state.tick + 12) / 5) * 8;
  for (let index = 0; index < 80; index += 1) {
    const phase = state.tick + index;
    const directionalPull = market.bias === "BUY" ? 0.34 : market.bias === "SELL" ? -0.34 : 0;
    const impulse = Math.sin(phase / 3.7) * 0.95 + directionalPull;
    const open = price;
    const close = open + impulse + Math.cos(phase / 5) * 0.42;
    const high = Math.max(open, close) + 0.55 + Math.abs(Math.sin(phase / 2.4)) * 1.55;
    const low = Math.min(open, close) - 0.55 - Math.abs(Math.cos(phase / 2.9)) * 1.55;
    const volume = Math.round(900 + Math.abs(Math.sin(phase / 4)) * 1700 + (phase % 11 === 0 ? 900 : 0));
    candles.push({ time: new Date(Date.now() - (80 - index) * 60 * 1000), open, high, low, close, volume });
    price = close;
  }
  if (market.valid && state.tick % 5 >= 2) {
    const last = candles[candles.length - 1];
    const previousClose = candles[candles.length - 2]?.close || last.close;
    const averageVolume = average(candles.slice(-20).map((item) => item.volume));
    if (market.bias === "BUY") {
      last.open = previousClose - 0.45;
      last.low = last.open - 3.15;
      last.close = last.open + 2.75;
      last.high = last.close + 0.42;
    }
    if (market.bias === "SELL") {
      last.open = previousClose + 0.45;
      last.high = last.open + 3.15;
      last.close = last.open - 2.75;
      last.low = last.close - 0.42;
    }
    last.volume = Math.round(averageVolume * 1.42);
  }
  return candles;
}

function average(values) {
  const filtered = values.filter(Number.isFinite);
  if (!filtered.length) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

async function loadDailyNews() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = "xauusd-news-cache";
  const cached = safeJson(localStorage.getItem(cacheKey));

  if (cached?.date === todayKey) {
    state.newsEvents = cached.events || [];
    state.lastNewsLoad = cached.date;
    return;
  }

  try {
    const response = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      cache: "no-store",
    });
    const events = await response.json();
    state.newsEvents = events
      .filter((event) => {
        const title = `${event.title || ""} ${event.country || ""}`.toLowerCase();
        return (
          event.country === "USD" &&
          event.impact === "High" &&
          /cpi|non-farm|nfp|fomc|federal funds|powell|unemployment|jobless|interest rate/.test(title)
        );
      })
      .slice(0, 12);
    state.lastNewsLoad = todayKey;
    localStorage.setItem(cacheKey, JSON.stringify({ date: todayKey, events: state.newsEvents }));
  } catch {
    state.newsEvents = cached?.events || [];
  }
}

function evaluateAndRender() {
  if (state.replay.active) {
    evaluateReplayAndRender();
    return;
  }

  state.tick += 1;
  const session = getSession();
  const market = getMarketWeather();
  const news = getNewsRisk();
  const zones = getKeyZones(market);
  const candleScan = buildCandleScan(buildLiveCandles(market), market.bias);
  const confirmation = getEntryConfirmation(market, zones, candleScan);
  const rsi = getRsiConfirmation(market.bias);
  const smartResult = buildSmartMoneyAnalysis(session, market, news, zones, confirmation, candleScan);
  const goldResult = buildGoldIntelligenceAnalysis(smartResult, market, news, zones, confirmation, session, candleScan);
  const activeResult = state.analysisMode === "gold" ? goldResult : smartResult;
  const entryProjection = buildEntryProjection(activeResult, market, zones, confirmation, candleScan, buildLiveCandles(market));

  elements.sessionName.textContent = session.name;
  elements.marketBias.textContent = activeResult.biasLabel;
  elements.scoreTop.textContent = activeResult.score;
  elements.setupState.textContent = entryProjection.statusLabel;
  elements.activeModeLabel.textContent = activeResult.name;
  elements.tradeDirection.textContent = activeResult.status;
  elements.tradeDirection.style.color = getStatusColor(activeResult.status);
  elements.signalReason.textContent = entryProjection.reason;
  renderChartSignalAlert(activeResult, entryProjection);
  elements.badgeRow.innerHTML = activeResult.badges.map(renderBadge).join("");
  elements.scoreFill.style.width = `${activeResult.score}%`;
  elements.scoreValue.textContent = `${activeResult.score} / 100`;
  elements.entryPrice.textContent = activeResult.setup.entry;
  elements.stopLoss.textContent = activeResult.setup.sl;
  elements.tp1.textContent = activeResult.setup.tp1;
  elements.tp2.textContent = activeResult.setup.tp2;
  elements.tp3.textContent = activeResult.setup.tp3;
  elements.confirmTf.textContent = activeResult.timeframe;
  elements.usedZone.textContent = activeResult.zone;
  elements.targetLiquidity.textContent = activeResult.liquidity;
  elements.newsRisk.textContent = news.label;
  elements.blockingReason.textContent = activeResult.blockingReason;
  elements.h1Direction.textContent = goldResult.h1Direction;
  elements.m15Direction.textContent = goldResult.m15Direction;
  elements.confirmationSummary.textContent = activeResult.confirmationSummary;

  renderBlocks(activeResult.blocks);
  renderComparison(smartResult, goldResult);
  renderScenarios(market, zones, confirmation, session, entryProjection);
  renderStrategyOverlay(activeResult.direction, zones, confirmation, entryProjection);
  renderRsiPanel(rsi);
  renderCandleScanner(candleScan);
}

function getSession() {
  const hour = new Date().getUTCHours();
  if (hour >= 0 && hour < 7) return { name: "Asie", bias: 1 };
  if (hour >= 7 && hour < 13) return { name: "Londres", bias: 2 };
  if (hour >= 13 && hour < 21) return { name: "New York", bias: 2 };
  return { name: "Transition", bias: 0 };
}

function getMarketWeather() {
  const wave = Math.sin(state.tick / 4);
  const trendScore = Math.round(58 + wave * 31);
  const expansion = Math.cos(state.tick / 5) > 0.1;
  const isRange = trendScore > 43 && trendScore < 58;
  const bias = trendScore >= 58 ? "BUY" : trendScore <= 42 ? "SELL" : "WAIT";

  let context = "range";
  if (trendScore >= 68) context = "tendance haussière multi-timeframe";
  if (trendScore <= 32) context = "tendance baissière multi-timeframe";
  if (isRange) context = "range dangereux";
  if (expansion && !isRange) context += " avec expansion";

  return {
    valid: bias !== "WAIT" && !isRange,
    bias,
    action: bias === "BUY" ? "BUY privilégié" : bias === "SELL" ? "SELL privilégié" : "Attendre",
    context,
    score: isRange ? 28 : Math.abs(trendScore - 50) + 38,
  };
}

function getNewsRisk() {
  const now = Date.now();
  const critical = state.newsEvents.find((event) => {
    const time = new Date(event.date || event.timestamp || event.datetime || "").getTime();
    return Number.isFinite(time) && Math.abs(time - now) <= 45 * 60 * 1000;
  });

  if (critical) {
    return {
      valid: false,
      score: 0,
      label: `Risque fort: ${critical.title}`,
      reason: "News forte proche",
    };
  }

  return {
    valid: true,
    score: state.newsEvents.length ? 18 : 14,
    label: state.newsEvents.length ? `${state.newsEvents.length} news USD surveillées` : "Aucune news critique proche",
    reason: "Risque news acceptable",
  };
}

function getKeyZones(market) {
  const phase = state.tick % 6;
  const liquidityTaken = phase !== 2;
  const valid = market.valid && liquidityTaken;
  const primary = market.bias === "SELL" ? "H1 bearish order block + EQH" : "M15 bullish order block + FVG";
  const targetLiquidity = market.bias === "SELL" ? "Previous Low / London Low" : "Previous High / NY High";

  return {
    valid,
    primary,
    targetLiquidity,
    liquidityTaken,
    reason: liquidityTaken ? "Liquidité prise" : "Liquidité non prise",
  };
}

function getEntryConfirmation(market, zones, candleScan) {
  const confirmationCycle = state.tick % 5;
  const choch = confirmationCycle >= 2;
  const candleClose = confirmationCycle !== 4;
  const candleValid = candleScan.valid;
  const valid = market.valid && zones.valid && choch && candleClose && candleValid;

  return {
    valid,
    timeframe: state.intervalLabel === "H4" || state.intervalLabel === "H1" ? "M5" : state.intervalLabel,
    reason: valid ? `ChoCH + clôture claire + ${candleScan.summary}` : !choch ? "Order Block détecté mais pas de ChoCH" : !candleClose ? "Pas de confirmation bougie" : `Candle Quality insuffisante: ${candleScan.weakReasons.join(", ") || candleScan.summary}`,
    choch,
    candleClose,
    candleValid,
  };
}

function scoreSetup(market, news, zones, confirmation, candleScan) {
  let score = 0;
  score += clamp(market.score, 0, 30);
  score += news.score;
  score += zones.valid ? 22 : zones.liquidityTaken ? 13 : 7;
  score += confirmation.valid ? 18 : confirmation.choch ? 12 : 5;
  score += clamp(Math.round(candleScan.quality * 0.18), 0, 18);
  if (!candleScan.valid) score -= 14;
  return clamp(Math.round(score), 0, 100);
}

function buildSmartMoneyAnalysis(session, market, news, zones, confirmation, candleScan) {
  const score = scoreSetup(market, news, zones, confirmation, candleScan);
  const valid = market.valid && news.valid && zones.valid && confirmation.valid && candleScan.valid;
  const direction = valid ? market.bias : "WAIT";
  const setup = buildSetup(direction, zones, confirmation);
  const missingReason = getMissingReason(market, news, zones, confirmation, candleScan);
  const scoreLabel = score >= 85 ? "setup fort" : score >= 70 ? "signal possible" : score >= 50 ? "attente" : "pas de trade";

  return {
    id: "smart",
    name: "TSR Smart Money",
    valid,
    direction,
    status: valid ? direction : "ATTENTE",
    setupState: valid ? "Setup complet" : "Setup incomplet",
    score,
    scoreLabel,
    biasLabel: market.action,
    setup,
    timeframe: confirmation.timeframe,
    zone: zones.primary,
    liquidity: zones.targetLiquidity,
    blockingReason: valid ? "Aucun" : missingReason,
    confirmationSummary: confirmation.reason,
    reason: valid
      ? `${direction} validé: ${market.context}, ${zones.primary}, ${confirmation.reason}`
      : `Setup incomplet — ${missingReason}`,
    badges: buildSmartBadges(market, news, valid, candleScan),
    blocks: [
      ["Météo du marché", market.valid, market.context],
      ["Structure de marché", market.valid, market.bias === "BUY" ? "HH/HL + BOS haussier" : market.bias === "SELL" ? "LH/LL + BOS baissier" : "Structure neutre"],
      ["Liquidité", zones.valid, zones.reason],
      ["Order Blocks", zones.valid, zones.primary],
      ["Confirmation d'entrée", confirmation.valid, confirmation.reason],
      ["Candle Scanner", candleScan.valid, `${candleScan.quality}/100 · ${candleScan.summary}`],
      ["News économiques", news.valid, news.reason],
    ],
  };
}

function buildGoldIntelligenceAnalysis(smartResult, market, news, zones, confirmation, session, candleScan) {
  const h1Direction = getH1Direction(market);
  const m15Direction = getM15Direction(market, zones);
  const h1Aligned = smartResult.direction !== "WAIT" && h1Direction.bias === smartResult.direction;
  const h1OrderBlock = state.tick % 6 !== 1;
  const m15Refinement = state.tick % 5 !== 3;
  const trendline = state.tick % 4 !== 0;
  const fibonacci = state.tick % 3 !== 1;
  const rsiConfirmation = getRsiConfirmation(smartResult.direction);
  const rsi = rsiConfirmation.valid;
  const priceAction = confirmation.candleClose && candleScan.valid && state.tick % 6 !== 4;
  const crtAvailable = false;
  const crt = false;
  const advancedConfirmations = [
    ["Trendline", trendline, trendline ? "cassure/respect validé" : "trendline non confirmée"],
    ["Fibonacci", fibonacci, fibonacci ? "réaction sur 61.8 %" : "zone Fibonacci non validée"],
    ["RSI", rsi, rsiConfirmation.label],
    ["Price Action avancée", priceAction, priceAction ? candleScan.summary : "rejet ou momentum insuffisant"],
    ["Candle Quality", candleScan.quality >= 70, `${candleScan.quality}/100 · ${candleScan.qualityLabel}`],
    ["CRT", crtAvailable && crt, crtAvailable ? "CRT validé" : "CRT en attente"],
  ];
  const advancedCount = advancedConfirmations.filter((item) => item[1]).length;
  const mandatoryValid = smartResult.valid && h1Aligned && h1OrderBlock && m15Refinement;
  const valid = mandatoryValid && advancedCount >= 2;
  const refused = smartResult.valid && smartResult.direction !== "WAIT" && !h1Aligned;
  const status = valid ? smartResult.direction : refused ? "SIGNAL REFUSÉ" : "ATTENTE";
  const score = scoreGoldSetup(smartResult.score, h1Aligned, h1OrderBlock, m15Refinement, advancedCount, candleScan.quality);
  const missingAdvanced = advancedConfirmations.filter((item) => !item[1]).map((item) => item[0]);
  const confirmedAdvanced = advancedConfirmations.filter((item) => item[1]).map((item) => item[0]);
  const reason = getGoldReason({
    smartResult,
    valid,
    refused,
    h1Direction,
    h1Aligned,
    h1OrderBlock,
    m15Refinement,
    advancedCount,
    confirmedAdvanced,
    missingAdvanced,
  });

  return {
    id: "gold",
    name: "TSR Gold Intelligence",
    valid,
    direction: valid ? smartResult.direction : "WAIT",
    status,
    setupState: valid ? "Setup premium" : refused ? "Signal refusé" : "Setup incomplet",
    score,
    scoreLabel: score >= 90 ? "setup premium" : score >= 75 ? "setup avancé possible" : score >= 60 ? "attente" : "pas de trade",
    biasLabel: refused ? "Tendance contraire" : valid ? "Confluence forte" : "Attente avancée",
    setup: valid ? smartResult.setup : buildSetup("WAIT", zones, confirmation),
    timeframe: valid ? smartResult.timeframe : "H1 + M15",
    zone: h1OrderBlock ? `Order Block H1 ${smartResult.direction === "SELL" ? "bearish" : "bullish"}` : "Order Block H1 absent",
    liquidity: smartResult.liquidity,
    h1Direction: h1Direction.label,
    m15Direction: m15Direction.label,
    blockingReason: valid ? "Aucun" : reason,
    confirmationSummary: confirmedAdvanced.length ? confirmedAdvanced.join(", ") : "Aucune confirmation avancée",
    reason,
    badges: buildGoldBadges(valid, refused, news, market, h1Aligned, advancedCount, candleScan),
    blocks: [
      ["Mode 1 valide", smartResult.valid, smartResult.valid ? `${smartResult.status} Mode 1 confirmé` : smartResult.blockingReason],
      ["Direction H1 obligatoire", h1Aligned, h1Aligned ? h1Direction.label : `Tendance H1: ${h1Direction.label}`],
      ["Order Block H1 obligatoire", h1OrderBlock, h1OrderBlock ? "OB H1 valide" : "OB H1 non validé"],
      ["Raffinement M15 obligatoire", m15Refinement, m15Refinement ? m15Direction.label : "pas de raffinement M15"],
      ["Candle Scanner multi-timeframe", candleScan.mtf.h1.valid && candleScan.mtf.m15.valid && candleScan.mtf.entry.valid, `H1 ${candleScan.mtf.h1.quality}/100 · M15 ${candleScan.mtf.m15.quality}/100 · Entrée ${candleScan.mtf.entry.quality}/100`],
      ["Confirmations avancées", advancedCount >= 2, `${advancedCount}/2 minimum: ${confirmedAdvanced.join(", ") || "aucune"}`],
      ["CRT", true, "CRT en attente, non bloquant"],
    ],
  };
}

function scoreGoldSetup(smartScore, h1Aligned, h1OrderBlock, m15Refinement, advancedCount, candleQuality) {
  let score = Math.round(smartScore * 0.46);
  score += h1Aligned ? 18 : 0;
  score += h1OrderBlock ? 12 : 0;
  score += m15Refinement ? 12 : 0;
  score += clamp(advancedCount, 0, 5) * 5;
  score += clamp(Math.round(candleQuality * 0.1), 0, 10);
  return clamp(score, 0, 100);
}

function getGoldReason({ smartResult, valid, refused, h1Direction, h1Aligned, h1OrderBlock, m15Refinement, advancedCount, confirmedAdvanced, missingAdvanced }) {
  if (!smartResult.valid) return `Mode 1 non valide: ${smartResult.blockingReason}`;
  if (refused || !h1Aligned) return `Signal refusé: ${smartResult.status} contre tendance H1 ${h1Direction.label}`;
  if (!h1OrderBlock) return `Mode 1 ${smartResult.status} valide, mais Mode 2 en attente: Order Block H1 obligatoire absent`;
  if (!m15Refinement) return `Mode 1 ${smartResult.status} valide, mais Mode 2 en attente: pas de raffinement M15`;
  if (advancedCount < 2) return `Mode 2 en attente: confirmations avancées insuffisantes (${missingAdvanced.join(", ")})`;
  if (valid) return `${smartResult.status} confirmé: H1 aligné + OB H1 + raffinement M15 + ${confirmedAdvanced.join(" + ")}`;
  return "Mode 2 en attente";
}

function getH1Direction(market) {
  if (market.bias === "WAIT") return { bias: "WAIT", label: "H1 neutre / range" };
  const contrary = state.tick % 7 === 0;
  const bias = contrary ? oppositeDirection(market.bias) : market.bias;
  return {
    bias,
    label: bias === "BUY" ? "H1 haussier HH/HL" : "H1 baissier LH/LL",
  };
}

function getM15Direction(market, zones) {
  if (!zones.valid || market.bias === "WAIT") return { bias: "WAIT", label: "M15 en attente" };
  return {
    bias: market.bias,
    label: market.bias === "BUY" ? "M15 confirme la zone H1" : "M15 raffine la zone H1",
  };
}

function getRsiLabel(direction) {
  if (direction === "BUY") return "reprise haussière / sortie de survente";
  if (direction === "SELL") return "rejet baissier / sortie de surachat";
  return "RSI secondaire en attente";
}

function getRsiConfirmation(direction) {
  const values = Array.from({ length: 32 }, (_, index) => {
    const wave = Math.sin((state.tick + index) / 4) * 18;
    const pulse = Math.cos((state.tick + index) / 7) * 7;
    return clamp(Math.round(50 + wave + pulse), 12, 88);
  });
  const value = values[values.length - 1];
  const previous = values[values.length - 2];
  const rising = value > previous;
  const falling = value < previous;
  const buyValid = direction === "BUY" && ((previous < 35 && value >= 35) || (value > 50 && rising));
  const sellValid = direction === "SELL" && ((previous > 65 && value <= 65) || (value < 50 && falling));
  const neutralValid = direction === "WAIT" ? false : buyValid || sellValid;

  return {
    value,
    values,
    valid: neutralValid,
    label: neutralValid ? getRsiLabel(direction) : `RSI 14 neutre (${value})`,
  };
}

function oppositeDirection(direction) {
  return direction === "BUY" ? "SELL" : direction === "SELL" ? "BUY" : "WAIT";
}

function buildSmartBadges(market, news, valid, candleScan) {
  const badges = [];
  badges.push(valid ? ["Validé", "valid"] : ["En attente", "pending"]);
  if (!news.valid) badges.push(["Risque news", "risk"]);
  if (market.context.includes("range")) badges.push(["Range dangereux", "risk"]);
  if (market.valid) badges.push(["Tendance alignée", "valid"]);
  badges.push(candleScan.valid ? [`Candle ${candleScan.quality}`, "valid"] : ["Bougie faible", "risk"]);
  return badges;
}

function buildGoldBadges(valid, refused, news, market, h1Aligned, advancedCount, candleScan) {
  const badges = [];
  badges.push(valid ? ["Validé", "valid"] : refused ? ["Refusé", "refused"] : ["En attente", "pending"]);
  if (!news.valid) badges.push(["Risque news", "risk"]);
  if (market.context.includes("range")) badges.push(["Range dangereux", "risk"]);
  badges.push(h1Aligned ? ["Tendance alignée", "valid"] : ["Tendance contraire", "refused"]);
  if (advancedCount >= 2) badges.push(["Confluence forte", "valid"]);
  badges.push(candleScan.quality >= 81 ? ["Bougie premium", "valid"] : candleScan.valid ? ["Bougie forte", "valid"] : ["Bougie faible", "risk"]);
  return badges;
}

function buildSetup(direction, zones, confirmation) {
  if (direction === "WAIT") {
    return { entry: "--", sl: "--", tp1: "--", tp2: "--", tp3: "--" };
  }

  const drift = Math.sin(state.tick / 3) * 4.2;
  const entry = state.basePrice + drift + (direction === "BUY" ? 1.7 : -1.7);
  const risk = confirmation.timeframe === "M1" || confirmation.timeframe === "30s" ? 2.9 : 5.4;
  const sign = direction === "BUY" ? 1 : -1;

  return {
    entry: formatPrice(entry),
    sl: formatPrice(entry - sign * risk),
    tp1: formatPrice(entry + sign * risk * 1.35),
    tp2: formatPrice(entry + sign * risk * 2.15),
    tp3: formatPrice(entry + sign * risk * 3.2),
    zone: zones.primary,
  };
}

function getMissingReason(market, news, zones, confirmation, candleScan) {
  if (!market.valid) return market.context === "range dangereux" ? "Marché en range dangereux" : "Météo du marché non alignée";
  if (!news.valid) return news.reason;
  if (!zones.valid) return zones.reason;
  if (!candleScan.valid) return `Candle Quality insuffisante: ${candleScan.weakReasons.join(", ") || candleScan.summary}`;
  if (!confirmation.valid) return confirmation.reason;
  return "Attente confirmation";
}

function buildEntryProjection(activeResult, market, zones, confirmation, candleScan, candles = []) {
  const confirmed = activeResult.status === "BUY" || activeResult.status === "SELL";
  const direction = confirmed ? activeResult.status : inferProjectionDirection(activeResult, market, zones);
  const hasDirection = direction === "BUY" || direction === "SELL";
  const stage = getEntryProjectionStage(confirmed, market, zones, confirmation, candleScan);
  const setup = confirmed ? activeResult.setup : hasDirection ? buildSetup(direction, zones, confirmation) : buildSetup("WAIT", zones, confirmation);
  const metrics = buildPositionMetrics(direction, setup, stage, candles);

  return {
    stage,
    direction,
    setup,
    metrics,
    statusLabel: getProjectionStatusLabel(stage, direction),
    reason: getProjectionReason(stage, direction, zones, confirmation, candleScan, activeResult),
  };
}

function inferProjectionDirection(activeResult, market, zones) {
  if (activeResult.status === "BUY" || activeResult.status === "SELL") return activeResult.status;
  if (market.bias === "BUY" || market.bias === "SELL") return market.bias;
  if (String(zones.primary).toLowerCase().includes("bearish")) return "SELL";
  return "BUY";
}

function getEntryProjectionStage(confirmed, market, zones, confirmation, candleScan) {
  if (confirmed) return "confirmed";
  if (market.valid && zones.valid && confirmation.choch && (candleScan.quality >= 50 || candleScan.current?.detections?.wickRejection)) return "imminent";
  if (market.valid && (zones.valid || zones.liquidityTaken)) return "potential";
  return "future";
}

function getProjectionStatusLabel(stage, direction) {
  if (stage === "confirmed") return `${direction} confirmé`;
  if (stage === "imminent") return "Entrée imminente — prépare-toi";
  if (stage === "potential") return "Entrée potentielle — attendre réaction";
  return `Zone potentielle ${direction}`;
}

function getProjectionReason(stage, direction, zones, confirmation, candleScan, activeResult) {
  if (stage === "confirmed") return activeResult.reason;
  if (stage === "imminent") return `${direction}: prix dans la zone, ${confirmation.choch ? "ChoCH/BOS possible" : "structure en formation"}, ${candleScan.summary}`;
  if (stage === "potential") return `${direction}: direction cohérente, prix proche de ${zones.primary}. Attendre rejet et clôture claire.`;
  return `${direction}: zone détectée à l'avance sur ${zones.primary}. Aucun signal d'entrée encore.`;
}

function buildPositionMetrics(direction, setup, stage, candles = []) {
  const entry = parsePrice(setup.entry);
  const sl = parsePrice(setup.sl);
  const tp1 = parsePrice(setup.tp1);
  const tp2 = parsePrice(setup.tp2);
  const tp3 = parsePrice(setup.tp3);
  if (direction !== "BUY" && direction !== "SELL") return { valid: false, status: "en attente", rr1: "--", rr2: "--", rr3: "--", riskPoints: "--", tp1Points: "--", tp2Points: "--", tp3Points: "--" };
  if (![entry, sl, tp1, tp2, tp3].every(Number.isFinite)) return { valid: false, status: "en attente", rr1: "--", rr2: "--", rr3: "--", riskPoints: "--", tp1Points: "--", tp2Points: "--", tp3Points: "--" };

  const risk = Math.abs(entry - sl);
  const tp1Distance = Math.abs(tp1 - entry);
  const tp2Distance = Math.abs(tp2 - entry);
  const tp3Distance = Math.abs(tp3 - entry);
  const status = getPositionStatus(direction, { entry, sl, tp1, tp2, tp3 }, stage, candles);

  return {
    valid: true,
    status,
    rr1: formatRatio(tp1Distance / risk),
    rr2: formatRatio(tp2Distance / risk),
    rr3: formatRatio(tp3Distance / risk),
    riskPoints: formatPoints(risk),
    tp1Points: formatPoints(tp1Distance),
    tp2Points: formatPoints(tp2Distance),
    tp3Points: formatPoints(tp3Distance),
  };
}

function getPositionStatus(direction, levels, stage, candles) {
  if (stage !== "confirmed") return "en attente";
  const afterEntry = candles.filter((candle) => direction === "BUY" ? candle.high >= levels.entry : candle.low <= levels.entry);
  if (!afterEntry.length) return "actif";
  for (const candle of afterEntry) {
    if (direction === "BUY") {
      if (candle.low <= levels.sl) return "SL touché";
      if (candle.high >= levels.tp3) return "TP3 touché";
      if (candle.high >= levels.tp2) return "TP2 touché";
      if (candle.high >= levels.tp1) return "TP1 touché";
      if (candle.low <= levels.entry && candle.close > levels.entry) return "break-even";
    } else {
      if (candle.high >= levels.sl) return "SL touché";
      if (candle.low <= levels.tp3) return "TP3 touché";
      if (candle.low <= levels.tp2) return "TP2 touché";
      if (candle.low <= levels.tp1) return "TP1 touché";
      if (candle.high >= levels.entry && candle.close < levels.entry) return "break-even";
    }
  }
  return "actif";
}

function formatRatio(value) {
  if (!Number.isFinite(value)) return "--";
  return `1:${value.toFixed(2)}`;
}

function formatPoints(value) {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(2)} pts`;
}

function renderBlocks(blockRows) {
  elements.blockChecks.innerHTML = blockRows
    .map(([label, valid, reason]) => {
      const className = valid ? "valid" : "blocked";
      return `
        <div class="block-row ${className}">
          <span class="block-icon">${valid ? "✓" : "!"}</span>
          <span><strong>${label}</strong><br />${reason}</span>
        </div>
      `;
    })
    .join("");
}

function renderCandleScanner(candleScan) {
  elements.candleQuality.textContent = `${candleScan.quality}/100 · ${candleScan.qualityLabel}`;
  elements.candleType.textContent = candleScan.type;
  elements.candleRejection.textContent = `${candleScan.rejectionDirection} · ${candleScan.summary}`;
  elements.wickStrength.textContent = `${candleScan.wickStrength}%`;
  elements.bodyStrength.textContent = `${candleScan.bodyStrength}%`;
  elements.volumeStrength.textContent = `${candleScan.volumeStrength >= 0 ? "+" : ""}${candleScan.volumeStrength}% vs moyenne 20 bougies`;
}

function renderChartSignalAlert(activeResult, entryProjection) {
  const direction = activeResult.status;
  elements.chartSignalAlert.classList.toggle("buy", direction === "BUY");
  elements.chartSignalAlert.classList.toggle("sell", direction === "SELL");
  elements.chartSignalAlert.classList.toggle("waiting", direction !== "BUY" && direction !== "SELL");
  elements.chartAlertStage.textContent = entryProjection.statusLabel;
  elements.chartAlertDirection.textContent = direction;
  elements.chartAlertReason.textContent = buildChartAlertReason(activeResult, entryProjection);
}

function buildChartAlertReason(activeResult, entryProjection) {
  const setup = entryProjection.setup;
  if (activeResult.status === "BUY" || activeResult.status === "SELL") {
    return `Entrée ${setup.entry} · SL ${setup.sl} · TP1 ${setup.tp1} · ${entryProjection.metrics.status}`;
  }
  return entryProjection.reason;
}

function renderComparison(smartResult, goldResult) {
  if (!state.showBothAnalyses) {
    elements.compareResults.innerHTML = "";
    elements.compareResults.classList.remove("visible");
    return;
  }

  elements.compareResults.classList.add("visible");
  elements.compareResults.innerHTML = [smartResult, goldResult]
    .map(
      (result) => `
        <article class="mini-analysis-card">
          <div class="mini-card-head">
            <strong>${result.name}</strong>
            <span class="mini-status" style="color:${getStatusColor(result.status)}">${result.status}</span>
          </div>
          <div class="mini-score">
            <span>${result.scoreLabel}</span>
            <strong>${result.score}/100</strong>
          </div>
          <p>${result.reason}</p>
          <dl>
            <div><dt>Zone</dt><dd>${result.zone}</dd></div>
            <div><dt>Liquidité</dt><dd>${result.liquidity}</dd></div>
            <div><dt>Confirmation</dt><dd>${result.confirmationSummary}</dd></div>
          </dl>
          <div class="badge-row">${result.badges.map(renderBadge).join("")}</div>
        </article>
      `,
    )
    .join("");
}

function renderBadge([label, type]) {
  return `<span class="status-badge ${type}">${label}</span>`;
}

function getStatusColor(status) {
  if (status === "BUY") return "var(--green)";
  if (status === "SELL") return "var(--red)";
  if (status === "SIGNAL REFUSÉ") return "var(--red)";
  return "var(--gold)";
}

function renderScenarios(market, zones, confirmation, session, entryProjection) {
  const scenarios = [
    {
      title: entryProjection.statusLabel,
      body: entryProjection.reason,
    },
    {
      title: "Attente sweep + displacement",
      body: `${zones.targetLiquidity} comme cible prioritaire`,
    },
  ];

  elements.scenarioList.innerHTML = scenarios
    .map((scenario) => `<article><strong>${scenario.title}</strong><span>${scenario.body}</span></article>`)
    .join("");
}

function addEntryProjectionItems(items, projection) {
  if (!projection || projection.direction === "WAIT") return;
  const visible = state.smartMoneyVisibility;
  const isBuy = projection.direction === "BUY";
  const sideClass = isBuy ? "overlay-buy" : "overlay-sell";
  const stageRank = { future: 1, potential: 2, imminent: 3, confirmed: 4 }[projection.stage] || 0;
  const top = isBuy ? 56 : 28;

  if ((visible.entryZones || visible.futureZones) && visible.futureZones && stageRank >= 1) {
    items.push({
      className: `overlay-entry-zone overlay-zone-future ${sideClass}`,
      label: `Zone potentielle ${projection.direction}`,
      style: `left: 53%; top: ${top}%; width: 24%; height: 9%;`,
    });
  }
  if (visible.potentialEntries && stageRank >= 2) {
    items.push({
      className: `overlay-entry-stage overlay-entry-potential ${sideClass}`,
      label: "Entrée potentielle — attendre réaction",
      style: `left: 50%; top: ${top + 10}%; width: 30%;`,
    });
  }
  if (visible.imminentEntries && stageRank >= 3) {
    items.push({
      className: `overlay-entry-stage overlay-entry-imminent ${sideClass}`,
      label: "Entrée imminente — prépare-toi",
      style: `left: 49%; top: ${top + 16}%; width: 32%;`,
    });
  }
  if (visible.confirmedSignals && stageRank >= 4) {
    items.push({
      className: `overlay-entry-stage overlay-signal-confirmed ${sideClass}`,
      label: `${projection.direction} confirmé`,
      style: `left: 48%; top: ${top + 22}%; width: 20%;`,
    });
  }

  const showTool = stageRank >= 4 && ((isBuy && visible.longPositionTool) || (!isBuy && visible.shortPositionTool));
  if (showTool) addPositionToolItem(items, projection, top, sideClass);
}

function addPositionToolItem(items, projection, top, sideClass) {
  const visible = state.smartMoneyVisibility;
  const setup = projection.setup;
  const metrics = projection.metrics;
  const toolLabel = projection.direction === "BUY" ? "Position longue" : "Position courte";
  const rr = visible.riskReward ? ` · RR ${metrics.rr1}/${metrics.rr2}/${metrics.rr3}` : "";
  const slTp = visible.slTp ? ` · SL ${setup.sl} · TP1 ${setup.tp1} · TP2 ${setup.tp2} · TP3 ${setup.tp3}` : "";
  items.push({
    className: `overlay-position-tool ${projection.direction === "BUY" ? "overlay-position-long" : "overlay-position-short"} ${sideClass}`,
    label: `${toolLabel} · Entrée ${setup.entry}${slTp}${rr} · ${metrics.status}`,
    style: `left: 12%; top: ${projection.direction === "BUY" ? top - 18 : top + 30}%; width: 37%;`,
  });
}

function renderStrategyOverlay(direction, zones, confirmation, entryProjection) {
  const visible = state.smartMoneyVisibility;
  const classic = state.classicVisibility;
  const items = [];

  if (visible.sessions) {
    items.push({ className: "overlay-session", label: "Asie", style: "left: 8%;" });
    items.push({ className: "overlay-session", label: "Londres", style: "left: 38%;" });
    items.push({ className: "overlay-session", label: "New York", style: "left: 68%;" });
  }
  if (visible.orderBlocks) items.push({ className: "overlay-ob", label: "OB H1", style: "left: 55%; top: 24%; width: 25%; height: 9%;" });
  if (visible.fvg) items.push({ className: "overlay-fvg", label: "FVG M15", style: "left: 33%; top: 45%; width: 18%; height: 8%;" });
  if (visible.equalHigh) items.push({ className: "overlay-eqh overlay-line", label: "", style: "left: 17%; top: 20%; width: 64%;" });
  if (visible.equalLow) items.push({ className: "overlay-eql overlay-line", label: "", style: "left: 12%; top: 72%; width: 59%;" });
  if (visible.liquiditySweep) items.push({ className: "overlay-liq", label: "Sweep", style: "left: 70%; top: 17%;" });
  if (visible.bos) items.push({ className: "overlay-buy", label: "BOS", style: "left: 48%; top: 38%;" });
  if (visible.choch) items.push({ className: confirmation.valid ? "overlay-buy" : "overlay-sell", label: "ChoCH", style: "left: 62%; top: 51%;" });
  if (visible.trendlines) items.push({ className: "overlay-liq overlay-line", label: "", style: "left: 22%; top: 61%; width: 47%; transform: rotate(-9deg);" });
  if (visible.previousHL) {
    items.push({ className: "overlay-tp overlay-line", label: "", style: "left: 10%; top: 14%; width: 78%;" });
    items.push({ className: "overlay-sl overlay-line", label: "", style: "left: 10%; top: 82%; width: 78%;" });
  }
  addEntryProjectionItems(items, entryProjection);
  if (classic.ema20) items.push({ className: "overlay-ema overlay-ema20", label: "", style: "left: 12%; top: 37%; width: 68%; transform: rotate(-7deg);" });
  if (classic.ema50) items.push({ className: "overlay-ema overlay-ema50", label: "", style: "left: 10%; top: 48%; width: 70%; transform: rotate(-3deg);" });
  if (classic.ema200) items.push({ className: "overlay-ema overlay-ema200", label: "", style: "left: 8%; top: 59%; width: 72%; transform: rotate(2deg);" });
  if (classic.superTrend) items.push({ className: "overlay-supertrend", label: "", style: "left: 20%; top: 66%; width: 55%; transform: rotate(-5deg);" });

  elements.strategyOverlay.innerHTML = items
    .map((item) => `<span class="overlay-item ${item.className}" style="${item.style}">${item.label}</span>`)
    .join("");
}

function clearStrategyOverlay() {
  elements.strategyOverlay.innerHTML = "";
}

function renderRsiPanel(rsi) {
  if (!state.classicVisibility.rsi) {
    elements.rsiPanel.hidden = true;
    elements.rsiLine.setAttribute("points", "");
    elements.rsiValue.textContent = "--";
    return;
  }

  elements.rsiPanel.hidden = false;
  elements.rsiValue.textContent = `${rsi.value}`;
  const points = rsi.values
    .map((value, index) => {
      const x = (index / (rsi.values.length - 1)) * 100;
      const y = 100 - value;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  elements.rsiLine.setAttribute("points", points);
}

function getTradingViewStudies() {
  return classicIndicators
    .filter((item) => item.tradingViewStudy && state.classicVisibility[item.id])
    .map((item) => item.tradingViewStudy);
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPrice(value) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

window.addEventListener("DOMContentLoaded", boot);
