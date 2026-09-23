// ============================================================
// ROSTER PAGE: time/roster, roster page, agent lookup, full monthly table
// Split from the original script.js on 2026-09-06
// ============================================================

// ============================================================
// 📅 TIME & ROSTER FUNCTIONS
// ============================================================
function getUAECurrentDate() {
  const now = new Date();
  const uaeTimeMs = now.getTime() + (4 * 60 * 60 * 1000);
  const uaeDate = new Date(uaeTimeMs);

  const uaeHours = uaeDate.getUTCHours();
  const period = uaeHours >= 12 ? "PM" : "AM";
  let hour12 = uaeHours % 12;
  if (hour12 === 0) hour12 = 12;

  return { 
    year: String(uaeDate.getUTCFullYear()), 
    month: String(uaeDate.getUTCMonth() + 1).padStart(2, '0'), 
    day: String(uaeDate.getUTCDate()).padStart(2, '0'), 
    hour: hour12, 
    hour24: uaeHours, 
    minute: uaeDate.getUTCMinutes(), 
    second: uaeDate.getUTCSeconds(), 
    period: period 
  };
}

let ccPulseHomeWidgetPollTimer = null;

function startGlobalLiveClock() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  const updateClock = () => {
    const uae = getUAECurrentDate();
    const secStr = String(uae.second).padStart(2, '0');
    const minStr = String(uae.minute).padStart(2, '0');
    const hrStr = String(uae.hour).padStart(2, '0');
    const clockText = `${hrStr}:${minStr}:${secStr} ${uae.period} (GST)`;
    const clockEl = document.getElementById("uaeClockText");
    if (clockEl) clockEl.innerText = clockText;
    const homeClockEl = document.getElementById("homeClockText");
    if (homeClockEl) homeClockEl.innerText = clockText;
    updateActiveSummary();
    if (typeof tickCcPulseCounters === "function") tickCcPulseCounters();
  };
  updateClock();
  liveClockInterval = setInterval(updateClock, 1000);

  // بيانات الحالة الحية لازم تتحدّث لكل المستخدمين (مش بس الأدمن في صفحة CC Pulse)
  // عشان ويدجت "Active On Shift Right Now" في الصفحة الرئيسية يفضل شغال
  if (ccPulseHomeWidgetPollTimer) clearInterval(ccPulseHomeWidgetPollTimer);
  fetchCcPulseLiveStatus();
  ccPulseHomeWidgetPollTimer = setInterval(fetchCcPulseLiveStatus, 10000);
}

function isShiftActiveNow(shiftCode) {
  const uae = getUAECurrentDate();
  const current24Hour = uae.hour24;
  if (shiftCode === "Shift 1" && current24Hour >= 9 && current24Hour < 17) return true;
  if (shiftCode === "Shift 2" && current24Hour >= 11 && current24Hour < 19) return true;
  if (shiftCode === "Shift 3" && current24Hour >= 13 && current24Hour < 21) return true;
  return false;
}

