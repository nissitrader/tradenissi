const smartMoneyOverlays = [
  { id: "orderBlocks", label: "Order Blocks", defaultOn: true },
  { id: "fvg", label: "FVG / Imbalance", defaultOn: true },
  { id: "equalHigh", label: "Equal High", defaultOn: true },
  { id: "equalLow", label: "Equal Low", defaultOn: true },
  { id: "liquiditySweep", label: "Liquidity Sweep", defaultOn: true },
  { id: "bos", label: "BOS", defaultOn: true },
  { id: "choch", label: "ChoCH", defaultOn: true },
  { id: "premiumDiscount", label: "Premium / Discount", defaultOn: true },
  { id: "ote", label: "OTE 0.705", defaultOn: true },
  { id: "idm", label: "IDM / Inducement", defaultOn: true },
  { id: "target", label: "Target", defaultOn: true },
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
  { id: "vwap", label: "VWAP", defaultOn: false },
  { id: "superTrend", label: "SuperTrend", defaultOn: false },
  { id: "volume", label: "Volume", defaultOn: false },
  { id: "rsi", label: "RSI", defaultOn: false },
];

const API_UNAVAILABLE_MESSAGE = "API locale indisponible — vérifiez que votre PC, npm start et Cloudflare Tunnel sont actifs.";
const DRAG_STORAGE_KEY = "tsr-draggable-signal-card-positions";
const RISK_REWARD_STORAGE_KEY = "tsr-risk-reward-minimum";
const SCORE_FILTER_STORAGE_KEY = "tsr-score-filter-minimums";
const PRICE_AUTO_FIT_STORAGE_KEY = "tsr-price-auto-fit-visible-candles";
const RISK_REWARD_DEFAULT_MINIMUM = 1.2;
const SMART_SCORE_DEFAULT_MINIMUM = 70;
const GOLD_SCORE_DEFAULT_MINIMUM = 80;
const PRICE_SCALE_VISIBLE_CANDLES = 72;
const PRICE_SCALE_MARGIN_RATIO = 0.12;
const TOP_DOWN_TIMEFRAMES = [
  { label: "Mensuel", group: 180, weight: 24, role: "historique large" },
  { label: "Weekly", group: 132, weight: 22, role: "liquidite majeure" },
  { label: "Daily", group: 96, weight: 20, role: "biais global" },
  { label: "H4", group: 72, weight: 18, role: "structure externe" },
  { label: "H1", group: 54, weight: 16, role: "direction principale" },
  { label: "M30", group: 38, weight: 13, role: "raffinement" },
  { label: "M15", group: 28, weight: 11, role: "FVG / ChoCH" },
  { label: "M5", group: 16, weight: 9, role: "precision scalping" },
];

const state = {
  interval: "240",
  intervalLabel: "H4",
  analysisMode: "smart",
  showBothAnalyses: false,
  autoFitVisibleCandles: true,
  forceRecentPriceCenter: 0,
  riskRewardMinimum: RISK_REWARD_DEFAULT_MINIMUM,
  scoreMinimums: {
    smart: SMART_SCORE_DEFAULT_MINIMUM,
    gold: GOLD_SCORE_DEFAULT_MINIMUM,
  },
  signalFlow: {
    activeDirection: null,
    status: "en attente",
    invalidatedTick: -999,
  },
  smartMoneyVisibility: Object.fromEntries(smartMoneyOverlays.map((item) => [item.id, item.defaultOn])),
  classicVisibility: Object.fromEntries(classicIndicators.map((item) => [item.id, item.defaultOn])),
  tick: 0,
  basePrice: 2336.4,
  widget: null,
  tvInterval: "",
  lastNewsLoad: null,
  newsEvents: [],
  api: {
    available: false,
    message: API_UNAVAILABLE_MESSAGE,
    health: null,
    signals: [],
    history: [],
    historySource: "none",
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
  topDownZones: [],
  chartZoneHitboxes: [],
  selectedZone: null,
  marketFlow: {
    status: "active",
    lastUpdateAt: 0,
    lastCandleAt: null,
    lastSignature: "",
  },
  tsrAnalysis: {
    status: "active",
    pending: false,
    cacheKey: "",
    cached: { zones: [], bias: "WAIT" },
    lastAnalysisAt: 0,
    lastError: "",
  },
  lastChartRender: null,
};

const elements = {
  workspace: document.getElementById("workspace"),
  apiNotice: document.getElementById("apiNotice"),
  chartFrame: document.getElementById("chartFrame"),
  chartSignalAlert: document.getElementById("chartSignalAlert"),
  chartAlertStage: document.getElementById("chartAlertStage"),
  chartAlertDirection: document.getElementById("chartAlertDirection"),
  chartAlertReason: document.getElementById("chartAlertReason"),
  chartDecisionCard: document.getElementById("chartDecisionCard"),
  chartDecisionStage: document.getElementById("chartDecisionStage"),
  chartDecisionMode: document.getElementById("chartDecisionMode"),
  chartDecisionDirection: document.getElementById("chartDecisionDirection"),
  chartDecisionReason: document.getElementById("chartDecisionReason"),
  chartDecisionBadges: document.getElementById("chartDecisionBadges"),
  chartDecisionFill: document.getElementById("chartDecisionFill"),
  chartDecisionScore: document.getElementById("chartDecisionScore"),
  resetSignalPositions: document.getElementById("resetSignalPositions"),
  recenterPrice: document.getElementById("recenterPrice"),
  autoFitVisibleCandles: document.getElementById("autoFitVisibleCandles"),
  riskRewardMinimum: document.getElementById("riskRewardMinimum"),
  smartScoreMinimum: document.getElementById("smartScoreMinimum"),
  goldScoreMinimum: document.getElementById("goldScoreMinimum"),
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
  marketFlowStatus: document.getElementById("marketFlowStatus"),
  tsrAnalysisStatus: document.getElementById("tsrAnalysisStatus"),
  lastCandleAt: document.getElementById("lastCandleAt"),
  lastAnalysisAt: document.getElementById("lastAnalysisAt"),
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
  riskRewardValue: document.getElementById("riskRewardValue"),
  confirmTf: document.getElementById("confirmTf"),
  blockChecks: document.getElementById("blockChecks"),
  usedZone: document.getElementById("usedZone"),
  targetLiquidity: document.getElementById("targetLiquidity"),
  newsRisk: document.getElementById("newsRisk"),
  blockingReason: document.getElementById("blockingReason"),
  h1Direction: document.getElementById("h1Direction"),
  m15Direction: document.getElementById("m15Direction"),
  confirmationSummary: document.getElementById("confirmationSummary"),
  riskAmount: document.getElementById("riskAmount"),
  gainPotential: document.getElementById("gainPotential"),
  rrClassification: document.getElementById("rrClassification"),
  signalLifecycleStatus: document.getElementById("signalLifecycleStatus"),
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
  initRiskRewardMinimum();
  initScoreMinimums();
  initPriceAutoFit();
  renderOverlayControls();
  bindInteractions();
  initDraggableSignalCards();
  renderTradingView();
  loadDailyNews();
  initTsrDataApi();
  evaluateAndRender();
  window.setInterval(evaluateAndRender, 4500);
  window.setInterval(refreshLiveData, 5000);
  window.setInterval(updateFlowWatchdog, 1000);
  updateFlowMonitor();
}

function renderTradingView() {
  const target = document.getElementById("tradingview_chart");
  if (!target) return;
  target.innerHTML = "";

  if (!window.TradingView) {
    target.innerHTML = '<div class="tv-fallback">TradingView direct indisponible</div>';
    return;
  }

  state.tvInterval = state.interval;
  state.widget = new window.TradingView.widget({
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
      "paneProperties.background": "#090a08",
      "paneProperties.vertGridProperties.color": "rgba(238, 232, 207, 0.08)",
      "paneProperties.horzGridProperties.color": "rgba(238, 232, 207, 0.08)",
    },
  });
}

function ensureTradingViewInterval() {
  if (state.tvInterval !== state.interval) renderTradingView();
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
      state.forceRecentPriceCenter += 1;
      elements.chartInterval.textContent = state.intervalLabel;
      ensureTradingViewInterval();
      evaluateAndRender();
      if (state.api.available) loadApiHistory().then(evaluateAndRender);
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
    state.forceRecentPriceCenter += 1;
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
      evaluateAndRender();
    });
  });

  document.getElementById("chartScale").addEventListener("input", (event) => {
    elements.workspace.style.gridTemplateColumns = `var(--left-width) ${event.target.value}fr var(--right-width)`;
  });

  elements.recenterPrice.addEventListener("click", () => {
    state.forceRecentPriceCenter += 1;
    state.autoFitVisibleCandles = true;
    elements.autoFitVisibleCandles.checked = true;
    writePriceAutoFit();
    evaluateAndRender();
  });

  elements.autoFitVisibleCandles.addEventListener("change", () => {
    state.autoFitVisibleCandles = elements.autoFitVisibleCandles.checked;
    state.forceRecentPriceCenter += 1;
    writePriceAutoFit();
    evaluateAndRender();
  });

  document.getElementById("toggleControls").addEventListener("click", () => {
    elements.workspace.classList.toggle("controls-collapsed");
  });

  document.getElementById("toggleSignal").addEventListener("click", () => {
    elements.workspace.classList.toggle("signal-collapsed");
  });

  document.getElementById("refreshWidget").addEventListener("click", () => {
    renderTradingView();
    refreshLiveData();
  });
  document.getElementById("fullscreenChart").addEventListener("click", () => {
    document.querySelector(".chart-desk").classList.toggle("chart-fullscreen");
    setTimeout(evaluateAndRender, 160);
  });
  elements.resetSignalPositions.addEventListener("click", resetDraggableSignalCards);
  elements.replayCanvas.addEventListener("click", handleChartZoneClick);
  elements.riskRewardMinimum.addEventListener("change", () => {
    state.riskRewardMinimum = Number(elements.riskRewardMinimum.value) || RISK_REWARD_DEFAULT_MINIMUM;
    writeRiskRewardMinimum();
    evaluateAndRender();
  });
  elements.smartScoreMinimum.addEventListener("change", () => {
    state.scoreMinimums.smart = Number(elements.smartScoreMinimum.value) || SMART_SCORE_DEFAULT_MINIMUM;
    writeScoreMinimums();
    evaluateAndRender();
  });
  elements.goldScoreMinimum.addEventListener("change", () => {
    state.scoreMinimums.gold = Number(elements.goldScoreMinimum.value) || GOLD_SCORE_DEFAULT_MINIMUM;
    writeScoreMinimums();
    evaluateAndRender();
  });
}

function initRiskRewardMinimum() {
  try {
    const saved = Number(localStorage.getItem(RISK_REWARD_STORAGE_KEY));
    if ([1, 1.2, 1.5, 2].includes(saved)) state.riskRewardMinimum = saved;
  } catch {
    state.riskRewardMinimum = RISK_REWARD_DEFAULT_MINIMUM;
  }
  elements.riskRewardMinimum.value = String(state.riskRewardMinimum);
}

function writeRiskRewardMinimum() {
  try {
    localStorage.setItem(RISK_REWARD_STORAGE_KEY, String(state.riskRewardMinimum));
  } catch {
    // The selected RR still applies in the current session if storage is blocked.
  }
}

function initScoreMinimums() {
  try {
    const saved = safeJson(localStorage.getItem(SCORE_FILTER_STORAGE_KEY));
    if ([60, 65, 70, 75].includes(Number(saved?.smart))) state.scoreMinimums.smart = Number(saved.smart);
    if ([75, 80, 85, 90].includes(Number(saved?.gold))) state.scoreMinimums.gold = Number(saved.gold);
  } catch {
    state.scoreMinimums.smart = SMART_SCORE_DEFAULT_MINIMUM;
    state.scoreMinimums.gold = GOLD_SCORE_DEFAULT_MINIMUM;
  }
  elements.smartScoreMinimum.value = String(state.scoreMinimums.smart);
  elements.goldScoreMinimum.value = String(state.scoreMinimums.gold);
}

function writeScoreMinimums() {
  try {
    localStorage.setItem(SCORE_FILTER_STORAGE_KEY, JSON.stringify(state.scoreMinimums));
  } catch {
    // Score filters still apply in the current session if storage is blocked.
  }
}

function initPriceAutoFit() {
  try {
    const saved = localStorage.getItem(PRICE_AUTO_FIT_STORAGE_KEY);
    state.autoFitVisibleCandles = saved === null ? true : saved === "true";
  } catch {
    state.autoFitVisibleCandles = true;
  }
  elements.autoFitVisibleCandles.checked = state.autoFitVisibleCandles;
}

function writePriceAutoFit() {
  try {
    localStorage.setItem(PRICE_AUTO_FIT_STORAGE_KEY, String(state.autoFitVisibleCandles));
  } catch {
    // Auto-fit still applies in the current session if storage is blocked.
  }
}

function initDraggableSignalCards() {
  const cards = getDraggableSignalCards();
  const savedPositions = readDraggablePositions();
  cards.forEach((card) => {
    const savedPosition = savedPositions[card.dataset.draggableCard];
    if (savedPosition) applyDraggablePosition(card, savedPosition);
    card.addEventListener("pointerdown", startSignalCardDrag);
  });
}

function markMarketFlowUpdate(candles = []) {
  const last = candles[candles.length - 1];
  state.marketFlow.status = "active";
  state.marketFlow.lastUpdateAt = Date.now();
  state.marketFlow.lastCandleAt = last?.time instanceof Date ? last.time : new Date();
  state.marketFlow.lastSignature = last ? getCandleSignature(last) : state.marketFlow.lastSignature;
  updateFlowMonitor();
}

function updateFlowWatchdog() {
  if (state.replay.active) {
    state.marketFlow.status = "active";
    updateFlowMonitor();
    return;
  }
  const age = Date.now() - (state.marketFlow.lastUpdateAt || 0);
  if (state.marketFlow.lastUpdateAt && age > 10000) {
    state.marketFlow.status = "interrupted";
    elements.apiNotice.textContent = "Flux marché interrompu";
    elements.apiNotice.hidden = false;
  }
  updateFlowMonitor();
}

function updateFlowMonitor() {
  const marketActive = state.marketFlow.status !== "interrupted";
  elements.marketFlowStatus.textContent = marketActive ? "Temps réel actif" : "Flux interrompu";
  elements.marketFlowStatus.dataset.status = marketActive ? "active" : "blocked";
  elements.tsrAnalysisStatus.textContent = state.tsrAnalysis.status === "running" ? "Analyse en cours" : state.tsrAnalysis.status === "blocked" ? "Analyse bloquée" : "Analyse active";
  elements.tsrAnalysisStatus.dataset.status = state.tsrAnalysis.status === "running" ? "running" : state.tsrAnalysis.status === "blocked" ? "blocked" : "active";
  elements.lastCandleAt.textContent = state.marketFlow.lastUpdateAt ? formatClockTime(new Date(state.marketFlow.lastUpdateAt)) : "--:--:--";
  elements.lastAnalysisAt.textContent = state.tsrAnalysis.lastAnalysisAt ? formatClockTime(new Date(state.tsrAnalysis.lastAnalysisAt)) : "--:--:--";
}

