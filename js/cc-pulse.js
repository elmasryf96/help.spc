// ============================================================
// CC PULSE: live agent status + reports (admin only)
// Split from the original script.js on 2026-09-06
// ============================================================

// ============================================================
// 📡 CC PULSE - LIVE AGENT STATUS (ADMIN ONLY)
// ============================================================
let ccPulsePollTimer = null;
let ccPulseTickTimer = null;
let ccPulseReportPollTimer = null;
let ccPulseAgentsCache = [];
let ccPulseAgentsCacheFetchedAtMs = 0; // وقت آخر تحديث لبيانات الحالة الحية - يستخدمه ويدجت الصفحة الرئيسية كمان

// ألوان الحالات المستخدمة في كل تايم لاين - مختارة عشان تبان واضحة فوق بار غامق
const CCP_STATUS_ICONS = { "Available": "fa-headset", "Break": "fa-mug-hot", "Emails": "fa-envelope", "Custom 1": "fa-users", "Custom 2": "fa-star", "Out of office": "fa-phone-volume" };
// بعض الحالات اسمها الحقيقي في 3CX مش واضح لليوزر - بنستبدله باسم أوضح وقت العرض بس (البيانات والحسابات لسه شغالة بالاسم الأصلي)
const CCP_STATUS_DISPLAY_NAMES = { "Out of office": "Call Outs" };
function ccpDisplayStatusName(status) {
  return CCP_STATUS_DISPLAY_NAMES[status] || status;
}
// أخضر = شغال (أي حالة غير Break)، أصفر = Break، أزرق = Follow up case - مفيش فرق بين الفرق (Calls/Emails/Outbound) في اللون
function ccpStatusColor(status) {
  if (status === "Break") return "#d97706";
  if (status === "Follow up case") return "#2563eb";
  return "#107c41";
}
const CCP_STATUS_COLORS = {
  "Available": ccpStatusColor("Available"),
  "Break": ccpStatusColor("Break"),
  "Emails": ccpStatusColor("Emails"),
  "Custom 1": ccpStatusColor("Custom 1"),
  "Custom 2": ccpStatusColor("Custom 2")
};
let ccPulseMode = "day";
let ccpResultView = "queue"; // "queue" | "agents" - بيفصل بين قسم الـ Queue Overview وقسم كروت الإيجنتس في تقرير "All agents"، وبيفضل زي ما هو حتى مع التحديث التلقائي كل 20 ثانية

function setCcpResultView(view) {
  ccpResultView = view;
  const queueBox = document.getElementById("ccpQueueSection");
  const agentsBox = document.getElementById("ccpAgentsSection");
  const queueBtn = document.getElementById("ccpResultViewBtn_queue");
  const agentsBtn = document.getElementById("ccpResultViewBtn_agents");
  if (queueBox) queueBox.style.display = (view === "queue") ? "" : "none";
  if (agentsBox) agentsBox.style.display = (view === "agents") ? "" : "none";
  if (queueBtn) queueBtn.classList.toggle("active", view === "queue");
  if (agentsBtn) agentsBtn.classList.toggle("active", view === "agents");
}
let ccPulseReportLiveBase = null; // بيتخزن فيه أرقام آخر تقرير عشان نعد عليها بالثانية زي العداد اللي فوق
let ccPulseLastExportAgentsList = null; // بيتخزن فيه آخر بيانات تقرير اتحمّلت عشان زرار الـ Export يقدر يستخدمها
let ccPulseLastExportTrackingStartDate = null; // بيتخزن فيه trackingStartDate بتاع آخر تقرير، عشان الـ CSV يستبعد نفس الأيام

function initCcPulsePage() {
  const uae = getUAECurrentDate();
  const todayStr = `${uae.year}-${uae.month}-${uae.day}`;

  const dayInput = document.getElementById("ccpDayInput");
  if (dayInput) dayInput.value = todayStr;

  const rangeStartInput = document.getElementById("ccpRangeStartInput");
  const rangeEndInput = document.getElementById("ccpRangeEndInput");
  if (rangeStartInput) rangeStartInput.value = todayStr;
  if (rangeEndInput) rangeEndInput.value = todayStr;

  const monthInput = document.getElementById("ccpMonthInput");
  if (monthInput) monthInput.value = todayStr.slice(0, 7);

  const select = document.getElementById("ccPulseAgentSelect");
  if (select) select.dataset.populated = "false";

  setCcPulseMode("day");
  fetchCcPulseLiveStatus();
  startCcPulsePolling();
}

function startCcPulsePolling() {
  stopCcPulsePolling();
  ccPulsePollTimer = setInterval(fetchCcPulseLiveStatus, 10000);
  ccPulseTickTimer = setInterval(() => {
    tickCcPulseCounters();
    tickCcPulseReportNumbers();
  }, 1000);
}

function stopCcPulsePolling() {
  if (ccPulsePollTimer) clearInterval(ccPulsePollTimer);
  if (ccPulseTickTimer) clearInterval(ccPulseTickTimer);
  if (ccPulseReportPollTimer) clearInterval(ccPulseReportPollTimer);
  ccPulsePollTimer = null;
  ccPulseTickTimer = null;
  ccPulseReportPollTimer = null;
  ccPulseReportLiveBase = null;
}

async function fetchCcPulseLiveStatus() {
  const grid = document.getElementById("ccPulseLiveGrid");
  try {
    const res = await fetch(PYTHON_BACKEND_AGENT_STATUS_URL);
    const agents = await res.json();
    ccPulseAgentsCache = Array.isArray(agents) ? agents : [];
    ccPulseAgentsCacheFetchedAtMs = Date.now();
    renderCcPulseLiveGrid();
    populateCcPulseAgentSelect();
    if (typeof updateDashboardLiveWidget === "function") updateDashboardLiveWidget();
  } catch (e) {
    if (grid) grid.innerHTML = `<div class="ccp-error">⚠️ Could not load live status</div>`;
  }
}