function updateDashboardLiveWidget() {
  const container = document.getElementById("homeActiveAgentsGrid");
  if (!container) return;

  // بنحفظ مكان السكرول الحالي لكل صندوق قبل ما نعيد بناء الـ HTML كله من الصفر
  // (الويدجت بيتبني تاني كل ثانية عشان العدادات تفضل تعد لايف)
  const savedScrollPositions = {};
  container.querySelectorAll(".hl-team-list[data-team]").forEach(el => {
    savedScrollPositions[el.getAttribute("data-team")] = el.scrollTop;
  });

  const uae = getUAECurrentDate();
  const monthNum = parseInt(uae.month, 10);
  const yearNum = parseInt(uae.year, 10);

  // اسم الإيجنت -> الفريق بتاعه من الروستر (لنفس الشهر الحالي)، لو موجود
  const rosterDeptByName = {};
  if (Array.isArray(rosterData)) {
    rosterData.forEach(agent => {
      const aMonth = parseInt(agent.month, 10);
      const aYear = parseInt(agent.year, 10);
      if (aMonth === monthNum && aYear === yearNum && agent && agent.name) {
        rosterDeptByName[agent.name] = agent.dept;
      }
    });
  }

  const nowSec = Date.now() / 1000;
  const elapsedSinceFetch = ccPulseAgentsCacheFetchedAtMs
    ? Math.max(0, (Date.now() - ccPulseAgentsCacheFetchedAtMs) / 1000)
    : 0;

  const dayNum = parseInt(uae.day, 10);
  const statusByName = {};
  (Array.isArray(ccPulseAgentsCache) ? ccPulseAgentsCache : []).forEach(a => {
    if (a && a.name) statusByName[a.name] = a.status;
  });

  const activeByTeam = { "Calls": [], "Call Outs": [], "Emails": [] };
  const missingAgents = []; // مجدول عليهم شيفت دلوقتي بس حالتهم الحية Away (أو مش معروفة)

  (Array.isArray(ccPulseAgentsCache) ? ccPulseAgentsCache : []).forEach(a => {
    if (!a || a.status === "Away") return; // أي حالة غير Away تعتبر "شغال دلوقتي"

    const roster_dept = rosterDeptByName[a.name];
    const team = (roster_dept && activeByTeam[roster_dept]) ? roster_dept : "Calls"; // مفيش روستر = يظهر في Calls

    // بنضيف على الأرقام الأساسية الوقت اللي عدى من آخر تحديث، عشان العداد يفضل يعد لايف
    // من غير ما نحتاج نعمل تحديث DOM منفصل (الويدجت كله بيتبني من جديد كل ثانية أصلاً)
    const adjusted = Object.assign({}, a, {
      todaysTotalSeconds: (a.todaysTotalSeconds || 0) + elapsedSinceFetch,
      todaysBreakSeconds: (a.status === "Break") ? (a.todaysBreakSeconds || 0) + elapsedSinceFetch : (a.todaysBreakSeconds || 0)
    });

    activeByTeam[team].push(adjusted);
  });

  if (Array.isArray(rosterData)) {
    rosterData.forEach(agent => {
      const aMonth = parseInt(agent.month, 10);
      const aYear = parseInt(agent.year, 10);
      if (aMonth !== monthNum || aYear !== yearNum || !agent || !agent.schedule) return;

      const shift = agent.schedule[dayNum];
      if (!shift || shift === "" || shift === "OFF+" || shift === "null") return;
      if (!isShiftActiveNow(shift)) return;

      const liveStatus = statusByName[agent.name];
      if (liveStatus === "Away" || liveStatus === undefined) {
        missingAgents.push({ name: agent.name, dept: agent.dept, shift: shift });
      }
    });
  }

  let html = "";
  const teams = ["Calls", "Call Outs", "Emails"];
  teams.forEach(teamName => {
    const agents = activeByTeam[teamName] || [];
    const agentsHtml = agents.length === 0
      ? `<span class="hl-none-text"><i class="fa-solid fa-moon"></i> No active agents</span>`
      : agents.map(a => ccPulseBuildAgentCardHtml(a, nowSec)).join('');

    html += `<div class="hl-team-box"><div class="hl-team-title"><div class="hl-tt-left"><i class="fa-solid ${teamName === 'Calls' ? 'fa-headset' : teamName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i><span>${teamName} Team</span></div><span class="hl-team-badge">${agents.length} Active</span></div><div class="hl-team-list" data-team="${teamName}">${agentsHtml}</div></div>`;
  });

  const missingHtml = missingAgents.length === 0
    ? `<span class="hl-none-text"><i class="fa-solid fa-circle-check"></i> No missing agents right now</span>`
    : missingAgents.map(m => `
        <div class="hl-agent-chip" style="border-color:#ef4444;">
          <span class="hl-chip-name">${m.name}</span>
          <span class="hl-chip-shift" style="color:#991b1b;">${m.shift} · <span class="ccp-blink-red">Away</span></span>
        </div>`).join('');

  html += `<div class="hl-team-box" style="border-color:#ef4444;">
      <div class="hl-team-title">
        <div class="hl-tt-left"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i><span>Out Of Adherence</span></div>
        <span class="hl-team-badge" style="background:#fef2f2;color:#991b1b;">${missingAgents.length} Out</span>
      </div>
      <div class="hl-team-list" data-team="OutOfAdherence">${missingHtml}</div>
    </div>`;

  container.innerHTML = html;

  // نرجّع كل صندوق لمكان السكرول القديم بتاعه بعد إعادة البناء
  container.querySelectorAll(".hl-team-list[data-team]").forEach(el => {
    const saved = savedScrollPositions[el.getAttribute("data-team")];
    if (saved) el.scrollTop = saved;
  });
}

// ============================================================
// 📅 ROSTER PAGE FUNCTIONS
// ============================================================
function initRosterPage() {
  const dateInput = document.getElementById("rosterDateInput");
  const uaeNow = getUAECurrentDate();
  if (dateInput && !dateInput.value) {
    dateInput.value = `${uaeNow.year}-${uaeNow.month}-${uaeNow.day}`;
  }
  
  switchRosterTab('live-view');
  
  populateAgentDropdown();
  renderRosterView();
  renderFullMonthlyTable();
}

function switchRosterTab(tabKey) {
  const tabs = {
    'live-view': { content: 'tab-live-view', btn: 'tabLiveBtn' },
    'agent-view': { content: 'tab-agent-view', btn: 'tabAgentBtn' },
    'full-sheet-view': { content: 'tab-full-sheet-view', btn: 'tabFullBtn' },
    'swap-view': { content: 'tab-swap-view', btn: 'tabSwapBtn' }
  };

  Object.keys(tabs).forEach(key => {
    const contentEl = document.getElementById(tabs[key].content);
    const btnEl = document.getElementById(tabs[key].btn);
    if (contentEl) {
      contentEl.classList.add("hidden-tab");
      contentEl.style.display = "none";
    }
    if (btnEl) btnEl.classList.remove("active");
  });

  const selected = tabs[tabKey];
  if (selected) {
    const targetContent = document.getElementById(selected.content);
    const targetBtn = document.getElementById(selected.btn);
    if (targetContent) {
      targetContent.classList.remove("hidden-tab");
      targetContent.style.display = "block";
    }
    if (targetBtn) targetBtn.classList.add("active");
  }

  if (tabKey === 'swap-view' && typeof initSwapTab === "function") initSwapTab();
  if (typeof swapUpdateBadges === "function") swapUpdateBadges();
}

function resetRosterToToday() {
  const dateInput = document.getElementById("rosterDateInput");
  const uae = getUAECurrentDate();
  if (dateInput) {
    dateInput.value = `${uae.year}-${uae.month}-${uae.day}`;
    renderRosterView();
    renderFullMonthlyTable();
  }
}