function formatClockTime(date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getCandleSignature(candle) {
  if (!candle) return "";
  return `${candle.time instanceof Date ? candle.time.getTime() : candle.time}-${candle.open}-${candle.high}-${candle.low}-${candle.close}-${candle.volume || 0}`;
}

function getDraggableSignalCards() {
  return [elements.chartSignalAlert, elements.chartDecisionCard].filter(Boolean);
}

function startSignalCardDrag(event) {
  if (event.button !== undefined && event.button !== 0) return;
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const startLeft = rect.left;
  const startTop = rect.top;
  const startX = event.clientX;
  const startY = event.clientY;

  event.preventDefault();
  card.setPointerCapture?.(event.pointerId);
  card.classList.add("dragging", "user-positioned");
  document.body.classList.add("dragging-signal-card");
  applyDraggablePosition(card, { left: startLeft, top: startTop, width });

  function moveCard(moveEvent) {
    moveEvent.preventDefault();
    const left = clamp(startLeft + moveEvent.clientX - startX, 0, Math.max(0, window.innerWidth - width));
    const top = clamp(startTop + moveEvent.clientY - startY, 0, Math.max(0, window.innerHeight - height));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function finishDrag(upEvent) {
    card.releasePointerCapture?.(upEvent.pointerId);
    card.classList.remove("dragging");
    document.body.classList.remove("dragging-signal-card");
    document.removeEventListener("pointermove", moveCard);
    document.removeEventListener("pointerup", finishDrag);
    document.removeEventListener("pointercancel", finishDrag);
    saveDraggablePosition(card);
  }

  document.addEventListener("pointermove", moveCard, { passive: false });
  document.addEventListener("pointerup", finishDrag);
  document.addEventListener("pointercancel", finishDrag);
}

function applyDraggablePosition(card, position) {
  const width = Math.min(Number(position.width) || card.getBoundingClientRect().width, window.innerWidth - 16);
  const left = clamp(Number(position.left) || 0, 0, Math.max(0, window.innerWidth - width));
  const top = clamp(Number(position.top) || 0, 0, Math.max(0, window.innerHeight - card.getBoundingClientRect().height));

  card.classList.add("user-positioned");
  card.style.position = "fixed";
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
  card.style.right = "auto";
  card.style.bottom = "auto";
  card.style.width = `${width}px`;
}

function saveDraggablePosition(card) {
  const key = card.dataset.draggableCard;
  if (!key) return;
  const rect = card.getBoundingClientRect();
  const positions = readDraggablePositions();
  positions[key] = {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
  };
  writeDraggablePositions(positions);
}

function resetDraggableSignalCards() {
  try {
    localStorage.removeItem(DRAG_STORAGE_KEY);
  } catch {
    // Reset still works visually even if localStorage is blocked.
  }
  getDraggableSignalCards().forEach((card) => {
    card.classList.remove("dragging", "user-positioned");
    card.removeAttribute("style");
  });
  document.body.classList.remove("dragging-signal-card");
}

function readDraggablePositions() {
  try {
    return JSON.parse(localStorage.getItem(DRAG_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeDraggablePositions(positions) {
  try {
    localStorage.setItem(DRAG_STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // localStorage can be unavailable in restrictive browser modes.
  }
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
    await loadMarketFallbackHistory(health.message);
    evaluateAndRender();
    return;
  }

  state.api.available = true;
  state.api.health = health.data;
  state.api.message = "TSR Data API connectée";
  elements.apiNotice.hidden = true;
  await Promise.all([loadApiHistory(), loadApiSignals()]);
  evaluateAndRender();
}

async function refreshLiveData() {
  if (state.replay.active) return;
  await loadApiHistory();
  evaluateAndRender();
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
    return loadMarketFallbackHistory(data.message);
  }
  const candles = normalizeApiCandles(extractCandles(data.data));
  if (!candles.length) {
    state.api.history = [];
    return loadMarketFallbackHistory("TSR Data API connectée mais aucune bougie /history reçue.");
  }
  state.api.available = true;
  state.api.historySource = "tsr-data-api";
  state.api.history = candles;
  markMarketFlowUpdate(candles);
  elements.apiNotice.hidden = true;
  return state.api.history;
}

async function loadMarketFallbackHistory(reason = "") {
  const params = new URLSearchParams({
    symbol: "XAUUSD",
    timeframe: state.interval,
    limit: "500",
  });

  try {
    const response = await fetch(`/api/market/history?${params.toString()}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    const candles = normalizeApiCandles(extractCandles(data));
    if (!response.ok || candles.length < 30) {
      state.api.history = [];
      state.api.historySource = "none";
      elements.apiNotice.textContent = `${reason || API_UNAVAILABLE_MESSAGE} — graphique TradingView direct actif, analyse TSR en attente de bougies.`;
      elements.apiNotice.hidden = false;
      return [];
    }

    state.api.history = candles;
    state.api.historySource = "market-fallback";
    markMarketFlowUpdate(candles);
    elements.apiNotice.textContent = `${reason ? `${reason} ` : ""}TradingView visible + analyse TSR active via flux OHLCV fallback ${data.sourceSymbol || "GC=F"}.`;
    elements.apiNotice.hidden = false;
    return state.api.history;
  } catch {
    state.api.history = [];
    state.api.historySource = "none";
    elements.apiNotice.textContent = `${reason || API_UNAVAILABLE_MESSAGE} — graphique TradingView direct actif, analyse TSR en attente de bougies.`;
    elements.apiNotice.hidden = false;
    return [];
  }
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
    candles: [],
    source: "unavailable",
    message: `Aucune bougie TSR Data API pour ${state.replay.date} ${params.timeframe}.`,
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
      cache: "no-store",
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
  elements.apiNotice.textContent = `${state.api.message} — graphique TradingView direct actif. Les overlays TSR reprendront dès que les bougies API seront disponibles.`;
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
    evaluateAndRender();
  }
}

async function resetReplaySession() {
  elements.chartFrame.classList.remove("tv-fallback-active");
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
  elements.chartFrame.classList.remove("tv-fallback-active");
  if (!state.replay.candles.length) {
    const message = state.api.message || API_UNAVAILABLE_MESSAGE;
    elements.replayStatus.textContent = message;
    clearStrategyOverlay();
    drawReplayMessage(message);
    return;
  }

  const visibleCandles = state.replay.candles.slice(0, state.replay.index + 1);
  markMarketFlowUpdate(visibleCandles);
  const context = buildReplayContext(visibleCandles);
  state.tick = state.replay.index;
  state.basePrice = context.last.close;
  const advancedSmc = buildAdvancedSmcContext(visibleCandles, context.market, context.zones, context.confirmation, context.candleScan);

  const smartResult = buildSmartMoneyAnalysis(context.session, context.market, context.news, context.zones, context.confirmation, context.candleScan, advancedSmc);
  const goldResult = buildGoldIntelligenceAnalysis(smartResult, context.market, context.news, context.zones, context.confirmation, context.session, context.candleScan, visibleCandles, advancedSmc);
  let activeResult = state.analysisMode === "gold" ? goldResult : smartResult;
  activeResult = applySignalLifecycle(activeResult);
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
  renderRiskRewardDetails(activeResult.riskReward);
  elements.confirmTf.textContent = activeResult.timeframe;
  elements.usedZone.textContent = activeResult.zone;
  elements.targetLiquidity.textContent = activeResult.liquidity;
  elements.newsRisk.textContent = "Replay: news ignorées";
  elements.blockingReason.textContent = activeResult.blockingReason;
  elements.signalLifecycleStatus.textContent = activeResult.signalLifecycleStatus || "en attente";
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

  const visible = candles.slice(-PRICE_SCALE_VISIBLE_CANDLES);
  const visibleStartIndex = candles.length - visible.length;
  const scale = buildVisiblePriceScale(visible, candles, visibleStartIndex);
  const { max, min } = scale;
  const priceRange = Math.max(0.0001, max - min);
  const topPadding = 26;
  const bottomPadding = 34;
  const leftPadding = 18;
  const rightPadding = 92;
  const plotWidth = Math.max(120, rect.width - leftPadding - rightPadding);
  const priceToY = (price) => ((max - price) / priceRange) * (rect.height - topPadding - bottomPadding) + topPadding;
  const candleWidth = Math.max(5, plotWidth / visible.length);
  const candleToX = (absoluteIndex) => {
    const localIndex = clamp(absoluteIndex - visibleStartIndex, 0, visible.length - 1);
    return leftPadding + localIndex * candleWidth + candleWidth / 2;
  };
  const geometry = {
    visible,
    visibleStartIndex,
    priceToY,
    candleToX,
    leftPadding,
    rightPadding,
    topPadding,
    bottomPadding,
    candleWidth,
    plotWidth,
    plotRight: leftPadding + plotWidth,
    rect,
    scale,
    clampPriceY: (price) => clamp(priceToY(price), topPadding, rect.height - bottomPadding),
    isPriceNearView: (price) => Number.isFinite(price) && price >= scale.discreetMin && price <= scale.discreetMax,
    isPriceVisible: (price) => Number.isFinite(price) && price >= min && price <= max,
  };

  state.lastChartRender = { candles, context, activeResult, entryProjection };
  const topDownAnalysis = getTopDownAnalysisForRender(candles, context, activeResult, entryProjection);
  state.topDownZones = topDownAnalysis.zones;
  if (state.selectedZone) state.selectedZone = state.topDownZones.find((zone) => zone.id === state.selectedZone.id) || null;
  state.chartZoneHitboxes = [];

  drawReplayGrid(ctx, rect);
  drawClassicIndicators(ctx, geometry, candles);
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

  drawReplayOverlays(ctx, rect, context, activeResult, geometry, entryProjection, topDownAnalysis);
  renderSelectedZoneInfo();
}

function drawLiveTsrOverlay(candles, context, activeResult, entryProjection) {
  const canvas = elements.replayCanvas;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height || !candles.length) {
    clearTsrOverlayCanvas();
    return;
  }
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const visible = candles.slice(-PRICE_SCALE_VISIBLE_CANDLES);
  const visibleStartIndex = candles.length - visible.length;
  const scale = buildVisiblePriceScale(visible, candles, visibleStartIndex);
  const { max, min } = scale;
  const priceRange = Math.max(0.0001, max - min);
  const topPadding = 26;
  const bottomPadding = 34;
  const leftPadding = 18;
  const rightPadding = 92;
  const plotWidth = Math.max(120, rect.width - leftPadding - rightPadding);
  const priceToY = (price) => ((max - price) / priceRange) * (rect.height - topPadding - bottomPadding) + topPadding;
  const candleWidth = Math.max(5, plotWidth / visible.length);
  const candleToX = (absoluteIndex) => {
    const localIndex = clamp(absoluteIndex - visibleStartIndex, 0, visible.length - 1);
    return leftPadding + localIndex * candleWidth + candleWidth / 2;
  };
  const geometry = {
    visible,
    visibleStartIndex,
    priceToY,
    candleToX,
    leftPadding,
    rightPadding,
    topPadding,
    bottomPadding,
    candleWidth,
    plotWidth,
    plotRight: leftPadding + plotWidth,
    rect,
    scale,
    clampPriceY: (price) => clamp(priceToY(price), topPadding, rect.height - bottomPadding),
    isPriceNearView: (price) => Number.isFinite(price) && price >= scale.discreetMin && price <= scale.discreetMax,
    isPriceVisible: (price) => Number.isFinite(price) && price >= min && price <= max,
  };

  state.lastChartRender = { candles, context, activeResult, entryProjection, liveOverlay: true };
  const topDownAnalysis = getTopDownAnalysisForRender(candles, context, activeResult, entryProjection);
  state.topDownZones = topDownAnalysis.zones;
  if (state.selectedZone) state.selectedZone = state.topDownZones.find((zone) => zone.id === state.selectedZone.id) || null;
  state.chartZoneHitboxes = [];

  drawClassicIndicators(ctx, geometry, candles);
  drawReplayOverlays(ctx, rect, context, activeResult, geometry, entryProjection, topDownAnalysis);
  renderSelectedZoneInfo();
}

function clearTsrOverlayCanvas() {
  const canvas = elements.replayCanvas;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor((rect.width || 1) * ratio));
  canvas.height = Math.max(1, Math.floor((rect.height || 1) * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width || 1, rect.height || 1);
  state.chartZoneHitboxes = [];
  state.topDownZones = [];
  state.selectedZone = null;
  renderSelectedZoneInfo();
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

function buildVisiblePriceScale(visibleCandles, allCandles, visibleStartIndex) {
  const visibleHighs = visibleCandles.map((candle) => candle.high).filter(Number.isFinite);
  const visibleLows = visibleCandles.map((candle) => candle.low).filter(Number.isFinite);
  const indicatorPrices = state.autoFitVisibleCandles ? [] : getVisibleClassicPriceValues(allCandles, visibleStartIndex);
  const high = Math.max(...visibleHighs, ...indicatorPrices);
  const low = Math.min(...visibleLows, ...indicatorPrices);
  const lastClose = visibleCandles[visibleCandles.length - 1]?.close;
  const fallbackCenter = Number.isFinite(lastClose) ? lastClose : state.basePrice;
  const rawRange = Number.isFinite(high - low) && high > low ? high - low : Math.max(2, fallbackCenter * 0.0008);
  const center = Number.isFinite(high) && Number.isFinite(low) ? (high + low) / 2 : fallbackCenter;
  const padding = Math.max(0.8, rawRange * PRICE_SCALE_MARGIN_RATIO);
  const min = center - rawRange / 2 - padding;
  const max = center + rawRange / 2 + padding;
  const extended = Math.max(1.2, (max - min) * 0.35);

  return {
    min,
    max,
    rawHigh: high,
    rawLow: low,
    discreetMin: min - extended,
    discreetMax: max + extended,
  };
}

function getTopDownAnalysisForRender(candles, context, activeResult, entryProjection) {
  const cacheKey = getTopDownCacheKey(candles, context);
  const cached = state.tsrAnalysis.cached || { zones: [], bias: "WAIT" };
  const refreshedCached = refreshCachedTopDownStatuses(cached, candles, context, activeResult, entryProjection);
  state.tsrAnalysis.cached = refreshedCached;

  if (cacheKey && cacheKey !== state.tsrAnalysis.cacheKey && !state.tsrAnalysis.pending) {
    scheduleTopDownAnalysis(cacheKey, candles, context, activeResult, entryProjection);
  }

  return refreshedCached;
}

function getTopDownCacheKey(candles, context) {
  const last = candles[candles.length - 1];
  if (!last) return "";
  const lastTime = last.time instanceof Date ? last.time.getTime() : Date.now();
  const h1Bucket = state.replay.active ? Math.floor(candles.length / 4) : Math.floor(lastTime / 3600000);
  const structureSource = candles.slice(-96);
  const high = Math.max(...structureSource.map((candle) => candle.high));
  const low = Math.min(...structureSource.map((candle) => candle.low));
  const structureKey = `${Math.round(high * 10)}-${Math.round(low * 10)}-${context.market?.bias || "WAIT"}`;
  return `${state.intervalLabel}-${h1Bucket}-${structureKey}`;
}

function refreshCachedTopDownStatuses(cached, candles, context, activeResult, entryProjection) {
  const last = candles[candles.length - 1];
  if (!last || !cached?.zones?.length) return cached || { zones: [], bias: "WAIT" };
  return {
    ...cached,
    zones: cached.zones.map((zone) => enrichTopDownZone(zone, last, context, activeResult, entryProjection)),
  };
}

function scheduleTopDownAnalysis(cacheKey, candles, context, activeResult, entryProjection) {
  state.tsrAnalysis.pending = true;
  state.tsrAnalysis.status = "running";
  state.tsrAnalysis.lastError = "";
  updateFlowMonitor();

  const analysisCandles = candles.slice(-220);
  const analysisContext = {
    ...context,
    market: { ...context.market },
    zones: { ...context.zones },
    confirmation: { ...context.confirmation },
    last: context.last ? { ...context.last } : analysisCandles[analysisCandles.length - 1],
  };
  const analysisResult = { ...activeResult };
  const analysisProjection = entryProjection ? { ...entryProjection, setup: { ...entryProjection.setup }, metrics: { ...entryProjection.metrics } } : null;

  window.setTimeout(() => {
    try {
      const result = buildTopDownAnalysis(analysisCandles, analysisContext, analysisResult, analysisProjection);
      state.tsrAnalysis.cached = result;
      state.tsrAnalysis.cacheKey = cacheKey;
      state.tsrAnalysis.status = "active";
      state.tsrAnalysis.lastAnalysisAt = Date.now();
      state.tsrAnalysis.lastError = "";
    } catch (error) {
      state.tsrAnalysis.status = "blocked";
      state.tsrAnalysis.lastError = error?.message || "Analyse TSR bloquée";
    } finally {
      state.tsrAnalysis.pending = false;
      updateFlowMonitor();
    }

    const latest = state.lastChartRender;
    if (latest && getTopDownCacheKey(latest.candles, latest.context) === cacheKey) {
      window.requestAnimationFrame(() => {
        if (latest.liveOverlay && !state.replay.active) {
          drawLiveTsrOverlay(latest.candles, latest.context, latest.activeResult, latest.entryProjection);
        } else {
          drawReplayChart(latest.candles, latest.context, latest.activeResult, latest.entryProjection);
        }
      });
    }
  }, 0);
}

function getVisibleClassicPriceValues(candles, visibleStartIndex) {
  const classic = state.classicVisibility;
  const values = [];
  const collect = (series) => values.push(...series.slice(visibleStartIndex).filter(Number.isFinite));
  if (classic.ema20) collect(calculateEmaSeries(candles, 20));
  if (classic.ema50) collect(calculateEmaSeries(candles, 50));
  if (classic.ema200) collect(calculateEmaSeries(candles, 200));
  if (classic.vwap) collect(calculateVwapSeries(candles));
  if (classic.superTrend) collect(calculateSuperTrendSeries(candles).map((item) => item?.value));
  return values;
}

function drawClassicIndicators(ctx, geometry, candles) {
  const classic = state.classicVisibility;
  if (classic.volume) drawVolumeBars(ctx, geometry, candles);
  if (classic.ema20) drawIndicatorSeries(ctx, geometry, calculateEmaSeries(candles, 20), "#3bd8bd", "EMA 20");
  if (classic.ema50) drawIndicatorSeries(ctx, geometry, calculateEmaSeries(candles, 50), "#74a7ff", "EMA 50");
  if (classic.ema200) drawIndicatorSeries(ctx, geometry, calculateEmaSeries(candles, 200), "#e7b84e", "EMA 200");
  if (classic.vwap) drawIndicatorSeries(ctx, geometry, calculateVwapSeries(candles), "#dcd6c8", "VWAP");
  if (classic.superTrend) drawSuperTrendSeries(ctx, geometry, calculateSuperTrendSeries(candles));
}

function drawVolumeBars(ctx, geometry, candles) {
  const { visible, visibleStartIndex, candleToX, candleWidth, rect, bottomPadding, plotRight } = geometry;
  const maxVolume = Math.max(1, ...visible.map((candle) => candle.volume || 0));
  const baseY = rect.height - bottomPadding + 24;
  const maxHeight = Math.min(62, rect.height * 0.16);

  ctx.save();
  ctx.globalAlpha = 0.42;
  visible.forEach((candle, localIndex) => {
    const absoluteIndex = visibleStartIndex + localIndex;
    const height = clamp(((candle.volume || 0) / maxVolume) * maxHeight, 1, maxHeight);
    const x = candleToX(absoluteIndex);
    ctx.fillStyle = candle.close >= candle.open ? "rgba(70, 209, 123, 0.58)" : "rgba(239, 98, 98, 0.58)";
    ctx.fillRect(x - candleWidth * 0.28, baseY - height, candleWidth * 0.56, height);
  });
  ctx.restore();
  ctx.fillStyle = "rgba(220, 214, 200, 0.68)";
  ctx.font = "800 10px ui-sans-serif, system-ui";
  ctx.fillText("Volume", Math.min(plotRight - 58, 18), baseY - maxHeight - 5);
}

function drawIndicatorSeries(ctx, geometry, values, color, label) {
  const { visible, visibleStartIndex, candleToX, priceToY, topPadding, bottomPadding, rect, plotRight } = geometry;
  let started = false;
  let lastPoint = null;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  for (let localIndex = 0; localIndex < visible.length; localIndex += 1) {
    const absoluteIndex = visibleStartIndex + localIndex;
    const value = values[absoluteIndex];
    if (!Number.isFinite(value)) continue;
    const x = candleToX(absoluteIndex);
    const y = clamp(priceToY(value), topPadding, rect.height - bottomPadding);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
    lastPoint = { x, y };
  }
  if (!started) return;
  ctx.stroke();
  if (lastPoint) {
    ctx.fillStyle = color;
    ctx.font = "800 10px ui-sans-serif, system-ui";
    ctx.fillText(label, Math.min(lastPoint.x + 6, plotRight - 52), lastPoint.y - 6);
  }
}

function drawSuperTrendSeries(ctx, geometry, values) {
  const { visible, visibleStartIndex, candleToX, priceToY, topPadding, bottomPadding, rect, plotRight } = geometry;
  let previous = null;
  values.slice(visibleStartIndex, visibleStartIndex + visible.length).forEach((item, localIndex) => {
    const absoluteIndex = visibleStartIndex + localIndex;
    if (!item || !Number.isFinite(item.value)) return;
    const point = {
      x: candleToX(absoluteIndex),
      y: clamp(priceToY(item.value), topPadding, rect.height - bottomPadding),
      trend: item.trend,
    };
    if (previous) {
      ctx.strokeStyle = point.trend === "BUY" ? "#46d17b" : "#ef6262";
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    previous = point;
  });
  if (previous) {
    ctx.fillStyle = previous.trend === "BUY" ? "#46d17b" : "#ef6262";
    ctx.font = "800 10px ui-sans-serif, system-ui";
    ctx.fillText("SuperTrend", Math.min(previous.x + 6, plotRight - 76), previous.y - 6);
  }
}

function calculateEmaSeries(candles, period) {
  const values = Array(candles.length).fill(null);
  if (candles.length < period) return values;
  const multiplier = 2 / (period + 1);
  let ema = average(candles.slice(0, period).map((candle) => candle.close));
  values[period - 1] = ema;
  for (let index = period; index < candles.length; index += 1) {
    ema = candles[index].close * multiplier + ema * (1 - multiplier);
    values[index] = ema;
  }
  return values;
}

function calculateVwapSeries(candles) {
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  return candles.map((candle) => {
    const volume = Math.max(1, Number(candle.volume) || 1);
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativePriceVolume += typicalPrice * volume;
    cumulativeVolume += volume;
    return cumulativePriceVolume / cumulativeVolume;
  });
}

function calculateAtrSeries(candles, period = 10) {
  return candles.map((candle, index) => {
    const previousClose = candles[index - 1]?.close ?? candle.close;
    const trueRange = Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
    if (index === 0) return trueRange;
    const start = Math.max(0, index - period + 1);
    const ranges = candles.slice(start, index + 1).map((item, itemIndex) => {
      const absoluteIndex = start + itemIndex;
      const prevClose = candles[absoluteIndex - 1]?.close ?? item.close;
      return Math.max(item.high - item.low, Math.abs(item.high - prevClose), Math.abs(item.low - prevClose));
    });
    return average(ranges);
  });
}

function calculateSuperTrendSeries(candles) {
  const atr = calculateAtrSeries(candles, 10);
  const ema = calculateEmaSeries(candles, 20);
  let trend = "WAIT";
  return candles.map((candle, index) => {
    const basis = (candle.high + candle.low) / 2;
    const reference = ema[index] ?? candle.close;
    if (candle.close > reference) trend = "BUY";
    if (candle.close < reference) trend = "SELL";
    const distance = Math.max(0.8, atr[index] * 1.65);
    return {
      value: trend === "SELL" ? basis + distance : basis - distance,
      trend: trend === "WAIT" ? candle.close >= candle.open ? "BUY" : "SELL" : trend,
    };
  });
}

function buildTopDownAnalysis(candles, context, activeResult, entryProjection) {
  const usableCandles = candles.filter((candle) => [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite));
  const last = usableCandles[usableCandles.length - 1];
  if (!last || usableCandles.length < 12) return { zones: [], bias: "WAIT" };

  const broad = usableCandles.slice(-Math.min(usableCandles.length, 180));
  const broadHigh = Math.max(...broad.map((candle) => candle.high));
  const broadLow = Math.min(...broad.map((candle) => candle.low));
  const broadMid = broadLow + (broadHigh - broadLow) / 2;
  const globalBias = last.close >= broadMid ? "SELL" : "BUY";
  const zones = [];
  const seen = new Set();

  TOP_DOWN_TIMEFRAMES.forEach((timeframe) => {
    const segment = usableCandles.slice(-Math.min(usableCandles.length, timeframe.group));
    if (segment.length < 8) return;
    const startIndex = usableCandles.length - segment.length;
    const structure = getSegmentStructure(segment, startIndex);
    const tfBias = getTopDownBias(segment, structure, globalBias);
    addTopDownObZone(zones, seen, segment, startIndex, timeframe, tfBias, last, context, activeResult, entryProjection);
    addTopDownFvgZone(zones, seen, segment, startIndex, timeframe, tfBias, last, context, activeResult, entryProjection);
    addTopDownLiquidityZones(zones, seen, segment, startIndex, timeframe, tfBias, last, context, activeResult, entryProjection);
    addTopDownOteZone(zones, seen, segment, startIndex, timeframe, tfBias, last, structure, context, activeResult, entryProjection);
  });

  const rankedZones = zones
    .filter((zone) => Number.isFinite(zone.top) && Number.isFinite(zone.bottom) && zone.top !== zone.bottom)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  return { zones: rankedZones, bias: globalBias };
}

function getSegmentStructure(segment, startIndex) {
  let highIndex = 0;
  let lowIndex = 0;
  segment.forEach((candle, index) => {
    if (candle.high > segment[highIndex].high) highIndex = index;
    if (candle.low < segment[lowIndex].low) lowIndex = index;
  });
  return {
    swingHigh: segment[highIndex].high,
    swingLow: segment[lowIndex].low,
    highIndex: startIndex + highIndex,
    lowIndex: startIndex + lowIndex,
    range: Math.max(0.0001, segment[highIndex].high - segment[lowIndex].low),
  };
}

function getTopDownBias(segment, structure, fallbackBias) {
  const first = segment[0];
  const last = segment[segment.length - 1];
  const move = last.close - first.open;
  if (Math.abs(move) < structure.range * 0.12) return fallbackBias;
  return move > 0 ? "BUY" : "SELL";
}

function addTopDownObZone(zones, seen, segment, startIndex, timeframe, direction, last, context, activeResult, entryProjection) {
  if (direction !== "BUY" && direction !== "SELL") return;
  const impulse = findDisplacementCandle(segment, direction);
  if (!impulse) return;
  const searchEnd = Math.max(0, impulse.index);
  const opposite = direction === "BUY"
    ? findLastCandle(segment.slice(0, searchEnd), (candle) => candle.close < candle.open)
    : findLastCandle(segment.slice(0, searchEnd), (candle) => candle.close > candle.open);
  if (!opposite) return;
  const absoluteIndex = startIndex + opposite.index;
  const height = Math.max(opposite.candle.high - opposite.candle.low, Math.abs(opposite.candle.close - opposite.candle.open), 0.7);
  const top = Math.max(opposite.candle.open, opposite.candle.close) + height * 0.12;
  const bottom = Math.min(opposite.candle.open, opposite.candle.close) - height * 0.12;
  pushTopDownZone(zones, seen, {
    type: "OB",
    timeframe: timeframe.label,
    direction,
    startIndex: absoluteIndex,
    endIndex: startIndex + segment.length - 1,
    top,
    bottom,
    score: timeframe.weight + 36 + (impulse.scan.detections.displacement ? 10 : 0),
    reason: `OB ${timeframe.label} cree par derniere bougie opposee avant displacement ${direction}`,
    source: timeframe.role,
  }, last, context, activeResult, entryProjection);
}

function addTopDownFvgZone(zones, seen, segment, startIndex, timeframe, direction, last, context, activeResult, entryProjection) {
  const fvg = findTopDownFvg(segment, direction);
  if (!fvg) return;
  pushTopDownZone(zones, seen, {
    type: "FVG",
    timeframe: timeframe.label,
    direction,
    startIndex: startIndex + fvg.index - 2,
    endIndex: startIndex + segment.length - 1,
    top: fvg.top,
    bottom: fvg.bottom,
    score: timeframe.weight + 28 + (timeframe.label === "M15" || timeframe.label === "M5" ? 8 : 0),
    reason: `FVG ${timeframe.label} reel detecte entre trois bougies`,
    source: timeframe.role,
  }, last, context, activeResult, entryProjection);
}

function addTopDownLiquidityZones(zones, seen, segment, startIndex, timeframe, direction, last, context, activeResult, entryProjection) {
  const equalHigh = findEqualLiquidity(segment, "high");
  const equalLow = findEqualLiquidity(segment, "low");
  if (equalHigh && (direction === "SELL" || timeframe.weight >= 18)) {
    const pad = Math.max(0.35, equalHigh.tolerance * 1.3);
    pushTopDownZone(zones, seen, {
      type: "Liquidite",
      timeframe: timeframe.label,
      direction: "SELL",
      startIndex: startIndex + equalHigh.start,
      endIndex: startIndex + equalHigh.end,
      top: equalHigh.price + pad,
      bottom: equalHigh.price - pad,
      score: timeframe.weight + 24,
      reason: `Equal High ${timeframe.label} / liquidite haute visible`,
      source: timeframe.role,
    }, last, context, activeResult, entryProjection);
  }
  if (equalLow && (direction === "BUY" || timeframe.weight >= 18)) {
    const pad = Math.max(0.35, equalLow.tolerance * 1.3);
    pushTopDownZone(zones, seen, {
      type: "Liquidite",
      timeframe: timeframe.label,
      direction: "BUY",
      startIndex: startIndex + equalLow.start,
      endIndex: startIndex + equalLow.end,
      top: equalLow.price + pad,
      bottom: equalLow.price - pad,
      score: timeframe.weight + 24,
      reason: `Equal Low ${timeframe.label} / liquidite basse visible`,
      source: timeframe.role,
    }, last, context, activeResult, entryProjection);
  }
}

function addTopDownOteZone(zones, seen, segment, startIndex, timeframe, direction, last, structure, context, activeResult, entryProjection) {
  if ((direction !== "BUY" && direction !== "SELL") || timeframe.weight < 11) return;
  const range = structure.range;
  const buyLower = structure.swingHigh - range * 0.79;
  const buyUpper = structure.swingHigh - range * 0.618;
  const sellLower = structure.swingLow + range * 0.618;
  const sellUpper = structure.swingLow + range * 0.79;
  const lower = direction === "BUY" ? Math.min(buyLower, buyUpper) : Math.min(sellLower, sellUpper);
  const upper = direction === "BUY" ? Math.max(buyLower, buyUpper) : Math.max(sellLower, sellUpper);
  const center = direction === "BUY" ? structure.swingHigh - range * 0.705 : structure.swingLow + range * 0.705;
  pushTopDownZone(zones, seen, {
    type: "OTE",
    timeframe: timeframe.label,
    direction,
    startIndex: Math.min(structure.highIndex, structure.lowIndex),
    endIndex: startIndex + segment.length - 1,
    top: upper,
    bottom: lower,
    score: timeframe.weight + 18,
    reason: `OTE 0.618-0.79 ${timeframe.label}, centre 0.705 a ${formatPrice(center)}`,
    source: "premium / discount",
  }, last, context, activeResult, entryProjection);
}

function pushTopDownZone(zones, seen, zone, last, context, activeResult, entryProjection) {
  const top = Math.max(zone.top, zone.bottom);
  const bottom = Math.min(zone.top, zone.bottom);
  const id = `${zone.type}-${zone.timeframe}-${zone.direction}-${Math.round(top * 10)}-${Math.round(bottom * 10)}-${zone.startIndex}`;
  if (seen.has(id)) return;
  seen.add(id);
  const enriched = enrichTopDownZone({ ...zone, id, top, bottom }, last, context, activeResult, entryProjection);
  if (enriched.score >= 42) zones.push(enriched);
}

function enrichTopDownZone(zone, last, context, activeResult, entryProjection) {
  const baseReason = zone.baseReason || zone.reason;
  const range = Math.max(0.0001, zone.top - zone.bottom);
  const distance = last.close > zone.top ? last.close - zone.top : last.close < zone.bottom ? zone.bottom - last.close : 0;
  const inside = last.high >= zone.bottom && last.low <= zone.top;
  const near = distance <= Math.max(range * 2.2, Math.abs(last.close) * 0.0012);
  const invalidated = zone.direction === "BUY" ? last.close < zone.bottom - range * 0.35 : last.close > zone.top + range * 0.35;
  const confirmed = activeResult.valid && activeResult.direction === zone.direction && inside;
  const status = invalidated ? "invalidée" : confirmed ? "signal confirmé" : inside ? "entrée imminente" : near ? "entrée potentielle" : "zone future";
  const setup = zone.direction === "BUY"
    ? buildZoneSetup(zone, last.close, zone.bottom - range * 0.45, 1)
    : buildZoneSetup(zone, last.close, zone.top + range * 0.45, -1);
  const score = clamp(Math.round(zone.score + (inside ? 16 : near ? 9 : 0) + (context.confirmation?.choch ? 7 : 0) + (entryProjection?.stage === "confirmed" ? 10 : 0) - (invalidated ? 32 : 0)), 0, 100);
  return {
    ...zone,
    score,
    status,
    invalidation: zone.direction === "BUY" ? `Cloture sous ${formatPrice(zone.bottom - range * 0.35)}` : `Cloture au-dessus de ${formatPrice(zone.top + range * 0.35)}`,
    entry: setup.entry,
    sl: setup.sl,
    tp1: setup.tp1,
    tp2: setup.tp2,
    tp3: setup.tp3,
    label: `${zone.type} ${zone.timeframe} ${zone.direction}`,
    baseReason,
    reason: `${baseReason} + statut ${status}`,
  };
}

function buildZoneSetup(zone, referencePrice, stop, sign) {
  const entryRaw = zone.direction === "BUY" ? Math.min(Math.max(referencePrice, zone.bottom), zone.top) : Math.max(Math.min(referencePrice, zone.top), zone.bottom);
  const risk = Math.max(0.0001, Math.abs(entryRaw - stop));
  return {
    entry: formatPrice(entryRaw),
    sl: formatPrice(stop),
    tp1: formatPrice(entryRaw + sign * risk * 1.25),
    tp2: formatPrice(entryRaw + sign * risk * 2),
    tp3: formatPrice(entryRaw + sign * risk * 3),
  };
}

function findDisplacementCandle(segment, direction) {
  const scanned = segment.map((_, index) => scanCandle(segment, index)).filter(Boolean);
  return scanned
    .map((scan, index) => ({ scan, index }))
    .reverse()
    .find(({ scan }) => {
      const aligned = direction === "BUY" ? scan.close > scan.open : scan.close < scan.open;
      return aligned && (scan.detections.displacement || scan.bodyRatio >= 0.52) && scan.totalSize > 0;
    }) || null;
}

function findLastCandle(segment, predicate) {
  for (let index = segment.length - 1; index >= 0; index -= 1) {
    if (predicate(segment[index])) return { candle: segment[index], index };
  }
  return null;
}

function findTopDownFvg(segment, direction) {
  for (let index = segment.length - 1; index >= 2; index -= 1) {
    const before = segment[index - 2];
    const current = segment[index];
    if (direction === "BUY" && current.low > before.high) return { index, top: current.low, bottom: before.high };
    if (direction === "SELL" && current.high < before.low) return { index, top: before.low, bottom: current.high };
  }
  return null;
}

function findEqualLiquidity(segment, field) {
  const range = Math.max(0.0001, Math.max(...segment.map((candle) => candle.high)) - Math.min(...segment.map((candle) => candle.low)));
  const tolerance = Math.max(0.25, range * 0.012);
  for (let index = segment.length - 1; index >= 4; index -= 1) {
    const price = segment[index][field];
    for (let compare = index - 3; compare >= Math.max(0, index - 18); compare -= 1) {
      const other = segment[compare][field];
      if (Math.abs(price - other) <= tolerance) {
        return { price: (price + other) / 2, start: compare, end: index, tolerance };
      }
    }
  }
  return null;
}

function drawReplayOverlays(ctx, rect, context, activeResult, geometry, entryProjection, topDownAnalysis = { zones: [] }) {
  const visible = state.smartMoneyVisibility;
  const { priceToY, candleToX, visible: candles, visibleStartIndex, plotRight } = geometry;
  const highY = priceToY(context.previousHigh);
  const lowY = priceToY(context.previousLow);
  const lastIndex = visibleStartIndex + candles.length - 1;
  const swingHighIndex = findSwingIndex(candles, "high") + visibleStartIndex;
  const swingLowIndex = findSwingIndex(candles, "low") + visibleStartIndex;

  drawTopDownZones(ctx, rect, geometry, topDownAnalysis.zones || []);
  if (visible.equalHigh || visible.previousHL) drawReplayLine(ctx, highY, "#74a7ff", "Previous High / EQH", rect);
  if (visible.equalLow || visible.previousHL) drawReplayLine(ctx, lowY, "#74a7ff", "Previous Low / EQL", rect);
  if (visible.liquiditySweep && context.zones.liquidityTaken) {
    const sweepIndex = context.market.bias === "SELL" ? swingHighIndex : swingLowIndex;
    const sweepPrice = context.market.bias === "SELL" ? context.previousHigh : context.previousLow;
    drawReplayLabel(ctx, candleToX(sweepIndex) + 8, priceToY(sweepPrice) - 18, "Sweep", "#74a7ff");
  }
  if (visible.bos && context.confirmation.choch) {
    const bosY = context.market.bias === "SELL" ? lowY : highY;
    drawAnchoredSegment(ctx, candleToX(swingLowIndex), bosY, candleToX(lastIndex), bosY, "#46d17b", "BOS");
  }
  if (visible.choch && context.confirmation.choch) {
    const chochIndex = Math.max(visibleStartIndex, lastIndex - 8);
    const chochY = priceToY(context.last.close);
    drawAnchoredSegment(ctx, candleToX(chochIndex), chochY, candleToX(lastIndex), chochY, "#e7b84e", "ChoCH");
  }
  if (visible.idm) {
    const idmIndex = Math.max(visibleStartIndex, lastIndex - 18);
    const idmPrice = candles[Math.max(0, candles.length - 18)]?.close || context.last.close;
    drawAnchoredSegment(ctx, candleToX(idmIndex), priceToY(idmPrice), candleToX(Math.min(lastIndex, idmIndex + 8)), priceToY(idmPrice), "#101010", "IDM");
  }
  if (visible.target) {
    const targetPrice = context.market.bias === "SELL" ? context.previousLow : context.previousHigh;
    drawAnchoredSegment(ctx, candleToX(Math.max(visibleStartIndex, lastIndex - 24)), priceToY(targetPrice), Math.min(plotRight, candleToX(lastIndex) + 80), priceToY(targetPrice), "#111", "Target");
  }
  if (visible.trendlines) {
    ctx.strokeStyle = "rgba(116, 167, 255, 0.75)";
    ctx.beginPath();
    ctx.moveTo(candleToX(Math.max(visibleStartIndex, lastIndex - 42)), priceToY(context.previousLow));
    ctx.lineTo(candleToX(lastIndex), priceToY(context.last.close));
    ctx.stroke();
  }
  const projectionZone = (topDownAnalysis.zones || []).find((zone) => zone.direction === entryProjection?.direction && zone.status !== "invalidée");
  drawReplayEntryProjection(ctx, rect, entryProjection, geometry, projectionZone);
}

function drawTopDownZones(ctx, rect, geometry, zones) {
  state.chartZoneHitboxes = [];
  zones.forEach((zone) => {
    if (!shouldDrawTopDownZone(zone)) return;
    drawTopDownZone(ctx, rect, geometry, zone);
  });
}

function shouldDrawTopDownZone(zone) {
  const visible = state.smartMoneyVisibility;
  const typeVisible = zone.type === "OB"
    ? visible.orderBlocks
    : zone.type === "FVG"
      ? visible.fvg
      : zone.type === "OTE"
        ? visible.ote || visible.premiumDiscount
        : visible.equalHigh || visible.equalLow || visible.liquiditySweep || visible.previousHL;
  if (!typeVisible) return false;
  if (zone.status === "zone future") return Boolean(visible.futureZones || visible.entryZones);
  if (zone.status === "entrée potentielle") return Boolean(visible.potentialEntries);
  if (zone.status === "entrée imminente") return Boolean(visible.imminentEntries);
  if (zone.status === "signal confirmé") return Boolean(visible.confirmedSignals);
  if (zone.status === "invalidée") return Boolean(visible.futureZones);
  return true;
}

function drawTopDownZone(ctx, rect, geometry, zone) {
  const { candleToX, candleWidth, plotRight, clampPriceY, isPriceNearView } = geometry;
  if (!isPriceNearView(zone.top) && !isPriceNearView(zone.bottom)) return;
  const left = Math.max(8, candleToX(zone.startIndex) - candleWidth * 0.45);
  const right = Math.min(plotRight, candleToX(zone.endIndex) + candleWidth * 0.45);
  const topY = clampPriceY(zone.top);
  const bottomY = clampPriceY(zone.bottom);
  const y = Math.min(topY, bottomY);
  const height = Math.max(8, Math.min(190, Math.abs(bottomY - topY)));
  const width = Math.max(42, right - left);
  const style = getTopDownZoneStyle(zone);

  ctx.save();
  ctx.globalAlpha = style.alpha;
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.lineWidth;
  if (zone.status === "invalidée") ctx.setLineDash([5, 5]);
  ctx.fillRect(left, y, width, height);
  ctx.strokeRect(left, y, width, height);
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.fillStyle = style.text;
  ctx.font = "800 11px ui-sans-serif, system-ui";
  const label = `${zone.type} ${zone.timeframe} ${zone.direction} · ${zone.score}`;
  ctx.fillText(label, left + 8, clamp(y + 16, 28, rect.height - 18));
  if (zone.status !== "zone future") {
    ctx.font = "700 10px ui-sans-serif, system-ui";
    ctx.fillText(zone.status, left + 8, clamp(y + 31, 42, rect.height - 10));
  }
  ctx.restore();

  state.chartZoneHitboxes.push({ id: zone.id, left, right: left + width, top: y, bottom: y + height });
}

function getTopDownZoneStyle(zone) {
  const htf = ["Mensuel", "Weekly", "Daily", "H4", "H1"].includes(zone.timeframe);
  const alpha = zone.status === "invalidée" ? 0.18 : zone.status === "signal confirmé" ? 0.86 : htf ? 0.42 : 0.62;
  if (zone.type === "OB") return { fill: "rgba(231, 184, 78, 0.18)", stroke: "rgba(231, 184, 78, 0.78)", text: "#f5d56f", alpha, lineWidth: htf ? 1 : 1.4 };
  if (zone.type === "FVG") return { fill: "rgba(59, 216, 189, 0.15)", stroke: "rgba(59, 216, 189, 0.72)", text: "#6ff5dc", alpha, lineWidth: htf ? 1 : 1.4 };
  if (zone.type === "OTE") return { fill: "rgba(116, 167, 255, 0.12)", stroke: "rgba(116, 167, 255, 0.7)", text: "#aecaFF", alpha, lineWidth: htf ? 1 : 1.2 };
  return { fill: "rgba(239, 98, 98, 0.11)", stroke: "rgba(239, 98, 98, 0.68)", text: "#ffb0b0", alpha, lineWidth: htf ? 1 : 1.2 };
}

function findSwingIndex(candles, field) {
  if (!candles.length) return 0;
  let bestIndex = 0;
  candles.forEach((candle, index) => {
    if (field === "high" && candle.high > candles[bestIndex].high) bestIndex = index;
    if (field === "low" && candle.low < candles[bestIndex].low) bestIndex = index;
  });
  return bestIndex;
}

function getReplayOrderBlockZone(candles, direction, visibleStartIndex) {
  const search = candles.slice(-34);
  const offset = candles.length - search.length;
  const targetIsBearish = direction === "BUY";
  const foundIndex = search
    .map((candle, index) => ({ candle, index }))
    .reverse()
    .find(({ candle }) => targetIsBearish ? candle.close < candle.open : candle.close > candle.open)?.index ?? Math.max(0, search.length - 12);
  const absoluteIndex = visibleStartIndex + offset + foundIndex;
  const candle = search[foundIndex] || candles[candles.length - 1];
  const height = Math.max(Math.abs(candle.open - candle.close), (candle.high - candle.low) * 0.45, 1.2);
  const top = Math.max(candle.open, candle.close) + height * 0.35;
  const bottom = Math.min(candle.open, candle.close) - height * 0.35;

  return {
    startIndex: absoluteIndex,
    endIndex: visibleStartIndex + candles.length - 1,
    top,
    bottom,
  };
}

function getReplayFvgZone(candles, direction, visibleStartIndex) {
  for (let index = candles.length - 1; index >= 2; index -= 1) {
    const before = candles[index - 2];
    const current = candles[index];
    if (direction === "BUY" && current.low > before.high) {
      return {
        startIndex: visibleStartIndex + index - 2,
        endIndex: visibleStartIndex + candles.length - 1,
        top: current.low,
        bottom: before.high,
      };
    }
    if (direction === "SELL" && current.high < before.low) {
      return {
        startIndex: visibleStartIndex + index - 2,
        endIndex: visibleStartIndex + candles.length - 1,
        top: before.low,
        bottom: current.high,
      };
    }
  }
  return null;
}

function drawPriceTimeZone(ctx, zone, geometry, options) {
  if (!zone) return;
  const { priceToY, candleToX, candleWidth, plotRight, clampPriceY, isPriceNearView } = geometry;
  const topNear = isPriceNearView(zone.top);
  const bottomNear = isPriceNearView(zone.bottom);
  if (!topNear && !bottomNear) return;
  const left = candleToX(zone.startIndex) - candleWidth * 0.45;
  const right = Math.min(plotRight, candleToX(zone.endIndex) + candleWidth * 0.45);
  const top = clampPriceY(zone.top);
  const bottom = clampPriceY(zone.bottom);
  const y = Math.min(top, bottom);
  const height = Math.min(180, Math.max(10, Math.abs(bottom - top)));
  const width = Math.max(24, right - left);

  ctx.fillStyle = options.fill;
  ctx.strokeStyle = options.stroke;
  ctx.lineWidth = 1;
  ctx.fillRect(left, y, width, height);
  ctx.strokeRect(left, y, width, height);
  ctx.fillStyle = "#111";
  ctx.font = "800 11px ui-sans-serif, system-ui";
  ctx.fillText(options.label, left + width / 2 - 10, y + 16);
}

function drawAnchoredSegment(ctx, x1, y1, x2, y2, color, label) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.font = "800 11px ui-sans-serif, system-ui";
  ctx.fillText(label, Math.min(x1, x2) + Math.abs(x2 - x1) / 2 + 6, y1 - 5);
}

function drawReplayEntryProjection(ctx, rect, projection, geometry, sourceZone = null) {
  if (!projection || projection.direction === "WAIT") return;
  const visible = state.smartMoneyVisibility;
  const { priceToY, candleToX, visibleStartIndex, clampPriceY, isPriceNearView } = geometry;
  const isBuy = projection.direction === "BUY";
  const color = isBuy ? "#46d17b" : "#ef6262";
  const entry = parsePrice(projection.setup.entry);
  const sl = parsePrice(projection.setup.sl);
  const tp1 = parsePrice(projection.setup.tp1);
  const entryNear = isPriceNearView(entry);
  const slNear = isPriceNearView(sl);
  const tp1Near = isPriceNearView(tp1);
  const zoneY = entryNear ? clampPriceY(entry) : isBuy ? rect.height * 0.58 : rect.height * 0.28;
  const slY = slNear ? clampPriceY(sl) : zoneY + (isBuy ? 44 : -44);
  const zoneTop = Number.isFinite(sl) ? Math.min(zoneY, slY) : zoneY;
  const zoneHeight = Number.isFinite(sl) ? Math.min(160, Math.max(32, Math.abs(slY - zoneY))) : 48;
  const zoneLeft = candleToX(visibleStartIndex + Math.max(6, geometry.visible.length - 18));
  const zoneWidth = Math.max(90, rect.width - zoneLeft - 112);
  const stageRank = { future: 1, potential: 2, imminent: 3, confirmed: 4 }[projection.stage] || 0;
  if (!sourceZone && stageRank < 4) return;
  const projectionNearView = !Number.isFinite(entry) || entryNear || slNear || tp1Near;
  if (!projectionNearView) {
    drawReplayLabel(ctx, zoneLeft, isBuy ? rect.height - 62 : 34, `${projection.direction} hors echelle visible`, color);
    return;
  }

  if ((visible.entryZones || visible.futureZones) && visible.futureZones && stageRank >= 1) {
    const sourceTop = sourceZone ? clampPriceY(sourceZone.top) : zoneTop;
    const sourceBottom = sourceZone ? clampPriceY(sourceZone.bottom) : zoneTop + zoneHeight;
    const anchoredTop = Math.min(sourceTop, sourceBottom);
    const anchoredHeight = Math.max(20, Math.min(160, Math.abs(sourceBottom - sourceTop)));
    ctx.fillStyle = isBuy ? "rgba(70, 209, 123, 0.08)" : "rgba(239, 98, 98, 0.08)";
    ctx.strokeStyle = isBuy ? "rgba(70, 209, 123, 0.34)" : "rgba(239, 98, 98, 0.34)";
    ctx.strokeRect(zoneLeft, anchoredTop, zoneWidth, anchoredHeight);
    ctx.fillRect(zoneLeft, anchoredTop, zoneWidth, anchoredHeight);
    drawReplayLabel(ctx, zoneLeft + 8, clamp(anchoredTop - 28, 28, rect.height - 64), `Zone potentielle ${projection.direction}`, color);
  }
  if (visible.potentialEntries && stageRank >= 2) drawReplayLabel(ctx, zoneLeft + 8, zoneTop + zoneHeight + 8, "Entrée potentielle — attendre réaction", "#e7b84e");
  if (visible.imminentEntries && stageRank >= 3) drawReplayLabel(ctx, zoneLeft + 8, zoneTop + zoneHeight + 38, "Entrée imminente — prépare-toi", color);
  if (visible.confirmedSignals && stageRank >= 4) drawReplayLabel(ctx, zoneLeft + 8, Number.isFinite(tp1) ? priceToY(tp1) - 24 : zoneTop + zoneHeight + 68, `${projection.direction} confirmé`, color);

  const showPositionTool = stageRank >= 4 && ((isBuy && visible.longPositionTool) || (!isBuy && visible.shortPositionTool));
  if (showPositionTool) drawReplayPositionTool(ctx, rect, projection, geometry, color);
}

function drawReplayPositionTool(ctx, rect, projection, geometry, color) {
  const visible = state.smartMoneyVisibility;
  const { priceToY, clampPriceY, isPriceNearView } = geometry;
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
  if (!Number.isFinite(y) || y < -20 || y > rect.height + 20) return;
  const safeY = clamp(y, 26, rect.height - 34);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(8, safeY);
  ctx.lineTo(rect.width - 10, safeY);
  ctx.stroke();
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(label, 12, safeY - 5);
}

function drawReplayLabel(ctx, x, y, label, color) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const canvasRect = elements.replayCanvas.getBoundingClientRect();
  ctx.fillStyle = "rgba(9, 10, 8, 0.82)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const width = Math.max(48, label.length * 7 + 14);
  const safeX = clamp(x, 8, Math.max(8, canvasRect.width - width - 8));
  const safeY = clamp(y, 28, Math.max(28, canvasRect.height - 34));
  ctx.beginPath();
  ctx.roundRect(safeX, safeY, width, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "700 11px ui-sans-serif, system-ui";
  ctx.fillText(label, safeX + 7, safeY + 16);
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
    risk: activeResult.riskReward.riskPoints,
    gainPotential: activeResult.riskReward.gainPotentialPoints,
    riskReward: activeResult.riskReward.display,
    riskRewardClassification: activeResult.riskReward.classification,
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
    risk: activeResult.riskReward.riskPoints,
    gainPotential: activeResult.riskReward.gainPotentialPoints,
    riskReward: activeResult.riskReward.display,
    riskRewardClassification: activeResult.riskReward.classification,
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
          <span>Risque: ${entry.risk} · Gain potentiel: ${entry.gainPotential} · RR ${entry.riskReward} (${entry.riskRewardClassification})</span>
          <span>Position: ${entry.positionStatus}</span>
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

function average(values) {
  const filtered = values.filter(Number.isFinite);
  if (!filtered.length) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

async function loadDailyNews() {
  const todayKey = new Date().toISOString().slice(0, 10);

  if (state.lastNewsLoad === todayKey) {
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
  } catch {
    state.newsEvents = [];
  }
}

function evaluateAndRender() {
  if (state.replay.active) {
    evaluateReplayAndRender();
    return;
  }

  state.tick += 1;
  const news = getNewsRisk();
  const session = getSession();
  const liveCandles = getLivePrecisionCandles();
  const market = getMarketWeather(liveCandles);
  const zones = getKeyZones(market, liveCandles);
  if (!liveCandles.length) {
    renderNoLiveCandlesState(session, market, news, zones);
    return;
  }
  if (liveCandles.length) state.basePrice = liveCandles[liveCandles.length - 1].close;
  const candleScan = buildCandleScan(liveCandles, market.bias);
  const confirmation = getEntryConfirmation(market, zones, candleScan);
  const rsi = getRsiConfirmation(market.bias, liveCandles);
  const advancedSmc = buildAdvancedSmcContext(liveCandles, market, zones, confirmation, candleScan);
  const smartResult = buildSmartMoneyAnalysis(session, market, news, zones, confirmation, candleScan, advancedSmc);
  const goldResult = buildGoldIntelligenceAnalysis(smartResult, market, news, zones, confirmation, session, candleScan, liveCandles, advancedSmc);
  let activeResult = state.analysisMode === "gold" ? goldResult : smartResult;
  activeResult = applySignalLifecycle(activeResult);
  const entryProjection = buildEntryProjection(activeResult, market, zones, confirmation, candleScan, liveCandles);

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
  renderRiskRewardDetails(activeResult.riskReward);
  elements.confirmTf.textContent = activeResult.timeframe;
  elements.usedZone.textContent = activeResult.zone;
  elements.targetLiquidity.textContent = activeResult.liquidity;
  elements.newsRisk.textContent = news.label;
  elements.blockingReason.textContent = activeResult.blockingReason;
  elements.signalLifecycleStatus.textContent = activeResult.signalLifecycleStatus || "en attente";
  elements.h1Direction.textContent = goldResult.h1Direction;
  elements.m15Direction.textContent = goldResult.m15Direction;
  elements.confirmationSummary.textContent = activeResult.confirmationSummary;

  renderBlocks(activeResult.blocks);
  renderComparison(smartResult, goldResult);
  renderScenarios(market, zones, confirmation, session, entryProjection);
  renderStrategyOverlay(activeResult.direction, zones, confirmation, entryProjection);
  renderLivePrecisionChart(liveCandles, { session, market, news, zones, confirmation, candleScan, previousHigh: Math.max(...liveCandles.slice(-24).map((candle) => candle.high)), previousLow: Math.min(...liveCandles.slice(-24).map((candle) => candle.low)), last: liveCandles[liveCandles.length - 1] }, activeResult, entryProjection);
  renderRsiPanel(rsi);
  renderCandleScanner(candleScan);
}

function getLivePrecisionCandles() {
  const apiCandles = normalizeApiCandles(extractCandles({ candles: state.api.history }));
  if (apiCandles.length >= 30) return apiCandles.slice(-220);
  return [];
}

function renderLivePrecisionChart(candles, context, activeResult, entryProjection) {
  if (state.replay.active) return;
  elements.chartFrame.classList.remove("tv-fallback-active");
  ensureTradingViewInterval();
  if (!candles.length) {
    clearTsrOverlayCanvas();
    return;
  }
  drawLiveTsrOverlay(candles, context, activeResult, entryProjection);
}

function renderNoLiveCandlesState(session, market, news, zones) {
  elements.chartFrame.classList.add("tv-fallback-active");
  ensureTradingViewInterval();
  clearTsrOverlayCanvas();
  const candleScan = buildEmptyCandleScan();
  const confirmation = {
    valid: false,
    timeframe: state.intervalLabel,
    reason: "Aucune bougie live TSR Data API disponible",
    choch: false,
    candleClose: false,
    candleValid: false,
  };
  const setup = buildSetup("WAIT", zones, confirmation);
  const activeResult = {
    id: state.analysisMode,
    name: state.analysisMode === "gold" ? "TSR Gold Intelligence" : "TSR Smart Money",
    valid: false,
    direction: "WAIT",
    status: "AUCUN TRADE",
    setupState: "Aucun trade qualifié",
    score: 0,
    scoreLabel: "pas de trade",
    biasLabel: "Données live indisponibles",
    setup,
    riskReward: setup.riskReward,
    timeframe: state.intervalLabel,
    zone: "Aucune zone calculée sans bougies live",
    liquidity: "Non calculée",
    h1Direction: "Indisponible",
    m15Direction: "Indisponible",
    signalLifecycleStatus: "en attente",
    blockingReason: "Bougies TSR indisponibles, graphique TradingView direct actif",
    confirmationSummary: "Analyse TSR suspendue tant que /history ne renvoie pas de bougies",
    reason: "Aucun trade qualifié — TradingView direct affiché en attendant les bougies TSR.",
    badges: [["TradingView direct", "pending"], ["Overlays TSR en attente", "risk"]],
    blocks: [
      ["Météo du marché", false, "Indisponible sans bougies live"],
      ["Zones clés", false, "Aucune zone calculée sans données OHLC réelles"],
      ["Confirmation d'entrée", false, "Aucune bougie de confirmation disponible"],
      ["Risk/Reward minimum", false, "Calculé après détection d'une vraie entrée"],
      ["News économiques", news.valid, news.reason],
    ],
  };
  const entryProjection = {
    stage: "none",
    direction: "WAIT",
    setup,
    metrics: buildPositionMetrics("WAIT", setup, "none", []),
    statusLabel: "Aucun trade qualifié",
    reason: "Graphique TradingView direct actif — les overlays TSR reprendront quand /history renverra des bougies.",
  };

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
  elements.scoreFill.style.width = "0%";
  elements.scoreValue.textContent = "0 / 100";
  elements.entryPrice.textContent = "--";
  elements.stopLoss.textContent = "--";
  elements.tp1.textContent = "--";
  elements.tp2.textContent = "--";
  elements.tp3.textContent = "--";
  renderRiskRewardDetails(activeResult.riskReward);
  elements.confirmTf.textContent = state.intervalLabel;
  elements.usedZone.textContent = activeResult.zone;
  elements.targetLiquidity.textContent = activeResult.liquidity;
  elements.newsRisk.textContent = news.label;
  elements.blockingReason.textContent = activeResult.blockingReason;
  elements.signalLifecycleStatus.textContent = activeResult.signalLifecycleStatus;
  elements.h1Direction.textContent = activeResult.h1Direction;
  elements.m15Direction.textContent = activeResult.m15Direction;
  elements.confirmationSummary.textContent = activeResult.confirmationSummary;

  renderBlocks(activeResult.blocks);
  renderComparison(activeResult, activeResult);
  elements.scenarioList.innerHTML = "<article><strong>Graphique direct actif</strong><span>TradingView affiche XAUUSD en direct. Les zones TSR attendent les bougies /history.</span></article>";
  clearStrategyOverlay();
  renderRsiPanel({ value: "--", values: [], valid: false, label: "RSI en attente" });
  renderCandleScanner(candleScan);
}

function applySignalLifecycle(result) {
  const next = {
    ...result,
    badges: [...(result.badges || [])],
    blocks: [...(result.blocks || [])],
  };
  const confirmed = next.status === "BUY" || next.status === "SELL";

  if (confirmed) {
    if (state.signalFlow.activeDirection && state.signalFlow.activeDirection !== next.status) {
      state.signalFlow.activeDirection = null;
      state.signalFlow.status = "invalidé";
      state.signalFlow.invalidatedTick = state.tick;
      return overrideSignalLifecycle(next, "Signal invalidé", "Signal invalidé — attente nouveau setup", "invalidé");
    }
    if (state.signalFlow.status === "invalidé" && state.tick - state.signalFlow.invalidatedTick < 2) {
      return overrideSignalLifecycle(next, "Attente nouveau setup", "Attente nouveau setup — laisser le marché reformer une configuration", "en attente");
    }
    state.signalFlow.activeDirection = next.status;
    state.signalFlow.status = "actif";
    next.signalLifecycleStatus = "actif";
    return next;
  }

  if (state.signalFlow.activeDirection) {
    state.signalFlow.activeDirection = null;
    state.signalFlow.status = "invalidé";
    state.signalFlow.invalidatedTick = state.tick;
    return overrideSignalLifecycle(next, "Signal invalidé", "Signal invalidé — attente nouveau setup", "invalidé");
  }

  if (state.signalFlow.status === "invalidé") {
    if (state.tick - state.signalFlow.invalidatedTick < 2) {
      return overrideSignalLifecycle(next, "Attente nouveau setup", "Attente nouveau setup — laisser le marché reformer une configuration", "en attente");
    }
    state.signalFlow.status = "en attente";
  }

  next.signalLifecycleStatus = next.signalLifecycleStatus || "en attente";
  return next;
}

function overrideSignalLifecycle(result, setupState, reason, lifecycleStatus) {
  return {
    ...result,
    valid: false,
    status: "ATTENTE",
    setupState,
    signalLifecycleStatus: lifecycleStatus,
    blockingReason: reason,
    reason,
    badges: [["Signal", lifecycleStatus === "invalidé" ? "refused" : "pending"], ...(result.badges || [])],
  };
}

function getSession() {
  const hour = new Date().getUTCHours();
  if (hour >= 0 && hour < 7) return { name: "Asie", bias: 1 };
  if (hour >= 7 && hour < 13) return { name: "Londres", bias: 2 };
  if (hour >= 13 && hour < 21) return { name: "New York", bias: 2 };
  return { name: "Transition", bias: 0 };
}

function getMarketWeather(candles = []) {
  if (candles.length >= 30) {
    const lookback = candles.slice(-80);
    const first = lookback[0];
    const last = lookback[lookback.length - 1];
    const high = Math.max(...lookback.map((candle) => candle.high));
    const low = Math.min(...lookback.map((candle) => candle.low));
    const range = Math.max(0.1, high - low);
    const move = last.close - first.open;
    const trendStrength = Math.abs(move) / range;
    const recentRanges = lookback.slice(-12).map((candle) => candle.high - candle.low);
    const compression = average(recentRanges) < range / Math.max(8, lookback.length * 0.24);
    const isRange = trendStrength < 0.24 || compression;
    const bias = isRange ? "WAIT" : move > 0 ? "BUY" : "SELL";
    const expansion = average(recentRanges.slice(-4)) > average(recentRanges.slice(0, 8)) * 1.18;
    let context = isRange ? "range dangereux" : bias === "BUY" ? "tendance haussière multi-timeframe" : "tendance baissière multi-timeframe";
    if (expansion && !isRange) context += " avec expansion";

    return {
      valid: bias !== "WAIT" && !isRange,
      bias,
      action: bias === "BUY" ? "BUY privilégié" : bias === "SELL" ? "SELL privilégié" : "Attendre",
      context,
      score: isRange ? 28 : clamp(Math.round(38 + trendStrength * 52), 38, 86),
    };
  }

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

function getKeyZones(market, candles = []) {
  if (candles.length >= 25) {
    const last = candles[candles.length - 1];
    const previous = candles.slice(-25, -1);
    const previousHigh = Math.max(...previous.map((candle) => candle.high));
    const previousLow = Math.min(...previous.map((candle) => candle.low));
    const liquidityTaken = market.bias === "SELL" ? last.high > previousHigh : market.bias === "BUY" ? last.low < previousLow : last.high > previousHigh || last.low < previousLow;
    const fvg = getReplayFvgZone(candles.slice(-72), market.bias, Math.max(0, candles.length - 72));
    const orderBlock = getReplayOrderBlockZone(candles.slice(-72), market.bias, Math.max(0, candles.length - 72));
    const hasZone = Boolean(fvg || orderBlock);
    const primary = market.bias === "SELL" ? "H1 bearish order block + EQH" : market.bias === "BUY" ? "M15 bullish order block + FVG" : "Zone neutre";
    const targetLiquidity = market.bias === "SELL" ? "Previous Low / London Low" : market.bias === "BUY" ? "Previous High / NY High" : "Liquidité en attente";

    return {
      valid: market.valid && hasZone,
      primary,
      targetLiquidity,
      liquidityTaken,
      hasOrderBlock: Boolean(orderBlock),
      fvgPresent: Boolean(fvg),
      previousHigh,
      previousLow,
      reason: liquidityTaken ? "Liquidité prise sur les bougies live" : "Liquidité non prise",
    };
  }

  const phase = state.tick % 6;
  const liquidityTaken = phase !== 2;
  const valid = market.valid;
  const primary = market.bias === "SELL" ? "H1 bearish order block + EQH" : "M15 bullish order block + FVG";
  const targetLiquidity = market.bias === "SELL" ? "Previous Low / London Low" : "Previous High / NY High";

  return {
    valid,
    primary,
    targetLiquidity,
    liquidityTaken,
    hasOrderBlock: valid,
    fvgPresent: valid,
    reason: liquidityTaken ? "Liquidité prise" : "Liquidité non prise",
  };
}

function getEntryConfirmation(market, zones, candleScan) {
  if (candleScan.current && Number.isFinite(zones.previousHigh) && Number.isFinite(zones.previousLow)) {
    const candle = candleScan.current;
    const buffer = Math.max(0.4, candle.totalSize * 0.22);
    const choch = market.bias === "BUY"
      ? candle.close > zones.previousHigh - buffer
      : market.bias === "SELL"
        ? candle.close < zones.previousLow + buffer
        : false;
    const candleClose = market.bias === "BUY"
      ? candle.close >= Math.max(candle.open, candle.low + candle.totalSize * 0.58)
      : market.bias === "SELL"
        ? candle.close <= Math.min(candle.open, candle.high - candle.totalSize * 0.58)
        : false;
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

function buildAdvancedSmcContext(candles, market, zones, confirmation, candleScan) {
  const empty = {
    bosDisplacement: false,
    fvgPresent: false,
    liquidityTaken: Boolean(zones.liquidityTaken),
    premiumDiscountAligned: false,
    premiumDiscountLabel: "non respecté",
    oteStatus: "absent",
    oteTouched: false,
    oteNear: false,
    ote705: "--",
    oteRangeLabel: "--",
    htfZoneValid: Boolean(zones.valid),
    m15Refinement: Boolean(zones.valid && confirmation.choch),
    structuralSetup: null,
    summary: "Confluence SMC avancée en attente",
  };
  if (!candles.length || market.bias === "WAIT") return empty;

  const direction = market.bias;
  const lookback = candles.slice(-96);
  const last = lookback[lookback.length - 1];
  const swingHigh = Math.max(...lookback.map((candle) => candle.high));
  const swingLow = Math.min(...lookback.map((candle) => candle.low));
  const range = Math.max(0.0001, swingHigh - swingLow);
  const midpoint = swingLow + range * 0.5;
  const current = candleScan.current;
  const bosDisplacement = Boolean(confirmation.choch && current && (current.detections.displacement || current.bodyRatio >= 0.55 && current.relativeVolume >= 1.04));
  const fvgPresent = Boolean(zones.fvgPresent || getReplayFvgZone(candles.slice(-72), direction, Math.max(0, candles.length - 72)));
  const premiumDiscountAligned = direction === "BUY" ? last.close <= midpoint : last.close >= midpoint;
  const premiumDiscountLabel = premiumDiscountAligned
    ? direction === "BUY" ? "Discount respecté" : "Premium respecté"
    : direction === "BUY" ? "Discount non respecté" : "Premium non respecté";
  const ote = getOteContext(direction, last, swingHigh, swingLow, range);
  const structuralSetup = buildStructuralSetup(direction, last, swingHigh, swingLow, range, zones);

  return {
    ...empty,
    bosDisplacement,
    fvgPresent,
    premiumDiscountAligned,
    premiumDiscountLabel,
    oteStatus: ote.status,
    oteTouched: ote.touched,
    oteNear: ote.near,
    ote705: formatPrice(ote.center),
    oteRangeLabel: `${formatPrice(ote.lower)} - ${formatPrice(ote.upper)}`,
    htfZoneValid: Boolean(zones.valid || zones.hasOrderBlock),
    m15Refinement: Boolean(zones.valid && (fvgPresent || confirmation.choch)),
    structuralSetup,
    summary: `BOS displacement ${bosDisplacement ? "validé" : "faible"} · FVG ${fvgPresent ? "présent" : "absent"} · ${premiumDiscountLabel} · OTE ${ote.status}`,
  };
}

function getOteContext(direction, last, swingHigh, swingLow, range) {
  const buyLower = swingHigh - range * 0.79;
  const buyUpper = swingHigh - range * 0.618;
  const sellLower = swingLow + range * 0.618;
  const sellUpper = swingLow + range * 0.79;
  const lower = direction === "BUY" ? Math.min(buyLower, buyUpper) : Math.min(sellLower, sellUpper);
  const upper = direction === "BUY" ? Math.max(buyLower, buyUpper) : Math.max(sellLower, sellUpper);
  const center = direction === "BUY" ? swingHigh - range * 0.705 : swingLow + range * 0.705;
  const touched = direction === "BUY" ? last.low <= upper && last.high >= lower : last.high >= lower && last.low <= upper;
  const distance = last.close < lower ? lower - last.close : last.close > upper ? last.close - upper : 0;
  const near = !touched && distance <= range * 0.08;
  return {
    lower,
    upper,
    center,
    touched,
    near,
    status: touched ? "touché" : near ? "proche" : "absent",
  };
}

function buildStructuralSetup(direction, last, swingHigh, swingLow, range, zones) {
  if (direction !== "BUY" && direction !== "SELL") return null;
  const buffer = Math.max(0.6, range * 0.035);
  const entry = last.close;
  const risk = direction === "BUY" ? Math.max(0.0001, entry - (swingLow - buffer)) : Math.max(0.0001, (swingHigh + buffer) - entry);
  const sign = direction === "BUY" ? 1 : -1;
  return {
    entry: formatPrice(entry),
    sl: formatPrice(direction === "BUY" ? swingLow - buffer : swingHigh + buffer),
    tp1: formatPrice(entry + sign * risk * 1.35),
    tp2: formatPrice(entry + sign * risk * 2.15),
    tp3: formatPrice(entry + sign * risk * 3.2),
    zone: zones.primary,
    structural: true,
  };
}

function scoreSmartMoneySetup(market, zones, confirmation, candleScan, riskReward, h1Direction, advancedSmc) {
  let score = 0;
  score += advancedSmc.bosDisplacement ? 15 : 0;
  score += advancedSmc.fvgPresent ? 10 : 0;
  score += advancedSmc.liquidityTaken ? 15 : 0;
  score += advancedSmc.premiumDiscountAligned ? 10 : 0;
  score += advancedSmc.oteTouched || advancedSmc.oteNear ? 5 : 0;
  score += confirmation.valid && candleScan.valid ? 20 : candleScan.valid ? 10 : 0;
  score += market.valid && (h1Direction.bias === "WAIT" || h1Direction.bias === market.bias) ? 20 : market.valid ? 10 : 0;
  score += riskReward.rr >= 1 ? 5 : 0;
  if (!advancedSmc.bosDisplacement && confirmation.choch) score -= 8;
  if (!candleScan.valid) score -= 12;
  if (!riskReward.valid && riskReward.rr < 1) score -= 18;
  return clamp(Math.round(score), 0, 100);
}

function scoreGoldIntelligenceSetup(h1Aligned, h1OrderBlock, m15Refinement, confirmation, candleScan, riskReward, advancedSmc) {
  let score = 0;
  score += h1Aligned ? 15 : 0;
  score += h1OrderBlock ? 15 : 0;
  score += m15Refinement ? 10 : 0;
  score += advancedSmc.bosDisplacement ? 15 : 0;
  score += advancedSmc.fvgPresent ? 10 : 0;
  score += advancedSmc.liquidityTaken ? 15 : 0;
  score += advancedSmc.premiumDiscountAligned ? 10 : 0;
  score += advancedSmc.oteTouched || advancedSmc.oteNear ? 5 : 0;
  score += confirmation.valid && candleScan.valid ? 15 : 0;
  score += riskReward.rr >= 1 ? 5 : 0;
  return clamp(Math.round(score), 0, 100);
}

function getFinalSignalValidation({ mode, direction, setup, market, news, zones, confirmation, candleScan, riskReward, score, scoreMinimum, h1Direction, advancedSmc }) {
  if (direction !== "BUY" && direction !== "SELL") {
    return buildValidationFailure("Aucun trade qualifié", "Aucun trade qualifié — attendre meilleure configuration", "en attente");
  }
  if (!market.valid) {
    return buildValidationFailure("Aucun trade qualifié", market.context === "range dangereux" ? "Marché compressé" : "Météo du marché non alignée", "en attente");
  }
  if (!news.valid) return buildValidationFailure("Setup incomplet", news.reason, "en attente");
  if (!zones.valid) return buildValidationFailure("Setup incomplet", zones.liquidityTaken ? zones.reason : "Liquidité non prise", "en attente");
  if (mode === "gold" && h1Direction?.bias && h1Direction.bias !== "WAIT" && h1Direction.bias !== direction) {
    return buildValidationFailure("Signal refusé", "Signal refusé : contre tendance H1", "refusé");
  }
  if (mode === "smart" && h1Direction?.bias && h1Direction.bias !== "WAIT" && h1Direction.bias !== direction && market.score >= 62) {
    return buildValidationFailure("Signal refusé", "Signal refusé : marché clairement contre tendance H1", "refusé");
  }
  if (!confirmation.choch) return buildValidationFailure("Setup incomplet", "Order Block détecté mais pas de ChoCH", "en attente");
  if (mode === "gold") {
    if (!advancedSmc?.htfZoneValid) return buildValidationFailure("Setup incomplet", "Zone HTF / OB H1 non valide", "en attente");
    if (!advancedSmc?.m15Refinement) return buildValidationFailure("Setup incomplet", "Raffinement M15 absent", "en attente");
    if (!advancedSmc?.bosDisplacement) return buildValidationFailure("Setup incomplet", "BOS displacement faible", "en attente");
    if (!advancedSmc?.fvgPresent) return buildValidationFailure("Setup incomplet", "FVG / Imbalance absent apres BOS", "en attente");
    if (!advancedSmc?.liquidityTaken) return buildValidationFailure("Setup incomplet", "Liquidite non prise avant impulsion", "en attente");
    if (!advancedSmc?.premiumDiscountAligned) return buildValidationFailure("Setup incomplet", "Premium/Discount non respecte", "en attente");
  }
  if (!confirmation.candleClose) return buildValidationFailure("Setup incomplet", "Pas de confirmation bougie", "en attente");

  const candleReview = getCandleConfirmationReview(direction, candleScan, setup);
  if (!candleReview.valid) return buildValidationFailure("Setup incomplet", candleReview.reason, "en attente");

  const zoneReview = getZoneArrivalReview(direction, candleScan, setup);
  if (!zoneReview.valid) return buildValidationFailure("Entrée potentielle", zoneReview.reason, "en attente");

  const spaceReview = getTp1SpaceReview(setup);
  if (!spaceReview.valid) return buildValidationFailure("Signal refusé", spaceReview.reason, "refusé");

  if (!riskReward.valid) {
    const reason = riskReward.rr < 1 ? "Signal refusé : RR insuffisant" : "Configuration valide mais RR insuffisant.";
    return buildValidationFailure("Signal refusé", reason, "refusé");
  }
  if (score < scoreMinimum) {
    return buildValidationFailure("Aucun trade qualifié", "Aucun trade qualifié — attendre meilleure configuration", "en attente");
  }

  return {
    valid: true,
    setupState: "Setup complet",
    statusKind: "actif",
    blockingReason: "Aucun",
    reason: "Validation finale acceptée",
  };
}

function buildValidationFailure(setupState, reason, statusKind) {
  return {
    valid: false,
    setupState,
    statusKind,
    blockingReason: reason,
    reason,
  };
}

function getCandleConfirmationReview(direction, candleScan, setup) {
  const candle = candleScan.current;
  if (!candle) return { valid: false, reason: "Bougie de confirmation faible" };
  if (candle.detections.doji || candle.detections.indecision) return { valid: false, reason: "Doji / indécision" };
  if (candle.detections.tooSmall || candleScan.quality < 64) return { valid: false, reason: "Bougie de confirmation faible" };
  if (candle.bodyRatio < 0.3) return { valid: false, reason: "Corps de bougie insuffisant" };
  if (candle.relativeVolume < 0.75) return { valid: false, reason: "Volume trop faible" };

  const entry = parsePrice(setup.entry);
  const sl = parsePrice(setup.sl);
  if (direction === "BUY") {
    const hasRejection = candle.lowerWickRatio >= 0.25 || candle.detections.bullishRejection;
    const closesWell = candle.closePosition >= 0.58 && (candle.direction === "bullish" || candle.closePosition >= 0.72);
    if (!hasRejection) return { valid: false, reason: "Rejet clair sur zone absent" };
    if (!closesWell) return { valid: false, reason: "Clôture BUY faible" };
    if (Number.isFinite(sl) && candle.close < Math.min(entry, sl)) return { valid: false, reason: "Prix clôture sous la zone clé" };
  }
  if (direction === "SELL") {
    const hasRejection = candle.upperWickRatio >= 0.25 || candle.detections.bearishRejection;
    const closesWell = candle.closePosition <= 0.42 && (candle.direction === "bearish" || candle.closePosition <= 0.28);
    if (!hasRejection) return { valid: false, reason: "Rejet clair sur zone absent" };
    if (!closesWell) return { valid: false, reason: "Clôture SELL faible" };
    if (Number.isFinite(sl) && candle.close > Math.max(entry, sl)) return { valid: false, reason: "Prix clôture au-dessus de la zone clé" };
  }
  return { valid: true, reason: candleScan.summary };
}

function getZoneArrivalReview(direction, candleScan, setup) {
  const candle = candleScan.current;
  const entry = parsePrice(setup.entry);
  const sl = parsePrice(setup.sl);
  if (!candle || !Number.isFinite(entry) || !Number.isFinite(sl)) return { valid: false, reason: "Prix trop loin de la zone" };
  const risk = Math.max(0.0001, Math.abs(entry - sl));
  const distance = Math.abs(candle.close - entry);
  if (distance > risk * 1.25) return { valid: false, reason: "Prix trop loin de la zone" };
  return { valid: true, reason: "Prix dans la zone" };
}

function getTp1SpaceReview(setup) {
  const entry = parsePrice(setup.entry);
  const sl = parsePrice(setup.sl);
  const tp1 = parsePrice(setup.tp1);
  if (![entry, sl, tp1].every(Number.isFinite)) return { valid: false, reason: "Pas assez d'espace avant TP" };
  const risk = Math.abs(entry - sl);
  const gain = Math.abs(tp1 - entry);
  if (risk <= 0 || gain < Math.max(1, risk * 0.8)) return { valid: false, reason: "Signal refusé : espace insuffisant avant TP1" };
  return { valid: true, reason: "Espace TP1 suffisant" };
}

function buildSmartMoneyAnalysis(session, market, news, zones, confirmation, candleScan, advancedSmc = buildAdvancedSmcContext([], market, zones, confirmation, candleScan)) {
  const h1Direction = getH1Direction(market);
  const h1Against = market.bias !== "WAIT" && h1Direction.bias !== "WAIT" && h1Direction.bias !== market.bias;
  const coreValid = market.valid && news.valid && zones.valid && confirmation.valid && candleScan.valid;
  const direction = coreValid ? market.bias : "WAIT";
  const setup = buildSetup(direction, zones, confirmation, advancedSmc);
  const riskReward = setup.riskReward;
  const score = clamp(scoreSmartMoneySetup(market, zones, confirmation, candleScan, riskReward, h1Direction, advancedSmc) - (h1Against ? 8 : 0), 0, 100);
  const finalValidation = coreValid
    ? getFinalSignalValidation({ mode: "smart", direction, setup, market, news, zones, confirmation, candleScan, riskReward, score, scoreMinimum: state.scoreMinimums.smart, h1Direction, advancedSmc })
    : buildValidationFailure("Setup incomplet", getMissingReason(market, news, zones, confirmation, candleScan), "en attente");
  const rrBlocked = coreValid && !riskReward.valid;
  const valid = finalValidation.valid;
  const scoreLabel = score >= 90 ? "signal fort" : score >= 80 ? "bon signal" : score >= 70 ? "signal possible" : score >= 50 ? "attente" : "pas de trade";
  const status = valid ? direction : finalValidation.statusKind === "refusé" ? "SIGNAL REFUSÉ" : finalValidation.setupState === "Aucun trade qualifié" ? "AUCUN TRADE" : "ATTENTE";

  return {
    id: "smart",
    name: "TSR Smart Money",
    valid,
    direction,
    status,
    setupState: valid ? "Setup complet" : finalValidation.setupState,
    score,
    scoreLabel,
    biasLabel: h1Against ? `${market.action} · H1 contraire` : market.action,
    setup,
    riskReward,
    timeframe: confirmation.timeframe,
    zone: zones.primary,
    liquidity: zones.targetLiquidity,
    h1Direction: h1Direction.label,
    signalLifecycleStatus: valid ? "actif" : finalValidation.statusKind,
    blockingReason: valid ? "Aucun" : finalValidation.blockingReason,
    confirmationSummary: `${confirmation.reason} | ${advancedSmc.summary}`,
    reason: valid
      ? `${direction} confirmé: Entrée ${setup.entry}, SL ${setup.sl}, TP1 ${setup.tp1}, RR ${riskReward.display}. ${market.context}, ${zones.primary}, ${confirmation.reason}`
      : finalValidation.reason,
    badges: buildSmartBadges(market, news, valid, candleScan, riskReward, rrBlocked, advancedSmc),
    blocks: [
      ["BOS displacement", advancedSmc.bosDisplacement, advancedSmc.bosDisplacement ? "valide" : "faible"],
      ["FVG / Imbalance", advancedSmc.fvgPresent, advancedSmc.fvgPresent ? "present apres BOS" : "absent"],
      ["Premium/Discount", advancedSmc.premiumDiscountAligned, advancedSmc.premiumDiscountLabel],
      ["OTE 0.618-0.79", advancedSmc.oteTouched || advancedSmc.oteNear, `${advancedSmc.oteStatus} - 0.705 ${advancedSmc.ote705}`],
      ["SL/TP structurels", Boolean(setup.structural), setup.structural ? `SL ${setup.sl} - TP1 ${setup.tp1} - TP2 ${setup.tp2} - TP3 ${setup.tp3}` : "Niveaux calcules par defaut"],
      ["Météo du marché", market.valid, market.context],
      ["Structure de marché", market.valid, market.bias === "BUY" ? "HH/HL + BOS haussier" : market.bias === "SELL" ? "LH/LL + BOS baissier" : "Structure neutre"],
      ["Liquidité", zones.valid, zones.reason],
      ["Order Blocks", zones.valid, zones.primary],
      ["Confirmation d'entrée", confirmation.valid, confirmation.reason],
      ["Réaction bougie", !coreValid || getCandleConfirmationReview(direction, candleScan, setup).valid, coreValid ? getCandleConfirmationReview(direction, candleScan, setup).reason : "En attente"],
      ["Score minimum", !coreValid || score >= state.scoreMinimums.smart, `${score}/100 · minimum ${state.scoreMinimums.smart}`],
      ["Direction H1", !h1Against || market.score < 62, h1Direction.label],
      ["Risk/Reward minimum", !coreValid || riskReward.valid, coreValid ? `${riskReward.display} · ${riskReward.classification} · minimum ${formatRiskRewardValue(state.riskRewardMinimum)}` : "Calculé après validation structure"],
      ["Candle Scanner", candleScan.valid, `${candleScan.quality}/100 · ${candleScan.summary}`],
      ["News économiques", news.valid, news.reason],
    ],
  };
}

function buildGoldIntelligenceAnalysis(smartResult, market, news, zones, confirmation, session, candleScan, candles = [], advancedSmc = buildAdvancedSmcContext(candles, market, zones, confirmation, candleScan)) {
  const h1Direction = getH1Direction(market);
  const m15Direction = getM15Direction(market, zones);
  const h1Aligned = smartResult.direction !== "WAIT" && h1Direction.bias === smartResult.direction;
  const h1OrderBlock = advancedSmc.htfZoneValid;
  const m15Refinement = advancedSmc.m15Refinement;
  const trendline = state.tick % 4 !== 0;
  const fibonacci = state.tick % 3 !== 1;
  const rsiConfirmation = getRsiConfirmation(smartResult.direction, candles);
  const rsi = rsiConfirmation.valid;
  const priceAction = confirmation.candleClose && candleScan.valid && state.tick % 6 !== 4;
  const crtAvailable = false;
  const crt = false;
  const advancedConfirmations = [
    ["BOS displacement", advancedSmc.bosDisplacement, advancedSmc.bosDisplacement ? "valide" : "faible"],
    ["FVG / Imbalance", advancedSmc.fvgPresent, advancedSmc.fvgPresent ? "present apres BOS" : "absent"],
    ["Liquidite prise", advancedSmc.liquidityTaken, advancedSmc.liquidityTaken ? "oui" : "non"],
    ["Premium/Discount", advancedSmc.premiumDiscountAligned, advancedSmc.premiumDiscountLabel],
    ["OTE 0.705", advancedSmc.oteTouched || advancedSmc.oteNear, `${advancedSmc.oteStatus} - zone ${advancedSmc.oteRangeLabel}`],
    ["Trendline", trendline, trendline ? "cassure/respect validé" : "trendline non confirmée"],
    ["Fibonacci", fibonacci, fibonacci ? "réaction sur 61.8 %" : "zone Fibonacci non validée"],
    ["RSI", rsi, rsiConfirmation.label],
    ["Price Action avancée", priceAction, priceAction ? candleScan.summary : "rejet ou momentum insuffisant"],
    ["Candle Quality", candleScan.quality >= 70, `${candleScan.quality}/100 · ${candleScan.qualityLabel}`],
    ["CRT", crtAvailable && crt, crtAvailable ? "CRT validé" : "CRT en attente"],
  ];
  const advancedCount = advancedConfirmations.filter((item) => item[1]).length;
  const rrRefused = smartResult.status === "SIGNAL REFUSÉ";
  const h1Contrary = smartResult.direction !== "WAIT" && h1Direction.bias !== "WAIT" && h1Direction.bias !== smartResult.direction;
  const candidateSetup = smartResult.direction !== "WAIT" ? smartResult.setup : buildSetup("WAIT", zones, confirmation, advancedSmc);
  const candidateRiskReward = smartResult.direction !== "WAIT" ? smartResult.riskReward : candidateSetup.riskReward;
  const mandatoryValid = smartResult.valid && h1Aligned && h1OrderBlock && m15Refinement && advancedSmc.bosDisplacement && advancedSmc.fvgPresent && advancedSmc.liquidityTaken && advancedSmc.premiumDiscountAligned;
  const score = scoreGoldIntelligenceSetup(h1Aligned, h1OrderBlock, m15Refinement, confirmation, candleScan, candidateRiskReward, advancedSmc);
  const missingAdvanced = advancedConfirmations.filter((item) => !item[1]).map((item) => item[0]);
  const confirmedAdvanced = advancedConfirmations.filter((item) => item[1]).map((item) => item[0]);
  const requiredSmcMissing = [
    ["BOS displacement", advancedSmc.bosDisplacement],
    ["FVG / Imbalance", advancedSmc.fvgPresent],
    ["Liquidite prise", advancedSmc.liquidityTaken],
    ["Premium/Discount", advancedSmc.premiumDiscountAligned],
  ].filter((item) => !item[1]).map((item) => item[0]);
  const preFinalValid = mandatoryValid && advancedCount >= 2;
  const finalValidation = preFinalValid
    ? getFinalSignalValidation({ mode: "gold", direction: smartResult.direction, setup: candidateSetup, market, news, zones, confirmation, candleScan, riskReward: candidateRiskReward, score, scoreMinimum: state.scoreMinimums.gold, h1Direction, advancedSmc })
    : buildValidationFailure(h1Contrary || rrRefused ? "Signal refusé" : "Setup incomplet", h1Contrary ? "Signal refusé : contre tendance H1" : getGoldReason({
      smartResult,
      valid: false,
      refused: rrRefused || h1Contrary,
      h1Direction,
      h1Aligned,
      h1OrderBlock,
      m15Refinement,
      advancedCount,
      confirmedAdvanced,
      missingAdvanced,
      requiredSmcMissing,
    }), h1Contrary || rrRefused ? "refusé" : "en attente");
  const valid = finalValidation.valid;
  const refused = rrRefused || h1Contrary || finalValidation.statusKind === "refusé";
  const status = valid ? smartResult.direction : refused ? "SIGNAL REFUSÉ" : finalValidation.setupState === "Aucun trade qualifié" ? "AUCUN TRADE" : "ATTENTE";
  const reason = valid ? getGoldReason({
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
    requiredSmcMissing,
  }) : finalValidation.reason;

  return {
    id: "gold",
    name: "TSR Gold Intelligence",
    valid,
    direction: valid ? smartResult.direction : "WAIT",
    status,
    setupState: valid ? "Setup premium" : finalValidation.setupState,
    score,
    scoreLabel: score >= 90 ? "setup premium" : score >= 80 ? "signal possible" : score >= 60 ? "attente" : "pas de trade",
    biasLabel: rrRefused ? "RR insuffisant" : h1Contrary ? "Contre tendance H1" : valid ? "Confluence forte" : "Attente avancée",
    setup: valid || refused ? candidateSetup : buildSetup("WAIT", zones, confirmation, advancedSmc),
    riskReward: valid || refused ? candidateRiskReward : buildSetup("WAIT", zones, confirmation, advancedSmc).riskReward,
    timeframe: valid ? smartResult.timeframe : "H1 + M15",
    zone: h1OrderBlock ? `Order Block H1 ${smartResult.direction === "SELL" ? "bearish" : "bullish"}` : "Order Block H1 absent",
    liquidity: smartResult.liquidity,
    h1Direction: h1Direction.label,
    m15Direction: m15Direction.label,
    signalLifecycleStatus: valid ? "actif" : finalValidation.statusKind,
    blockingReason: valid ? "Aucun" : reason,
    confirmationSummary: confirmedAdvanced.length ? confirmedAdvanced.join(", ") : "Aucune confirmation avancée",
    reason,
    badges: buildGoldBadges(valid, refused, news, market, h1Aligned, advancedCount, candleScan, candidateRiskReward, rrRefused, advancedSmc),
    blocks: [
      ["BOS displacement", advancedSmc.bosDisplacement, advancedSmc.bosDisplacement ? "valide" : "faible"],
      ["FVG / Imbalance", advancedSmc.fvgPresent, advancedSmc.fvgPresent ? "present apres BOS" : "absent"],
      ["Liquidite avant impulsion", advancedSmc.liquidityTaken, advancedSmc.liquidityTaken ? "oui" : "non"],
      ["Premium/Discount", advancedSmc.premiumDiscountAligned, advancedSmc.premiumDiscountLabel],
      ["OTE 0.618-0.79", advancedSmc.oteTouched || advancedSmc.oteNear, `${advancedSmc.oteStatus} - 0.705 ${advancedSmc.ote705}`],
      ["Bougie confirmation", confirmation.valid && candleScan.valid, candleScan.valid ? "forte" : "faible"],
      ["SL/TP structurels", Boolean(candidateSetup.structural), candidateSetup.structural ? `SL ${candidateSetup.sl} - TP1 ${candidateSetup.tp1} - TP2 ${candidateSetup.tp2} - TP3 ${candidateSetup.tp3}` : "Niveaux calcules par defaut"],
      ["Mode 1 valide", smartResult.valid, smartResult.valid ? `${smartResult.status} Mode 1 confirmé` : smartResult.blockingReason],
      ["Risk/Reward minimum", !rrRefused && (!smartResult.riskReward || smartResult.riskReward.valid), smartResult.riskReward ? `${smartResult.riskReward.display} · ${smartResult.riskReward.classification} · minimum ${formatRiskRewardValue(state.riskRewardMinimum)}` : "En attente"],
      ["Direction H1 obligatoire", h1Aligned, h1Aligned ? h1Direction.label : `Tendance H1: ${h1Direction.label}`],
      ["Score minimum", score >= state.scoreMinimums.gold, `${score}/100 · minimum ${state.scoreMinimums.gold}`],
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

function getGoldReason({ smartResult, valid, refused, h1Direction, h1Aligned, h1OrderBlock, m15Refinement, advancedCount, confirmedAdvanced, missingAdvanced, requiredSmcMissing = [] }) {
  if (smartResult.status === "SIGNAL REFUSÉ") return smartResult.blockingReason;
  if (!smartResult.valid) return `Mode 1 non valide: ${smartResult.blockingReason}`;
  if (refused || !h1Aligned) return `Signal refusé: ${smartResult.status} contre tendance H1 ${h1Direction.label}`;
  if (!h1OrderBlock) return `Mode 1 ${smartResult.status} valide, mais Mode 2 en attente: Order Block H1 obligatoire absent`;
  if (!m15Refinement) return `Mode 1 ${smartResult.status} valide, mais Mode 2 en attente: pas de raffinement M15`;
  if (requiredSmcMissing.length) return `Mode 2 en attente: criteres SMC requis manquants (${requiredSmcMissing.join(", ")})`;
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

function getRsiConfirmation(direction, candles = []) {
  const sourceCandles = candles.length ? candles : normalizeApiCandles(extractCandles({ candles: state.api.history }));
  if (sourceCandles.length) return getReplayRsi(sourceCandles, direction);

  const values = Array.from({ length: 32 }, () => 50);
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

function buildSmartBadges(market, news, valid, candleScan, riskReward, rrBlocked, advancedSmc = null) {
  const badges = [];
  badges.push(valid ? ["Validé", "valid"] : rrBlocked ? ["RR insuffisant", "refused"] : ["En attente", "pending"]);
  if (!news.valid) badges.push(["Risque news", "risk"]);
  if (market.context.includes("range")) badges.push(["Range dangereux", "risk"]);
  if (market.valid) badges.push(["Tendance alignée", "valid"]);
  if (riskReward?.display && riskReward.display !== "--") badges.push([`RR ${riskReward.display}`, riskReward.valid ? "valid" : "risk"]);
  if (advancedSmc) {
    badges.push([advancedSmc.bosDisplacement ? "BOS displacement" : "BOS faible", advancedSmc.bosDisplacement ? "valid" : "risk"]);
    badges.push([`OTE ${advancedSmc.oteStatus}`, advancedSmc.oteTouched || advancedSmc.oteNear ? "valid" : "pending"]);
  }
  badges.push(candleScan.valid ? [`Candle ${candleScan.quality}`, "valid"] : ["Bougie faible", "risk"]);
  return badges;
}

function buildGoldBadges(valid, refused, news, market, h1Aligned, advancedCount, candleScan, riskReward, rrBlocked, advancedSmc = null) {
  const badges = [];
  badges.push(valid ? ["Validé", "valid"] : refused ? ["Refusé", "refused"] : ["En attente", "pending"]);
  if (!news.valid) badges.push(["Risque news", "risk"]);
  if (market.context.includes("range")) badges.push(["Range dangereux", "risk"]);
  badges.push(h1Aligned ? ["Tendance alignée", "valid"] : ["Tendance contraire", "refused"]);
  if (advancedCount >= 2) badges.push(["Confluence forte", "valid"]);
  if (riskReward?.display && riskReward.display !== "--") badges.push([rrBlocked ? "RR insuffisant" : `RR ${riskReward.display}`, riskReward.valid ? "valid" : "risk"]);
  if (advancedSmc?.premiumDiscountAligned) badges.push(["Premium/Discount", "valid"]);
  if (advancedSmc?.oteTouched || advancedSmc?.oteNear) badges.push(["OTE 0.705", "valid"]);
  badges.push(candleScan.quality >= 81 ? ["Bougie premium", "valid"] : candleScan.valid ? ["Bougie forte", "valid"] : ["Bougie faible", "risk"]);
  return badges;
}

function buildSetup(direction, zones, confirmation, advancedSmc = null) {
  if (direction === "WAIT") {
    return attachRiskReward({ entry: "--", sl: "--", tp1: "--", tp2: "--", tp3: "--", zone: zones.primary }, direction);
  }
  if (advancedSmc?.structuralSetup) {
    return attachRiskReward({ ...advancedSmc.structuralSetup, zone: zones.primary }, direction);
  }

  const drift = Math.sin(state.tick / 3) * 4.2;
  const entry = state.basePrice + drift + (direction === "BUY" ? 1.7 : -1.7);
  const risk = confirmation.timeframe === "M1" || confirmation.timeframe === "30s" ? 2.9 : 5.4;
  const sign = direction === "BUY" ? 1 : -1;

  return attachRiskReward({
    entry: formatPrice(entry),
    sl: formatPrice(entry - sign * risk),
    tp1: formatPrice(entry + sign * risk * 1.35),
    tp2: formatPrice(entry + sign * risk * 2.15),
    tp3: formatPrice(entry + sign * risk * 3.2),
    zone: zones.primary,
  }, direction);
}

function attachRiskReward(setup, direction) {
  return {
    ...setup,
    riskReward: calculateRiskReward(direction, setup),
  };
}

function calculateRiskReward(direction, setup) {
  const entry = parsePrice(setup.entry);
  const sl = parsePrice(setup.sl);
  const tp2 = parsePrice(setup.tp2);
  const minimum = Math.max(1, Number(state.riskRewardMinimum) || RISK_REWARD_DEFAULT_MINIMUM);
  if (direction !== "BUY" && direction !== "SELL" || ![entry, sl, tp2].every(Number.isFinite)) {
    return {
      valid: false,
      rr: 0,
      display: "--",
      classification: "En attente",
      riskPoints: "--",
      gainPotentialPoints: "--",
      minimum,
      reason: "RR calculé après validation des niveaux",
    };
  }

  const risk = Math.abs(entry - sl);
  const gainPotential = Math.abs(tp2 - entry);
  const rr = risk > 0 ? gainPotential / risk : 0;
  const valid = rr >= 1 && rr >= minimum;
  return {
    valid,
    rr,
    display: formatRiskRewardValue(rr),
    classification: classifyRiskReward(rr),
    riskPoints: formatPoints(risk),
    gainPotentialPoints: formatPoints(gainPotential),
    minimum,
    reason: valid ? `RR ${formatRiskRewardValue(rr)} accepté` : rr < 1 ? "Signal refusé : RR insuffisant" : "Configuration valide mais RR insuffisant",
  };
}

function classifyRiskReward(rr) {
  if (rr < 1) return "Refusé";
  if (rr < 1.2) return "Faible";
  if (rr < 1.5) return "Acceptable";
  if (rr <= 2) return "Bon";
  return "Premium";
}

function formatRiskRewardValue(value) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(2).replace(/\.?0+$/, "");
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
  const refused = activeResult.status === "SIGNAL REFUSÉ";
  const noTrade = activeResult.status === "AUCUN TRADE";
  const direction = noTrade ? "WAIT" : confirmed || refused ? activeResult.direction : inferProjectionDirection(activeResult, market, zones);
  const hasDirection = direction === "BUY" || direction === "SELL";
  const stage = noTrade ? "none" : refused ? "refused" : getEntryProjectionStage(confirmed, market, zones, confirmation, candleScan);
  const setup = confirmed || refused || noTrade ? activeResult.setup : hasDirection ? buildSetup(direction, zones, confirmation) : buildSetup("WAIT", zones, confirmation);
  const metrics = buildPositionMetrics(direction, setup, stage, candles);

  return {
    stage,
    direction,
    setup,
    metrics,
    statusLabel: getProjectionStatusLabel(stage, direction),
    reason: refused || noTrade ? activeResult.reason : getProjectionReason(stage, direction, zones, confirmation, candleScan, activeResult),
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
  if (stage === "none") return "Aucun trade qualifié";
  if (stage === "refused") return "Signal refusé";
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
  if (direction !== "BUY" && direction !== "SELL") return { valid: false, status: "en attente", rr: "--", rr1: "--", rr2: "--", rr3: "--", riskPoints: "--", gainPotentialPoints: "--", tp1Points: "--", tp2Points: "--", tp3Points: "--" };
  if (![entry, sl, tp1, tp2, tp3].every(Number.isFinite)) return { valid: false, status: "en attente", rr: "--", rr1: "--", rr2: "--", rr3: "--", riskPoints: "--", gainPotentialPoints: "--", tp1Points: "--", tp2Points: "--", tp3Points: "--" };

  const risk = Math.abs(entry - sl);
  if (risk <= 0) return { valid: false, status: "en attente", rr: "--", rr1: "--", rr2: "--", rr3: "--", riskPoints: "--", gainPotentialPoints: "--", tp1Points: "--", tp2Points: "--", tp3Points: "--" };
  const tp1Distance = Math.abs(tp1 - entry);
  const tp2Distance = Math.abs(tp2 - entry);
  const tp3Distance = Math.abs(tp3 - entry);
  const status = getPositionStatus(direction, { entry, sl, tp1, tp2, tp3 }, stage, candles);

  return {
    valid: true,
    status,
    rr: formatRiskRewardValue(tp2Distance / risk),
    rr1: formatRatio(tp1Distance / risk),
    rr2: formatRatio(tp2Distance / risk),
    rr3: formatRatio(tp3Distance / risk),
    riskPoints: formatPoints(risk),
    gainPotentialPoints: formatPoints(tp2Distance),
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

function renderRiskRewardDetails(riskReward) {
  const rr = riskReward || calculateRiskReward("WAIT", { entry: "--", sl: "--", tp2: "--" });
  elements.riskRewardValue.textContent = rr.display === "--" ? "--" : `${rr.display} (${rr.classification})`;
  elements.riskAmount.textContent = rr.riskPoints;
  elements.gainPotential.textContent = rr.gainPotentialPoints;
  elements.rrClassification.textContent = rr.display === "--"
    ? `Minimum ${formatRiskRewardValue(state.riskRewardMinimum)}`
    : `${rr.classification} · minimum ${formatRiskRewardValue(state.riskRewardMinimum)} · ${rr.valid ? "accepté" : "refusé"}`;
}

function renderChartSignalAlert(activeResult, entryProjection) {
  const direction = activeResult.status;
  elements.chartSignalAlert.classList.toggle("buy", direction === "BUY");
  elements.chartSignalAlert.classList.toggle("sell", direction === "SELL");
  elements.chartSignalAlert.classList.toggle("refused", direction === "SIGNAL REFUSÉ");
  elements.chartSignalAlert.classList.toggle("waiting", direction !== "BUY" && direction !== "SELL" && direction !== "SIGNAL REFUSÉ");
  elements.chartAlertStage.textContent = entryProjection.statusLabel;
  elements.chartAlertDirection.textContent = direction;
  elements.chartAlertReason.textContent = buildChartAlertReason(activeResult, entryProjection);
  renderChartDecisionCard(activeResult, entryProjection);
}

function renderChartDecisionCard(activeResult, entryProjection) {
  const direction = activeResult.status;
  elements.chartDecisionCard.classList.toggle("buy", direction === "BUY");
  elements.chartDecisionCard.classList.toggle("sell", direction === "SELL");
  elements.chartDecisionCard.classList.toggle("refused", direction === "SIGNAL REFUSÉ");
  elements.chartDecisionCard.classList.toggle("waiting", direction !== "BUY" && direction !== "SELL" && direction !== "SIGNAL REFUSÉ");
  elements.chartDecisionStage.textContent = entryProjection.statusLabel;
  elements.chartDecisionMode.textContent = activeResult.name;
  elements.chartDecisionDirection.textContent = direction;
  elements.chartDecisionReason.textContent = entryProjection.reason;
  elements.chartDecisionBadges.innerHTML = activeResult.badges.map(renderBadge).join("");
  elements.chartDecisionFill.style.width = `${activeResult.score}%`;
  elements.chartDecisionScore.textContent = `${activeResult.score} / 100`;
}

function buildChartAlertReason(activeResult, entryProjection) {
  const setup = entryProjection.setup;
  if (activeResult.status === "BUY" || activeResult.status === "SELL") {
    return `Entrée ${setup.entry} · SL ${setup.sl} · TP1 ${setup.tp1} · RR ${activeResult.riskReward?.display || entryProjection.metrics.rr} · ${entryProjection.metrics.status}`;
  }
  if (activeResult.status === "SIGNAL REFUSÉ" && activeResult.riskReward?.display) {
    return `Signal refusé : RR insuffisant · RR ${activeResult.riskReward.display} · minimum ${formatRiskRewardValue(state.riskRewardMinimum)}`;
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
  if (status === "SIGNAL REFUSÉ" || status === "AUCUN TRADE") return "var(--red)";
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
  clearStrategyOverlay();
}

function clearStrategyOverlay() {
  elements.strategyOverlay.innerHTML = "";
}

function handleChartZoneClick(event) {
  const rect = elements.replayCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const hit = state.chartZoneHitboxes.find((box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom);
  state.selectedZone = hit ? state.topDownZones.find((zone) => zone.id === hit.id) || null : null;
  renderSelectedZoneInfo();
}

function renderSelectedZoneInfo() {
  if (!state.selectedZone) {
    elements.strategyOverlay.innerHTML = "";
    return;
  }
  const zone = state.selectedZone;
  elements.strategyOverlay.innerHTML = `
    <article class="zone-info-card">
      <button type="button" class="zone-info-close" aria-label="Fermer">x</button>
      <strong>${zone.label}</strong>
      <span>${zone.status} · score ${zone.score}/100</span>
      <p>${zone.reason}</p>
      <dl>
        <dt>Timeframe</dt><dd>${zone.timeframe}</dd>
        <dt>Invalidation</dt><dd>${zone.invalidation}</dd>
        <dt>Entree</dt><dd>${zone.entry}</dd>
        <dt>SL</dt><dd>${zone.sl}</dd>
        <dt>TP1 / TP2 / TP3</dt><dd>${zone.tp1} / ${zone.tp2} / ${zone.tp3}</dd>
      </dl>
    </article>
  `;
  elements.strategyOverlay.querySelector(".zone-info-close")?.addEventListener("click", () => {
    state.selectedZone = null;
    renderSelectedZoneInfo();
  });
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
  if (!rsi.values.length) {
    elements.rsiLine.setAttribute("points", "");
    return;
  }
  const denominator = Math.max(1, rsi.values.length - 1);
  const points = rsi.values
    .map((value, index) => {
      const x = (index / denominator) * 100;
      const y = 100 - value;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  elements.rsiLine.setAttribute("points", points);
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
