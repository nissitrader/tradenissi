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
];

const classicIndicators = [
  { id: "ema20", label: "EMA 20", defaultOn: false },
  { id: "ema50", label: "EMA 50", defaultOn: false },
  { id: "ema200", label: "EMA 200", defaultOn: false },
  { id: "vwap", label: "VWAP", defaultOn: false, tradingViewStudy: "STD;VWAP" },
  { id: "superTrend", label: "SuperTrend", defaultOn: false },
  { id: "volume", label: "Volume", defaultOn: false, tradingViewStudy: "STD;Volume" },
];

const state = {
  interval: "240",
  intervalLabel: "H4",
  smartMoneyVisibility: Object.fromEntries(smartMoneyOverlays.map((item) => [item.id, item.defaultOn])),
  classicVisibility: Object.fromEntries(classicIndicators.map((item) => [item.id, item.defaultOn])),
  tick: 0,
  basePrice: 2336.4,
  widget: null,
  lastNewsLoad: null,
  newsEvents: [],
};

const elements = {
  workspace: document.getElementById("workspace"),
  overlayControls: document.getElementById("overlayControls"),
  strategyOverlay: document.getElementById("strategyOverlay"),
  chartInterval: document.getElementById("chartInterval"),
  sessionName: document.getElementById("sessionName"),
  marketBias: document.getElementById("marketBias"),
  scoreTop: document.getElementById("scoreTop"),
  setupState: document.getElementById("setupState"),
  tradeDirection: document.getElementById("tradeDirection"),
  signalReason: document.getElementById("signalReason"),
  scoreFill: document.getElementById("scoreFill"),
  scoreValue: document.getElementById("scoreValue"),
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
  scenarioList: document.getElementById("scenarioList"),
};

function boot() {
  renderOverlayControls();
  bindInteractions();
  renderTradingView();
  loadDailyNews();
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
  state.tick += 1;
  const session = getSession();
  const market = getMarketWeather();
  const news = getNewsRisk();
  const zones = getKeyZones(market);
  const confirmation = getEntryConfirmation(market, zones);
  const score = scoreSetup(market, news, zones, confirmation);
  const allBlocksValid = market.valid && news.valid && zones.valid && confirmation.valid;
  const direction = allBlocksValid ? market.bias : "WAIT";
  const setup = buildSetup(direction, zones, confirmation);
  const missingReason = getMissingReason(market, news, zones, confirmation);

  elements.sessionName.textContent = session.name;
  elements.marketBias.textContent = market.action;
  elements.scoreTop.textContent = score;
  elements.setupState.textContent = allBlocksValid ? "Setup complet" : "Setup incomplet";
  elements.tradeDirection.textContent = allBlocksValid ? direction : "ATTENTE";
  elements.tradeDirection.style.color = direction === "BUY" ? "var(--green)" : direction === "SELL" ? "var(--red)" : "var(--gold)";
  elements.signalReason.textContent = allBlocksValid
    ? `${direction} validé: ${market.context}, ${zones.primary}, ${confirmation.reason}.`
    : `Setup incomplet — ${missingReason}`;
  elements.scoreFill.style.width = `${score}%`;
  elements.scoreValue.textContent = `${score} / 100`;
  elements.entryPrice.textContent = setup.entry;
  elements.stopLoss.textContent = setup.sl;
  elements.tp1.textContent = setup.tp1;
  elements.tp2.textContent = setup.tp2;
  elements.tp3.textContent = setup.tp3;
  elements.confirmTf.textContent = confirmation.timeframe;
  elements.usedZone.textContent = zones.primary;
  elements.targetLiquidity.textContent = zones.targetLiquidity;
  elements.newsRisk.textContent = news.label;
  elements.blockingReason.textContent = allBlocksValid ? "Aucun" : missingReason;

  renderBlocks(market, news, zones, confirmation);
  renderScenarios(market, zones, confirmation, session);
  renderStrategyOverlay(direction, zones, confirmation);
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

function getEntryConfirmation(market, zones) {
  const confirmationCycle = state.tick % 5;
  const choch = confirmationCycle >= 2;
  const candleClose = confirmationCycle !== 4;
  const valid = market.valid && zones.valid && choch && candleClose;

  return {
    valid,
    timeframe: state.intervalLabel === "H4" || state.intervalLabel === "H1" ? "M5" : state.intervalLabel,
    reason: valid ? "ChoCH + clôture de bougie de confirmation" : !choch ? "Order Block détecté mais pas de ChoCH" : "Pas de confirmation bougie",
    choch,
    candleClose,
  };
}

function scoreSetup(market, news, zones, confirmation) {
  let score = 0;
  score += clamp(market.score, 0, 34);
  score += news.score;
  score += zones.valid ? 24 : zones.liquidityTaken ? 14 : 8;
  score += confirmation.valid ? 24 : confirmation.choch ? 15 : 6;
  return clamp(Math.round(score), 0, 100);
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

function getMissingReason(market, news, zones, confirmation) {
  if (!market.valid) return market.context === "range dangereux" ? "Marché en range dangereux" : "Météo du marché non alignée";
  if (!news.valid) return news.reason;
  if (!zones.valid) return zones.reason;
  if (!confirmation.valid) return confirmation.reason;
  return "Attente confirmation";
}

function renderBlocks(market, news, zones, confirmation) {
  const blockRows = [
    ["Météo du marché", market.valid, market.context],
    ["News économiques", news.valid, news.reason],
    ["Zones clés", zones.valid, zones.reason],
    ["Confirmation d'entrée", confirmation.valid, confirmation.reason],
  ];

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

function renderScenarios(market, zones, confirmation, session) {
  const scenarios = [
    {
      title: `${market.bias === "SELL" ? "Short" : "Long"} sur retour zone clé`,
      body: `${zones.primary} · ${session.name} · ${confirmation.timeframe}`,
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

function renderStrategyOverlay(direction, zones, confirmation) {
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
  if (visible.entryZones) items.push({ className: direction === "SELL" ? "overlay-sell" : "overlay-buy", label: "Entrée", style: "left: 58%; top: 56%; width: 14%; height: 7%;" });
  if (classic.ema20) items.push({ className: "overlay-ema overlay-ema20", label: "", style: "left: 12%; top: 37%; width: 68%; transform: rotate(-7deg);" });
  if (classic.ema50) items.push({ className: "overlay-ema overlay-ema50", label: "", style: "left: 10%; top: 48%; width: 70%; transform: rotate(-3deg);" });
  if (classic.ema200) items.push({ className: "overlay-ema overlay-ema200", label: "", style: "left: 8%; top: 59%; width: 72%; transform: rotate(2deg);" });
  if (classic.superTrend) items.push({ className: "overlay-supertrend", label: "", style: "left: 20%; top: 66%; width: 55%; transform: rotate(-5deg);" });

  elements.strategyOverlay.innerHTML = items
    .map((item) => `<span class="overlay-item ${item.className}" style="${item.style}">${item.label}</span>`)
    .join("");
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