function renderRosterView() {
  const dateInput = document.getElementById("rosterDateInput");
  if (!dateInput || !dateInput.value) return;
  const [selectedYear, selectedMonth, selectedDay] = dateInput.value.split("-");
  const dayNum = parseInt(selectedDay, 10);
  const monthNum = parseInt(selectedMonth, 10);
  const yearNum = parseInt(selectedYear, 10);

  const container = document.getElementById("rosterDeptContainer");
  if (!container) return;
  container.innerHTML = "";
  const depts = ["Calls", "Call Outs", "Emails"];

  depts.forEach(deptName => {
    const deptAgents = Array.isArray(rosterData) ? rosterData.filter(a => {
      const aMonth = parseInt(a.month, 10);
      const aYear = parseInt(a.year, 10);
      return a.dept === deptName && aMonth === monthNum && aYear === yearNum;
    }) : [];

    const hasAnyScheduleData = deptAgents.some(agent => {
      const shift = agent.schedule ? agent.schedule[dayNum] : "";
      return shift && String(shift).trim() !== "" && String(shift).trim() !== "null";
    });

    const card = document.createElement("div");
    card.className = "dept-roster-card";
    let rowsHTML = "";

    if (deptAgents.length === 0 || !hasAnyScheduleData) {
      rowsHTML = `<div style="padding: 20px; text-align: center; color: #94a3b8; font-weight: 600; font-size: 13px;">
        <i class="fa-solid fa-calendar-xmark" style="font-size: 18px; margin-bottom: 6px; display: block; color: #cbd5e1;"></i>
        No schedule posted for Day ${dayNum} yet
      </div>`;
    } else {
      deptAgents.forEach(agent => {
        const shift = (agent.schedule && agent.schedule[dayNum]) ? agent.schedule[dayNum] : "";
        
        if (!shift || String(shift).trim() === "" || String(shift).trim() === "null") return;

        const isActive = isShiftActiveNow(shift);
        let shiftBadgeClass = "shift-off-badge";
        let shiftIcon = `<i class="fa-solid fa-mug-hot"></i>`;
        if (shift === "Shift 1") { shiftBadgeClass = "shift1-badge"; shiftIcon = `<i class="fa-solid fa-sun"></i>`; }
        else if (shift === "Shift 2") { shiftBadgeClass = "shift2-badge"; shiftIcon = `<i class="fa-solid fa-cloud-sun"></i>`; }
        else if (shift === "Shift 3") { shiftBadgeClass = "shift3-badge"; shiftIcon = `<i class="fa-solid fa-moon"></i>`; }
        
        let livePulseHTML = isActive ? `<span class="live-active-tag"><i class="fa-solid fa-circle"></i> ON DUTY</span>` : ``;
        rowsHTML += `<div class="roster-agent-row ${isActive ? 'highlight-active-agent' : ''}"><div class="agent-profile"><span class="lang-pill ${(agent.lang || 'Ara').toLowerCase()}">${agent.lang || 'Ara'}</span><span class="agent-name">${agent.name}</span></div><div class="agent-status-wrapper">${livePulseHTML}<span class="shift-badge ${shiftBadgeClass}">${shiftIcon} ${shift}</span></div></div>`;
      });
    }

    card.innerHTML = `<div class="dept-card-header"><i class="fa-solid ${deptName === 'Calls' ? 'fa-headset' : deptName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i><h3>${deptName} Team</h3><span class="dept-count">${deptAgents.length} Agents</span></div><div class="dept-agent-list">${rowsHTML}</div>`;
    container.appendChild(card);
  });
  updateActiveSummary();
}

function updateActiveSummary() {
  const dateInput = document.getElementById("rosterDateInput");
  const summaryContainer = document.getElementById("activeAgentsSummary");
  const summaryTitle = document.getElementById("activeSummaryTitle");
  if (!dateInput || !summaryContainer) return;
  
  const [selectedYear, selectedMonth, selectedDay] = dateInput.value.split("-");
  const dayNum = parseInt(selectedDay, 10);
  const monthNum = parseInt(selectedMonth, 10);
  const yearNum = parseInt(selectedYear, 10);

  const uae = getUAECurrentDate();
  const isTodaySelected = (monthNum === parseInt(uae.month, 10) && dayNum === parseInt(uae.day, 10) && yearNum === parseInt(uae.year, 10));
  
  if (summaryTitle) {
    summaryTitle.innerText = isTodaySelected ? "Active On Shift Right Now (UAE Time)" : `Scheduled Duty Roster for Day ${dayNum}`;
  }
  
  let activeAgentsList = [];
  if (Array.isArray(rosterData)) {
    rosterData.forEach(agent => {
      const aMonth = parseInt(agent.month, 10);
      const aYear = parseInt(agent.year, 10);

      if (aMonth === monthNum && aYear === yearNum && agent && agent.schedule) {
        const shift = agent.schedule[dayNum];
        if (shift && shift !== "" && shift !== "OFF+" && shift !== "null") {
          if (isTodaySelected ? isShiftActiveNow(shift) : true) {
            activeAgentsList.push({ name: agent.name, dept: agent.dept, shift: shift, lang: agent.lang });
          }
        }
      }
    });
  }
  summaryContainer.innerHTML = activeAgentsList.length === 0 ? `<span class="no-active-msg"><i class="fa-solid fa-bed"></i> No agents active on shift at this time.</span>` : activeAgentsList.map(item => `<div class="active-agent-pill"><span class="pill-dept">${item.dept} Team</span><span class="pill-name">${item.name}</span><span class="pill-shift">${item.shift}</span></div>`).join('');
}

