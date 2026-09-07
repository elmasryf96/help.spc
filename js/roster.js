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
    updateDashboardLiveWidget();
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

    html += `<div class="hl-team-box"><div class="hl-team-title"><div class="hl-tt-left"><i class="fa-solid ${teamName === 'Calls' ? 'fa-headset' : teamName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i><span>${teamName} Team</span></div><span class="hl-team-badge">${agents.length} Active</span></div><div class="hl-team-list">${agentsHtml}</div></div>`;
  });

  const missingHtml = missingAgents.length === 0
    ? `<span class="hl-none-text"><i class="fa-solid fa-circle-check"></i> No missing agents right now</span>`
    : missingAgents.map(m => `
        <div class="hl-agent-chip" style="border-color:#ef4444;">
          <span class="hl-chip-name">${m.name}</span>
          <span class="hl-chip-shift" style="color:#991b1b;">${m.shift} · Away</span>
        </div>`).join('');

  html += `<div class="hl-team-box" style="border-color:#ef4444;">
      <div class="hl-team-title">
        <div class="hl-tt-left"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i><span>Missing (Scheduled but Away)</span></div>
        <span class="hl-team-badge" style="background:#fef2f2;color:#991b1b;">${missingAgents.length} Missing</span>
      </div>
      <div class="hl-team-list">${missingHtml}</div>
    </div>`;

  container.innerHTML = html;
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
    'full-sheet-view': { content: 'tab-full-sheet-view', btn: 'tabFullBtn' }
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
