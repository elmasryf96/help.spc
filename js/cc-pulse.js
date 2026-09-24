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

// الحالات المتاحة في مودال "تعديل التايم لاين" (Click-to-edit) - من غير Custom 1/Custom 2 بناءً على طلب الأدمن
const CCP_EDITABLE_STATUSES = [
  { value: "Available", label: "🟢 Available" },
  { value: "Break", label: "🟠 Break" },
  { value: "Follow up case", label: "🔵 Follow up case" },
  { value: "Emails", label: "🟢 Emails" },
  { value: "Out of office", label: "🟢 Call Outs" },
  { value: "Away", label: "⚪ Away" }
];

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
let ccPulseLastExportCallLogByDay = null; // بيتخزن فيه callLogData.agentsByDay بتاع آخر تقرير (أرقام مكالمات كل إيجنت في كل يوم لوحده) عشان الـ CSV يضيفها لكل صف

// كارت "My Day" (بيانات/تايم لاين الإيجنت لنفسه في الصفحة الرئيسية) كان بيتحمّل مرة واحدة بس وبيفضل واقف زي ما هو،
// فمع مرور الوقت الداتا بتفضل قديمة والـ Out Of Adherence بيبان غلط لحد ما الإيجنت يعمل refresh يدوي.
// دول بيخلوه يتحدّث لوحده زي باقي الصفحة (Live widget/تقرير الأدمن) - كل 20 ثانية طول ما هو واقف في الصفحة الرئيسية.
let myDayCardPollTimer = null;
let myDayCardCurrentDate = null; // آخر تاريخ مختار في شريط التاريخ بتاع الكارت - عشان التحديث التلقائي يفضل على نفس اليوم اللي الإيجنت شايفه

function startMyDayCardPolling() {
  stopMyDayCardPolling();
  myDayCardPollTimer = setInterval(() => loadMyDayCard(myDayCardCurrentDate), 20000);
}

function stopMyDayCardPolling() {
  if (myDayCardPollTimer) clearInterval(myDayCardPollTimer);
  myDayCardPollTimer = null;
}