// ============================================================
// 👤 AGENT INDIVIDUAL LOOKUP
// ============================================================
function populateAgentDropdown() {
  const dropdown = document.getElementById("agentDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = `<option value="">-- Select Agent Name --</option>`;
  if (!Array.isArray(rosterData)) return;

  const uniqueAgentNames = [];
  rosterData.forEach(agent => {
    if (!uniqueAgentNames.includes(agent.name)) {
      uniqueAgentNames.push(agent.name);
    }
  });

  uniqueAgentNames.sort().forEach(name => {
    let opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    dropdown.appendChild(opt);
  });
}

function clearAgentDateFilter() {
  const filterDateInput = document.getElementById("agentDateFilter");
  if (filterDateInput) {
    filterDateInput.value = "";
  }
  renderAgentLookup();
}

function renderAgentLookup() {
  const dropdown = document.getElementById("agentDropdown");
  const monthSelect = document.getElementById("agentMonthSelect");
  const filterDateInput = document.getElementById("agentDateFilter");
  const container = document.getElementById("agentResultContainer");
  if (!dropdown || !container) return;
  
  const agentName = dropdown.value;
  if (!agentName) {
    container.innerHTML = `<div class="no-sched-results"><i class="fa-solid fa-hand-pointer"></i><p>Please select an agent name above to view their schedule.</p></div>`;
    return;
  }

  let targetMonth = 9;
  let targetYear = 2026;

  if (monthSelect && monthSelect.value) {
    const [m, y] = monthSelect.value.split("-");
    targetMonth = parseInt(m, 10);
    targetYear = parseInt(y, 10);
  }

  let selectedDay = null;
  if (filterDateInput && filterDateInput.value) {
    const parts = filterDateInput.value.split("-");
    const filterYr = parseInt(parts[0], 10);
    const filterMo = parseInt(parts[1], 10);
    
    if (filterYr === targetYear && filterMo === targetMonth) {
      selectedDay = parseInt(parts[2], 10);
    }
  }

  const agent = rosterData.find(a => a.name === agentName && parseInt(a.month, 10) === targetMonth && parseInt(a.year, 10) === targetYear);

  if (!agent) {
    container.innerHTML = `<div class="no-sched-results"><i class="fa-solid fa-circle-exclamation"></i><p>No schedule records found for ${agentName} in ${targetMonth}/${targetYear}.</p></div>`;
    return;
  }

  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

  let cardsHTML = "";
  for (let day = 1; day <= daysInMonth; day++) {
    if (selectedDay !== null && day !== selectedDay) continue;

    const shift = (agent.schedule && agent.schedule[day]) ? agent.schedule[day] : "";
    if (!shift || shift === "" || shift === "null") continue;

    const dayName = getDayNameShort(day, targetMonth, targetYear);
    let cardClass = "shift-off-card";
    let icon = `<i class="fa-solid fa-bed"></i>`;
    if (shift === "Shift 1") { cardClass = "shift1-card"; icon = `<i class="fa-solid fa-sun"></i>`; }
    else if (shift === "Shift 2") { cardClass = "shift2-card"; icon = `<i class="fa-solid fa-cloud-sun"></i>`; }
    else if (shift === "Shift 3") { cardClass = "shift3-card"; icon = `<i class="fa-solid fa-moon"></i>`; }
    
    cardsHTML += `<div class="agent-day-card ${cardClass}"><div class="adc-day-number">Day ${day} (${dayName})</div><div class="adc-shift-type">${icon} ${shift}</div></div>`;
  }

  if (cardsHTML === "") {
    cardsHTML = `<div style="grid-column: 1/-1; padding: 30px; text-align: center; color: #94a3b8; font-weight: 600;">
      <i class="fa-solid fa-calendar-xmark" style="font-size: 24px; margin-bottom: 8px; display: block; color: #cbd5e1;"></i>
      No schedule published for this agent in the selected period.
    </div>`;
  }

  container.innerHTML = `<div class="agent-info-banner"><div class="aip-left"><span class="lang-pill ${(agent.lang || 'Ara').toLowerCase()}">${agent.lang || 'Ara'}</span><h2>${agent.name}</h2><span class="team-tag"><i class="fa-solid fa-users"></i> ${agent.dept} Team</span></div><div class="aip-right"><span class="month-label">Monthly Schedule (${targetMonth}/${targetYear})</span></div></div><div class="agent-days-grid">${cardsHTML}</div>`;
}

// ============================================================
// 📊 FULL MONTHLY TABLE
// ============================================================
function renderFullMonthlyTable() {
  const table = document.getElementById("monthlyRosterTable");
  const monthSelect = document.getElementById("fullRosterMonthSelect");
  const dateInput = document.getElementById("rosterDateInput");
  if (!table) return;

  const uae = getUAECurrentDate();
  let monthNum = parseInt(uae.month, 10);
  let yearNum = parseInt(uae.year, 10);

  if (monthSelect && monthSelect.value) {
    const [m, y] = monthSelect.value.split("-");
    monthNum = parseInt(m, 10);
    yearNum = parseInt(y, 10);
  } 
  else if (dateInput && dateInput.value) {
    const parts = dateInput.value.split("-");
    yearNum = parseInt(parts[0], 10);
    monthNum = parseInt(parts[1], 10);
  }

  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  let headerHTML = `<thead><tr><th class="sticky-col first-col">Team</th><th class="sticky-col second-col">Agent Name</th>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayName = getDayNameShort(d, monthNum, yearNum);
    headerHTML += `<th>Day ${d}<br><span style="font-size: 9px; opacity: 0.8;">${dayName}</span></th>`;
  }
  headerHTML += `</tr></thead>`;
  let bodyHTML = `<tbody>`;
  const depts = ["Calls", "Call Outs", "Emails"];

  depts.forEach(deptName => {
    const teamAgents = Array.isArray(rosterData) ? rosterData.filter(a => {
      const aMonth = parseInt(a.month, 10);
      const aYear = parseInt(a.year, 10);
      return a.dept === deptName && aMonth === monthNum && aYear === yearNum;
    }) : [];

    teamAgents.forEach((agent, idx) => {
      bodyHTML += `<tr>`;
      if (idx === 0) {
        bodyHTML += `<td rowspan="${teamAgents.length}" class="sticky-col first-col dept-cell">${deptName} Team</td>`;
      }
      bodyHTML += `<td class="sticky-col second-col name-cell"><strong>${agent.name}</strong> <span class="lang-mini">${agent.lang || 'Ara'}</span></td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const shift = (agent.schedule && agent.schedule[d]) ? agent.schedule[d] : "";
        let cellClass = "cell-off";
        let displayVal = shift;

        if (!shift || String(shift).trim() === "" || String(shift).trim() === "null") {
          cellClass = "";
          displayVal = "-";
        } else if (shift === "Shift 1") cellClass = "cell-shift1";
        else if (shift === "Shift 2") cellClass = "cell-shift2";
        else if (shift === "Shift 3") cellClass = "cell-shift3";

        bodyHTML += `<td class="${cellClass}">${displayVal}</td>`;
      }
      bodyHTML += `</tr>`;
    });
  });
  bodyHTML += `</tbody>`;
  table.innerHTML = headerHTML + bodyHTML;
}