function formatCcPulseElapsed(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// رصيد البريك اليومي (30 دقيقة) - بيترست لوحده كل يوم لأنه بيتحسب من "تقرير النهاردة" بس
const CCP_BREAK_BUDGET_SECONDS = 30 * 60;

// بيرجع نص العداد (المتبقي أو الزيادة بالسالب) + هل تخطى الحد ولا لسه
function formatCcPulseBreakRemaining(usedSeconds) {
  const remaining = CCP_BREAK_BUDGET_SECONDS - usedSeconds;
  if (remaining >= 0) {
    return { text: formatCcPulseElapsed(remaining), over: false };
  }
  return { text: "-" + formatCcPulseElapsed(-remaining), over: true };
}

function ccPulseBuildAgentCardHtml(a, nowSec) {
  const isAway = a.status === "Away";
  const isOnBreak = a.status === "Break";
  const statusClass = isAway ? "ccp-status-away" : (isOnBreak ? "ccp-status-break" : "ccp-status-active");

  // الشيفت المجدول للإيجنت ده النهاردة من الروستر (لو موجود)
  const uaeNow = getUAECurrentDate();
  const todayStr = `${uaeNow.year}-${uaeNow.month}-${uaeNow.day}`;
  const shiftWindow = getShiftWindowForAgentDate(a.name, todayStr);
  const shiftHtml = shiftWindow
    ? `<div class="ccp-shift-label"><i class="fa-solid fa-calendar-day"></i> ${shiftWindow.label}</div>`
    : "";

  // إجمالي وقت الشغل تراكمي طول اليوم (من غير Away): بيعد لايف وهو شغال،
  // وبيفضل واقف على آخر رقم لما يبقى Away (مش بيختفي) - وبيترست لوحده كل يوم جديد
  const todayBase = a.todaysTotalSeconds || 0;
  const todayHtml = `<div class="ccp-counter" data-today-base="${todayBase}" data-today-fetched="${nowSec}" data-today-active="${isAway ? "0" : "1"}">${formatCcPulseElapsed(todayBase)}</div>`;

  // رصيد البريك: عداد تنازلي من 30 دقيقة وهو في بريك، ولو خلص الوقت بيتحول لسالب بالأحمر
  const breakBase = a.todaysBreakSeconds || 0;
  const breakInfo = formatCcPulseBreakRemaining(breakBase);
  const breakHtml = `
    <div class="ccp-break-badge" data-break-base="${breakBase}" data-break-fetched="${nowSec}" data-break-active="${isOnBreak ? "1" : "0"}">
      <i class="fa-solid fa-mug-hot"></i> Break:
      <span class="ccp-break-value" style="${breakInfo.over ? "color:#ef4444;font-weight:800;" : ""}">${breakInfo.text}</span>
    </div>`;

  const agentDept = getAgentDeptToday(a.name);
  const callsAnsweredHtml = (agentDept === "Calls")
    ? `<div class="ccp-calls-badge"><i class="fa-solid fa-phone-volume"></i> Calls: ${a.todaysCallsAnswered || 0}</div>`
    : "";
  const outboundHtml = `<div class="ccp-outbound-badge"><i class="fa-solid fa-arrow-up-right-from-square"></i> Outbound: ${a.todaysOutboundCalls || 0}</div>`;

  let callHtml = "";
  if (a.currentCall && a.currentCall.startedAt) {
    const callElapsed = nowSec - a.currentCall.startedAt;
    callHtml = `
      <div class="ccp-call-badge" data-call-start="${a.currentCall.startedAt}">
        <i class="fa-solid fa-phone-volume"></i> ${a.currentCall.with}
        <span class="ccp-call-duration">${formatCcPulseElapsed(callElapsed)}</span>
      </div>`;
  }

  return `
    <div class="ccp-agent-card">
      <div class="ccp-agent-name">${a.name}</div>
      <div class="ccp-status-badge ${statusClass}">${ccpDisplayStatusName(a.status)}</div>
      ${shiftHtml}
      ${todayHtml}
      ${breakHtml}
      ${callsAnsweredHtml}
      ${outboundHtml}
      ${callHtml}
    </div>`;
}

// نفس تصنيف الفرق المستخدم في صفحة الروستر بالظبط (roster.js) - عشان الاتنين يفضلوا متسقين
const CCP_TEAM_LIST = ["Calls", "Call Outs", "Emails"];
const CCP_TEAM_ICONS = { "Calls": "fa-headset", "Call Outs": "fa-phone-volume", "Emails": "fa-envelope-open-text" };

function renderCcPulseLiveGrid() {
  const grid = document.getElementById("ccPulseLiveGrid");
  if (!grid) return;

  const nowSec = Date.now() / 1000;

  // بنقسم الإيجنتس على الفرق التلاتة (مفيش روستر = بيتحسب Calls زي getAgentDeptToday بالظبط)
  const byTeam = {};
  CCP_TEAM_LIST.forEach(t => { byTeam[t] = []; });
  ccPulseAgentsCache.forEach(a => {
    const dept = getAgentDeptToday(a.name);
    const team = CCP_TEAM_LIST.includes(dept) ? dept : "Calls";
    byTeam[team].push(a);
  });

  grid.innerHTML = CCP_TEAM_LIST.map(team => {
    const agents = byTeam[team];
    if (agents.length === 0) return "";
    return `
      <div class="ccp-team-block">
        <div class="dept-card-header" style="margin: 0 15px 8px;">
          <i class="fa-solid ${CCP_TEAM_ICONS[team] || "fa-users"}"></i>
          <h3>${team} Team</h3>
          <span class="dept-count">${agents.length} Agent${agents.length === 1 ? "" : "s"}</span>
        </div>
        <div class="ccp-live-grid">
          ${agents.map(a => ccPulseBuildAgentCardHtml(a, nowSec)).join("")}
        </div>
      </div>`;
  }).join("");
}

function tickCcPulseCounters() {
  const nowSec = Date.now() / 1000;

  document.querySelectorAll(".ccp-counter").forEach(el => {
    const base = parseFloat(el.getAttribute("data-today-base"));
    const fetchedAt = parseFloat(el.getAttribute("data-today-fetched"));
    const isActive = el.getAttribute("data-today-active") === "1";
    if (isNaN(base) || isNaN(fetchedAt)) return;
    const elapsed = isActive ? Math.max(0, nowSec - fetchedAt) : 0;
    el.textContent = formatCcPulseElapsed(base + elapsed);
  });

  document.querySelectorAll(".ccp-break-badge").forEach(el => {
    const base = parseFloat(el.getAttribute("data-break-base"));
    const fetchedAt = parseFloat(el.getAttribute("data-break-fetched"));
    const isActive = el.getAttribute("data-break-active") === "1";
    if (isNaN(base) || isNaN(fetchedAt)) return;
    const elapsed = isActive ? Math.max(0, nowSec - fetchedAt) : 0;
    const info = formatCcPulseBreakRemaining(base + elapsed);
    const valueEl = el.querySelector(".ccp-break-value");
    if (valueEl) {
      valueEl.textContent = info.text;
      valueEl.style.color = info.over ? "#ef4444" : "";
      valueEl.style.fontWeight = info.over ? "800" : "";
    }
  });

  document.querySelectorAll(".ccp-call-badge").forEach(el => {
    const start = parseFloat(el.getAttribute("data-call-start"));
    const durEl = el.querySelector(".ccp-call-duration");
    if (!isNaN(start) && durEl) durEl.textContent = formatCcPulseElapsed(nowSec - start);
  });
}

// بيعد بالثانية على أرقام تقرير اليوم (Total login time + الحالة الحالية)
// بنفس فكرة العداد اللي فوق، من غير ما نضطر نطلب البيانات من السيرفر كل ثانية
function tickCcPulseReportNumbers() {
  if (!ccPulseReportLiveBase) return;

  if (ccPulseReportLiveBase.type === "all") {
    const elapsed = (Date.now() - ccPulseReportLiveBase.fetchedAtMs) / 1000;
    if (elapsed < 0) return;

    ccPulseAgentsCache.forEach(liveAgent => {
      if (liveAgent.status === "Away") return; // ثابت زي ما هو
      const base = ccPulseReportLiveBase.perAgentSeconds[liveAgent.name];
      if (base === undefined) return;
      const totalEl = document.querySelector(`[data-agent-total="${liveAgent.name}"]`);
      if (totalEl) totalEl.textContent = formatCcPulseDuration(base + elapsed);

      const statusBase = (ccPulseReportLiveBase.perAgentStatusSeconds[liveAgent.name] || {})[liveAgent.status] || 0;
      const statusEl = document.querySelector(`[data-agent-status="${liveAgent.name}::${liveAgent.status}"]`);
      if (statusEl) statusEl.textContent = formatCcPulseDuration(statusBase + elapsed);
    });
    return;
  }

  // type === "single"
  const liveAgent = ccPulseAgentsCache.find(a => a.name === ccPulseReportLiveBase.agentName);
  if (!liveAgent || liveAgent.status === "Away") return; // الإيجنت مش شغال دلوقتي، الأرقام تفضل ثابتة

  const elapsed = (Date.now() - ccPulseReportLiveBase.fetchedAtMs) / 1000;
  if (elapsed < 0) return;

  const totalEl = document.getElementById("ccpTotalLoginValue");
  if (totalEl) {
    totalEl.textContent = formatCcPulseDuration(ccPulseReportLiveBase.totalSeconds + elapsed);
  }

  const statusEl = document.querySelector(`[data-status-metric="${liveAgent.status}"]`);
  if (statusEl) {
    const baseForStatus = ccPulseReportLiveBase.statusSeconds[liveAgent.status] || 0;
    statusEl.textContent = formatCcPulseDuration(baseForStatus + elapsed);
  }
}

function populateCcPulseAgentSelect() {
  const select = document.getElementById("ccPulseAgentSelect");
  if (!select || select.dataset.populated === "true") return;
  const names = ccPulseAgentsCache.map(a => a.name).sort();
  select.innerHTML = `<option value="__all__">All agents</option>` +
    names.map(n => `<option value="${n}">${n}</option>`).join("");
  select.dataset.populated = "true";
}

function setCcPulseMode(mode) {
  ccPulseMode = mode;
  ["day", "range", "month"].forEach(m => {
    const btn = document.getElementById("ccpMode_" + m);
    const box = document.getElementById("ccpModeBox_" + m);
    if (btn) btn.classList.toggle("active", m === mode);
    if (box) box.style.display = (m === mode) ? "flex" : "none";
  });
}

function buildCcPulseDateParams() {
  const params = new URLSearchParams();
  params.set("mode", ccPulseMode);
  if (ccPulseMode === "day") {
    params.set("date", document.getElementById("ccpDayInput").value);
  } else if (ccPulseMode === "range") {
    params.set("start", document.getElementById("ccpRangeStartInput").value);
    params.set("end", document.getElementById("ccpRangeEndInput").value);
  } else if (ccPulseMode === "month") {
    params.set("month", document.getElementById("ccpMonthInput").value);
  }
  return params;
}

async function loadCcPulseReport(isAutoRefresh = false) {
  const resultBox = document.getElementById("ccPulseReportResult");
  const select = document.getElementById("ccPulseAgentSelect");
  if (!resultBox || !select) return;

  // كل مرة اليوزر يدوس "View report" بنفسه، بنلغي أي تحديث تلقائي شغال قبل كده ونبدأ من جديد
  if (!isAutoRefresh && ccPulseReportPollTimer) {
    clearInterval(ccPulseReportPollTimer);
    ccPulseReportPollTimer = null;
  }

  const agentName = select.value;
  const params = buildCcPulseDateParams();

  // في التحديث التلقائي منعرضش "Loading..." تاني عشان الشاشة متريقش/تقفز، بس أول مرة بس
  if (!isAutoRefresh) {
    resultBox.innerHTML = `<div class="ccp-loading">Loading report...</div>`;
  }

  try {
    if (agentName === "__all__") {
      params.set("action", "allAgentsLoginTotals");
      const callLogParams = buildCcPulseDateParams();
      callLogParams.set("action", "callLogReport");

      const [res, callLogRes] = await Promise.all([
        fetch(`${GOOGLE_SHEET_API_URL}?${params.toString()}`),
        fetch(`${GOOGLE_SHEET_API_URL}?${callLogParams.toString()}`)
      ]);
      const data = await res.json();
      const callLogData = await callLogRes.json().catch(() => null);
      renderCcPulseAllAgentsReport(data, callLogData);

      const uae = getUAECurrentDate();
      const todayStr = `${uae.year}-${uae.month}-${uae.day}`;
      const isTodayView = ccPulseMode === "day" && document.getElementById("ccpDayInput").value === todayStr;

      if (isTodayView && data && data.status === "success") {
        const perAgentSeconds = {};
        const perAgentStatusSeconds = {};
        data.agents.forEach(a => {
          perAgentSeconds[a.name] = a.totalLoginSeconds || 0;
          perAgentStatusSeconds[a.name] = Object.assign({}, a.totals || {});
        });
        ccPulseReportLiveBase = {
          type: "all",
          fetchedAtMs: Date.now(),
          perAgentSeconds: perAgentSeconds,
          perAgentStatusSeconds: perAgentStatusSeconds
        };
      } else {
        ccPulseReportLiveBase = null;
      }
    } else {
      params.set("action", "agentStatusReport");
      params.set("name", agentName);
      const callLogParams = buildCcPulseDateParams();
      callLogParams.set("action", "callLogReport");
      callLogParams.set("name", agentName);

      const [res, callLogRes] = await Promise.all([
        fetch(`${GOOGLE_SHEET_API_URL}?${params.toString()}`),
        fetch(`${GOOGLE_SHEET_API_URL}?${callLogParams.toString()}`)
      ]);
      const data = await res.json();
      const callLogData = await callLogRes.json().catch(() => null);
      renderCcPulseSingleAgentReport(data, callLogData);

      // بنعد بالثانية بس لو: التقرير عن يوم واحد وده يوم النهاردة، وفيه بيانات صح
      const uae = getUAECurrentDate();
      const todayStr = `${uae.year}-${uae.month}-${uae.day}`;
      const isTodayView = ccPulseMode === "day" && document.getElementById("ccpDayInput").value === todayStr;

      if (isTodayView && data && data.status === "success") {
        ccPulseReportLiveBase = {
          type: "single",
          agentName: agentName,
          fetchedAtMs: Date.now(),
          totalSeconds: data.totalLoginSeconds || 0,
          statusSeconds: Object.assign({}, data.totals || {})
        };
      } else {
        ccPulseReportLiveBase = null;
      }
    }

    // بعد أول تحميل ناجح (مش أوتوماتيك)، بنبدأ نحدّث التقرير كل 20 ثانية (بيصحح أي فرق بسيط ممكن يحصل من العد بالثانية)
    if (!isAutoRefresh) {
      ccPulseReportPollTimer = setInterval(() => loadCcPulseReport(true), 20000);
    }
  } catch (e) {
    console.error("CC Pulse report error:", e);
    if (!isAutoRefresh) {
      resultBox.innerHTML = `<div class="ccp-error">⚠️ Could not load report</div>`;
    }
  }
}

function formatCcPulseDuration(totalSeconds) {
  totalSeconds = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return s > 0 ? `${h}h ${m}m ${s}s` : (m > 0 ? `${h}h ${m}m` : `${h}h`);
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

function ccPulseTimeOnly(ts) {
  if (!ts) return "--";
  const parts = ts.split(" ");
  return parts[1] ? parts[1].slice(0, 5) : ts;
}

// بيبني كارت "Queue Overview" اللي بيوري أداء الكيو ككل (مش لإيجنت بعينه):
// إجمالي المكالمات، المردود عليها، نسبة الـ Abandonment، ومتوسط سرعة الرد (ASA)
function ccPulseBuildQueueSummaryHtml(qs) {
  if (!qs) return "";
  const abClass = qs.abandonmentRatePct <= 5 ? "ccp-adh-good" : (qs.abandonmentRatePct <= 10 ? "ccp-adh-warn" : "ccp-adh-bad");
  const asaClass = qs.asaSeconds <= 20 ? "ccp-adh-good" : (qs.asaSeconds <= 40 ? "ccp-adh-warn" : "ccp-adh-bad");
  const slClass = qs.serviceLevelPct >= 80 ? "ccp-adh-good" : (qs.serviceLevelPct >= 70 ? "ccp-adh-warn" : "ccp-adh-bad");
  return `
    <div class="ccp-queue-summary-card">
      <div class="ccp-queue-summary-header"><i class="fa-solid fa-headset"></i> Queue Overview (All Agents)</div>
      <div class="ccp-metrics-grid">
        <div class="ccp-metric-card">
          <div class="ccp-metric-label">Total Queue Calls</div>
          <div class="ccp-metric-value">${qs.totalCalls}</div>
        </div>
        <div class="ccp-metric-card ccp-metric-blue">
          <div class="ccp-metric-label">Answered</div>
          <div class="ccp-metric-value">${qs.answered}</div>
        </div>
        <div class="ccp-metric-card ${abClass}">
          <div class="ccp-metric-label">Abandonment Rate</div>
          <div class="ccp-metric-value">${qs.abandonmentRatePct}%</div>
        </div>
        <div class="ccp-metric-card ${asaClass}">
          <div class="ccp-metric-label">ASA (Avg Speed of Answer)</div>
          <div class="ccp-metric-value">${formatCcPulseDuration(qs.asaSeconds)}</div>
        </div>
        <div class="ccp-metric-card ${slClass}">
          <div class="ccp-metric-label">Service Level (20s)</div>
          <div class="ccp-metric-value">${qs.serviceLevelPct}%</div>
        </div>
        <div class="ccp-metric-card">
          <div class="ccp-metric-label">Abandoned</div>
          <div class="ccp-metric-value">${qs.abandoned}</div>
        </div>
        <div class="ccp-metric-card">
          <div class="ccp-metric-label">Redirected</div>
          <div class="ccp-metric-value">${qs.redirected}</div>
        </div>
      </div>
    </div>`;
}

// بيبني جدول تريند يومي لـ Abandonment Rate و ASA - بيظهر بس لما المدة المختارة
// أكتر من يوم واحد (Range أو Month)، عشان نلاحظ لو فيه تحسن أو تدهور مع الوقت
function ccPulseBuildQueueTrendHtml(byDay) {
  if (!byDay || byDay.length <= 1) return "";

  const rowsHtml = byDay.map(d => {
    const abClass = d.totalCalls === 0 ? "" : (d.abandonmentRatePct <= 5 ? "ccp-adh-good" : (d.abandonmentRatePct <= 10 ? "ccp-adh-warn" : "ccp-adh-bad"));
    const asaClass = d.answered === 0 ? "" : (d.asaSeconds <= 20 ? "ccp-adh-good" : (d.asaSeconds <= 40 ? "ccp-adh-warn" : "ccp-adh-bad"));
    const slClass = d.answered === 0 ? "" : (d.serviceLevelPct >= 80 ? "ccp-adh-good" : (d.serviceLevelPct >= 70 ? "ccp-adh-warn" : "ccp-adh-bad"));
    return `
      <tr>
        <td style="color:#1a252f">${d.date}</td>
        <td style="color:#1a252f">${d.totalCalls}</td>
        <td style="color:#1a252f">${d.answered}</td>
        <td style="color:#1a252f">${d.abandoned}</td>
        <td class="${abClass}">${d.totalCalls > 0 ? d.abandonmentRatePct + "%" : '<span style="color:#5a6a75">-</span>'}</td>
        <td class="${asaClass}">${d.answered > 0 ? formatCcPulseDuration(d.asaSeconds) : '<span style="color:#5a6a75">-</span>'}</td>
        <td class="${slClass}">${d.answered > 0 ? d.serviceLevelPct + "%" : '<span style="color:#5a6a75">-</span>'}</td>
      </tr>`;
  }).join("");

  return `
    <div class="ccp-queue-summary-card">
      <div class="ccp-queue-summary-header"><i class="fa-solid fa-chart-line"></i> Queue Trend (Daily)</div>
      <div class="ccp-queue-trend-table-wrap">
        <table class="ccp-queue-trend-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Total</th>
              <th>Answered</th>
              <th>Abandoned</th>
              <th>Abandonment %</th>
              <th>ASA</th>
              <th>Service Level (20s)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

// بيبني جدول Leaderboard لترتيب الإيجنتس حسب عدد المكالمات المردود عليها (والـ AHT
// جنبها للسياق) - بيظهر بس في تقرير "All agents"، ومقتصر على تيم الـ Calls بس
// (تيم الإيميلز وتيم الـ Outbound مستبعدين، مش هدفهم عدد مكالمات الكيو)
function ccPulseBuildLeaderboardHtml(callLogData) {
  if (!callLogData || callLogData.status !== "success" || !Array.isArray(callLogData.agents)) return "";

  const ranked = callLogData.agents
    .filter(a => a.callsAnswered > 0 && getAgentDeptToday(a.agent) === "Calls")
    .slice()
    .sort((a, b) => b.callsAnswered - a.callsAnswered);

  if (ranked.length === 0) return "";

  const medals = ["🥇", "🥈", "🥉"];
  const rowsHtml = ranked.map((a, i) => `
      <tr class="${i < 3 ? 'ccp-leaderboard-top' : ''}">
        <td style="color:#1a252f">${medals[i] || (i + 1)}</td>
        <td style="color:#1a252f">${a.agent}</td>
        <td style="color:#1a252f">${a.callsAnswered}</td>
        <td style="color:#1a252f">${formatCcPulseDuration(a.ahtSeconds)}</td>
      </tr>`).join("");

  return `
    <div class="ccp-queue-summary-card">
      <div class="ccp-queue-summary-header"><i class="fa-solid fa-trophy"></i> Leaderboard (Calls Answered)</div>
      <div class="ccp-queue-trend-table-wrap">
        <table class="ccp-queue-trend-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Agent</th>
              <th>Calls Answered</th>
              <th>AHT</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

// بيبني جدول "Peak Hours" - توزيع مكالمات الكيو على 24 ساعة اليوم (Total/Abandonment/ASA)
// مع بار بصري بسيط لكل ساعة عشان يبان أوقات الزحمة بسرعة - بيستبعد الساعات اللي مفيهاش مكالمات خالص
function ccPulseBuildPeakHoursHtml(byHour) {
  if (!byHour || !byHour.length) return "";
  const activeHours = byHour.filter(h => h.totalCalls > 0);
  if (activeHours.length === 0) return "";

  const maxCalls = Math.max(...activeHours.map(h => h.totalCalls));

  const rowsHtml = activeHours.map(h => {
    const abClass = h.abandonmentRatePct <= 5 ? "ccp-adh-good" : (h.abandonmentRatePct <= 10 ? "ccp-adh-warn" : "ccp-adh-bad");
    const asaClass = h.answered === 0 ? "" : (h.asaSeconds <= 20 ? "ccp-adh-good" : (h.asaSeconds <= 40 ? "ccp-adh-warn" : "ccp-adh-bad"));
    const slClass = h.answered === 0 ? "" : (h.serviceLevelPct >= 80 ? "ccp-adh-good" : (h.serviceLevelPct >= 70 ? "ccp-adh-warn" : "ccp-adh-bad"));
    const barPct = maxCalls > 0 ? Math.round((h.totalCalls / maxCalls) * 100) : 0;
    const hourLabel = String(h.hour).padStart(2, "0") + ":00";
    return `
      <tr>
        <td style="color:#1a252f">${hourLabel}</td>
        <td style="color:#1a252f">
          <div class="ccp-peak-bar-wrap">
            <div class="ccp-peak-bar" style="width:${barPct}%"></div>
            <span class="ccp-peak-bar-label">${h.totalCalls}</span>
          </div>
        </td>
        <td class="${abClass}">${h.abandonmentRatePct}%</td>
        <td class="${asaClass}">${h.answered > 0 ? formatCcPulseDuration(h.asaSeconds) : '<span style="color:#5a6a75">-</span>'}</td>
        <td class="${slClass}">${h.answered > 0 ? h.serviceLevelPct + "%" : '<span style="color:#5a6a75">-</span>'}</td>
      </tr>`;
  }).join("");

  return `
    <div class="ccp-queue-summary-card">
      <div class="ccp-queue-summary-header"><i class="fa-solid fa-clock"></i> Peak Hours (Call Volume)</div>
      <div class="ccp-queue-trend-table-wrap">
        <table class="ccp-queue-trend-table">
          <thead>
            <tr>
              <th>Hour</th>
              <th>Calls</th>
              <th>Abandonment %</th>
              <th>ASA</th>
              <th>Service Level (20s)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

function renderCcPulseAllAgentsReport(data, callLogData) {
  const resultBox = document.getElementById("ccPulseReportResult");
  if (!data || data.status !== "success") {
    resultBox.innerHTML = `<div class="ccp-error">⚠️ ${data && data.message ? data.message : "No data"}</div>`;
    return;
  }

  const statusColors = CCP_STATUS_COLORS;

  const callLogByAgent = {};
  if (callLogData && callLogData.status === "success" && Array.isArray(callLogData.agents)) {
    callLogData.agents.forEach(c => { callLogByAgent[c.agent] = c; });
  }

  const cardsHtml = data.agents.map(a => {
    const totalsHtml = Object.keys(a.totals || {}).map(st => `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">${ccpDisplayStatusName(st)}</div>
        <div class="ccp-metric-value" data-agent-status="${a.name}::${st}">${formatCcPulseDuration(a.totals[st])}</div>
      </div>`).join("");

    const callStats = callLogByAgent[a.name];
    const agentDept = getAgentDeptToday(a.name);
    const callsHtml = (agentDept === "Calls")
      ? `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Calls Answered</div>
        <div class="ccp-metric-value">${callStats ? callStats.callsAnswered : 0}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">AHT</div>
        <div class="ccp-metric-value">${callStats ? formatCcPulseDuration(callStats.ahtSeconds) : "0s"}</div>
      </div>`
      : "";
    const outboundReportHtml = `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Outbound Calls</div>
        <div class="ccp-metric-value">${callStats ? callStats.outboundCallsCount : 0}</div>
      </div>`;

    let adherenceHtml = "";
    let timelineHtml = "";
    let attendanceBadgeHtml = "";

    if (a.date) {
      const shiftWindow = getShiftWindowForAgentDate(a.name, a.date);
      const attendanceStatus = getAttendanceStatus(shiftWindow, a.totalLoginSeconds, a.date, a.firstLogin, a.endShift);
      if (attendanceStatus === "off") {
        attendanceBadgeHtml = `<div class="ccp-attendance-badge ccp-attendance-off">🏖️ Day Off</div>`;
      } else if (attendanceStatus === "no-show") {
        attendanceBadgeHtml = `<div class="ccp-attendance-badge ccp-attendance-noshow">🚫 No Show</div>`;
      }

      const effectiveEndMin = getEffectiveShiftEndMin(a.date);
      const adherencePct = calculateShiftAdherence(a.sessions || [], shiftWindow, effectiveEndMin);
      if (adherencePct !== null) {
        const adherenceClass = adherencePct >= 90 ? "ccp-adh-good" : (adherencePct >= 70 ? "ccp-adh-warn" : "ccp-adh-bad");
        adherenceHtml = `
          <div class="ccp-metric-card ${adherenceClass}">
            <div class="ccp-metric-label">Adherence</div>
            <div class="ccp-metric-value">${ccpFormatAdherencePct(adherencePct)}</div>
          </div>`;
      }
      timelineHtml = renderCcPulseTimelineHtml(a.sessions || [], statusColors, shiftWindow, effectiveEndMin);
    } else {
      const periodAdherencePct = calculateAdherenceFromDays(a.name, a.days || [], data.trackingStartDate);
      if (periodAdherencePct !== null) {
        const adherenceClass = periodAdherencePct >= 90 ? "ccp-adh-good" : (periodAdherencePct >= 70 ? "ccp-adh-warn" : "ccp-adh-bad");
        adherenceHtml = `
          <div class="ccp-metric-card ${adherenceClass}">
            <div class="ccp-metric-label">Adherence</div>
            <div class="ccp-metric-value">${ccpFormatAdherencePct(periodAdherencePct)}</div>
          </div>`;
      }
    }

    const tardyResult = calculateTardyFromDays(a.name, a.days || [], data.trackingStartDate);
    const isSingleDayView = Boolean(a.date);
    const tardyCountLabel = isSingleDayView ? "Tardy" : "Tardy Count";
    const tardyCountValue = isSingleDayView ? (tardyResult.count > 0 ? "Yes" : "No") : tardyResult.count;
    const tardyHtml = `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">${tardyCountLabel}</div>
        <div class="ccp-metric-value">${tardyCountValue}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Tardy Minutes</div>
        <div class="ccp-metric-value">${formatCcPulseDuration(tardyResult.minutes * 60)}</div>
      </div>`;

    return `
      <div class="ccp-agent-report-card">
        <div class="ccp-agent-report-header">
          <span class="ccp-total-name">${a.name}</span>
          <span class="ccp-total-ext">Ext ${a.number}</span>
        </div>
        ${attendanceBadgeHtml}
        <div class="ccp-metric-card ccp-total-highlight">
          <div class="ccp-metric-label">Total login time</div>
          <div class="ccp-metric-value" data-agent-total="${a.name}">${formatCcPulseDuration(a.totalLoginSeconds)}</div>
        </div>
        <div class="ccp-metrics-grid">${callsHtml}${outboundReportHtml}${totalsHtml}${adherenceHtml}${tardyHtml}</div>
        ${timelineHtml}
      </div>`;
  }).join("");

  resultBox.innerHTML = `
    <div class="ccp-export-bar">
      <button type="button" class="ccp-export-btn" onclick="exportCcPulseReportToCsv()">📥 Export to CSV</button>
    </div>
    <div class="ccp-mode-bar" style="margin: 4px 0 14px;">
      <button type="button" id="ccpResultViewBtn_queue" class="ccp-mode-btn" onclick="setCcpResultView('queue')"><i class="fa-solid fa-headset"></i> Queue</button>
      <button type="button" id="ccpResultViewBtn_agents" class="ccp-mode-btn" onclick="setCcpResultView('agents')"><i class="fa-solid fa-users"></i> Agents</button>
    </div>
    <div id="ccpQueueSection">
      ${ccPulseBuildQueueSummaryHtml(callLogData && callLogData.queueSummary)}
      ${ccPulseBuildQueueTrendHtml(callLogData && callLogData.queueSummaryByDay)}
      ${ccPulseBuildPeakHoursHtml(callLogData && callLogData.queueSummaryByHour)}
      ${ccPulseBuildLeaderboardHtml(callLogData)}
    </div>
    <div id="ccpAgentsSection">
      <div class="ccp-all-agents-report">${cardsHtml || '<div class="ccp-empty">No data for this period</div>'}</div>
    </div>`;

  ccPulseLastExportAgentsList = data.agents.map(a => ({ name: a.name, number: a.number, days: a.days || [] }));
  ccPulseLastExportTrackingStartDate = data.trackingStartDate || null;

  setCcpResultView(ccpResultView);
  attachCcPulseTimelineHover();
}

function ccPulseTimeToMinutes(ts) {
  const timePart = ts.split(" ")[1] || "00:00:00";
  const p = timePart.split(":").map(Number);
  return p[0] * 60 + p[1] + (p[2] || 0) / 60;
}

// بيفورمات نسبة الـ Adherence كنص: لو الرقم (بعد التقريب لأقرب 0.01) طلع صحيح زي 100، بيظهر "100%" من غير كسور عشري صفرية بتحس إنها "مظبوطة قوي"،
// ولو فيه كسور فعلية بيظهرها بدقة رقمين عشريين زي "99.89%"
function ccpFormatAdherencePct(pct) {
  const rounded = Math.round(pct * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${text}%`;
}

// بيحول رقم دقايق من نص الليل (زي 570) لنص وقت مقروء (زي "9:30 AM")
function ccPulseMinutesToTimeLabel(totalMinutes) {
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const minute = Math.round(totalMinutes % 60);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

// ============================================================
// 🕐 SHIFT ADHERENCE - مقارنة معاد الشيفت المفروض بالحضور الفعلي
// ============================================================
const CCP_SHIFT_TIME_RANGES = {
  "Shift 1": { startMin: 9 * 60, endMin: 17 * 60, label: "9 AM – 5 PM" },
  "Shift 2": { startMin: 11 * 60, endMin: 19 * 60, label: "11 AM – 7 PM" },
  "Shift 3": { startMin: 13 * 60, endMin: 21 * 60, label: "1 PM – 9 PM" }
};

// بيرجع معاد الشيفت المفروض للإيجنت في تاريخ معين (لو موجود ومعروف)، أو null لو إجازة/مش معروف
// بيرجع فريق الإيجنت (Calls/Call Outs/Emails) من الروستر لنفس اليوم، أو "Calls" افتراضيًا
// لو مالوش صف روستر خالص - عشان يبقى نفس المنطق المستخدم في ويدجت الصفحة الرئيسية
function getAgentDeptToday(agentName) {
  const uae = getUAECurrentDate();
  const monthNum = parseInt(uae.month, 10);
  const yearNum = parseInt(uae.year, 10);
  if (!Array.isArray(rosterData)) return "Calls";
  const entry = rosterData.find(a => a.name === agentName && a.month === monthNum && a.year === yearNum);
  return (entry && entry.dept) ? entry.dept : "Calls";
}

function getShiftWindowForAgentDate(agentName, dateStr) {
  if (!agentName || !dateStr || !Array.isArray(rosterData)) return null;
  const parts = dateStr.split("-").map(Number); // [yyyy, mm, dd]
  const year = parts[0], month = parts[1], day = parts[2];

  const entry = rosterData.find(a => a.name === agentName && a.month === month && a.year === year);
  if (!entry || !entry.schedule) return null;

  const shiftCode = entry.schedule[day];
  const range = CCP_SHIFT_TIME_RANGES[shiftCode];
  if (!range) return null; // OFF / فاضي / كود مش معروف

  return { startMin: range.startMin, endMin: range.endMin, label: `${shiftCode} (${range.label})` };
}

// بيحدد هل اليوم دا "يستاهل نحكم عليه" ولا لأ: أيام مستقبلية (بعد النهاردة) أو شيفت النهاردة نفسه لسه ماوصلش معاده لسه بدري نحكم عليهم
function isDayJudgeable(dateStr, shiftWindow) {
  const uae = getUAECurrentDate();
  const todayStr = `${uae.year}-${uae.month}-${uae.day}`;
  if (dateStr > todayStr) return false; // يوم لسه ماجاش أصلاً
  if (dateStr === todayStr && shiftWindow) {
    const nowMin = uae.hour24 * 60 + uae.minute;
    if (nowMin < shiftWindow.startMin) return false; // شيفت النهاردة لسه ماوصلش معاده
  }
  return true;
}

// بيحدد حالة الحضور: "off" (مفيش شيفت في الروستر = إجازة)، "no-show" (شيفت موجود بس اشتغل أقل من نصه)، أو null (عادي أو لسه بدري نحكم)
function getAttendanceStatus(shiftWindow, totalLoginSeconds, dateStr, firstLogin, endShift) {
  if (!shiftWindow) return "off"; // مفيش شيفت متجدول في الروستر أصلاً
  if (dateStr && !isDayJudgeable(dateStr, shiftWindow)) return null; // لسه بدري (يوم مستقبلي أو الشيفت لسه ماوصلش معاده)

  if (!firstLogin) return "no-show"; // مجاش خالص طول اليوم (ولا مرة غيّر حالته من Away)
  if (!endShift) return null; // لسه شغال فعليًا (معملش Away تاني) - منقدرش نحكم عليه دلوقتي

  const shiftDurationSec = (shiftWindow.endMin - shiftWindow.startMin) * 60;
  const workedSeconds = (new Date(endShift.replace(" ", "T")) - new Date(firstLogin.replace(" ", "T"))) / 1000;
  if (workedSeconds < shiftDurationSec / 2) return "no-show";
  return null;
}

// ============================================================
// ⏰ TARDY - عدد مرات ودقايق التأخير في بداية الشيفت (بدون Grace Period)
// ============================================================
// بياخد قايمة أيام (كل يوم فيه date + firstLogin، واختياريًا totalLoginSeconds لو متوفر)
// وبيرجع { count, minutes }. بيتجاهل تلقائيًا أيام الـ Day Off (مفيش شيفت في الروستر)
// وأيام الـ No Show (مجاش خالص، أو - لو totalLoginSeconds متوفرة - اشتغل أقل من نص الشيفت)
// وأي يوم قبل trackingStartDate (يعني قبل ما نبدأ نسجل بيانات في AgentStatusLog أصلاً)
function calculateTardyFromDays(agentName, days, trackingStartDate) {
  let tardyCount = 0;
  let tardyMinutes = 0;

  (days || []).forEach(day => {
    if (trackingStartDate && day.date < trackingStartDate) return; // قبل بداية التتبع، متجاهلش

    const shiftWindow = getShiftWindowForAgentDate(agentName, day.date);
    if (!shiftWindow) return; // Day Off
    if (!isDayJudgeable(day.date, shiftWindow)) return; // لسه بدري (يوم مستقبلي أو شيفت النهاردة لسه ماوصلش معاده)

    if (day.totalLoginSeconds !== undefined) {
      if (getAttendanceStatus(shiftWindow, day.totalLoginSeconds, day.date, day.firstLogin, day.endShift) === "no-show") return;
    }

    if (!day.firstLogin) return; // مجاش خالص

    const firstLoginMin = ccPulseTimeToMinutes(day.firstLogin);
    const lateMin = firstLoginMin - shiftWindow.startMin;
    if (lateMin > 1) { // فترة سماح دقيقة واحدة - أي تأخير دقيقة أو أقل مايتحسبش
      tardyCount++;
      tardyMinutes += lateMin;
    }
  });

  return { count: tardyCount, minutes: tardyMinutes };
}

// بيحسب نسبة الالتزام بالشيفت: من إجمالي وقت الشيفت المجدول، قد إيه اشتغل فعليًا (مش Away) جواه
// لو اليوم اللي بنقيّمه هو النهاردة، بيرجع "دلوقتي" بالدقايق؛ لو يوم فات، بيرجع null (يعني قيس على الشيفت كامل)
function getEffectiveShiftEndMin(dateStr) {
  const uae = getUAECurrentDate();
  const todayStr = `${uae.year}-${uae.month}-${uae.day}`;
  if (dateStr !== todayStr) return null;
  return uae.hour24 * 60 + uae.minute;
}

// بيحسب نسبة الالتزام بالشيفت: من الوقت اللي "المفروض يكون خلص لحد دلوقتي" (لو الشيفت لسه شغال)، قد إيه اشتغل فعليًا (مش Away) جواه
// بيحسب الفترات (جوه وقت الشيفت بس) اللي الإيجنت كان فيها Away - يعني "خارج الالتزام بالشيفت"
// بيرجع array من [startMin, endMin] بترتيب الوقت
function computeOutOfAdherenceSegments(sessions, shiftWindow, effectiveEndMin) {
  if (!shiftWindow) return [];
  const clampedEnd = (effectiveEndMin != null) ? Math.min(shiftWindow.endMin, effectiveEndMin) : shiftWindow.endMin;
  if (clampedEnd <= shiftWindow.startMin) return [];

  const covered = (sessions || [])
    .map(s => [Math.max(ccPulseTimeToMinutes(s.start), shiftWindow.startMin), Math.min(ccPulseTimeToMinutes(s.end), clampedEnd)])
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  const gaps = [];
  let cursor = shiftWindow.startMin;
  covered.forEach(([start, end]) => {
    if (start > cursor) gaps.push([cursor, start]);
    cursor = Math.max(cursor, end);
  });
  if (cursor < clampedEnd) gaps.push([cursor, clampedEnd]);

  // فترة سماح دقيقة واحدة - زي الـ Tardy بالظبط: أي فجوة دقيقة أو أقل مش هتتحسب Out Of Adherence
  return gaps.filter(([start, end]) => (end - start) > 1);
}

function calculateShiftAdherence(sessions, shiftWindow, effectiveEndMin) {
  if (!shiftWindow) return null; // مفيش شيفت متجدول أصلاً نقيس عليه

  // لو الشيفت لسه شغال (النهاردة ومخلصش لحد دلوقتي)، بنقيس بس على الجزء اللي المفروض يكون عداه من الشيفت
  const clampedEnd = (effectiveEndMin != null) ? Math.min(shiftWindow.endMin, effectiveEndMin) : shiftWindow.endMin;
  const shiftDurationMin = clampedEnd - shiftWindow.startMin;
  if (shiftDurationMin <= 0) return null; // الشيفت لسه ماوصلش معاده أصلاً

  // بنستخدم نفس فترة السماح (دقيقة واحدة) المستخدمة في تحديد فترات الـ Out Of Adherence الحمرا على التايم لاين،
  // عشان النسبة تفضل متسقة مع اللي شايفه الإيجنت/الأدمن بصريًا - أي فجوة دقيقة أو أقل متتحسبش ضد الإيجنت
  const outOfAdherenceGaps = computeOutOfAdherenceSegments(sessions, shiftWindow, effectiveEndMin);
  const gapMin = outOfAdherenceGaps.reduce((sum, [start, end]) => sum + (end - start), 0);
  const workedMinInShift = shiftDurationMin - gapMin;

  const pct = (workedMinInShift / shiftDurationMin) * 100;
  return Math.max(0, Math.min(100, pct));
}

// بيحسب أدهيرنس فترة كاملة (Range/Month): بيجمع الوقت المشتغل جوه الشيفت على كل الأيام،
// ويقسمه على إجمالي مدة الشيفتات المجدولة في نفس الأيام. بيتجاهل تلقائيًا أيام الـ Day Off
// وأي يوم قبل trackingStartDate (يعني قبل ما نبدأ نسجل بيانات في AgentStatusLog أصلاً)
function calculateAdherenceFromDays(agentName, days, trackingStartDate) {
  let workedTotalMin = 0;
  let shiftTotalMin = 0;

  (days || []).forEach(day => {
    if (trackingStartDate && day.date < trackingStartDate) return; // قبل بداية التتبع، متجاهلش

    const shiftWindow = getShiftWindowForAgentDate(agentName, day.date);
    if (!shiftWindow) return; // Day Off
    if (!isDayJudgeable(day.date, shiftWindow)) return; // لسه بدري (يوم مستقبلي أو شيفت النهاردة لسه ماوصلش معاده)

    const effectiveEndMin = getEffectiveShiftEndMin(day.date);
    const clampedEnd = (effectiveEndMin != null) ? Math.min(shiftWindow.endMin, effectiveEndMin) : shiftWindow.endMin;
    const shiftDurationMin = clampedEnd - shiftWindow.startMin;
    if (shiftDurationMin <= 0) return; // الشيفت لسه ماوصلش معاده

    // بنستخدم نفس فترة السماح (دقيقة واحدة) المستخدمة في الأحمر (Out Of Adherence) عشان النسبة تبقى متسقة معاه
    const outOfAdherenceGaps = computeOutOfAdherenceSegments(day.sessions || [], shiftWindow, effectiveEndMin);
    const gapMin = outOfAdherenceGaps.reduce((sum, [start, end]) => sum + (end - start), 0);
    const workedMinInShift = shiftDurationMin - gapMin;

    workedTotalMin += workedMinInShift;
    shiftTotalMin += shiftDurationMin;
  });

  if (shiftTotalMin <= 0) return null;
  const pct = (workedTotalMin / shiftTotalMin) * 100;
  return Math.max(0, Math.min(100, pct));
}

// ============================================================
// 📥 CSV EXPORT - صف لكل يوم لكل إيجنت، بكل التفاصيل
// ============================================================
// بياخد قايمة إيجنتس [{ name, number, days }] وبيبني صفوف CSV (هيدر + صف لكل يوم لكل إيجنت)
// بيتجاهل تلقائيًا أي يوم قبل trackingStartDate (لو اتبعتت) عشان الأرقام تفضل متسقة مع باقي التقرير
function buildCcPulseExportRows(agentsList, trackingStartDate) {
  // نجمع كل أسماء الـ status الموجودة في كل الأيام لكل الإيجنتس، عشان الأعمدة تبقى موحدة لكل الصفوف
  const statusSet = new Set();
  agentsList.forEach(agent => {
    (agent.days || []).forEach(day => {
      if (trackingStartDate && day.date < trackingStartDate) return;
      Object.keys(day.totals || {}).forEach(st => statusSet.add(st));
    });
  });
  const statusColumns = Array.from(statusSet);

  const headers = ["Date", "Agent", "Ext", "Scheduled Shift", "First Login", "End Shift", "Tardy", "Tardy Minutes", "Total Login Time", "Breaks"].concat(statusColumns.map(st => ccpDisplayStatusName(st)));
  const rows = [headers];

  agentsList.forEach(agent => {
    (agent.days || []).forEach(day => {
      if (trackingStartDate && day.date < trackingStartDate) return; // قبل بداية التتبع، متجاهلش

      const shiftWindow = getShiftWindowForAgentDate(agent.name, day.date);
      const shiftLabel = shiftWindow ? shiftWindow.label : "Day Off";

      const firstLoginMin = day.firstLogin ? ccPulseTimeToMinutes(day.firstLogin) : null;
      let isTardy = "No";
      let tardyMin = 0;
      if (shiftWindow && firstLoginMin !== null) {
        const lateMin = firstLoginMin - shiftWindow.startMin;
        if (lateMin > 1) { // نفس فترة السماح دقيقة واحدة المستخدمة في التقرير
          isTardy = "Yes";
          tardyMin = Math.round(lateMin);
        }
      }

      const breaksList = (day.sessions || [])
        .filter(s => s.status === "Break")
        .map(s => `${ccPulseTimeOnly(s.start)}\u2192${ccPulseTimeOnly(s.end)}`)
        .join("; ");

      const row = [
        day.date,
        agent.name,
        agent.number || "-",
        shiftLabel,
        ccPulseTimeOnly(day.firstLogin),
        ccPulseTimeOnly(day.endShift),
        isTardy,
        tardyMin,
        formatCcPulseDuration(day.totalLoginSeconds),
        breaksList
      ];

      statusColumns.forEach(st => {
        row.push(day.totals && day.totals[st] ? formatCcPulseDuration(day.totals[st]) : "");
      });

      rows.push(row);
    });
  });

  return rows;
}

// بيحوّل صفوف الداتا لملف CSV فعلي وبيبدأ تحميله في المتصفح
function downloadCcPulseCsv(rows, filename) {
  const escapeCell = (val) => {
    const str = String(val === undefined || val === null ? "" : val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = rows.map(row => row.map(escapeCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// زرار "Export to CSV" بيستخدم آخر بيانات تقرير اتحمّلت (اتخزنت في ccPulseLastExportAgentsList وقت الـ render)
function exportCcPulseReportToCsv() {
  if (!ccPulseLastExportAgentsList || !ccPulseLastExportAgentsList.length) return;
  const rows = buildCcPulseExportRows(ccPulseLastExportAgentsList, ccPulseLastExportTrackingStartDate);
  const uae = getUAECurrentDate();
  const filename = `cc-pulse-report_${uae.year}-${uae.month}-${uae.day}.csv`;
  downloadCcPulseCsv(rows, filename);
}

function renderCcPulseTimelineHtml(sessions, statusColors, shiftWindow = null, effectiveEndMin = null) {
  if (!sessions.length && !shiftWindow) return ""; // مفيش جلسات ولا شيفت متجدول، مفيش حاجة نرسمها

  let dayStart = 9 * 60;
  let dayEnd = 21 * 60;
  sessions.forEach(s => {
    dayStart = Math.min(dayStart, ccPulseTimeToMinutes(s.start));
    dayEnd = Math.max(dayEnd, ccPulseTimeToMinutes(s.end));
  });
  if (shiftWindow) {
    dayStart = Math.min(dayStart, shiftWindow.startMin);
    dayEnd = Math.max(dayEnd, shiftWindow.endMin);
  }
  const span = dayEnd - dayStart || 1;

  let shiftBandHtml = "";
  if (shiftWindow) {
    const left = ((shiftWindow.startMin - dayStart) / span) * 100;
    const width = Math.max(((shiftWindow.endMin - shiftWindow.startMin) / span) * 100, 0.3);
    shiftBandHtml = `<div class="ccp-tl-shift-band" style="left:${left}%;width:${width}%;" data-tooltip="Scheduled shift: ${shiftWindow.label}"></div>`;
  }

  const segmentsHtml = sessions.map(s => {
    const startMin = ccPulseTimeToMinutes(s.start);
    const endMin = ccPulseTimeToMinutes(s.end);
    const left = ((startMin - dayStart) / span) * 100;
    const width = Math.max(((endMin - startMin) / span) * 100, 0.3);
    const color = ccpStatusColor(s.status);
    const icon = CCP_STATUS_ICONS[s.status] || "fa-circle";
    const iconColor = "#ffffff";
    const tooltipText = `${ccpDisplayStatusName(s.status)}: ${ccPulseTimeOnly(s.start)} \u2192 ${ccPulseTimeOnly(s.end)} (${formatCcPulseDuration(s.durationSeconds)})`;
    return `<div class="ccp-tl-segment" style="left:${left}%;width:${width}%;background:${color};color:${iconColor};" data-tooltip="${tooltipText}"><i class="fa-solid ${icon}"></i></div>`;
  }).join("");

  const outOfAdherenceSegments = computeOutOfAdherenceSegments(sessions, shiftWindow, effectiveEndMin);
  const outOfAdherenceHtml = outOfAdherenceSegments.map(([startMin, endMin]) => {
    const left = ((startMin - dayStart) / span) * 100;
    const width = Math.max(((endMin - startMin) / span) * 100, 0.3);
    const tooltipText = `Out Of Adherence: ${ccPulseMinutesToTimeLabel(startMin)} \u2192 ${ccPulseMinutesToTimeLabel(endMin)} (${formatCcPulseDuration((endMin - startMin) * 60)})`;
    return `<div class="ccp-tl-segment ccp-tl-outofadherence" style="left:${left}%;width:${width}%;" data-tooltip="${tooltipText}"></div>`;
  }).join("");

  // خط "دلوقتي" مع بادج الوقت - بيظهر بس لو التايم لاين ده بتاع النهاردة
  // (effectiveEndMin بيرجع قيمة غير null بس لو التاريخ هو النهاردة)
  let nowMarkerHtml = "";
  if (effectiveEndMin != null && effectiveEndMin >= dayStart && effectiveEndMin <= dayEnd) {
    const nowPos = ((effectiveEndMin - dayStart) / span) * 100;
    nowMarkerHtml = `
      <div class="ccp-tl-now-line" style="left:${nowPos}%;"></div>
      <div class="ccp-tl-now-badge" style="left:${nowPos}%;"><i class="fa-regular fa-clock"></i> ${ccPulseMinutesToTimeLabel(effectiveEndMin)}</div>`;
  }

  const hourCount = 6;
  let axisHtml = "";
  for (let i = 0; i <= hourCount; i++) {
    const minuteMark = dayStart + (span * i / hourCount);
    const hour24 = Math.floor(minuteMark / 60) % 24;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const pos = (i / hourCount) * 100;
    const translate = i === 0 ? "0" : (i === hourCount ? "-100%" : "-50%");
    axisHtml += `<span class="ccp-tl-mark" style="left:${pos}%;transform:translateX(${translate});">${hour12} ${suffix}</span>`;
  }

  const legendHtml = shiftWindow
    ? `<div class="ccp-tl-shift-legend"><span class="ccp-tl-shift-swatch"></span> Scheduled shift: ${shiftWindow.label}${outOfAdherenceSegments.length ? ` &nbsp;·&nbsp; <span class="ccp-tl-outofadherence-swatch"></span> Out Of Adherence` : ""}</div>`
    : "";

  return `
    <div class="ccp-timeline-wrap">
      ${legendHtml}
      <div class="ccp-timeline-bar">
        <div class="ccp-timeline-track">${shiftBandHtml}${segmentsHtml}${outOfAdherenceHtml}</div>
        ${nowMarkerHtml}
      </div>
      <div class="ccp-timeline-axis">${axisHtml}</div>
      <div class="ccp-tl-tooltip" id="ccpTlTooltip"></div>
    </div>`;
}

function attachCcPulseTimelineHover() {
  document.querySelectorAll(".ccp-timeline-bar").forEach(bar => {
    const tooltip = bar.parentElement.querySelector(".ccp-tl-tooltip");
    if (!tooltip || bar.dataset.hoverBound === "true") return;
    bar.dataset.hoverBound = "true";

    bar.addEventListener("mouseover", (e) => {
      const seg = e.target.closest(".ccp-tl-segment");
      if (!seg) return;
      tooltip.textContent = seg.getAttribute("data-tooltip");
      tooltip.style.display = "block";
      const barRect = bar.getBoundingClientRect();
      const segRect = seg.getBoundingClientRect();
      let left = segRect.left - barRect.left + (segRect.width / 2);
      tooltip.style.left = left + "px";
    });

    bar.addEventListener("mouseout", (e) => {
      if (!e.target.closest(".ccp-tl-segment")) return;
      tooltip.style.display = "none";
    });
  });
}

// ============================================================
// 📆 يوم واحد لإيجنت واحد - الـ HTML الكامل (المتريكس + الهايلايت + التايم لاين + قايمة السيشنز)
// نفس الدالة مستخدمة في تقرير الأدمن (اليوم الواحد) وفي كارت "My Day" الشخصي، عشان الاتنين يفضلوا متطابقين بالظبط
// liveIds=true بتضيف id/data-attribute المستخدمين في التحديث اللايف لتقرير الأدمن بس (مش مطلوبين في My Day)
// ============================================================
function buildCcPulseAgentDayHtml(agentName, day, callStats, trackingStartDate, options = {}) {
  const liveIds = Boolean(options.liveIds);
  const statusColors = CCP_STATUS_COLORS;

  const dept = getAgentDeptToday(agentName);
  const callsHtml = (dept === "Calls")
    ? `
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">Calls Answered</div>
      <div class="ccp-metric-value">${callStats ? callStats.callsAnswered : 0}</div>
    </div>
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">AHT</div>
      <div class="ccp-metric-value">${callStats ? formatCcPulseDuration(callStats.ahtSeconds) : "0s"}</div>
    </div>`
    : "";
  const outboundReportHtml = `
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">Outbound Calls</div>
      <div class="ccp-metric-value">${callStats ? callStats.outboundCallsCount : 0}</div>
    </div>`;

  const totalsHtml = Object.keys(day.totals || {}).map(st => `
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">${ccpDisplayStatusName(st)}</div>
      <div class="ccp-metric-value"${liveIds ? ` data-status-metric="${st}"` : ""}>${formatCcPulseDuration(day.totals[st])}</div>
    </div>`).join("");

  const tardyResult = calculateTardyFromDays(agentName, [day], trackingStartDate);
  const tardyHtml = `
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">Tardy</div>
      <div class="ccp-metric-value">${tardyResult.count > 0 ? "Yes" : "No"}</div>
    </div>
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">Tardy Minutes</div>
      <div class="ccp-metric-value">${formatCcPulseDuration(tardyResult.minutes * 60)}</div>
    </div>`;

  const shiftWindow = getShiftWindowForAgentDate(agentName, day.date);
  const attendanceStatus = getAttendanceStatus(shiftWindow, day.totalLoginSeconds, day.date, day.firstLogin, day.endShift);

  let dayStatusBannerHtml = "";
  if (attendanceStatus === "no-show") {
    dayStatusBannerHtml = `<div class="ccp-daystatus-banner ccp-noshow">🚫 <strong>No Show</strong> — scheduled for ${shiftWindow.label} but worked less than half the shift (${formatCcPulseDuration(day.totalLoginSeconds)})</div>`;
  } else if (attendanceStatus === "off") {
    dayStatusBannerHtml = `<div class="ccp-daystatus-banner ccp-dayoff">🏖️ <strong>Day Off</strong> — no shift scheduled for this agent on this date</div>`;
  }

  const dayEffectiveEndMin = getEffectiveShiftEndMin(day.date);
  const adherencePct = calculateShiftAdherence(day.sessions, shiftWindow, dayEffectiveEndMin);
  const adherenceClass = adherencePct === null ? "" : (adherencePct >= 90 ? "ccp-adh-good" : (adherencePct >= 70 ? "ccp-adh-warn" : "ccp-adh-bad"));
  const adherenceCardHtml = adherencePct !== null ? `
      <div class="ccp-metric-card ${adherenceClass}">
        <div class="ccp-metric-label">Adherence</div>
        <div class="ccp-metric-value">${ccpFormatAdherencePct(adherencePct)}</div>
      </div>` : "";

  return `
    <div class="ccp-metric-card ccp-total-highlight">
      <div class="ccp-metric-label">Total login time</div>
      <div class="ccp-metric-value"${liveIds ? ` id="ccpTotalLoginValue"` : ""}>${formatCcPulseDuration(day.totalLoginSeconds)}</div>
    </div>
    <div class="ccp-metrics-grid">${callsHtml}${outboundReportHtml}${totalsHtml}${tardyHtml}</div>
    ${dayStatusBannerHtml}
    <div class="ccp-day-highlight">
      <div class="ccp-metric-card ccp-accent">
        <div class="ccp-metric-label">First login</div>
        <div class="ccp-metric-value">${ccPulseTimeOnly(day.firstLogin)}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">End shift</div>
        <div class="ccp-metric-value">${ccPulseTimeOnly(day.endShift)}</div>
      </div>
      ${adherenceCardHtml}
    </div>
    ${renderCcPulseTimelineHtml(day.sessions, statusColors, shiftWindow, dayEffectiveEndMin)}
    <div class="ccp-session-list">
      ${(day.sessions || []).map(s => `
        <div class="ccp-session-row">
          <span class="ccp-dot" style="background:${ccpStatusColor(s.status)}"></span>
          <span class="ccp-session-status">${ccpDisplayStatusName(s.status)}</span>
          <span class="ccp-session-time">${ccPulseTimeOnly(s.start)} → ${ccPulseTimeOnly(s.end)}</span>
          <span class="ccp-session-dur">${formatCcPulseDuration(s.durationSeconds)}</span>
        </div>`).join("")}
    </div>`;
}

function renderCcPulseSingleAgentReport(data, callLogData) {
  const resultBox = document.getElementById("ccPulseReportResult");
  if (!data || data.status !== "success") {
    resultBox.innerHTML = `<div class="ccp-error">⚠️ ${data && data.message ? data.message : "No data"}</div>`;
    return;
  }

  const callStats = (callLogData && callLogData.status === "success") ? callLogData.data : null;
  const isSingleDayView = data.mode === "day" && data.days.length === 1;

  let bodyHtml;
  if (isSingleDayView) {
    // يوم واحد - نفس الدالة المشتركة مع كارت My Day بالظبط (مع الـ id/data-attribute بتوع التحديث اللايف)
    bodyHtml = buildCcPulseAgentDayHtml(data.agent, data.days[0], callStats, data.trackingStartDate, { liveIds: true });
  } else {
    // رينج/شهر - نفس المنطق القديم زي ما هو (تقرير مجمّع لأكتر من يوم)
    const singleAgentDept = getAgentDeptToday(data.agent);
    const callsHtml = (singleAgentDept === "Calls")
      ? `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Calls Answered</div>
        <div class="ccp-metric-value">${callStats ? callStats.callsAnswered : 0}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">AHT</div>
        <div class="ccp-metric-value">${callStats ? formatCcPulseDuration(callStats.ahtSeconds) : "0s"}</div>
      </div>`
      : "";
    const outboundReportHtml = `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Outbound Calls</div>
        <div class="ccp-metric-value">${callStats ? callStats.outboundCallsCount : 0}</div>
      </div>`;

    const totalsHtml = Object.keys(data.totals || {}).map(st => `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">${ccpDisplayStatusName(st)}</div>
        <div class="ccp-metric-value" data-status-metric="${st}">${formatCcPulseDuration(data.totals[st])}</div>
      </div>`).join("");

    const tardyResult = calculateTardyFromDays(data.agent, data.days || [], data.trackingStartDate);
    const tardyHtml = `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Tardy Count</div>
        <div class="ccp-metric-value">${tardyResult.count}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Tardy Minutes</div>
        <div class="ccp-metric-value">${formatCcPulseDuration(tardyResult.minutes * 60)}</div>
      </div>`;

    let periodAdherenceHtml = "";
    const periodAdherencePct = calculateAdherenceFromDays(data.agent, data.days || [], data.trackingStartDate);
    if (periodAdherencePct !== null) {
      const adherenceClass = periodAdherencePct >= 90 ? "ccp-adh-good" : (periodAdherencePct >= 70 ? "ccp-adh-warn" : "ccp-adh-bad");
      periodAdherenceHtml = `
    <div class="ccp-metric-card ${adherenceClass}">
      <div class="ccp-metric-label">Adherence</div>
      <div class="ccp-metric-value">${ccpFormatAdherencePct(periodAdherencePct)}</div>
    </div>`;
    }

    const daysHtml = `
      <div class="ccp-days-table">
        ${data.days.map(day => `
          <div class="ccp-day-row">
            <span class="ccp-day-date">${day.date}</span>
            <span>${ccPulseTimeOnly(day.firstLogin)} → ${ccPulseTimeOnly(day.endShift)}</span>
            <span class="ccp-day-total">${formatCcPulseDuration(day.totalLoginSeconds)}</span>
          </div>`).join("")}
      </div>`;

    bodyHtml = `
      <div class="ccp-metric-card ccp-total-highlight">
        <div class="ccp-metric-label">Total login time</div>
        <div class="ccp-metric-value" id="ccpTotalLoginValue">${formatCcPulseDuration(data.totalLoginSeconds)}</div>
      </div>
      <div class="ccp-metrics-grid">${callsHtml}${outboundReportHtml}${totalsHtml}${tardyHtml}${periodAdherenceHtml}</div>
      ${daysHtml}`;
  }

  resultBox.innerHTML = `
    <div class="ccp-export-bar">
      <button type="button" class="ccp-export-btn" onclick="exportCcPulseReportToCsv()">📥 Export to CSV</button>
    </div>
    ${ccPulseBuildQueueSummaryHtml(callLogData && callLogData.queueSummary)}
    ${ccPulseBuildQueueTrendHtml(callLogData && callLogData.queueSummaryByDay)}
    ${ccPulseBuildPeakHoursHtml(callLogData && callLogData.queueSummaryByHour)}
    ${bodyHtml}
  `;

  const liveAgentMatch = ccPulseAgentsCache.find(x => x.name === data.agent);
  ccPulseLastExportAgentsList = [{ name: data.agent, number: liveAgentMatch ? liveAgentMatch.number : "-", days: data.days || [] }];
  ccPulseLastExportTrackingStartDate = data.trackingStartDate || null;

  attachCcPulseTimelineHover();
}

// ============================================================
// 👋 MY DAY - كارت شخصي في الصفحة الرئيسية بيوري بيانات اليوزر المسجل دخول
// بس (لو اسمه الكامل مطابق لاسم إيجنت معروف في الروستر أو بيانات 3CX الحية)
// ============================================================

function getMyAgentName() {
  const fullName = (localStorage.getItem("userFullName") || "").trim();
  if (!fullName) return null;
  const knownNames = new Set([
    ...(Array.isArray(rosterData) ? rosterData.map(a => a.name) : []),
    ...(Array.isArray(ccPulseAgentsCache) ? ccPulseAgentsCache.map(a => a.name) : [])
  ]);
  return knownNames.has(fullName) ? fullName : null;
}

// dateStr اختياري (YYYY-MM-DD) - لو مبعتش، بيعرض النهاردة. بيتنادى تاني لما الإيجنت يغيّر التاريخ من شريط الاختيار
async function loadMyDayCard(dateStr) {
  const container = document.getElementById("myDayCardContainer");
  if (!container) return;

  const agentName = getMyAgentName();
  if (!agentName) {
    container.innerHTML = "";
    return;
  }

  const uae = getUAECurrentDate();
  const todayStr = `${uae.year}-${uae.month}-${uae.day}`;
  const targetDateStr = dateStr || todayStr;

  // شريط اختيار التاريخ - بيفضل ظاهر دايمًا (حتى لو مفيش بيانات لليوم المختار) عشان الإيجنت يقدر يرجع يختار يوم تاني
  const dateBarHtml = `
    <div class="ccp-myday-datebar" style="margin: 8px 0 16px; display:flex; align-items:center; gap:8px;">
      <label for="myDayDateInput" style="font-size:13px; color:#6b7280;">Date:</label>
      <input type="date" id="myDayDateInput" class="combo-input" style="max-width:170px;"
        value="${targetDateStr}" max="${todayStr}" onchange="loadMyDayCard(this.value)">
    </div>`;

  try {
    const statusParams = new URLSearchParams({ action: "agentStatusReport", mode: "day", date: targetDateStr, name: agentName });
    const callsParams = new URLSearchParams({ action: "callLogReport", mode: "day", date: targetDateStr, name: agentName });

    const [statusRes, callsRes] = await Promise.all([
      fetch(`${GOOGLE_SHEET_API_URL}?${statusParams.toString()}`),
      fetch(`${GOOGLE_SHEET_API_URL}?${callsParams.toString()}`)
    ]);
    const data = await statusRes.json();
    const callLogData = await callsRes.json().catch(() => null);

    if (!data || data.status !== "success" || !data.days || !data.days[0]) {
      container.innerHTML = `
        <div class="ccp-agent-report-card" style="margin-bottom: 16px; text-align: left;">
          <div class="ccp-agent-report-header">
            <span class="ccp-total-name">👋 My Day — ${agentName}</span>
          </div>
          ${dateBarHtml}
          <div class="ccp-error">⚠️ No data for this date</div>
        </div>`;
      return;
    }

    const callStats = (callLogData && callLogData.status === "success") ? callLogData.data : null;
    // نفس دالة تقرير الأدمن لليوم الواحد بالظبط - عشان الإيجنت يشوف كل التفاصيل اللي الأدمن شايفها
    const dayHtml = buildCcPulseAgentDayHtml(agentName, data.days[0], callStats, data.trackingStartDate, { liveIds: false });

    container.innerHTML = `
      <div class="ccp-agent-report-card" style="margin-bottom: 16px; text-align: left;">
        <div class="ccp-agent-report-header">
          <span class="ccp-total-name">👋 My Day — ${agentName}</span>
        </div>
        ${dateBarHtml}
        ${dayHtml}
      </div>`;
  } catch (e) {
    console.error("My Day card error:", e);
    container.innerHTML = dateBarHtml;
  }
}