// المتصفح (خصوصًا Chrome) بيبطّئ/يجمّد أي setInterval في تاب مش هو التاب المفتوح فوق دلوقتي
// (مثلاً الإيجنت شغال في تاب تاني - 3CX أو غيره - وسايب صفحته هنا في الخلفية طول الوقت)،
// فالتحديث كل 20 ثانية لوحده ممكن ياخد وقت أطول بكتير لحد ما يرجع يفتح التاب فعليًا.
// عشان كده، لحظة ما التاب يرجع يبقى ظاهر (Visible)، بنعمل تحديث فوري بدل ما نستنى الدورة الجاية.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const homePage = document.getElementById("home-page");
  if (homePage && homePage.classList.contains("active-page") && typeof loadMyDayCard === "function") {
    loadMyDayCard(myDayCardCurrentDate);
  }
});

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
    if (!res.ok) throw new Error("bad status " + res.status);
    const agents = await res.json();
    ccPulseAgentsCache = Array.isArray(agents) ? agents : [];
    ccPulseAgentsCacheFetchedAtMs = Date.now();
    renderCcPulseLiveGrid();
    populateCcPulseAgentSelect();
    if (typeof updateDashboardLiveWidget === "function") updateDashboardLiveWidget();
  } catch (e) {
    // فشل مؤقت (شبكة بطيئة/تايم آوت) - نسيب آخر بيانات صحيحة زي ما هي بدل ما
    // نمسح الكروت كلها (ده كان سبب اختفاء الكروت كل شوية). بس لو دي أول مرة
    // فعلاً (لسه معندناش أي بيانات) نوري رسالة بدل ما يفضل فاضي بالكامل.
    console.warn("⚠️ fetchCcPulseLiveStatus failed, keeping last known data:", e);
    if (grid && (!ccPulseAgentsCache || ccPulseAgentsCache.length === 0)) {
      grid.innerHTML = `<div class="ccp-error">⚠️ Could not load live status</div>`;
    }
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
  const shiftHtml = ccpIsQueueSupport_(a.name)
    ? `<div class="ccp-shift-label"><i class="fa-solid fa-moon"></i> Queue Support (9 PM – 9 AM)</div>`
    : (shiftWindow
      ? `<div class="ccp-shift-label"><i class="fa-solid fa-calendar-day"></i> ${shiftWindow.label}</div>`
      : "");

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
  const callsAnsweredHtml = ccpIsInboundAgent_(a.name)
    ? `<div class="ccp-calls-badge"><i class="fa-solid fa-phone-volume"></i> Calls: ${a.todaysCallsAnswered || 0}</div>`
    : "";
  const outboundHtml = `<div class="ccp-outbound-badge" title="Outbound: Answered / Unanswered"><i class="fa-solid fa-arrow-up-right-from-square"></i> Outbound: ${a.todaysOutboundAnswered || 0} / ${a.todaysOutboundUnanswered || 0}</div>`;

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
const CCP_TEAM_LIST = ["Calls", "Call Outs", "Emails", "Queue Support"];
const CCP_TEAM_ICONS = { "Calls": "fa-headset", "Call Outs": "fa-phone-volume", "Emails": "fa-envelope-open-text", "Queue Support": "fa-moon" };

function renderCcPulseLiveGrid() {
  const grid = document.getElementById("ccPulseLiveGrid");
  if (!grid) return;

  const nowSec = Date.now() / 1000;

  // بنقسم الإيجنتس على الفرق التلاتة (مفيش روستر = بيتحسب Calls زي getAgentDeptToday بالظبط)
  const byTeam = {};
  CCP_TEAM_LIST.forEach(t => { byTeam[t] = []; });
  ccPulseAgentsCache.forEach(a => {
    const dept = ccpIsQueueSupport_(a.name) ? CCP_QUEUE_SUPPORT_DEPT : getAgentDeptToday(a.name);
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
  // 🔐 Apps Script's doGet بقى محتاج session token صحيح لأي حاجة غير
  // checkForceLogout/todayStatusLog (شوف الشرح في Code.gs) - CC Pulse كله
  // أدمن بس أصلاً، فالتوكن هيبقى موجود دايمًا هنا
  params.set("token", localStorage.getItem("sessionToken") || "");
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

  // لو فيه صف في قايمة الـ Sessions حالياً في وضع تعديل مباشر (تعديل موجود أو "+ Add status" لسه فاتح -
  // شوف ccpEnterRowEditMode_)، منعملش أي تحديث تلقائي دلوقتي عشان مانمسحش التعديل اللي لسه ما اتحفظش من
  // تحت الأدمن. هنحاول تاني في الدورة الجاية (20 ثانية) - أول ما يحفظ أو يلغي التعديل، التحديث بيرجع يشتغل
  // عادي زي ما هو (الحفظ بينادي loadCcPulseReport(false) مباشرة على أي حال)
  if (isAutoRefresh && resultBox.querySelector(".ccp-session-save-btn")) {
    return;
  }

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

// ============================================================
// 📈 Occupancy / Utilization (لكل التيمات: Calls / Call Outs / Emails)
// ------------------------------------------------------------
// حالات "شغل كامل" (CCP_BUSY_STATUSES): Follow up case (After Call Work) / Emails
//   -> وقتها كله محسوب شغل (الإيجنت مشغول بكيس/إيميلات حتى لو مش على مكالمة)
// حالات "مكالمات" (CCP_CALL_STATUSES): Available / Call Outs ("Out of office")
//   -> بيتحسب منها وقت المكالمات بس: الداخلة (كلام) + الصادرة (رنين + كلام، مردود عليها أو لأ -
//      المهم إن الإيجنت بيعمل مكالمات). يعني إيجنت Call Outs مبيتحسبش مشغول لو معملش مكالمات
// وقت الشغل (engaged) = المكالمات الداخلة + وقت حالات الشغل الكامل
//                       + المكالمات الصادرة اللي مش جوه حالة شغل كامل (عشان متتحسبش مرتين)
// Occupancy   = engaged ÷ (Available + Call Outs + حالات الشغل الكامل)  -> البريك برا الحسبة خالص (مرن 30 دقيقة في اليوم)
// Utilization = engaged ÷ إجمالي وقت الـ Login (كل الحالات ماعدا Away، يعني البريك داخل)
// callStats جاي من callLogReport (Code.gs): totalTalkSeconds (داخلة)، outboundTalkSeconds (كلام الصادر)،
// outboundCalls = [["yyyy-MM-dd HH:mm:ss", talkSeconds, ringSeconds], ...] (بيترجع مع أرقام اليوم الواحد بس)
// ============================================================
const CCP_BUSY_STATUSES = ["Follow up case", "Emails"];
const CCP_CALL_STATUSES = ["Available", "Out of office"];

function ccpTsToMs_(ts) {
  return new Date(String(ts || "").replace(" ", "T")).getTime();
}

// أرقام يوم واحد (بالثواني) - day = { totals, sessions, totalLoginSeconds } من تقرير الحالات
function ccpDayWorkSeconds_(day, callStats) {
  const totals = (day && day.totals) || {};
  const callStatusSec = CCP_CALL_STATUSES.reduce((sum, st) => sum + (totals[st] || 0), 0);
  const busySec = CCP_BUSY_STATUSES.reduce((sum, st) => sum + (totals[st] || 0), 0);
  const inboundTalk = callStats ? (callStats.totalTalkSeconds || 0) : 0;

  // وقت الصادر = رنين + كلام لكل مكالمة (مردود عليها أو لأ)، ناقص اللي وقع جوه حالة شغل كامل
  let outboundSec = 0;
  const outboundCalls = (callStats && Array.isArray(callStats.outboundCalls)) ? callStats.outboundCalls : [];
  if (outboundCalls.length) {
    const busyRanges = ((day && day.sessions) || [])
      .filter(s => CCP_BUSY_STATUSES.includes(s.status))
      .map(s => [ccpTsToMs_(s.start), ccpTsToMs_(s.end)]);
    outboundCalls.forEach(c => {
      const durationSec = (Number(c[1]) || 0) + (Number(c[2]) || 0);
      const callStart = ccpTsToMs_(c[0]);
      if (isNaN(callStart)) { outboundSec += durationSec; return; }
      const callEnd = callStart + durationSec * 1000;
      let insideBusySec = 0;
      busyRanges.forEach(r => {
        const overlapMs = Math.min(callEnd, r[1]) - Math.max(callStart, r[0]);
        if (overlapMs > 0) insideBusySec += overlapMs / 1000;
      });
      outboundSec += Math.max(0, durationSec - insideBusySec);
    });
  } else if (callStats) {
    // احتياطي لو Code.gs القديم لسه منشور (مفيش outboundCalls): كلام الصادر المردود عليه بس
    outboundSec = callStats.outboundTalkSeconds || 0;
  }

  return {
    engaged: inboundTalk + busySec + outboundSec,
    workWindow: callStatusSec + busySec,
    login: (day && day.totalLoginSeconds) || 0
  };
}

function ccpPct_(part, whole) {
  if (!whole || whole <= 0) return null;
  return Math.min(100, Math.round((part / whole) * 1000) / 10);
}

// items = [{ day, callStats }, ...] (يوم واحد أو أكتر) -> { occupancyPct, utilizationPct } (null لو مفيش وقت)
function ccpComputeWorkMetrics_(items) {
  let engaged = 0, workWindow = 0, login = 0;
  (items || []).forEach(it => {
    if (!it || !it.day) return;
    const s = ccpDayWorkSeconds_(it.day, it.callStats);
    engaged += s.engaged;
    workWindow += s.workWindow;
    login += s.login;
  });
  return { occupancyPct: ccpPct_(engaged, workWindow), utilizationPct: ccpPct_(engaged, login) };
}

// لإيجنت على كذا يوم: بيجيب أرقام مكالمات كل يوم لوحده من agentsByDay
function ccpComputeWorkMetricsForDays_(agentName, days, agentsByDay, trackingStartDate) {
  const items = (days || [])
    .filter(d => !(trackingStartDate && d.date < trackingStartDate))
    .map(d => ({ day: d, callStats: (agentsByDay && agentsByDay[d.date]) ? agentsByDay[d.date][agentName] : null }));
  return ccpComputeWorkMetrics_(items);
}

// ============================================================
// ⏱️ أرقام المكالمات الخام (من 3CX مباشرة - من غير أي افتراضات) عشان الـ KPIs
// ------------------------------------------------------------
// Inbound Talk Time = إجمالي كلام المكالمات الداخلة المردود عليها (totalTalkSeconds)
// Outbound Talk Time = إجمالي كلام الصادر المردود عليه (outboundTalkSeconds)
// Outbound Ring Time = إجمالي رنين كل الصادر، رد العميل أو لأ (outboundRingSeconds من Code.gs،
//                      أو بنجمعه من outboundCalls لو Code.gs قديم)
// Avg Outbound Talk = كلام الصادر ÷ عدد الصادر المردود عليه
// Contact Rate = الصادر المردود عليه ÷ إجمالي الصادر
// ============================================================
function ccpOutboundRingSeconds_(callStats) {
  if (!callStats) return 0;
  if (typeof callStats.outboundRingSeconds === "number") return callStats.outboundRingSeconds;
  const calls = Array.isArray(callStats.outboundCalls) ? callStats.outboundCalls : [];
  return calls.reduce((sum, c) => sum + (Number(c[2]) || 0), 0);
}

function ccpOutboundRawMetrics_(callStats) {
  const answered = callStats ? (callStats.outboundAnsweredCount || 0) : 0;
  const total = callStats ? (callStats.outboundCallsCount || 0) : 0;
  const talk = callStats ? (callStats.outboundTalkSeconds || 0) : 0;
  return {
    talkSeconds: talk,
    ringSeconds: ccpOutboundRingSeconds_(callStats),
    avgTalkSeconds: answered > 0 ? talk / answered : 0,
    contactRatePct: total > 0 ? Math.round((answered / total) * 1000) / 10 : null
  };
}

function ccpInboundTalkCardHtml_(callStats) {
  return `
      <div class="ccp-metric-card" title="Total talk time on answered inbound calls">
        <div class="ccp-metric-label">Inbound Talk Time</div>
        <div class="ccp-metric-value">${formatCcPulseDuration(callStats ? callStats.totalTalkSeconds : 0)}</div>
      </div>`;
}

function ccpOutboundExtraCardsHtml_(callStats) {
  const m = ccpOutboundRawMetrics_(callStats);
  return `
      <div class="ccp-metric-card" title="Total talk time on answered outbound calls">
        <div class="ccp-metric-label">Outbound Talk Time</div>
        <div class="ccp-metric-value">${formatCcPulseDuration(m.talkSeconds)}</div>
      </div>
      <div class="ccp-metric-card" title="Total ringing time on all outbound calls (answered or not)">
        <div class="ccp-metric-label">Outbound Ring Time</div>
        <div class="ccp-metric-value">${formatCcPulseDuration(m.ringSeconds)}</div>
      </div>
      <div class="ccp-metric-card" title="Outbound talk time ÷ answered outbound calls">
        <div class="ccp-metric-label">Avg Outbound Talk</div>
        <div class="ccp-metric-value">${formatCcPulseDuration(m.avgTalkSeconds)}</div>
      </div>
      <div class="ccp-metric-card" title="Answered outbound calls ÷ all outbound calls">
        <div class="ccp-metric-label">Contact Rate</div>
        <div class="ccp-metric-value">${m.contactRatePct !== null ? m.contactRatePct + "%" : "-"}</div>
      </div>`;
}

// تيم Emails برا حسبة Occupancy / Utilization (شغال إيميلات طول الشيفت - هيتابَع بطريقة تانية بعدين)
function ccpShowsWorkMetrics_(agentName) {
  return getAgentDeptToday(agentName) !== "Emails";
}

// كروت Occupancy + Utilization (HTML) - فاضية لو مفيش أرقام
function ccpWorkMetricsCardsHtml_(m) {
  if (!m) return "";
  let html = "";
  if (m.occupancyPct !== null) html += `
      <div class="ccp-metric-card" title="Time working (calls made/received + Follow up case / Emails) ÷ time Available, Call Outs, Follow up or Emails - Break not counted">
        <div class="ccp-metric-label">Occupancy</div>
        <div class="ccp-metric-value">${m.occupancyPct}%</div>
      </div>`;
  if (m.utilizationPct !== null) html += `
      <div class="ccp-metric-card" title="Time working (calls made/received + Follow up case / Emails) ÷ total login time - Break included">
        <div class="ccp-metric-label">Utilization</div>
        <div class="ccp-metric-value">${m.utilizationPct}%</div>
      </div>`;
  return html;
}

// "2026-09-23 00:51:00" -> "Sep 23 · 00:51" - للـ Queue Support عشان يومهم داخل في يومين
function ccpDateTimeLabel_(ts) {
  if (!ts) return "--";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = ts.slice(0, 10).split("-");
  if (d.length !== 3) return ccPulseTimeOnly(ts);
  return `${months[parseInt(d[1], 10) - 1]} ${parseInt(d[2], 10)} · ${ccPulseTimeOnly(ts)}`;
}

function ccPulseTimeOnly(ts) {
  if (!ts) return "--";
  const parts = ts.split(" ");
  return parts[1] ? parts[1].slice(0, 5) : ts;
}

// زي ccPulseTimeOnly بالظبط بس محتفظة بالثواني (HH:MM:SS) - مستخدمة في تصدير الإكسل بس
// (اليوزر طلب دقة الثانية في وقت الدخول/الخروج في الشيت) - من غير ما تأثر على أي عرض تاني في الواجهة
function ccPulseTimeWithSeconds_(ts) {
  if (!ts) return "--";
  const parts = ts.split(" ");
  return parts[1] ? parts[1] : ts;
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
          <div class="ccp-metric-value" style="cursor:pointer; text-decoration:underline dotted;" title="Click to see each call" onclick="ccpShowQueueCallDetailModal()">${qs.abandoned}</div>
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

// بيبني جدول Leaderboard لترتيب الإيجنتس - بيظهر بس في تقرير "All agents"، ومقتصر
// على تيم الـ Calls بس (تيم الإيميلز وتيم الـ Outbound مستبعدين)
// الترتيب بـ Score من 100 - 4 حاجات بنفس الأهمية (25% لكل واحدة):
//   1) عدد المكالمات: الأعلى أحسن  -> مكالماته ÷ أعلى عدد في التيم
//   2) Adherence: الأعلى أحسن       -> النسبة نفسها ÷ 100
//   3) AHT: الأقل أحسن              -> أقل AHT في التيم ÷ الـ AHT بتاعه
//   4) Follow up case: الأقل أحسن   -> 1 - (وقته ÷ أطول وقت في التيم)
// الـ Tardy بيظهر في الجدول للعلم بس ومش داخل في السكور، لأن التأخير أصلاً
// بيقلل الـ Adherence - فلو دخلناه هيتحسب على الإيجنت مرتين
const CCP_LEADERBOARD_WEIGHTS = { calls: 0.25, adherence: 0.25, aht: 0.25, followUp: 0.25 };

// بيطلع Adherence و Tardy و Follow up case لإيجنت من داتا تقرير الـ login
// (نفس الحسابات اللي في كروت الإيجنتس بالظبط)
function ccpLeaderboardAgentExtras_(loginAgent, trackingStartDate) {
  if (!loginAgent) return { adherencePct: null, tardyCount: 0, tardyMinutes: 0, followUpSeconds: 0 };

  let adherencePct = null;
  if (loginAgent.date) {
    const shiftWindow = getShiftWindowForAgentDate(loginAgent.name, loginAgent.date);
    adherencePct = calculateShiftAdherence(loginAgent.sessions || [], shiftWindow, getEffectiveShiftEndMin(loginAgent.date));
  } else {
    adherencePct = calculateAdherenceFromDays(loginAgent.name, loginAgent.days || [], trackingStartDate);
  }

  const tardy = calculateTardyFromDays(loginAgent.name, loginAgent.days || [], trackingStartDate);
  const followUpSeconds = (loginAgent.totals && loginAgent.totals["Follow up case"]) || 0;

  return { adherencePct, tardyCount: tardy.count, tardyMinutes: tardy.minutes, followUpSeconds };
}

function ccPulseBuildLeaderboardHtml(callLogData, loginData) {
  if (!callLogData || callLogData.status !== "success" || !Array.isArray(callLogData.agents)) return "";

  const loginByName = {};
  const trackingStartDate = loginData && loginData.trackingStartDate;
  if (loginData && Array.isArray(loginData.agents)) {
    loginData.agents.forEach(a => { loginByName[a.name] = a; });
  }
  const isSingleDay = Boolean(loginData && Array.isArray(loginData.agents) && loginData.agents.some(a => a.date));

  const eligible = callLogData.agents
    .filter(a => a.callsAnswered > 0 && ccpIsInboundAgent_(a.agent))
    .map(a => Object.assign({}, a, ccpLeaderboardAgentExtras_(loginByName[a.agent], trackingStartDate)));

  if (eligible.length === 0) return "";

  const maxCalls = Math.max(...eligible.map(a => a.callsAnswered));
  const ahtValues = eligible.map(a => a.ahtSeconds).filter(v => v > 0);
  const minAht = ahtValues.length ? Math.min(...ahtValues) : 0;
  const maxFollowUp = Math.max(...eligible.map(a => a.followUpSeconds));
  const adhValues = eligible.map(a => a.adherencePct).filter(v => v !== null && v !== undefined);
  // لو إيجنت مالوش Adherence (مثلاً اشتغل في يوم الأوف بتاعه) بياخد متوسط التيم عشان مايتظلمش
  const avgAdh = adhValues.length ? adhValues.reduce((x, y) => x + y, 0) / adhValues.length : 100;

  const W = CCP_LEADERBOARD_WEIGHTS;
  const ranked = eligible.map(a => {
    const callsPart = maxCalls > 0 ? a.callsAnswered / maxCalls : 0;
    const ahtPart = (a.ahtSeconds > 0 && minAht > 0) ? minAht / a.ahtSeconds : 0;
    const adh = (a.adherencePct !== null && a.adherencePct !== undefined) ? a.adherencePct : avgAdh;
    const adhPart = Math.max(0, Math.min(adh, 100)) / 100;
    const fuPart = maxFollowUp > 0 ? 1 - (a.followUpSeconds / maxFollowUp) : 1;
    const score = Math.round((W.calls * callsPart + W.aht * ahtPart + W.adherence * adhPart + W.followUp * fuPart) * 100);
    return Object.assign({}, a, { score });
  }).sort((a, b) =>
    (b.score - a.score) ||
    (b.callsAnswered - a.callsAnswered) ||   // تعادل في السكور: الأكتر مكالمات
    (a.ahtSeconds - b.ahtSeconds)            // وبعدين الأقل AHT
  );

  const medals = ["🥇", "🥈", "🥉"];
  const td = (v) => `<td style="color:#1a252f">${v}</td>`;
  const rowsHtml = ranked.map((a, i) => {
    const adhText = (a.adherencePct !== null && a.adherencePct !== undefined) ? ccpFormatAdherencePct(a.adherencePct) : "-";
    const tardyText = isSingleDay ? (a.tardyCount > 0 ? "Yes" : "No") : a.tardyCount;
    return `
      <tr class="${i < 3 ? 'ccp-leaderboard-top' : ''}">
        ${td(medals[i] || (i + 1))}
        ${td(a.agent)}
        ${td(a.callsAnswered)}
        ${td(formatCcPulseDuration(a.ahtSeconds))}
        ${td(adhText)}
        ${td(formatCcPulseDuration(a.followUpSeconds))}
        ${td(tardyText)}
        ${td(formatCcPulseDuration(a.tardyMinutes * 60))}
        ${td(`<b>${a.score}</b>`)}
      </tr>`;
  }).join("");

  return `
    <div class="ccp-queue-summary-card">
      <div class="ccp-queue-summary-header"><i class="fa-solid fa-trophy"></i> Leaderboard</div>
      <div class="ccp-queue-trend-table-wrap">
        <table class="ccp-queue-trend-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Agent</th>
              <th title="Higher is better">Calls Answered</th>
              <th title="Lower is better">AHT</th>
              <th title="Higher is better">Adherence</th>
              <th title="Lower is better">Follow up case</th>
              <th>${isSingleDay ? "Tardy" : "Tardy Count"}</th>
              <th>Tardy Minutes</th>
              <th title="25% Calls + 25% Adherence + 25% low AHT + 25% low Follow up case">Score</th>
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
    const isQs = ccpIsQueueSupport_(a.name);
    const workMetrics = ccpComputeWorkMetricsForDays_(a.name, a.days || [], callLogData && callLogData.agentsByDay, data.trackingStartDate);
    const workHtml = ccpShowsWorkMetrics_(a.name) ? ccpWorkMetricsCardsHtml_(workMetrics) : "";
    const callsHtml = (agentDept === "Calls" || isQs)
      ? `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Calls Answered</div>
        <div class="ccp-metric-value">${callStats ? callStats.callsAnswered : 0}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">AHT</div>
        <div class="ccp-metric-value">${callStats ? formatCcPulseDuration(callStats.ahtSeconds) : "0s"}</div>
      </div>${ccpInboundTalkCardHtml_(callStats)}
`
      : "";
    const outboundReportHtml = `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Outbound Calls</div>
        <div class="ccp-metric-value">${callStats ? callStats.outboundCallsCount : 0}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Outbound Answered</div>
        <div class="ccp-metric-value">${callStats ? callStats.outboundAnsweredCount : 0}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Outbound Unanswered</div>
        <div class="ccp-metric-value" style="cursor:pointer; text-decoration:underline dotted;" title="Click to see each call" onclick="ccpShowOutboundUnansweredModal('${a.name}', 'day', '${a.date}')">${callStats ? callStats.outboundUnansweredCount : 0}</div>
      </div>${ccpOutboundExtraCardsHtml_(callStats)}`;

    let adherenceHtml = "";
    let timelineHtml = "";
    let attendanceBadgeHtml = "";

    if (a.date && isQs) {
      // 🎧 Queue Support: مفيش Day Off / No Show / Adherence، والتايم لاين من 9 الصبح لـ 9 الصبح
      attendanceBadgeHtml = `<div class="ccp-attendance-badge" style="background:#ede9fe;color:#5b21b6;">🎧 Queue Support</div>`;
      timelineHtml = renderCcPulseTimelineHtml(a.sessions || [], statusColors, null, null, null, { queueSupportDate: a.date });
    } else if (a.date) {
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
      timelineHtml = renderCcPulseTimelineHtml(a.sessions || [], statusColors, shiftWindow, effectiveEndMin, { agentName: a.name, dateStr: a.date });
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
    const tardyHtml = isQs ? "" : `
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
        <div class="ccp-metrics-grid">${callsHtml}${workHtml}${outboundReportHtml}${totalsHtml}${adherenceHtml}${tardyHtml}</div>
        ${timelineHtml}
      </div>`;
  }).join("");

  resultBox.innerHTML = `
    <div class="ccp-export-bar">
      <button type="button" class="ccp-export-btn" onclick="exportCcPulseReportToCsv()">📥 Export to CSV</button>
      <button type="button" class="ccp-export-btn" onclick="exportCcPulseReportToPdf()">🖨️ Export to PDF</button>
    </div>
    <div class="ccp-mode-bar" style="margin: 4px 0 14px;">
      <button type="button" id="ccpResultViewBtn_queue" class="ccp-mode-btn" onclick="setCcpResultView('queue')"><i class="fa-solid fa-headset"></i> Queue</button>
      <button type="button" id="ccpResultViewBtn_agents" class="ccp-mode-btn" onclick="setCcpResultView('agents')"><i class="fa-solid fa-users"></i> Agents</button>
    </div>
    <div id="ccpQueueSection">
      ${ccPulseBuildQueueSummaryHtml(callLogData && callLogData.queueSummary)}
      ${ccPulseBuildQueueTrendHtml(callLogData && callLogData.queueSummaryByDay)}
      ${ccPulseBuildPeakHoursHtml(callLogData && callLogData.queueSummaryByHour)}
      ${ccPulseBuildLeaderboardHtml(callLogData, data)}
    </div>
    <div id="ccpAgentsSection">
      <div class="ccp-all-agents-report">${cardsHtml || '<div class="ccp-empty">No data for this period</div>'}</div>
    </div>`;

  ccPulseLastExportAgentsList = data.agents.map(a => ({ name: a.name, number: a.number, days: a.days || [] }));
  ccPulseLastExportTrackingStartDate = data.trackingStartDate || null;
  ccPulseLastExportCallLogByDay = (callLogData && callLogData.agentsByDay) || null;

  setCcpResultView(ccpResultView);
  attachCcPulseTimelineHover();
  attachCcPulseTimelineEditHandlers();
  attachCcPulseSessionListEditHandlers();
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

// ============================================================
// 🎧 QUEUE SUPPORT - إيجنتس لوجن حر (مالهمش شيفت) بيدخلوا سابورت من 9 بالليل لـ 9 الصبح
// بيتعرفوا من عمود Dept في الروستر = "Queue Support". يومهم من 9 الصبح لـ 9 الصبح اللي بعده
// (Code.gs بيحسبها كدا). مالهمش Day Off / No Show / Tardy / Adherence
// ============================================================
const CCP_QUEUE_SUPPORT_DEPT = "Queue Support";
const CCP_QS_DAY_START_MIN = 9 * 60;

function ccpIsQueueSupport_(agentName) {
  if (!agentName || !Array.isArray(rosterData)) return false;
  return rosterData.some(r => r.name === agentName && r.dept === CCP_QUEUE_SUPPORT_DEPT);
}

// بيرد على كيو المكالمات الداخلة (Calls أو Queue Support) - عشان كروت Calls Answered / AHT والـ Leaderboard
function ccpIsInboundAgent_(agentName) {
  return getAgentDeptToday(agentName) === "Calls" || ccpIsQueueSupport_(agentName);
}

// "دلوقتي" بالدقايق نسبةً ليوم Queue Support (dateStr 9 الصبح -> اليوم اللي بعده 9 الصبح)، أو null لو برة الفترة
function ccpQueueSupportNowMin_(dateStr) {
  const uae = getUAECurrentDate();
  const todayStr = `${uae.year}-${uae.month}-${uae.day}`;
  const nowMin = uae.hour24 * 60 + uae.minute;
  if (todayStr === dateStr && nowMin >= CCP_QS_DAY_START_MIN) return nowMin;
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 1);
  const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (todayStr === nextStr && nowMin < CCP_QS_DAY_START_MIN) return nowMin + 1440;
  return null;
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
// ⚠️ ملحوظة: قبل كده كانت بتحسب "قد إيه اشتغل" من الفرق بين firstLogin وendShift (أول Away لآخر Away) -
// دي كانت بتغلط لو ظهرت نقطة Away مبكرة والإيجنت رجع اشتغل تاني بعدها (زي لو اتضافت غلط من تعديل التايم لاين
// مثلاً) - كانت بتحسبها "اشتغل دقايق قليلة بس" وتحط No Show غلط رغم إنه شغال فعليًا لساعات بعد كده. الحساب الصح
// هو totalLoginSeconds (إجمالي الوقت الحقيقي في أي حالة غير Away، محسوب أصلاً وبيتبعت جاهز) - مش الفرق الزمني
// بين أول وآخر Away، فمبقاش محتاجين endShift في الحساب خالص
// ⚠️ ملحوظة تانية: كانت بتحكم بـ No Show أول ما الشيفت يبدأ (isDayJudgeable بتتأكد بس إن الشيفت بدأ)، فأي إيجنت
// شغال عادي من أول الشيفت كان بيتحط عليه No Show غلط في نص الشيفت لسه - لأنه طبيعي إنه لسه ما اشتغلش نص مدة
// الشيفت كلها. الصح: منحكمش بـ No Show إلا بعد ما نص مدة الشيفت نفسها يعدي (يعني حتى لو شغال 100% من غير ما
// يقف لحظة، أقرب وقت ممكن يوصل فيه لنص المدة هو نص الشيفت بالظبط)
function getAttendanceStatus(shiftWindow, totalLoginSeconds, dateStr, firstLogin, endShift) {
  if (!shiftWindow) return "off"; // مفيش شيفت متجدول في الروستر أصلاً
  if (dateStr && !isDayJudgeable(dateStr, shiftWindow)) return null; // لسه بدري (يوم مستقبلي أو الشيفت لسه ماوصلش معاده)

  if (dateStr) {
    const uae = getUAECurrentDate();
    const todayStr = `${uae.year}-${uae.month}-${uae.day}`;
    if (dateStr === todayStr) {
      const nowMin = uae.hour24 * 60 + uae.minute;
      const halfwayMin = (shiftWindow.startMin + shiftWindow.endMin) / 2;
      if (nowMin < halfwayMin) return null; // لسه ماوصلناش نص الشيفت - مبكر نحكم بـ No Show
    }
  }

  if (!firstLogin) return "no-show"; // مجاش خالص طول اليوم (ولا مرة غيّر حالته من Away)

  const shiftDurationSec = (shiftWindow.endMin - shiftWindow.startMin) * 60;
  if ((totalLoginSeconds || 0) < shiftDurationSec / 2) return "no-show";
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
// callLogByDay (اختياري) = callLogData.agentsByDay من Code.gs، بصيغة { "2026-09-01": { "Ahmed": {callsAnswered, ahtSeconds, ...}, ... }, ... } -
// بتضيف أعمدة أرقام المكالمات (Calls Answered / AHT / Occupancy / Outbound) لكل يوم لكل إيجنت بدل ما تفضل مجمّعة على الفترة كلها بس
function buildCcPulseExportRows(agentsList, trackingStartDate, callLogByDay) {
  // نجمع كل أسماء الـ status الموجودة في كل الأيام لكل الإيجنتس، عشان الأعمدة تبقى موحدة لكل الصفوف
  const statusSet = new Set();
  agentsList.forEach(agent => {
    (agent.days || []).forEach(day => {
      if (trackingStartDate && day.date < trackingStartDate) return;
      Object.keys(day.totals || {}).forEach(st => statusSet.add(st));
    });
  });
  const statusColumns = Array.from(statusSet);

  const headers = ["Date", "Agent", "Ext", "Scheduled Shift", "First Login", "End Shift", "Tardy", "Tardy Minutes", "Total Login Time", "Breaks",
    "Calls Answered", "AHT", "Inbound Talk Time", "Occupancy %", "Utilization %", "Outbound Answered", "Outbound Unanswered", "Outbound Total",
    "Outbound Talk Time", "Outbound Ring Time", "Avg Outbound Talk", "Contact Rate %"
  ].concat(statusColumns.map(st => ccpDisplayStatusName(st)));
  const rows = [headers];

  agentsList.forEach(agent => {
    const agentDept = getAgentDeptToday(agent.name);
    const isCallsAgent = agentDept === "Calls" || ccpIsQueueSupport_(agent.name);

    (agent.days || []).forEach(day => {
      if (trackingStartDate && day.date < trackingStartDate) return; // قبل بداية التتبع، متجاهلش

      const shiftWindow = getShiftWindowForAgentDate(agent.name, day.date);
      const shiftLabel = ccpIsQueueSupport_(agent.name) ? "Queue Support" : (shiftWindow ? shiftWindow.label : "Day Off");

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

      // أرقام مكالمات اليوم دا بالظبط للإيجنت دا (مش مجمّعة على الفترة كلها) - لو متوفرة
      const dayCallStats = (isCallsAgent && callLogByDay && callLogByDay[day.date]) ? callLogByDay[day.date][agent.name] : null;
      // Occupancy / Utilization لكل التيمات (مش Calls بس) - بياخد أرقام مكالمات أي إيجنت
      const dayAnyCallStats = (callLogByDay && callLogByDay[day.date]) ? callLogByDay[day.date][agent.name] : null;
      const dayOutbound = ccpOutboundRawMetrics_(dayAnyCallStats);
      const dayWork = (agentDept !== "Emails") ? ccpComputeWorkMetrics_([{ day: day, callStats: dayAnyCallStats }]) : { occupancyPct: null, utilizationPct: null };

      const row = [
        day.date,
        agent.name,
        agent.number || "-",
        shiftLabel,
        ccPulseTimeWithSeconds_(day.firstLogin),
        ccPulseTimeWithSeconds_(day.endShift),
        isTardy,
        tardyMin,
        formatCcPulseDuration(day.totalLoginSeconds),
        breaksList,
        isCallsAgent ? (dayCallStats ? dayCallStats.callsAnswered : 0) : "",
        isCallsAgent ? formatCcPulseDuration(dayCallStats ? dayCallStats.ahtSeconds : 0) : "",
        isCallsAgent ? formatCcPulseDuration(dayCallStats ? dayCallStats.totalTalkSeconds : 0) : "",
        dayWork.occupancyPct !== null ? `${dayWork.occupancyPct}%` : "",
        dayWork.utilizationPct !== null ? `${dayWork.utilizationPct}%` : "",
        // أرقام الصادر لأي إيجنت عمل صادر (مش Calls بس - تيم Call Outs شغله كله صادر)
        dayAnyCallStats ? dayAnyCallStats.outboundAnsweredCount : 0,
        dayAnyCallStats ? dayAnyCallStats.outboundUnansweredCount : 0,
        dayAnyCallStats ? dayAnyCallStats.outboundCallsCount : 0,
        formatCcPulseDuration(dayOutbound.talkSeconds),
        formatCcPulseDuration(dayOutbound.ringSeconds),
        formatCcPulseDuration(dayOutbound.avgTalkSeconds),
        dayOutbound.contactRatePct !== null ? `${dayOutbound.contactRatePct}%` : ""
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

// زرار "Export to PDF" - بياخد نفس كارت التقرير المعروض دلوقتي (#ccPulseReportResult)
// زي ما هو بالظبط (نفس التصميم/الألوان) ويحوله PDF، عن طريق مكتبة html2pdf.js
// (محمّلة من CDN في tail.html) - من غير أي تعديل في Code.gs أو السيرفر، كله فرونت إند.
// شريط زراير الـ Export نفسه (CSV/PDF) بيتشال من الـ PDF عشان مايظهرش جوه الملف الناتج.
function exportCcPulseReportToPdf() {
  const resultBox = document.getElementById("ccPulseReportResult");
  if (!resultBox || typeof html2pdf === "undefined") return;

  const uae = getUAECurrentDate();
  const filename = `cc-pulse-report_${uae.year}-${uae.month}-${uae.day}.pdf`;

  const opt = {
    margin: 8,
    filename: filename,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      ignoreElements: (el) => Boolean(el.classList && el.classList.contains("ccp-export-bar"))
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] }
  };

  html2pdf().set(opt).from(resultBox).save();
}

// زرار "Export to CSV" بيستخدم آخر بيانات تقرير اتحمّلت (اتخزنت في ccPulseLastExportAgentsList وقت الـ render)
function exportCcPulseReportToCsv() {
  if (!ccPulseLastExportAgentsList || !ccPulseLastExportAgentsList.length) return;
  const rows = buildCcPulseExportRows(ccPulseLastExportAgentsList, ccPulseLastExportTrackingStartDate, ccPulseLastExportCallLogByDay);
  const uae = getUAECurrentDate();
  const filename = `cc-pulse-report_${uae.year}-${uae.month}-${uae.day}.csv`;
  downloadCcPulseCsv(rows, filename);
}

// بيرجع "HH:MM" بصيغة 24 ساعة (الصيغة اللي محتاجها <input type="time">) من رقم دقايق من نص الليل
function ccpMinutesToHHMM_(totalMinutes) {
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const minute = Math.round(totalMinutes % 60);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// تهريب بسيط لأي قيمة بتتحط جوه data-attribute في الـ HTML (زي اسم الإيجنت)
function ccpEscapeAttr_(str) {
  return String(str == null ? "" : str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// editCtx = { agentName, dateStr } - لو موجودة، بيضيف data-attributes لكل جزء تايم لاين (حقيقي أو فجوة
// Out Of Adherence) عشان يبقى قابل للدوس عليه وتعديله - الدوس نفسه بيتفعّل بس للأدمن (شوف attachCcPulseTimelineEditHandlers)
function renderCcPulseTimelineHtml(sessions, statusColors, shiftWindow = null, effectiveEndMin = null, editCtx = null, opts = {}) {
  if (!sessions.length && !shiftWindow) return ""; // مفيش جلسات ولا شيفت متجدول، مفيش حاجة نرسمها

  // 🎧 Queue Support: اليوم من 9 الصبح لـ 9 الصبح اللي بعده - أي وقت في اليوم التاني بيتحسب +24 ساعة
  // عشان يترسم بعد 12 بالليل مش في أول التايم لاين. والتعديل من التايم لاين مقفول ليهم
  const qsDate = opts && opts.queueSupportDate;
  const toMin = (ts) => ccPulseTimeToMinutes(ts) + (qsDate && ts && ts.slice(0, 10) > qsDate ? 1440 : 0);
  if (qsDate) {
    editCtx = null;
    effectiveEndMin = ccpQueueSupportNowMin_(qsDate);
  }

  const canEdit = Boolean(editCtx && editCtx.agentName && editCtx.dateStr && typeof isAdmin === "function" && isAdmin());

  let dayStart = 9 * 60;
  let dayEnd = 21 * 60;
  if (qsDate) {
    // 🎧 Queue Support: التايم لاين على قد اللوجن بتاعهم بس (بساعة قبل وبعد)، مش اليوم كله
    if (sessions.length) {
      dayStart = Math.floor(Math.min(...sessions.map(s => toMin(s.start))) / 60) * 60 - 60;
      dayEnd = Math.ceil(Math.max(...sessions.map(s => toMin(s.end))) / 60) * 60 + 60;
    } else {
      dayStart = 21 * 60;
      dayEnd = 33 * 60;
    }
  }
  sessions.forEach(s => {
    dayStart = Math.min(dayStart, toMin(s.start));
    dayEnd = Math.max(dayEnd, toMin(s.end));
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

  const segmentsHtml = sessions.map((s, sIdx) => {
    const startMin = toMin(s.start);
    const endMin = toMin(s.end);
    const left = ((startMin - dayStart) / span) * 100;
    const width = Math.max(((endMin - startMin) / span) * 100, 0.3);
    const color = ccpStatusColor(s.status);
    const icon = CCP_STATUS_ICONS[s.status] || "fa-circle";
    const iconColor = "#ffffff";
    const tlFmt = qsDate ? ccpDateTimeLabel_ : ccPulseTimeOnly;
    const tooltipText = `${ccpDisplayStatusName(s.status)}: ${tlFmt(s.start)} \u2192 ${tlFmt(s.end)} (${formatCcPulseDuration(s.durationSeconds)})`;
    // \u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0644\u064a \u0643\u0627\u0646\u062a \u0634\u063a\u0627\u0644\u0629 \u0642\u0628\u0644 \u0627\u0644\u0633\u064a\u062c\u0645\u0646\u062a \u062f\u0647 \u0645\u0628\u0627\u0634\u0631\u0629 - \u0639\u0634\u0627\u0646 \u0644\u0648 \u0627\u0644\u0623\u062f\u0645\u0646 \u062d\u062f\u062f "End time" \u0647\u0646\u0627 \u0646\u0631\u062c\u0639\u0644\u0647
    // \u0644\u0646\u0641\u0633 \u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0644\u064a \u0643\u0627\u0646 \u0639\u0644\u064a\u0647\u0627 \u0641\u0639\u0644\u0627\u064b \u0642\u0628\u0644 \u0643\u062f\u0647 (\u0645\u0634 \u062a\u062e\u0645\u064a\u0646 \u0639\u0627\u0645 \u0632\u064a Available)\u060c \u0623\u0648\u0644 \u0633\u064a\u062c\u0645\u0646\u062a \u0641\u064a \u0627\u0644\u064a\u0648\u0645 \u0645\u0641\u064a\u0634 \u0642\u0628\u0644\u0647 \u062d\u0627\u062c\u0629
    const prevStatus = sIdx > 0 ? sessions[sIdx - 1].status : "";
    const editAttrs = canEdit
      ? ` data-ccp-edit="1" data-agent="${ccpEscapeAttr_(editCtx.agentName)}" data-date="${editCtx.dateStr}" data-time="${s.start}" data-status="${ccpEscapeAttr_(s.status)}" data-prev-status="${ccpEscapeAttr_(prevStatus)}"`
      : "";
    return `<div class="ccp-tl-segment" style="left:${left}%;width:${width}%;background:${color};color:${iconColor};" data-tooltip="${tooltipText}"${editAttrs}><i class="fa-solid ${icon}"></i></div>`;
  }).join("");

  const outOfAdherenceSegments = computeOutOfAdherenceSegments(sessions, shiftWindow, effectiveEndMin);
  const outOfAdherenceHtml = outOfAdherenceSegments.map(([startMin, endMin]) => {
    const left = ((startMin - dayStart) / span) * 100;
    const width = Math.max(((endMin - startMin) / span) * 100, 0.3);
    const tooltipText = `Out Of Adherence: ${ccPulseMinutesToTimeLabel(startMin)} \u2192 ${ccPulseMinutesToTimeLabel(endMin)} (${formatCcPulseDuration((endMin - startMin) * 60)})`;
    const editAttrs = canEdit
      ? ` data-ccp-edit="1" data-agent="${ccpEscapeAttr_(editCtx.agentName)}" data-date="${editCtx.dateStr}" data-time="" data-prefill="${ccpMinutesToHHMM_(startMin)}" data-status=""`
      : "";
    return `<div class="ccp-tl-segment ccp-tl-outofadherence" style="left:${left}%;width:${width}%;" data-tooltip="${tooltipText}"${editAttrs}></div>`;
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

  const legendHtml = qsDate
    ? `<div class="ccp-tl-shift-legend">🎧 Queue Support night — every login that started on this date (after 9 AM) until the next morning</div>`
    : shiftWindow
    ? `<div class="ccp-tl-shift-legend"><span class="ccp-tl-shift-swatch"></span> Scheduled shift: ${shiftWindow.label}${outOfAdherenceSegments.length ? ` &nbsp;·&nbsp; <span class="ccp-tl-outofadherence-swatch"></span> Out Of Adherence` : ""}${canEdit ? ` &nbsp;·&nbsp; ✏️ Click a segment to edit` : ""}</div>`
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

// ============================================================
// ✏️ CC PULSE TIMELINE - CLICK TO EDIT (ADMIN ONLY)
// بيسمح للأدمن يعدّل/يضيف نقطة في سجل حالة إيجنت بالدوس على التايم لاين مباشرة
// (سيجمنت حقيقي أو فجوة Out Of Adherence)، بدل ما يعدل شيت AgentStatusLog بإيده
// شوف Code.gs -> editAgentStatusPoint_ للمنطق اللي بيحصل في الشيت فعليًا
// ============================================================

// بيبني المودال مرة واحدة بس ويحطه في آخر الصفحة (لو موجود بالفعل مبيعملش حاجة)
function ccpEnsureEditModal_() {
  if (document.getElementById("ccpEditModal")) return;

  const statusOptionsHtml = CCP_EDITABLE_STATUSES.map(s => `<option value="${s.value}">${s.label}</option>`).join("");

  const modalHtml = `
    <div id="ccpEditModal" class="modal-overlay" style="display:none; z-index: 10000;">
      <div class="modal-content" style="max-width: 380px; border-radius: 16px;">
        <div class="modal-header">
          <h3 id="ccpEditModalTitle"><i class="fa-solid fa-pen"></i> Edit Status</h3>
          <button type="button" class="close-modal-btn" onclick="ccpCloseEditModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="ccp-edit-admin-note">🔒 Admin only — same permission as editing towers</div>

          <div class="form-group">
            <label for="ccpEditAgentDisplay">Agent</label>
            <input class="combo-input" id="ccpEditAgentDisplay" disabled style="background:#f8fafc;color:#64748b;">
          </div>

          <div class="form-group">
            <label for="ccpEditDate">Date</label>
            <input class="date-input" id="ccpEditDate" type="date">
          </div>

          <div class="form-group">
            <label for="ccpEditTime">Start time — status changes to this from here on</label>
            <input class="date-input" id="ccpEditTime" type="time" step="1">
          </div>

          <div class="form-group">
            <label for="ccpEditStatus">Status</label>
            <select class="combo-input" id="ccpEditStatus">${statusOptionsHtml}</select>
          </div>

          <div class="form-group">
            <label for="ccpEditEndTime">End time (optional)</label>
            <input class="date-input" id="ccpEditEndTime" type="time" step="1">
            <div class="ccp-edit-hint" id="ccpEditEndTimeHint"></div>
          </div>

          <div id="ccpEditError" class="ccp-edit-error" style="display:none;"></div>

          <div class="ccp-edit-actions">
            <button type="button" class="ccp-edit-btn-secondary" id="ccpEditCancelBtn" onclick="ccpCloseEditModal()">Cancel</button>
            <button type="button" class="btn-primary" id="ccpEditSaveBtn" onclick="ccpSaveEditModal()" style="flex:1;">Save</button>
          </div>

          <button type="button" class="ccp-edit-delete-link" id="ccpEditDeleteBtn" onclick="ccpDeleteEditPoint()" style="display:none;">
            <i class="fa-solid fa-trash-can"></i> Undo — delete this status change
          </button>
        </div>
      </div>
    </div>
    <div class="ccp-edit-toast" id="ccpEditToast"></div>`;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById("ccpEditModal").addEventListener("click", (e) => {
    if (e.target.id === "ccpEditModal") ccpCloseEditModal();
  });
}

let ccpEditState = null; // { agentName, originalTime, isGap } - بيتحط وقت فتح المودال، ومطلوب وقت الحفظ

// seg = العنصر (.ccp-tl-segment) اللي اتدوس عليه
function ccpOpenEditModal(seg) {
  if (!isAdmin()) return; // حماية إضافية - مش متوقع يوصل هنا أصلاً لو مش أدمن (الزرار مش بيتربط أصلاً)
  ccpEnsureEditModal_();

  const agentName = seg.getAttribute("data-agent") || "";
  const dateStr = seg.getAttribute("data-date") || "";
  const originalTime = seg.getAttribute("data-time") || "";
  const status = seg.getAttribute("data-status") || "";
  const prefillTime = seg.getAttribute("data-prefill") || "";
  const prevStatus = seg.getAttribute("data-prev-status") || "";
  const isGap = seg.classList.contains("ccp-tl-outofadherence");
  // الحالة اللي بيرجعلها لوحده لو حددنا "End time":
  // - فجوة (مفيش داتا خالص) بترجع "Away" (كأن الفجوة استمرت بعد كده)
  // - سيجمنت شغل حقيقي بيرجع لنفس الحالة اللي كانت شغالة قبله فعلاً (زي مثال "كان بيعمل Emails، حط Break
  //   ونسي يرجع" - بيرجعله Emails تحديدًا، مش تخمين عام) - لو مفيش سيجمنت قبله في اليوم (أول حاجة حصلت)
  // بيرجع "Available" كافتراض معقول
  const autoRevertStatus = isGap ? "Away" : (prevStatus || "Available");

  ccpEditState = { agentName: agentName, originalTime: originalTime, isGap: isGap, autoRevertStatus: autoRevertStatus };

  // بنعدل نقطة موجودة فعلاً (originalTime مش فاضي) -> "Edit Status". مفيش نقطة (originalTime فاضي) وفجوة
  // Out Of Adherence محسوبة (isGap) -> "Fill Gap". مفيش نقطة ومش فجوة -> إضافة يدوية من زرار "+ Add status"
  document.getElementById("ccpEditModalTitle").innerHTML = originalTime
    ? `<i class="fa-solid fa-pen"></i> Edit Status`
    : (isGap ? `<i class="fa-solid fa-pen"></i> Fill Gap` : `<i class="fa-solid fa-plus"></i> Add Status`);
  document.getElementById("ccpEditAgentDisplay").value = agentName;
  document.getElementById("ccpEditDate").value = dateStr;
  document.getElementById("ccpEditTime").value = originalTime ? originalTime.split(" ")[1] : ((prefillTime ? prefillTime + ":00" : "09:00:00"));
  document.getElementById("ccpEditStatus").value = isGap ? "Available" : (status || "Available");
  document.getElementById("ccpEditEndTime").value = ""; // دايمًا فاضي لما نفتح - اختياري
  document.getElementById("ccpEditEndTimeHint").textContent =
    `Leave blank to keep this status running until the next logged change. If set, it'll automatically switch back to "${ccpDisplayStatusName(autoRevertStatus)}" right after — no need to add that point yourself.`;

  const errEl = document.getElementById("ccpEditError");
  errEl.style.display = "none";
  errEl.textContent = "";
  const saveBtn = document.getElementById("ccpEditSaveBtn");
  saveBtn.disabled = false;
  saveBtn.textContent = "Save";

  // زرار "Undo" بيظهر بس لو بنعدل نقطة موجودة بالفعل (مش فجوة بنعبيها لأول مرة - مفيش حاجة نمسحها لسه)
  const delBtn = document.getElementById("ccpEditDeleteBtn");
  delBtn.style.display = originalTime ? "block" : "none";
  delBtn.disabled = false;
  delBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Undo — delete this status change`;

  document.getElementById("ccpEditModal").style.display = "flex";
}

function ccpCloseEditModal() {
  const modal = document.getElementById("ccpEditModal");
  if (modal) modal.style.display = "none";
  ccpEditState = null;
}

function ccpShowEditToast_(message) {
  const toast = document.getElementById("ccpEditToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

// بيرجع "HH:MM:SS" من قيمة حقل <input type="time" step="1"> - المفروض دايمًا يرجع الثواني بفضل step="1"،
// بس لو المتصفح مدعمش ده وبيرجع "HH:MM" بس، بنضيف ":00" احتياطًا
function ccpNormalizeTimeToHHMMSS_(timeVal) {
  return (timeVal && timeVal.length === 5) ? (timeVal + ":00") : timeVal;
}

// بيوضح رسالة الخطأ "already a status change" أكتر - عشان الأدمن يفهم إن مفيش حاجة اتمسحت،
// إحنا بس رفضنا نضيف نقطة جديدة لأن في نقطة موجودة أصلاً في نفس الثانية بالظبط
function ccpFriendlyEditError_(message) {
  message = message || "Failed to save";
  if (message.indexOf("already a status change") !== -1) {
    return message + " — nothing was deleted or changed. There's already a saved point at that exact second; " +
      "try adjusting the time by a second or a minute (e.g. 08:59:59 PM instead of 09:00:00 PM) and save again, " +
      "or leave it as is if that existing point already covers it.";
  }
  return message;
}

// بيبعت نقطة واحدة (editAgentStatusPoint) للسيرفر ويرجع الـ JSON - مستخدمة مرة واحدة أو مرتين (بداية + نهاية).
// oldStatus اختياري - لو موجود، بيتبعت صراحة عشان السيرفر يستخدمه زي ما هو بدل ما يخمّنه (شوف Code.gs)
function ccpPostAgentStatusEdit_(agentName, originalTime, newTime, newStatus, oldStatus) {
  const body = {
    action: "editAgentStatusPoint",
    agentName: agentName,
    originalTime: originalTime,
    newTime: newTime,
    newStatus: newStatus,
    token: localStorage.getItem("sessionToken") || ""
  };
  if (oldStatus) body.oldStatus = oldStatus;

  return fetch(GOOGLE_SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body)
  }).then(res => res.json());
}

async function ccpSaveEditModal() {
  if (!ccpEditState) return;

  const dateVal = document.getElementById("ccpEditDate").value;
  const timeVal = ccpNormalizeTimeToHHMMSS_(document.getElementById("ccpEditTime").value); // "HH:MM:SS"
  const endTimeVal = ccpNormalizeTimeToHHMMSS_(document.getElementById("ccpEditEndTime").value); // "HH:MM:SS" أو فاضي (اختياري)
  const statusVal = document.getElementById("ccpEditStatus").value;
  const errEl = document.getElementById("ccpEditError");

  if (!dateVal || !timeVal || !statusVal) {
    errEl.textContent = "⚠️ Please fill in date, time, and status.";
    errEl.style.display = "block";
    return;
  }
  if (endTimeVal && endTimeVal <= timeVal) {
    errEl.textContent = "⚠️ End time must be after the start time.";
    errEl.style.display = "block";
    return;
  }

  const newTime = `${dateVal} ${timeVal}`;
  const saveBtn = document.getElementById("ccpEditSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  errEl.style.display = "none";

  try {
    const res = await ccpPostAgentStatusEdit_(ccpEditState.agentName, ccpEditState.originalTime, newTime, statusVal);
    if (res.status !== "success") {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
      errEl.textContent = "❌ " + ccpFriendlyEditError_(res.message);
      errEl.style.display = "block";
      return;
    }

    // فيه "End time" - نضيف نقطة جديدة تانية (أول مرة، مفيش originalTime) ترجع الحالة أوتوماتيك
    // (Away لو دي فجوة كانت بتتعبى، أو نفس الحالة اللي كانت شغالة قبل السيجمنت ده فعليًا لو ده تصحيح
    // لحالة شغل حقيقي نسي يغيّرها - اتحسبت وقت فتح المودال، شوف ccpOpenEditModal)
    if (endTimeVal) {
      saveBtn.textContent = "Saving end time...";
      const autoRevertStatus = ccpEditState.autoRevertStatus;
      const endTime = `${dateVal} ${endTimeVal}`;
      const res2 = await ccpPostAgentStatusEdit_(ccpEditState.agentName, "", endTime, autoRevertStatus);
      if (res2.status !== "success") {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
        errEl.textContent = "⚠️ Start time saved, but the automatic end point failed: " + ccpFriendlyEditError_(res2.message || "unknown error") + ". Please check the timeline.";
        errEl.style.display = "block";
        loadCcPulseReport(false); // نحدث التايم لاين برضو عشان يبان اللي اتحفظ فعلاً
        return;
      }
    }

    ccpCloseEditModal();
    ccpShowEditToast_("✅ Saved — refreshing timeline...");
    loadCcPulseReport(false); // إعادة تحميل التقرير عشان التايم لاين يتحدث بالبيانات الجديدة فورًا
  } catch (err) {
    console.error("Error saving status edit:", err);
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
    errEl.textContent = "❌ Network error. Please check your connection and try again.";
    errEl.style.display = "block";
  }
}

// زرار "Undo" - بيمسح النقطة اللي المودال فاتح عليها دلوقتي خالص (مش تعديل، مسح فعلي من الشيت)
// متاح بس لما بنعدل نقطة موجودة بالفعل (ccpEditState.originalTime مش فاضي)
function ccpDeleteEditPoint() {
  if (!ccpEditState || !ccpEditState.originalTime) return;
  if (!confirm("Delete this status change? This cannot be undone.")) return;

  const saveBtn = document.getElementById("ccpEditSaveBtn");
  const delBtn = document.getElementById("ccpEditDeleteBtn");
  const errEl = document.getElementById("ccpEditError");
  saveBtn.disabled = true;
  delBtn.disabled = true;
  delBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting...`;
  errEl.style.display = "none";

  fetch(GOOGLE_SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "deleteAgentStatusPoint",
      agentName: ccpEditState.agentName,
      originalTime: ccpEditState.originalTime,
      token: localStorage.getItem("sessionToken") || ""
    })
  })
    .then(res => res.json())
    .then(res => {
      if (res.status === "success") {
        ccpCloseEditModal();
        ccpShowEditToast_("↩️ Removed — refreshing timeline...");
        loadCcPulseReport(false);
      } else {
        saveBtn.disabled = false;
        delBtn.disabled = false;
        delBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Undo — delete this status change`;
        errEl.textContent = "❌ " + (res.message || "Failed to delete");
        errEl.style.display = "block";
      }
    })
    .catch(err => {
      console.error("Error deleting status point:", err);
      saveBtn.disabled = false;
      delBtn.disabled = false;
      delBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Undo — delete this status change`;
      errEl.textContent = "❌ Network error. Please check your connection and try again.";
      errEl.style.display = "block";
    });
}

// بيربط الدوس على أجزاء التايم لاين (حقيقية أو فجوة Out Of Adherence) بفتح مودال التعديل - أدمن بس
// (بيتنادى بعد كل رندر تقرير جديد - زي attachCcPulseTimelineHover بالظبط)
function attachCcPulseTimelineEditHandlers() {
  if (!isAdmin()) return;
  document.querySelectorAll(".ccp-timeline-bar").forEach(bar => {
    if (bar.dataset.editBound === "true") return;
    bar.dataset.editBound = "true";

    bar.addEventListener("click", (e) => {
      const seg = e.target.closest('.ccp-tl-segment[data-ccp-edit="1"]');
      if (!seg) return;
      ccpOpenEditModal(seg);
    });
  });
}

// بيربط أزرار التعديل/الحذف/الحفظ/الإلغاء في قايمة الـ Sessions تحت التايم لاين (بديل تاني للدوس على
// التايم لاين، شوف buildCcPulseSessionListHtml_)، وزرار "+ Add status". التعديل هنا مباشر جوه الصف - مفيش
// مودال خالص (بعكس الدوس على التايم لاين اللي لسه بيفتح ccpOpenEditModal)
function attachCcPulseSessionListEditHandlers() {
  if (!isAdmin()) return;

  document.querySelectorAll(".ccp-session-list").forEach(list => {
    if (list.dataset.editBound === "true") return;
    list.dataset.editBound = "true";

    list.addEventListener("click", (e) => {
      const row = e.target.closest('.ccp-session-row[data-ccp-edit="1"]');
      if (!row) return;

      if (e.target.closest(".ccp-session-edit-btn")) {
        ccpEnterRowEditMode_(row);
      } else if (e.target.closest(".ccp-session-delete-btn")) {
        ccpDeleteSessionRow_(row);
      } else if (e.target.closest(".ccp-session-save-btn")) {
        ccpSaveRowEdit_(row);
      } else if (e.target.closest(".ccp-session-cancel-btn")) {
        ccpCancelRowEdit_(row);
      }
    });
  });

  document.querySelectorAll('.ccp-session-add-btn[data-ccp-add="1"]').forEach(btn => {
    if (btn.dataset.addBound === "true") return;
    btn.dataset.addBound = "true";
    btn.addEventListener("click", () => ccpAddNewRow_(btn));
  });
}

// حذف مباشر لسطر في قايمة الـ Sessions من غير ما نفتح المودال الأول - نفس فعل "Undo" جوه المودال
// (deleteAgentStatusPoint) بس خطوة واحدة بدل اتنين. مفيد خصوصًا للسيجمنتات اللي أصلاً بتتعدل من هنا لأنها
// صغيرة جدًا وصعبة على التايم لاين
function ccpDeleteSessionRow_(row) {
  if (!isAdmin()) return;
  const agentName = row.getAttribute("data-agent") || "";
  const originalTime = row.getAttribute("data-time") || "";
  if (!agentName || !originalTime) return;
  if (!confirm("Delete this status change? This cannot be undone.")) return;

  const btn = row.querySelector(".ccp-session-delete-btn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`; }

  fetch(GOOGLE_SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "deleteAgentStatusPoint",
      agentName: agentName,
      originalTime: originalTime,
      token: localStorage.getItem("sessionToken") || ""
    })
  })
    .then(res => res.json())
    .then(res => {
      if (res.status === "success") {
        ccpShowEditToast_("↩️ Removed — refreshing timeline...");
        loadCcPulseReport(false);
      } else {
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-trash-can"></i>`; }
        alert("❌ " + (res.message || "Failed to delete"));
      }
    })
    .catch(err => {
      console.error("Error deleting status point:", err);
      if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-trash-can"></i>`; }
      alert("❌ Network error. Please check your connection and try again.");
    });
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
  const isQs = ccpIsQueueSupport_(agentName);
  const workHtml = ccpShowsWorkMetrics_(agentName) ? ccpWorkMetricsCardsHtml_(ccpComputeWorkMetrics_([{ day: day, callStats: callStats }])) : "";
  const callsHtml = (dept === "Calls" || isQs)
    ? `
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">Calls Answered</div>
      <div class="ccp-metric-value">${callStats ? callStats.callsAnswered : 0}</div>
    </div>
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">AHT</div>
      <div class="ccp-metric-value">${callStats ? formatCcPulseDuration(callStats.ahtSeconds) : "0s"}</div>
    </div>${ccpInboundTalkCardHtml_(callStats)}
`
    : "";
  const outboundReportHtml = `
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">Outbound Calls</div>
      <div class="ccp-metric-value">${callStats ? callStats.outboundCallsCount : 0}</div>
    </div>
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">Outbound Answered</div>
      <div class="ccp-metric-value">${callStats ? callStats.outboundAnsweredCount : 0}</div>
    </div>
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">Outbound Unanswered</div>
      <div class="ccp-metric-value" style="cursor:pointer; text-decoration:underline dotted;" title="Click to see each call" onclick="ccpShowOutboundUnansweredModal('${agentName}', 'day', '${day.date}')">${callStats ? callStats.outboundUnansweredCount : 0}</div>
    </div>${ccpOutboundExtraCardsHtml_(callStats)}`;

  const totalsHtml = Object.keys(day.totals || {}).map(st => `
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">${ccpDisplayStatusName(st)}</div>
      <div class="ccp-metric-value"${liveIds ? ` data-status-metric="${st}"` : ""}>${formatCcPulseDuration(day.totals[st])}</div>
    </div>`).join("");

  const tardyResult = calculateTardyFromDays(agentName, [day], trackingStartDate);
  const tardyHtml = isQs ? "" : `
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
  if (isQs) {
    dayStatusBannerHtml = `<div class="ccp-daystatus-banner" style="background:#ede9fe;color:#5b21b6;">🎧 <strong>Queue Support</strong> — this date's night: any login that started after 9 AM on this date or before 9 AM the next morning</div>`;
  } else if (attendanceStatus === "no-show") {
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
    <div class="ccp-metrics-grid">${callsHtml}${workHtml}${outboundReportHtml}${totalsHtml}${tardyHtml}</div>
    ${dayStatusBannerHtml}
    <div class="ccp-day-highlight">
      <div class="ccp-metric-card ccp-accent">
        <div class="ccp-metric-label">First login</div>
        <div class="ccp-metric-value">${isQs ? ccpDateTimeLabel_(day.firstLogin) : ccPulseTimeOnly(day.firstLogin)}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">End shift</div>
        <div class="ccp-metric-value">${isQs ? ccpDateTimeLabel_(day.endShift) : ccPulseTimeOnly(day.endShift)}</div>
      </div>
      ${adherenceCardHtml}
    </div>
    ${isQs
      ? renderCcPulseTimelineHtml(day.sessions, statusColors, null, null, null, { queueSupportDate: day.date })
      : renderCcPulseTimelineHtml(day.sessions, statusColors, shiftWindow, dayEffectiveEndMin, { agentName: agentName, dateStr: day.date })}
    ${isQs ? buildCcPulseSessionListHtml_(day.sessions, null, null, true) : buildCcPulseSessionListHtml_(day.sessions, agentName, day.date)}`;
}

// كاش بسيط: "<agent>|<date>" -> آخر sessions array اتعرض لليوم ده. مطلوب عشان لو دُست على زرار قلم صف،
// نعرف الصف اللي قبله واللي بعده (عشان نعرف نتاريخ "النهاية" وين، ونحدد الحالة الافتراضية لو الصف ده آخر
// حاجة في اليوم) من غير ما نعيد الطلب من السيرفر أو نمرر بيانات زيادة في كل data-attribute
const ccpSessionListCache_ = {};

// قايمة الـ Sessions تحت التايم لاين - طريقة تانية للتعديل غير الدوس على التايم لاين نفسه، مفيدة خصوصًا
// للسيجمنتات الصغيرة جدًا (كام ثانية) اللي عمليًا مستحيل تدوس عليها بدقة على بار طوله 12 ساعة. التعديل هنا
// **مباشر جوه الصف نفسه (وقت البداية / وقت النهاية / الحالة كل واحد لوحده) من غير ما يفتح مودال/بوب أب** -
// بعكس الدوس على التايم لاين اللي لسه بيفتح نفس المودال القديم (شوف ccpOpenEditModal). البداية والنهاية
// بيتحفظوا بنداءين منفصلين لنفس endpoint الموجود أصلاً (editAgentStatusPoint) - "النهاية" فعليًا هي بداية
// الصف اللي بعده (مفيش سجل "نهاية" منفصل في AgentStatusLog)، فتعديلها بيحرك نقطة الصف اللي بعده. لو الصف ده
// آخر حاجة في اليوم (مفيش صف بعده) وحطينا نهاية، بنضيف نقطة جديدة تقفله (زي خانة "End time" الاختيارية اللي
// كانت في المودال، بس هنا لكل صف مش بس وقت الفتح). شوف attachCcPulseSessionListEditHandlers
function buildCcPulseSessionListHtml_(sessions, agentName, dateStr, showDate) {
  sessions = sessions || [];
  const canEdit = Boolean(agentName && dateStr && typeof isAdmin === "function" && isAdmin());

  if (agentName && dateStr) ccpSessionListCache_[agentName + "|" + dateStr] = sessions;

  const rowsHtml = sessions.map((s, sIdx) => {
    const prevStatus = sIdx > 0 ? sessions[sIdx - 1].status : "";
    const attrs = canEdit
      ? ` data-ccp-edit="1" data-agent="${ccpEscapeAttr_(agentName)}" data-date="${dateStr}" data-time="${s.start}" data-status="${ccpEscapeAttr_(s.status)}" data-old-status="${ccpEscapeAttr_(s.oldStatus || "")}" data-prev-status="${ccpEscapeAttr_(prevStatus)}" data-idx="${sIdx}"`
      : "";
    return `
        <div class="ccp-session-row"${attrs}>${ccpSessionRowViewInnerHtml_(s, canEdit, showDate)}</div>`;
  }).join("");

  const addBtnHtml = canEdit
    ? `<button type="button" class="ccp-session-add-btn" data-ccp-add="1" data-agent="${ccpEscapeAttr_(agentName)}" data-date="${dateStr}"><i class="fa-solid fa-plus"></i> Add status</button>`
    : "";

  return `
    <div class="ccp-session-list">${rowsHtml}</div>
    ${addBtnHtml}`;
}

// المحتوى الجوّاني لصف في وضع العرض العادي (مش بيغيّر data-attributes الصف نفسه - دي بتتحط مرة واحدة وبتفضل
// زي ما هي، سواء الصف في وضع عرض أو تعديل، لأنها بتمثل هوية النقطة الأصلية في الشيت)
function ccpSessionRowViewInnerHtml_(s, canEdit, showDate) {
  const fmt = showDate ? ccpDateTimeLabel_ : ccPulseTimeOnly;
  const rowActionsHtml = canEdit ? `
          <button type="button" class="ccp-session-edit-btn" title="Edit this status"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="ccp-session-delete-btn" title="Delete this status"><i class="fa-solid fa-trash-can"></i></button>` : "";
  return `
          <span class="ccp-dot" style="background:${ccpStatusColor(s.status)}"></span>
          <span class="ccp-session-status">${ccpDisplayStatusName(s.status)}</span>
          <span class="ccp-session-time">${fmt(s.start)} → ${fmt(s.end)}</span>
          <span class="ccp-session-dur">${formatCcPulseDuration(s.durationSeconds)}</span>${rowActionsHtml}`;
}

// المحتوى الجوّاني لصف في وضع التعديل - وقت البداية + الحالة "من -> لحد" (From/To - بتمثل عمودي
// OldStatus/NewStatus بتاعت الصف ده بالظبط في AgentStatusLog، معروضين صراحة بدل ما السيرفر يخمّن From
// لوحده زي الأول) + وقت النهاية (اختياري لو مفيش صف بعده) + زرار حفظ/إلغاء، كل حقل بيتعدل لوحده.
// hasNext=false يخلي حقل النهاية فاضي بـ placeholder "ongoing" (مفيش نقطة حقيقية بعده لسه - أي وقت
// هيتكتب هنا هيتضاف كنقطة جديدة وقت الحفظ، مش تحريك نقطة موجودة)
function ccpSessionRowEditInnerHtml_(oldStatus, status, startHHMMSS, endHHMMSS, hasNext) {
  const oldStatusOptionsHtml = CCP_EDITABLE_STATUSES.map(o => `<option value="${o.value}"${o.value === oldStatus ? " selected" : ""}>${o.label}</option>`).join("");
  const statusOptionsHtml = CCP_EDITABLE_STATUSES.map(o => `<option value="${o.value}"${o.value === status ? " selected" : ""}>${o.label}</option>`).join("");
  const endAttrs = hasNext ? "" : ` placeholder="ongoing"`;
  return `
          <input type="time" step="1" class="ccp-session-edit-start" value="${startHHMMSS}">
          <select class="ccp-session-edit-old-select" title="Status right before this point (From)">${oldStatusOptionsHtml}</select>
          <span class="ccp-session-edit-arrow">to</span>
          <select class="ccp-session-edit-select" title="Status from this point on (To)">${statusOptionsHtml}</select>
          <span class="ccp-session-edit-arrow">→</span>
          <input type="time" step="1" class="ccp-session-edit-end" value="${endHHMMSS}"${endAttrs}>
          <button type="button" class="ccp-session-save-btn" title="Save"><i class="fa-solid fa-check"></i></button>
          <button type="button" class="ccp-session-cancel-btn" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
          <div class="ccp-session-edit-err"></div>`;
}

// بيحوّل صف من وضع العرض لوضع التعديل مباشرة جوه نفس الصف (من غير مودال). بيستخدم الكاش عشان يعرف لو فيه
// صف بعده (hasNext) - لو آه، حقل النهاية بيمثل بداية الصف ده وتعديله بيحرك نقطته هو بنفس حالته. لو لأ (آخر
// صف في اليوم، أو صف جديد لسه ما اتسجلش)، حقل النهاية هيبقى فاضي وأي وقت يتكتب فيه هيتحفظ كنقطة جديدة تقفل
// الصف ده وترجع تلقائي لحالة قبله (أو Available لو مفيش صف قبله)
function ccpEnterRowEditMode_(row) {
  const agentName = row.getAttribute("data-agent") || "";
  const dateStr = row.getAttribute("data-date") || "";
  const originalTime = row.getAttribute("data-time") || "";
  const status = row.getAttribute("data-status") || "Available";
  const oldStatusAttr = row.getAttribute("data-old-status") || "";
  const idx = parseInt(row.getAttribute("data-idx"), 10);

  const sessions = ccpSessionListCache_[agentName + "|" + dateStr] || [];
  const hasNext = !isNaN(idx) && (idx + 1) < sessions.length;
  const nextSession = hasNext ? sessions[idx + 1] : null;
  const prevStatus = (!isNaN(idx) && idx > 0 && sessions[idx - 1]) ? sessions[idx - 1].status : "Away";

  row.dataset.hasNext = hasNext ? "1" : "0";
  row.dataset.nextTime = hasNext ? nextSession.start : "";
  row.dataset.nextStatus = hasNext ? nextSession.status : "";
  row.dataset.autoRevert = prevStatus;

  const startHHMMSS = originalTime ? originalTime.split(" ")[1] : "09:00:00";
  const endHHMMSS = hasNext ? nextSession.start.split(" ")[1] : "";
  // "From" - القيمة الحقيقية المخزنة في الشيت لو الصف موجود بالفعل (جايالنا من السيرفر)، أو تخمين معقول
  // (نفس منطق autoRevert - الحالة اللي كانت شغالة قبله فعلاً، أو "Away" لو ده أول صف في اليوم) لو صف جديد
  const oldStatusDefault = oldStatusAttr || prevStatus;

  row.innerHTML = ccpSessionRowEditInnerHtml_(oldStatusDefault, status, startHHMMSS, endHHMMSS, hasNext);
  row.querySelector(".ccp-session-edit-start").focus();
}

// إلغاء التعديل: لو الصف كان جديد (من زرار "+ Add status" ولسه ما اتحفظش) بنمسحه خالص ونرجع زرار الإضافة،
// لو صف موجود بيرجع لوضع العرض العادي من نفس بيانات الكاش (من غير طلب جديد من السيرفر)
function ccpCancelRowEdit_(row) {
  const list = row.parentElement;

  if (row.dataset.isNew === "1") {
    row.remove();
    const addBtn = list && list.nextElementSibling;
    if (addBtn && addBtn.classList.contains("ccp-session-add-btn")) addBtn.style.display = "";
    return;
  }

  const agentName = row.getAttribute("data-agent") || "";
  const dateStr = row.getAttribute("data-date") || "";
  const idx = parseInt(row.getAttribute("data-idx"), 10);
  const sessions = ccpSessionListCache_[agentName + "|" + dateStr] || [];
  const s = sessions[idx];
  if (!s) { loadCcPulseReport(false); return; } // احتياطي - مش متوقع يحصل
  row.innerHTML = ccpSessionRowViewInnerHtml_(s, true);
}

// حفظ صف بعد التعديل المباشر - ممكن يبعت حتى نداءين لـ editAgentStatusPoint (نفس endpoint بتاع المودال):
// واحد لبداية السيجمنت (لو الحالة و/أو وقت البداية اتغيروا)، وواحد تاني لنهايته (لو hasNext بيحرك نقطة الصف
// اللي بعده، أو لو مفيش صف بعده بيضيف نقطة جديدة تقفله) - كل نداء مستقل، ممكن تعدل واحد بس من الاتنين
async function ccpSaveRowEdit_(row) {
  const agentName = row.getAttribute("data-agent") || "";
  const dateStr = row.getAttribute("data-date") || "";
  const originalTime = row.getAttribute("data-time") || ""; // فاضي = صف جديد لسه مش متسجل في الشيت
  const origStatus = row.getAttribute("data-status") || "";
  const origOldStatus = row.getAttribute("data-old-status") || "";
  const hasNext = row.dataset.hasNext === "1";
  const nextTime = row.dataset.nextTime || "";
  const nextStatus = row.dataset.nextStatus || "";
  const autoRevertStatus = row.dataset.autoRevert || "Available";

  const oldStatusVal = row.querySelector(".ccp-session-edit-old-select").value;
  const statusVal = row.querySelector(".ccp-session-edit-select").value;
  const startVal = ccpNormalizeTimeToHHMMSS_(row.querySelector(".ccp-session-edit-start").value);
  const endVal = ccpNormalizeTimeToHHMMSS_(row.querySelector(".ccp-session-edit-end").value);
  const errEl = row.querySelector(".ccp-session-edit-err");
  const saveBtn = row.querySelector(".ccp-session-save-btn");
  const cancelBtn = row.querySelector(".ccp-session-cancel-btn");

  errEl.textContent = "";
  if (!dateStr || !startVal || !statusVal || !oldStatusVal) {
    errEl.textContent = "⚠️ Fill in time and status.";
    return;
  }
  if (endVal && endVal <= startVal) {
    errEl.textContent = "⚠️ End must be after start.";
    return;
  }

  saveBtn.disabled = true;
  cancelBtn.disabled = true;
  saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

  const newStartFull = `${dateStr} ${startVal}`;

  try {
    // 1) بداية السيجمنت - "From"/"To" و/أو وقت البداية (نفس نداء واحد بيغطي الكل، شوف editAgentStatusPoint_
    // - oldStatus بيتبعت صراحة دايمًا هنا عشان الشيت يتضبط بالظبط زي ما الأدمن شايف/مختار، مش تخمين)
    const startChanged = !originalTime || newStartFull !== originalTime || statusVal !== origStatus || oldStatusVal !== origOldStatus;
    if (startChanged) {
      const res1 = await ccpPostAgentStatusEdit_(agentName, originalTime, newStartFull, statusVal, oldStatusVal);
      if (res1.status !== "success") {
        errEl.textContent = "❌ " + ccpFriendlyEditError_(res1.message);
        saveBtn.disabled = false; cancelBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;
        return;
      }
    }

    // 2) نهاية السيجمنت
    if (hasNext) {
      const newEndFull = `${dateStr} ${endVal}`;
      if (endVal && newEndFull !== nextTime) {
        const res2 = await ccpPostAgentStatusEdit_(agentName, nextTime, newEndFull, nextStatus);
        if (res2.status !== "success") {
          errEl.textContent = "⚠️ Start saved, but end time failed: " + ccpFriendlyEditError_(res2.message || "unknown error");
          loadCcPulseReport(false);
          return;
        }
      }
    } else if (endVal) {
      const newEndFull = `${dateStr} ${endVal}`;
      const res2 = await ccpPostAgentStatusEdit_(agentName, "", newEndFull, autoRevertStatus);
      if (res2.status !== "success") {
        errEl.textContent = "⚠️ Start saved, but end time failed: " + ccpFriendlyEditError_(res2.message || "unknown error");
        loadCcPulseReport(false);
        return;
      }
    }

    ccpShowEditToast_("✅ Saved — refreshing timeline...");
    loadCcPulseReport(false);
  } catch (err) {
    console.error("Error saving inline status edit:", err);
    errEl.textContent = "❌ Network error. Please check your connection and try again.";
    saveBtn.disabled = false; cancelBtn.disabled = false;
    saveBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;
  }
}

// زرار "+ Add status": بيضيف صف جديد فاضي جوه القايمة مباشرة في وضع تعديل (من غير مودال) - مفيش نقطة بعده
// (hasNext=false دايمًا لصف جديد)، فحقل النهاية هنا بيشتغل بنفس منطق "آخر صف في اليوم" (تحديد نهاية = إضافة
// نقطة جديدة تقفله)
function ccpAddNewRow_(btn) {
  const agentName = btn.getAttribute("data-agent") || "";
  const dateStr = btn.getAttribute("data-date") || "";
  const list = btn.previousElementSibling;
  if (!list || !list.classList.contains("ccp-session-list")) return;

  const sessions = ccpSessionListCache_[agentName + "|" + dateStr] || [];

  const row = document.createElement("div");
  row.className = "ccp-session-row";
  row.setAttribute("data-ccp-edit", "1");
  row.setAttribute("data-agent", agentName);
  row.setAttribute("data-date", dateStr);
  row.setAttribute("data-time", "");
  row.setAttribute("data-status", "Available");
  row.setAttribute("data-idx", String(sessions.length)); // idx خارج نطاق المصفوفة الحقيقية -> hasNext=false تلقائي
  row.dataset.isNew = "1";
  list.appendChild(row);

  btn.style.display = "none";
  ccpEnterRowEditMode_(row);
  row.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// ============================================================
// 📞 POPUP: تفاصيل مكالمات الـ "Outbound Unanswered" لإيجنت معين - بيتفتح لما
// اليوزر يدوس على رقم الـ Outbound Unanswered في أي حتة ظاهر فيها (تقرير All
// agents، تقرير إيجنت واحد يوم/رينج، أو كارت My Day) - بيجيب من Code.gs
// (action=callLogDetail) كل مكالمة صادرة ماتردش عليها: رقم العميل، الوقت،
// ومدة الرنين بالثانية (waitSeconds بتاعت 3CX)
// ============================================================

// بيبني المودال مرة واحدة بس ويحطه في آخر الصفحة (زي نفس أسلوب ccpEnsureEditModal_)
function ccpEnsureCallDetailModal_() {
  if (document.getElementById("ccpCallDetailModal")) return;

  const modalHtml = `
    <div id="ccpCallDetailModal" class="modal-overlay" style="display:none; z-index: 10000;">
      <div class="modal-content" style="max-width: 950px; border-radius: 16px;">
        <div class="modal-header">
          <h3 id="ccpCallDetailTitle"><i class="fa-solid fa-phone-slash"></i> Outbound Unanswered</h3>
          <button type="button" class="close-modal-btn" onclick="ccpCloseCallDetailModal()">✕</button>
        </div>
        <div class="modal-body" id="ccpCallDetailBody" style="max-height: 65vh; overflow-y: auto;"></div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById("ccpCallDetailModal").addEventListener("click", (e) => {
    if (e.target.id === "ccpCallDetailModal") ccpCloseCallDetailModal();
  });
}

function ccpCloseCallDetailModal() {
  const modal = document.getElementById("ccpCallDetailModal");
  if (modal) modal.style.display = "none";
}

// mode="day" -> ccpShowOutboundUnansweredModal(agentName, "day", dateStr)
// mode="range" -> ccpShowOutboundUnansweredModal(agentName, "range", startDateStr, endDateStr)
async function ccpShowOutboundUnansweredModal(agentName, mode, dateOrStart, endDate) {
  ccpEnsureCallDetailModal_();

  const modal = document.getElementById("ccpCallDetailModal");
  const body = document.getElementById("ccpCallDetailBody");
  document.getElementById("ccpCallDetailTitle").innerHTML =
    `<i class="fa-solid fa-phone-slash"></i> Outbound Unanswered — ${agentName}`;
  body.innerHTML = `<div class="ccp-loading">Loading...</div>`;
  modal.style.display = "flex";

  const params = new URLSearchParams({
    action: "callLogDetail",
    name: agentName,
    direction: "Outbound",
    result: "Unanswered",
    token: localStorage.getItem("sessionToken") || "" // 🔐 لازم لـ doGet بعد إصلاح تسريب البيانات
  });
  if (mode === "day") {
    params.set("mode", "day");
    params.set("date", dateOrStart);
  } else {
    params.set("mode", "range");
    params.set("start", dateOrStart);
    params.set("end", endDate);
  }

  try {
    const res = await fetch(`${GOOGLE_SHEET_API_URL}?${params.toString()}`);
    const data = await res.json();

    if (!data || data.status !== "success") {
      body.innerHTML = `<div class="ccp-error">⚠️ ${data && data.message ? data.message : "Failed to load"}</div>`;
      return;
    }

    if (!data.calls || data.calls.length === 0) {
      body.innerHTML = `<div class="ccp-empty">No unanswered outbound calls in this period</div>`;
      return;
    }

    // بنعرض عمود "Reason" بس لو السبب "No route to destination" (يعني رقم غلط/معطل) -
    // أي سبب تاني بيتسيب فاضي عشان الجدول يفضل نضيف ومركز على الحالة دي بالذات
    const rowsHtml = data.calls.map(c => {
      const isNoRoute = /no route to destination/i.test(c.reason || "");
      return `
      <tr>
        <td>${c.date}</td>
        <td>${c.time ? c.time.slice(0, 8) : "--"}</td>
        <td>${c.customerNumber || "-"}</td>
        <td>${formatCcPulseDuration(c.waitSeconds)}</td>
        <td>${isNoRoute ? '<span style="color:#dc2626; font-weight:700;">No route to destination</span>' : "-"}</td>
      </tr>`;
    }).join("");

    body.innerHTML = `
      <div class="ccp-queue-trend-table-wrap">
        <table class="ccp-queue-trend-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Customer Number</th>
              <th>Rang For</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  } catch (err) {
    body.innerHTML = `<div class="ccp-error">⚠️ ${err}</div>`;
  }
}

// ============================================================
// 📞 POPUP: تفاصيل مكالمات "Abandoned" (اللي اتقفلت من غير رد) - على عكس
// ccpShowOutboundUnansweredModal دي على مستوى الكيو كله (كل الإيجنتس)، مش
// إيجنت بعينه - بتتفتح لما اليوزر يدوس على رقم "Abandoned" في Queue Overview.
// بتقرا نفس الفترة (يوم/رينج/شهر) المعروضة حاليًا في التقرير عن طريق
// buildCcPulseDateParams() - من Code.gs (action=queueCallDetail، دالة جديدة
// getQueueCallDetail_ مضافة في Code-7.gs، مش بتلمس أي حاجة موجودة)
// ============================================================
async function ccpShowQueueCallDetailModal() {
  ccpEnsureCallDetailModal_();

  const modal = document.getElementById("ccpCallDetailModal");
  const body = document.getElementById("ccpCallDetailBody");
  document.getElementById("ccpCallDetailTitle").innerHTML =
    `<i class="fa-solid fa-phone-slash"></i> Abandoned Calls`;
  body.innerHTML = `<div class="ccp-loading">Loading...</div>`;
  modal.style.display = "flex";

  const params = buildCcPulseDateParams();
  params.set("action", "queueCallDetail");
  params.set("direction", "Inbound");
  params.set("result", "Abandoned");

  try {
    const res = await fetch(`${GOOGLE_SHEET_API_URL}?${params.toString()}`);
    const data = await res.json();

    if (!data || data.status !== "success") {
      body.innerHTML = `<div class="ccp-error">⚠️ ${data && data.message ? data.message : "Failed to load"}</div>`;
      return;
    }

    if (!data.calls || data.calls.length === 0) {
      body.innerHTML = `<div class="ccp-empty">No abandoned calls in this period</div>`;
      return;
    }

    // 🔁 ملخص المتابعة فوق الجدول
    const fuCounts = { answered: 0, attempted: 0, none: 0 };
    data.calls.forEach(c => { const st = c.followUp ? c.followUp.status : "none"; fuCounts[st] = (fuCounts[st] || 0) + 1; });

    const rowsHtml = data.calls.map(c => `
      <tr>
        <td>${c.date}</td>
        <td>${c.time ? c.time.slice(0, 8) : "--"}</td>
        <td>${c.customerNumber || "-"}</td>
        <td>${c.queue || "-"}</td>
        <td>${formatCcPulseDuration(c.waitSeconds)}</td>
        <td style="text-align:left; white-space:normal;">${ccpAbandonFollowUpHtml_(c.followUp)}</td>
      </tr>`).join("");

    body.innerHTML = `
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
        <div class="ccp-metric-card"><div class="ccp-metric-label">Reached</div><div class="ccp-metric-value ccp-adh-good">${fuCounts.answered}</div></div>
        <div class="ccp-metric-card"><div class="ccp-metric-label">Not Reached</div><div class="ccp-metric-value ccp-adh-warn">${fuCounts.attempted}</div></div>
        <div class="ccp-metric-card"><div class="ccp-metric-label">No Calls After</div><div class="ccp-metric-value ccp-adh-bad">${fuCounts.none}</div></div>
      </div>
      <div class="ccp-queue-trend-table-wrap">
        <table class="ccp-queue-trend-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Customer Number</th>
              <th>Queue</th>
              <th>Waited</th>
              <th>After Abandon</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  } catch (err) {
    body.innerHTML = `<div class="ccp-error">⚠️ ${err}</div>`;
  }
}

// 🔁 بيبني خانة "Follow-up" لكل مكالمة Abandoned:
// العميل اتصل تاني؟ اترد عليه؟ ومين من الإيجنتس كلمه Outbound؟
function ccpAbandonFollowUpHtml_(fu) {
  if (!fu) return '<span style="color:#5a6a75">-</span>';

  const when = (ev) => {
    if (!ev) return "";
    const t = ev.time ? ev.time.slice(0, 5) : "";
    return ev.date ? `${ev.date.slice(5)} ${t}` : t;
  };
  // تايم لاين: كل مكالمة بعد الـ Abandoned بترتيبها الزمني (الباك إند بيرجعها مترتبة)
  const inb = fu.customerCalledAgain || { count: 0 };
  const outb = fu.weCalledBack || { count: 0 };
  const lines = (fu.events || []).map(ev => {
    const answered = ev.result === "Answered";
    const t = `<span style="color:#5a6a75">${when(ev)}</span>`;
    if (ev.direction === "Outbound") {
      return answered
        ? `📞 ${t} ${ev.agent || "?"} called — <b>answered</b> (talk ${formatCcPulseDuration(ev.talkSeconds)})`
        : `📞 ${t} ${ev.agent || "?"} called — no answer${ev.ringSeconds ? ` (rang ${formatCcPulseDuration(ev.ringSeconds)})` : ""}`;
    }
    return answered
      ? `📲 ${t} Customer called — <b>answered</b> by ${ev.agent || "?"} (talk ${formatCcPulseDuration(ev.talkSeconds)})`
      : `📲 ${t} Customer called — not answered (${ev.result || "-"})`;
  });

  // الحالة بتوضح مين عمل إيه: العميل اتصل تاني؟ ولا الإيجنت كلمه؟
  let badge;
  if (fu.status === "answered") {
    badge = '<span class="ccp-adh-good" style="font-weight:600">✅ Reached</span>';
  } else if (fu.status === "attempted") {
    const custTried = inb.count > 0, agentTried = outb.count > 0;
    const txt = custTried && agentTried
      ? "Customer called again &amp; agent called — no answer"
      : (custTried ? "Customer called again — not answered" : "Agent called — customer didn't answer");
    badge = `<span class="ccp-adh-warn" style="font-weight:600">⚠️ ${txt}</span>`;
  } else {
    badge = '<span class="ccp-adh-bad" style="font-weight:600">❌ No calls after</span>';
  }

  // أول 3 مكالمات بس ظاهرين، والباقي مخفي ورا زرار "+N more"
  const VISIBLE = 3;
  let listHtml = "";
  if (lines.length) {
    const shown = lines.slice(0, VISIBLE).join("<br>");
    const hidden = lines.slice(VISIBLE);
    const moreHtml = hidden.length
      ? `<div style="display:none;">${hidden.join("<br>")}</div>` +
        `<a href="javascript:void(0)" onclick="ccpToggleAbandonMore_(this)" data-count="${hidden.length}" style="font-weight:600; color:#2c6fbb; text-decoration:none;">+${hidden.length} more</a>`
      : "";
    listHtml = `<div style="font-size:12px; margin-top:3px; line-height:1.5;">${shown}${moreHtml}</div>`;
  }

  return `${badge}${listHtml}`;
}

// بيفتح/يقفل باقي المكالمات في خانة After Abandon
function ccpToggleAbandonMore_(link) {
  const box = link.previousElementSibling;
  const open = box.style.display === "none";
  box.style.display = open ? "block" : "none";
  link.textContent = open ? "Show less" : `+${link.dataset.count} more`;
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
    const workHtml = ccpShowsWorkMetrics_(data.agent) ? ccpWorkMetricsCardsHtml_(ccpComputeWorkMetricsForDays_(data.agent, data.days || [], callLogData && callLogData.agentsByDay, data.trackingStartDate)) : "";
    const callsHtml = (singleAgentDept === "Calls" || ccpIsQueueSupport_(data.agent))
      ? `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Calls Answered</div>
        <div class="ccp-metric-value">${callStats ? callStats.callsAnswered : 0}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">AHT</div>
        <div class="ccp-metric-value">${callStats ? formatCcPulseDuration(callStats.ahtSeconds) : "0s"}</div>
      </div>${ccpInboundTalkCardHtml_(callStats)}
`
      : "";
    const outboundReportHtml = `
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Outbound Calls</div>
        <div class="ccp-metric-value">${callStats ? callStats.outboundCallsCount : 0}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Outbound Answered</div>
        <div class="ccp-metric-value">${callStats ? callStats.outboundAnsweredCount : 0}</div>
      </div>
      <div class="ccp-metric-card">
        <div class="ccp-metric-label">Outbound Unanswered</div>
        <div class="ccp-metric-value" style="cursor:pointer; text-decoration:underline dotted;" title="Click to see each call" onclick="ccpShowOutboundUnansweredModal('${data.agent}', 'range', '${data.days[0].date}', '${data.days[data.days.length - 1].date}')">${callStats ? callStats.outboundUnansweredCount : 0}</div>
      </div>${ccpOutboundExtraCardsHtml_(callStats)}`;

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
      <div class="ccp-metrics-grid">${callsHtml}${workHtml}${outboundReportHtml}${totalsHtml}${tardyHtml}${periodAdherenceHtml}</div>
      ${daysHtml}`;
  }

  resultBox.innerHTML = `
    <div class="ccp-export-bar">
      <button type="button" class="ccp-export-btn" onclick="exportCcPulseReportToCsv()">📥 Export to CSV</button>
      <button type="button" class="ccp-export-btn" onclick="exportCcPulseReportToPdf()">🖨️ Export to PDF</button>
    </div>
    ${bodyHtml}
  `;

  const liveAgentMatch = ccPulseAgentsCache.find(x => x.name === data.agent);
  ccPulseLastExportAgentsList = [{ name: data.agent, number: liveAgentMatch ? liveAgentMatch.number : "-", days: data.days || [] }];
  ccPulseLastExportTrackingStartDate = data.trackingStartDate || null;
  ccPulseLastExportCallLogByDay = (callLogData && callLogData.agentsByDay) || null;

  attachCcPulseTimelineHover();
  attachCcPulseTimelineEditHandlers();
  attachCcPulseSessionListEditHandlers();
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
  myDayCardCurrentDate = targetDateStr; // عشان التحديث التلقائي (كل 20 ثانية) يفضل على نفس اليوم ده

  // شريط اختيار التاريخ - بيفضل ظاهر دايمًا (حتى لو مفيش بيانات لليوم المختار) عشان الإيجنت يقدر يرجع يختار يوم تاني
  const dateBarHtml = `
    <div class="ccp-myday-datebar" style="margin: 8px 0 16px; display:flex; align-items:center; gap:8px;">
      <label for="myDayDateInput" style="font-size:13px; color:#6b7280;">Date:</label>
      <input type="date" id="myDayDateInput" class="combo-input" style="max-width:170px;"
        value="${targetDateStr}" max="${todayStr}" onchange="loadMyDayCard(this.value)">
    </div>`;

  try {
    const ccpToken = localStorage.getItem("sessionToken") || ""; // 🔐 لازم لـ doGet بعد إصلاح تسريب البيانات
    const statusParams = new URLSearchParams({ action: "agentStatusReport", mode: "day", date: targetDateStr, name: agentName, token: ccpToken });
    const callsParams = new URLSearchParams({ action: "callLogReport", mode: "day", date: targetDateStr, name: agentName, token: ccpToken });

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