// ============================================================
// 🔄 SHIFT SWAP - تبديل شيفت بشيفت في نفس اليوم (مفيش Day Off Swap)
// ============================================================
// الإيجنت (أ) يبعت طلب لإيجنت (ب) -> (ب) يوافق أو يرفض -> لو وافق الشيفتين بيتبدلوا
// في شيت الروستر تلقائي (من Swap.gs في Google Apps Script) وبيتبعت إيميل للمديرين.
// الحد الأقصى للطلب/الموافقة: قبل بداية أقرب شيفت من الاتنين بساعتين (السيرفر هو اللي بيفرضه،
// والفرونت بس بيعرضه للمستخدم عشان يعرف).
const SWAP_SHIFT_START_HOUR = { "Shift 1": 9, "Shift 2": 11, "Shift 3": 13 };
const SWAP_SHIFT_LABELS = { "Shift 1": "9 AM – 5 PM", "Shift 2": "11 AM – 7 PM", "Shift 3": "1 PM – 9 PM" };
const SWAP_CUTOFF_HOURS = 2;

let swapState = { requests: [], me: "", isAdmin: false, busy: false, loaded: false };
let swapLastSignal = null;

function swapEsc(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function swapPad(n) {
  return (n < 10 ? "0" : "") + n;
}

// "yyyy-MM-dd HH:mm:ss" بتوقيت الإمارات - نفس صيغة الديدلاين اللي بيرجعها السيرفر (مقارنة نصية مباشرة)
function swapNowUaeString() {
  const u = getUAECurrentDate();
  return `${u.year}-${u.month}-${u.day} ${swapPad(u.hour24)}:${swapPad(u.minute)}:${swapPad(u.second)}`;
}

function swapTodayUaeString() {
  const u = getUAECurrentDate();
  return `${u.year}-${u.month}-${u.day}`;
}

function swapDeadlineString(dateStr, shiftA, shiftB) {
  const hour = Math.min(SWAP_SHIFT_START_HOUR[shiftA], SWAP_SHIFT_START_HOUR[shiftB]) - SWAP_CUTOFF_HOURS;
  return `${dateStr} ${swapPad(hour)}:00:00`;
}

function swapDeadlineNice(deadlineStr) {
  // "2026-09-21 07:00:00" -> "07:00 AM on 2026-09-21"
  const parts = String(deadlineStr).split(" ");
  if (parts.length < 2) return deadlineStr;
  const hm = parts[1].split(":");
  let h = parseInt(hm[0], 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return `${swapPad(h)}:${hm[1]} ${period} on ${parts[0]}`;
}

function swapMyName() {
  return swapState.me || localStorage.getItem("userFullName") || localStorage.getItem("loggedInUser") || "";
}

// شيفت إيجنت (بالاسم) في تاريخ معين "yyyy-MM-dd" من rosterData - أو null لو مش موجود في الروستر للشهر ده
function swapGetShift(name, dateStr) {
  if (!Array.isArray(rosterData) || !name || !dateStr) return null;
  const p = dateStr.split("-").map(Number);
  const wanted = String(name).trim().toLowerCase();
  const entry = rosterData.find(a => String(a.name).trim().toLowerCase() === wanted && a.month === p[1] && a.year === p[0]);
  if (!entry) return null;
  return String((entry.schedule && entry.schedule[p[2]]) || "").trim();
}

// تيم الإيجنت (Calls / Call Outs / Emails) في شهر التاريخ ده - أو "" لو مش موجود
function swapGetDept(name, dateStr) {
  if (!Array.isArray(rosterData) || !name || !dateStr) return "";
  const p = dateStr.split("-").map(Number);
  const wanted = String(name).trim().toLowerCase();
  const entry = rosterData.find(a => String(a.name).trim().toLowerCase() === wanted && a.month === p[1] && a.year === p[0]);
  return entry ? String(entry.dept || "").trim() : "";
}

function swapNormDept(d) {
  return String(d || "").trim().toLowerCase();
}

function swapGetToken() {
  return localStorage.getItem("sessionToken") || "";
}

function swapFetchRequests() {
  const token = swapGetToken();
  if (!token) return Promise.reject(new Error("Not logged in"));
  const url = GOOGLE_SHEET_API_URL + "?action=swapRequests&t=" + Date.now() + "&token=" + encodeURIComponent(token);
  return fetch(url, { method: "GET", redirect: "follow" })
    .then(r => r.json())
    .then(res => {
      if (!res || res.status !== "success") throw new Error((res && res.message) || "Failed to load swap requests");
      swapState.requests = Array.isArray(res.requests) ? res.requests : [];
      swapState.me = res.me || swapState.me;
      swapState.isAdmin = !!res.isAdmin;
      swapState.loaded = true;
      swapUpdateBadges();
      return res;
    });
}

function swapPost(payload) {
  return fetch(GOOGLE_SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ token: swapGetToken() }, payload))
  }).then(r => r.json());
}

