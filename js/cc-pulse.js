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
let ccPulseMode = "day";
let ccPulseReportLiveBase = null; // بيتخزن فيه أرقام آخر تقرير عشان نعد عليها بالثانية زي العداد اللي فوق

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
  if (!grid) return;
  try {
    const res = await fetch(PYTHON_BACKEND_AGENT_STATUS_URL);
    const agents = await res.json();
    ccPulseAgentsCache = Array.isArray(agents) ? agents : [];
    renderCcPulseLiveGrid();
    populateCcPulseAgentSelect();
  } catch (e) {
    grid.innerHTML = `<div class="ccp-error">⚠️ Could not load live status</div>`;
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

function renderCcPulseLiveGrid() {
  const grid = document.getElementById("ccPulseLiveGrid");
  if (!grid) return;

  const nowSec = Date.now() / 1000;

  grid.innerHTML = ccPulseAgentsCache.map(a => {
    const isAway = a.status === "Away";
    const statusClass = isAway ? "ccp-status-away" : "ccp-status-active";
    let counterHtml = "";
    if (!isAway && a.sessionStartedAt) {
      const elapsed = nowSec - a.sessionStartedAt;
      counterHtml = `<div class="ccp-counter" data-session-start="${a.sessionStartedAt}">${formatCcPulseElapsed(elapsed)}</div>`;
    }

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
        <div class="ccp-status-badge ${statusClass}">${a.status}</div>
        ${counterHtml}
        ${callHtml}
      </div>`;
  }).join("");
}

function tickCcPulseCounters() {
  const nowSec = Date.now() / 1000;
  document.querySelectorAll("#ccPulseLiveGrid .ccp-counter").forEach(el => {
    const start = parseFloat(el.getAttribute("data-session-start"));
    if (!isNaN(start)) el.textContent = formatCcPulseElapsed(nowSec - start);
  });
  document.querySelectorAll("#ccPulseLiveGrid .ccp-call-badge").forEach(el => {
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
      const el = document.querySelector(`[data-agent-total="${liveAgent.name}"]`);
      if (el) el.textContent = formatCcPulseDuration(base + elapsed);
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

  // في التحديث التلقائي منعرضش "Loading..." تاني عشان الشاشة متريقش/تقفز، بس أول مرة بس
  if (!isAutoRefresh) {
    resultBox.innerHTML = `<div class="ccp-loading">Loading report...</div>`;
  }

  try {
    if (agentName === "__all__") {
      params.set("action", "allAgentsLoginTotals");
      const res = await fetch(`${GOOGLE_SHEET_API_URL}?${params.toString()}`);
      const data = await res.json();
      renderCcPulseAllAgentsReport(data);

      const uae = getUAECurrentDate();
      const todayStr = `${uae.year}-${uae.month}-${uae.day}`;
      const isTodayView = ccPulseMode === "day" && document.getElementById("ccpDayInput").value === todayStr;

      if (isTodayView && data && data.status === "success") {
        const perAgentSeconds = {};
        data.agents.forEach(a => { perAgentSeconds[a.name] = a.totalLoginSeconds || 0; });
        ccPulseReportLiveBase = {
          type: "all",
          fetchedAtMs: Date.now(),
          perAgentSeconds: perAgentSeconds
        };
      } else {
        ccPulseReportLiveBase = null;
      }
    } else {
      params.set("action", "agentStatusReport");
      params.set("name", agentName);
      const res = await fetch(`${GOOGLE_SHEET_API_URL}?${params.toString()}`);
      const data = await res.json();
      renderCcPulseSingleAgentReport(data);

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

function renderCcPulseAllAgentsReport(data) {
  const resultBox = document.getElementById("ccPulseReportResult");
  if (!data || data.status !== "success") {
    resultBox.innerHTML = `<div class="ccp-error">⚠️ ${data && data.message ? data.message : "No data"}</div>`;
    return;
  }
  const rows = data.agents.map(a => `
    <div class="ccp-total-row">
      <span class="ccp-total-name">${a.name}</span>
      <span class="ccp-total-ext">Ext ${a.number}</span>
      <span class="ccp-total-value" data-agent-total="${a.name}">${formatCcPulseDuration(a.totalLoginSeconds)}</span>
    </div>`).join("");
  resultBox.innerHTML = `<div class="ccp-total-list">${rows || '<div class="ccp-empty">No data for this period</div>'}</div>`;
}

function ccPulseTimeToMinutes(ts) {
  const timePart = ts.split(" ")[1] || "00:00:00";
  const p = timePart.split(":").map(Number);
  return p[0] * 60 + p[1] + (p[2] || 0) / 60;
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

// بيحسب نسبة الالتزام بالشيفت: من إجمالي وقت الشيفت المجدول، قد إيه اشتغل فعليًا (مش Away) جواه
// لو اليوم اللي بنقيّمه هو النهاردة، بيرجع "دلوقتي" بالدقايق؛ لو يوم فات، بيرجع null (يعني قيس على الشيفت كامل)
function getEffectiveShiftEndMin(dateStr) {
  const uae = getUAECurrentDate();
  const todayStr = `${uae.year}-${uae.month}-${uae.day}`;
  if (dateStr !== todayStr) return null;
  return uae.hour24 * 60 + uae.minute;
}

// بيحسب نسبة الالتزام بالشيفت: من الوقت اللي "المفروض يكون خلص لحد دلوقتي" (لو الشيفت لسه شغال)، قد إيه اشتغل فعليًا (مش Away) جواه
function calculateShiftAdherence(sessions, shiftWindow, effectiveEndMin) {
  if (!shiftWindow) return null; // مفيش شيفت متجدول أصلاً نقيس عليه

  // لو الشيفت لسه شغال (النهاردة ومخلصش لحد دلوقتي)، بنقيس بس على الجزء اللي المفروض يكون عداه من الشيفت
  const clampedEnd = (effectiveEndMin != null) ? Math.min(shiftWindow.endMin, effectiveEndMin) : shiftWindow.endMin;
  const shiftDurationMin = clampedEnd - shiftWindow.startMin;
  if (shiftDurationMin <= 0) return null; // الشيفت لسه ماوصلش معاده أصلاً

  let workedMinInShift = 0;
  sessions.forEach(s => {
    const startMin = ccPulseTimeToMinutes(s.start);
    const endMin = ccPulseTimeToMinutes(s.end);
    const overlapStart = Math.max(startMin, shiftWindow.startMin);
    const overlapEnd = Math.min(endMin, clampedEnd);
    if (overlapEnd > overlapStart) workedMinInShift += (overlapEnd - overlapStart);
  });

  const pct = (workedMinInShift / shiftDurationMin) * 100;
  return Math.max(0, Math.min(100, pct));
}

function renderCcPulseTimelineHtml(sessions, statusColors, shiftWindow = null) {
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
    const color = statusColors[s.status] || "#888787";
    const tooltipText = `${s.status}: ${ccPulseTimeOnly(s.start)} \u2192 ${ccPulseTimeOnly(s.end)} (${formatCcPulseDuration(s.durationSeconds)})`;
    return `<div class="ccp-tl-segment" style="left:${left}%;width:${width}%;background:${color};" data-tooltip="${tooltipText}"></div>`;
  }).join("");

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
    ? `<div class="ccp-tl-shift-legend"><span class="ccp-tl-shift-swatch"></span> Scheduled shift: ${shiftWindow.label}</div>`
    : "";

  return `
    <div class="ccp-timeline-wrap">
      ${legendHtml}
      <div class="ccp-timeline-bar">${shiftBandHtml}${segmentsHtml}</div>
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

function renderCcPulseSingleAgentReport(data) {
  const resultBox = document.getElementById("ccPulseReportResult");
  if (!data || data.status !== "success") {
    resultBox.innerHTML = `<div class="ccp-error">⚠️ ${data && data.message ? data.message : "No data"}</div>`;
    return;
  }

  const statusColors = { "Available": "#107c41", "Break": "#d97706", "Emails": "#1a252f", "Custom 1": "#6d28d9", "Custom 2": "#0369a1" };

  const totalsHtml = Object.keys(data.totals || {}).map(st => `
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">${st}</div>
      <div class="ccp-metric-value" data-status-metric="${st}">${formatCcPulseDuration(data.totals[st])}</div>
    </div>`).join("");

  let daysHtml = "";
  if (data.mode === "day" && data.days.length === 1) {
    const day = data.days[0];
    const shiftWindow = getShiftWindowForAgentDate(data.agent, day.date);
    const hasSessions = day.sessions.length > 0;

    let dayStatusBannerHtml = "";
    if (!hasSessions) {
      dayStatusBannerHtml = shiftWindow
        ? `<div class="ccp-daystatus-banner ccp-noshow">🚫 <strong>No Show</strong> — scheduled for ${shiftWindow.label} but no login recorded this day</div>`
        : `<div class="ccp-daystatus-banner ccp-dayoff">🏖️ <strong>Day Off</strong> — no shift scheduled for this agent on this date</div>`;
    }

    const adherencePct = calculateShiftAdherence(day.sessions, shiftWindow, getEffectiveShiftEndMin(day.date));
    const adherenceClass = adherencePct === null ? "" : (adherencePct >= 90 ? "ccp-adh-good" : (adherencePct >= 70 ? "ccp-adh-warn" : "ccp-adh-bad"));
    const adherenceCardHtml = adherencePct !== null ? `
        <div class="ccp-metric-card ${adherenceClass}">
          <div class="ccp-metric-label">Adherence</div>
          <div class="ccp-metric-value">${adherencePct.toFixed(0)}%</div>
        </div>` : "";

    daysHtml = `
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
      ${renderCcPulseTimelineHtml(day.sessions, statusColors, shiftWindow)}
      <div class="ccp-session-list">
        ${day.sessions.map(s => `
          <div class="ccp-session-row">
            <span class="ccp-dot" style="background:${statusColors[s.status] || '#888'}"></span>
            <span class="ccp-session-status">${s.status}</span>
            <span class="ccp-session-time">${ccPulseTimeOnly(s.start)} → ${ccPulseTimeOnly(s.end)}</span>
            <span class="ccp-session-dur">${formatCcPulseDuration(s.durationSeconds)}</span>
          </div>`).join("")}
      </div>`;
  } else {
    daysHtml = `
      <div class="ccp-days-table">
        ${data.days.map(day => `
          <div class="ccp-day-row">
            <span class="ccp-day-date">${day.date}</span>
            <span>${ccPulseTimeOnly(day.firstLogin)} → ${ccPulseTimeOnly(day.endShift)}</span>
            <span class="ccp-day-total">${formatCcPulseDuration(day.totalLoginSeconds)}</span>
          </div>`).join("")}
      </div>`;
  }

  resultBox.innerHTML = `
    <div class="ccp-metric-card ccp-total-highlight">
      <div class="ccp-metric-label">Total login time</div>
      <div class="ccp-metric-value" id="ccpTotalLoginValue">${formatCcPulseDuration(data.totalLoginSeconds)}</div>
    </div>
    <div class="ccp-metrics-grid">${totalsHtml}</div>
    ${daysHtml}
  `;

  attachCcPulseTimelineHover();
}