function swapIncomingCount() {
  return swapState.requests.filter(r => r.canApprove).length;
}

// بادج على تاب الـ Swap + فقاعة عايمة في أي صفحة لما يكون فيه طلب مستني ردي
function swapUpdateBadges() {
  const n = swapIncomingCount();

  const badge = document.getElementById("swapTabBadge");
  if (badge) {
    badge.textContent = String(n);
    badge.style.display = n > 0 ? "inline-block" : "none";
  }

  let pill = document.getElementById("swapNotifyPill");
  const loggedIn = !!localStorage.getItem("loggedInUser");
  const swapTab = document.getElementById("tab-swap-view");
  const rosterPage = document.getElementById("roster-page");
  const alreadyLookingAtIt = !!(swapTab && swapTab.style.display === "block" && rosterPage && rosterPage.classList.contains("active-page"));

  if (n > 0 && loggedIn && !alreadyLookingAtIt) {
    if (!pill) {
      pill = document.createElement("button");
      pill.id = "swapNotifyPill";
      pill.className = "swap-notify-pill";
      pill.onclick = openSwapFromNotification;
      document.body.appendChild(pill);
    }
    pill.innerHTML = `<i class="fa-solid fa-right-left"></i> ${n} shift swap request${n > 1 ? "s" : ""} waiting for you`;
    pill.style.display = "block";
  } else if (pill) {
    pill.style.display = "none";
  }
}

function openSwapFromNotification() {
  navigateTo("roster-page");
  switchRosterTab("swap-view");
}

// 🔔 مفيش Polling مخصوص للسواب: auth.js بيسأل السيرفر كل 15 ثانية أصلاً (checkForceLogout) والرد فيه
// swapChangedAt - لو اتغيرت عن آخر مرة نسحب قايمة الطلبات (طلب جديد لينا / رد على طلبنا)، غير كده مفيش أي طلب زيادة
function swapOnServerSignal(value) {
  if (!localStorage.getItem("loggedInUser") || !swapGetToken()) {
    swapLastSignal = null; // أول إشارة بعد اللوجن هتسحب القايمة
    if (swapState.requests.length) { swapState.requests = []; swapUpdateBadges(); }
    return;
  }

  const v = String(value === undefined || value === null ? "0" : value);
  if (v === swapLastSignal) return;

  const isFirstSignal = (swapLastSignal === null);
  swapLastSignal = v;
  if (isFirstSignal && v === "0") return; // مفيش ولا طلب سواب اتعمل على السيرفر أصلاً

  swapFetchRequests().then(() => {
    const tab = document.getElementById("tab-swap-view");
    if (tab && tab.style.display === "block") { swapUpdateForm(); swapRenderLists(); }
  }).catch(() => { /* هدوء - أي فشل مؤقت في الشبكة هيتعاد مع الإشارة الجاية */ });
}

// بيتنادى أول ما التاب يتفتح (من switchRosterTab)
function initSwapTab() {
  const dateEl = document.getElementById("swapDateInput");
  if (dateEl) {
    const today = swapTodayUaeString();
    dateEl.min = today;
    if (!dateEl.value || dateEl.value < today) dateEl.value = today;
  }
  swapShowMsg("", "");
  swapUpdateForm();
  swapRenderLists();
  swapFetchRequests()
    .then(() => { swapUpdateForm(); swapRenderLists(); })
    .catch(err => swapShowListError(err.message));
}

function swapShowMsg(text, kind) {
  const el = document.getElementById("swapFormMsg");
  if (!el) return;
  el.textContent = text || "";
  el.className = "swap-msg" + (kind ? " swap-msg-" + kind : "");
  el.style.display = text ? "block" : "none";
}

function swapShowListError(text) {
  const el = document.getElementById("swapListsContainer");
  if (el && !swapState.loaded) {
    el.innerHTML = `<div class="swap-empty"><i class="fa-solid fa-triangle-exclamation"></i> ${swapEsc(text)}</div>`;
  }
}

// بيبني قايمة "Swap with" حسب اليوم المختار وشيفتي أنا فيه
function swapUpdateForm() {
  const dateEl = document.getElementById("swapDateInput");
  const sel = document.getElementById("swapTargetSelect");
  const info = document.getElementById("swapFormInfo");
  const btn = document.getElementById("swapSendBtn");
  if (!dateEl || !sel || !info || !btn) return;

  const dateStr = dateEl.value;
  const me = swapMyName();
  const previouslySelected = sel.value;

  sel.innerHTML = `<option value="">-- Choose agent --</option>`;
  btn.disabled = true;

  if (!dateStr) {
    info.innerHTML = `Pick a date first.`;
    return;
  }

  const myShift = swapGetShift(me, dateStr);
  if (myShift === null) {
    info.innerHTML = `<i class="fa-solid fa-circle-info"></i> Your name (<b>${swapEsc(me)}</b>) was not found in the roster for this month.`;
    return;
  }
  if (!SWAP_SHIFT_START_HOUR[myShift]) {
    info.innerHTML = `<i class="fa-solid fa-circle-info"></i> You don't have a shift on <b>${swapEsc(dateStr)}</b>. Only Shift&nbsp;1/2/3 can be swapped (Day Off swaps aren't allowed).`;
    return;
  }

  const p = dateStr.split("-").map(Number);
  const myDept = swapGetDept(me, dateStr);
  // السواب جوه نفس التيم بس (Calls مع Calls / Call Outs مع Call Outs / Emails مع Emails)
  // اللي على نفس شيفتي بيظهروا في القايمة بس مقفولين (Same shift) عشان محدش يفتكرهم ناقصين
  const candidates = [];
  (Array.isArray(rosterData) ? rosterData : []).forEach(a => {
    if (a.month !== p[1] || a.year !== p[0]) return;
    if (String(a.name).trim().toLowerCase() === me.trim().toLowerCase()) return;
    if (swapNormDept(a.dept) !== swapNormDept(myDept)) return;
    const shift = String((a.schedule && a.schedule[p[2]]) || "").trim();
    if (!SWAP_SHIFT_START_HOUR[shift]) return;
    candidates.push({ name: a.name, shift: shift, dept: a.dept, same: shift === myShift });
  });
  // اللي ينفع يتبدل معاهم الأول، وبعدهم اللي على نفس الشيفت
  candidates.sort((x, y) => (x.same - y.same) || x.name.localeCompare(y.name));

  candidates.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.dataset.shift = c.shift;
    if (c.same) {
      opt.disabled = true;
      opt.textContent = `${c.name} — ${c.shift} (Same shift)`;
    } else {
      opt.textContent = `${c.name} — ${c.shift} (${c.dept})`;
    }
    sel.appendChild(opt);
  });
  if (previouslySelected && candidates.some(c => !c.same && c.name === previouslySelected)) sel.value = previouslySelected;

  if (!candidates.some(c => !c.same)) {
    info.innerHTML = `Your shift on <b>${swapEsc(dateStr)}</b>: <b>${swapEsc(myShift)}</b> (${SWAP_SHIFT_LABELS[myShift]}). Nobody in the <b>${swapEsc(myDept || "")}</b> team has a different shift that day to swap with.`;
    return;
  }

  swapUpdateDeadlineInfo();
}

// بيوضح الديدلاين حسب الإيجنت المختار، ويقفل الزرار لو الوقت عدّى
function swapUpdateDeadlineInfo() {
  const dateEl = document.getElementById("swapDateInput");
  const sel = document.getElementById("swapTargetSelect");
  const info = document.getElementById("swapFormInfo");
  const btn = document.getElementById("swapSendBtn");
  if (!dateEl || !sel || !info || !btn) return;

  const dateStr = dateEl.value;
  const myShift = swapGetShift(swapMyName(), dateStr);
  if (!SWAP_SHIFT_START_HOUR[myShift]) return;

  const base = `Your shift on <b>${swapEsc(dateStr)}</b>: <b>${swapEsc(myShift)}</b> (${SWAP_SHIFT_LABELS[myShift]}).`;
  const opt = sel.options[sel.selectedIndex];
  const targetShift = opt && opt.dataset ? opt.dataset.shift : "";

  if (!sel.value || !targetShift) {
    info.innerHTML = base + ` Choose who you want to swap with.`;
    btn.disabled = true;
    return;
  }

  const deadline = swapDeadlineString(dateStr, myShift, targetShift);
  const tooLate = swapNowUaeString() >= deadline;
  info.innerHTML = base +
    ` You'd take <b>${swapEsc(targetShift)}</b> (${SWAP_SHIFT_LABELS[targetShift]}) and <b>${swapEsc(sel.value)}</b> takes <b>${swapEsc(myShift)}</b>.<br>` +
    (tooLate
      ? `<span class="swap-late"><i class="fa-solid fa-ban"></i> Too late — swaps must be requested ${SWAP_CUTOFF_HOURS} hours before the earlier shift starts (deadline was ${swapEsc(swapDeadlineNice(deadline))}).</span>`
      : `<i class="fa-regular fa-clock"></i> Both of you must finish this swap before <b>${swapEsc(swapDeadlineNice(deadline))}</b> (UAE time).`);
  btn.disabled = tooLate;
}

async function swapSendRequest() {
  if (swapState.busy) return;
  const dateEl = document.getElementById("swapDateInput");
  const sel = document.getElementById("swapTargetSelect");
  const btn = document.getElementById("swapSendBtn");
  if (!dateEl || !sel || !dateEl.value || !sel.value) {
    swapShowMsg("Please choose a date and an agent.", "error");
    return;
  }

  swapState.busy = true;
  btn.disabled = true;
  swapShowMsg("Sending request...", "info");
  try {
    const res = await swapPost({ action: "requestSwap", date: dateEl.value, target: sel.value });
    if (res && res.status === "success") {
      swapShowMsg("✅ " + (res.message || "Request sent"), "ok");
      sel.value = "";
      await swapFetchRequests();
      swapRenderLists();
    } else {
      swapShowMsg("⚠️ " + ((res && res.message) || "Failed to send request"), "error");
    }
  } catch (err) {
    swapShowMsg("⚠️ Network error - please try again.", "error");
  } finally {
    swapState.busy = false;
    swapUpdateForm();
    swapRenderLists(); // بعد ما الـ busy يتصفّر - عشان أزرار الكروت ماتفضلش معطّلة
  }
}

async function swapRespond(id, decision) {
  if (swapState.busy) return;
  const req = swapState.requests.find(r => r.id === id);
  if (!req) return;

  if (decision === "approve") {
    const me = swapMyName();
    const iGiveUp = (req.target.toLowerCase() === me.toLowerCase()) ? req.targetShift : req.requesterShift;
    const iTake = (req.target.toLowerCase() === me.toLowerCase()) ? req.requesterShift : req.targetShift;
    if (!confirm(`Approve this swap?\n\nOn ${req.date} you'll work ${iTake} instead of ${iGiveUp}.\nThe roster will be updated right away and the managers will be notified by email.`)) return;
  } else if (decision === "cancel") {
    if (!confirm("Cancel this swap request?")) return;
  }

  swapState.busy = true;
  swapRenderLists();
  try {
    const res = await swapPost({ action: "respondSwap", id: id, decision: decision });
    if (res && res.status === "success") {
      if (decision === "approve") {
        await fetchAllDataFromGoogleSheet(); // الروستر اتغير - نسحب النسخة الجديدة فورًا
      }
      await swapFetchRequests();
      swapState.busy = false;
      swapRenderLists();
      swapUpdateForm();
      let msg = "✅ " + (res.message || "Done");
      if (decision === "approve" && res.emailSent === false) msg += " (the manager email could not be sent)";
      swapShowMsg(msg, "ok");
      return;
    }
    swapShowMsg("⚠️ " + ((res && res.message) || "Something went wrong"), "error");
    await swapFetchRequests().catch(() => {});
  } catch (err) {
    swapShowMsg("⚠️ Network error - please try again.", "error");
  } finally {
    swapState.busy = false;
    swapRenderLists();
  }
}

function swapCardHtml(r) {
  const me = swapMyName().toLowerCase();
  const who = n => (String(n).toLowerCase() === me ? "You" : swapEsc(n));
  const status = String(r.status || "");
  let actions = "";

  if (r.canApprove) {
    actions = `<button class="swap-btn swap-btn-ok" data-swap-action="approve" data-swap-id="${swapEsc(r.id)}"${swapState.busy ? " disabled" : ""}><i class="fa-solid fa-check"></i> Approve</button>` +
              `<button class="swap-btn swap-btn-no" data-swap-action="reject" data-swap-id="${swapEsc(r.id)}"${swapState.busy ? " disabled" : ""}><i class="fa-solid fa-xmark"></i> Reject</button>`;
  } else if (r.canCancel) {
    actions = `<button class="swap-btn swap-btn-no" data-swap-action="cancel" data-swap-id="${swapEsc(r.id)}"${swapState.busy ? " disabled" : ""}><i class="fa-solid fa-rotate-left"></i> Cancel request</button>`;
  }

  const statusBadge = `<span class="swap-status swap-status-${swapEsc(status.toLowerCase())}">${swapEsc(status)}</span>`;
  const meta = `📅 ${swapEsc(r.date)} · sent ${swapEsc(r.createdAt)}` +
    (status === "Pending" ? ` · deadline ${swapEsc(swapDeadlineNice(r.deadline))}` : (r.respondedAt ? ` · replied ${swapEsc(r.respondedAt)}` : ""));

  return `<div class="swap-card">
    <div class="swap-card-main"><b>${who(r.requester)}</b> <span class="swap-shift">${swapEsc(r.requesterShift)}</span> <i class="fa-solid fa-right-left"></i> <b>${who(r.target)}</b> <span class="swap-shift">${swapEsc(r.targetShift)}</span></div>
    <div class="swap-card-meta">${meta}</div>
    <div class="swap-card-actions">${statusBadge}${actions}</div>
  </div>`;
}

function swapRenderLists() {
  const box = document.getElementById("swapListsContainer");
  if (!box) return;

  const incoming = swapState.requests.filter(r => r.canApprove);
  const outgoing = swapState.requests.filter(r => r.canCancel);
  const history = swapState.requests.filter(r => !r.canApprove && !r.canCancel);

  const section = (title, icon, items, emptyText) =>
    `<div class="swap-section"><h4><i class="fa-solid ${icon}"></i> ${title} <span class="swap-count">${items.length}</span></h4>` +
    (items.length ? items.map(swapCardHtml).join("") : `<div class="swap-empty">${emptyText}</div>`) +
    `</div>`;

  box.innerHTML =
    section("Waiting for your reply", "fa-inbox", incoming, "No requests waiting for you.") +
    section("Your pending requests", "fa-paper-plane", outgoing, "You have no pending requests.") +
    section(swapState.isAdmin ? "All swaps (last 14 days)" : "History (last 14 days)", "fa-clock-rotate-left", history.slice(0, 40), "Nothing here yet.");
}

// event delegation - أزرار الكروت بتتبني ديناميك
document.addEventListener("click", function (ev) {
  const btn = ev.target.closest && ev.target.closest("[data-swap-action]");
  if (!btn || btn.disabled) return;
  swapRespond(btn.getAttribute("data-swap-id"), btn.getAttribute("data-swap-action"));
});
