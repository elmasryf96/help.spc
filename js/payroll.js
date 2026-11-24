// ============================================================
// 💰 HR & Payroll > Payroll - مرتبات تيم مصر (أدمن بس) + تعليمات الإيجنت في كارت My Day
// ============================================================
// القواعد اللي Faris طلبها (24 نوفمبر):
//   - مرتب شهري لكل إيجنت (أول مرة 17,000 جنيه للكل) والأدمن يقدر يزوده أو ينقصه لكل واحد لوحده.
//   - اليوم = المرتب ÷ 30 / الساعة = اليوم ÷ 8 / الدقيقة = الساعة ÷ 60.
//   - أيام الأوف و Leave و Sick Leave و Public Holiday و Day in Lieu و Compensated مدفوعة - مفيش خصم.
//   - كل يوم شيفت: التأخير + أي وقت مش لوجن جوه الشيفت (Away / خروج بدري) + البريك الزيادة عن 30 دقيقة
//     = دقايق لازم تتعوض في نفس اليوم بالقعدة بعد آخر الشيفت. اللي مايتعوضش بيتخصم بالدقيقة.
//   - البريك 30 دقيقة حق الإيجنت: لو أخد أقل، الباقي مابيعوضش أي تأخير.
//   - الشغل قبل الشيفت مش بيعوض أوتوماتيك - الأدمن بس يقدر يفعّله ليوم معين (PayrollEarlyCredits).
//   - No Show (ماجاش أو اشتغل أقل من نص الشيفت) = اليوم كله بيتخصم، وبياخد بس تمن الدقايق اللي اشتغلها.
//     لو اتعمله Compensation واتوافق عليه، اليوم بيبقى Compensated في الروستر فمفيش خصم.
//   - مفيش أوفر تايم دلوقتي.
//   - النهاردة لسه "مفتوح" (الإيجنت لسه يقدر يعوّض لآخر اليوم) فبيظهر لوحده ومش بيدخل في الخصومات.
//   - الأرقام كلها بتتحسب لحظيًا من AgentStatusLog - أي تعديل في الأكتيفيتي لوج بيظهر مع أول Refresh
//     (والتاب بيعمل Refresh لوحده كل دقيقة).
//   - الإيجنت مابيشوفش أي فلوس - بيشوف بس التعليمات + الدقايق اللي عليه تتعوض النهاردة في كارت My Day.
// ============================================================

const PAY_DAYS_DIVISOR = 30;
const PAY_GRACE_MIN = 1;          // سماح دقيقة واحدة (نفس الـ Tardy)
const PAY_AUTO_REFRESH_MS = 60000;

let payrollState = {
  meLoaded: false, meLoading: null, member: false,
  agents: [], earlyCredits: [], settingsLoaded: false,
  month: "", report: null, loading: false, error: "", detail: "", busy: false, showMadeUp: false
};
let payrollTimer = null;

// ------------------------------------------------------------
// 🧰 أدوات
// ------------------------------------------------------------
function payMoney(n) {
  return (Math.round((n || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function payMin(min) {
  min = Math.round(min || 0);
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function payClock(min) {
  min = Math.round(min);
  const h24 = Math.floor(min / 60) % 24, m = min % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function payRates(salary) {
  const day = (salary || 0) / PAY_DAYS_DIVISOR;
  const hour = day / 8;
  return { salary: salary || 0, day, hour, minute: hour / 60 };
}

function payToken() {
  return localStorage.getItem("sessionToken") || "";
}

function payIsAdmin() {
  return (typeof leaveIsAdminUser === "function") && leaveIsAdminUser();
}

// اسم في شيت Payroll يطابق اسم في الروستر؟ (الاسم كامل، أو الاسم الأول بس)
function payNameMatches(payName, rosterName) {
  const a = String(payName || "").trim().toLowerCase(), b = String(rosterName || "").trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || b.split(/\s+/)[0] === a;
}

// أسامي الروستر (للشهر ده) اللي تطابق اسم في المرتبات
function payRosterMatches(payName, month) {
  const [y, m] = month.split("-").map(Number);
  const names = [];
  (Array.isArray(rosterData) ? rosterData : []).forEach(a => {
    if (a.year !== y || a.month !== m || a.dept === "Queue Support") return;
    if (names.indexOf(a.name) === -1 && payNameMatches(payName, a.name)) names.push(a.name);
  });
  // الاسم الكامل بالظبط أولى من مطابقة الاسم الأول
  const exact = names.filter(n => n.trim().toLowerCase() === String(payName).trim().toLowerCase());
  return exact.length ? exact : names;
}

function payEarlyOn(agentName, dateStr, payName) {
  return (payrollState.earlyCredits || []).some(c => c.date === dateStr &&
    (String(c.agent).trim().toLowerCase() === String(agentName).trim().toLowerCase() ||
     String(c.agent).trim().toLowerCase() === String(payName || "").trim().toLowerCase()));
}

// ------------------------------------------------------------
// 🧮 حساب يوم واحد
// ------------------------------------------------------------
function payComputeDay(agentName, dateStr, day, trackingStartDate, now, rates, earlyOn) {
  const code = (typeof leaveRosterCode === "function") ? leaveRosterCode(agentName, dateStr) : null;
  const kind = (typeof rosterLeaveKind === "function") ? rosterLeaveKind(code) : null;
  const range = (typeof HR_SHIFT_RANGES !== "undefined") ? HR_SHIFT_RANGES[code] : null;
  const sessions = (day && day.sessions) || [];
  const r = {
    date: dateStr, code: code === null ? "" : (code || "OFF"), kind, range: range || null,
    status: "", label: "", final: false, isToday: dateStr === now.today,
    late: 0, away: 0, leftEarly: 0, notLoggedNow: 0, extraBreak: 0, breakIn: 0,
    owed: 0, afterWork: 0, beforeWork: 0, earlyOn: !!earlyOn, comp: 0, remaining: 0,
    workTotal: 0, loginTotal: 0, deduction: 0, paidWorked: 0, parts: [], firstLogin: ""
  };

  if (dateStr > now.today) { r.status = "upcoming"; r.label = "Upcoming"; return r; }
  if (kind) { r.status = "paid"; r.label = `${kind} (paid)`; r.final = true; return r; }
  if (code === null) { r.status = "noroster"; r.label = "Not in roster"; r.final = true; return r; }
  if (!range) { r.status = "off"; r.label = "Day off (paid)"; r.final = true; return r; }
  if (trackingStartDate && dateStr < trackingStartDate) { r.status = "nodata"; r.label = "No login data"; r.final = true; return r; }

  const shiftStart = range[0], shiftEnd = range[1];
  const covered = [];
  sessions.forEach(s => {
    const a = hrMinOf(s.start, dateStr), b = Math.min(hrMinOf(s.end, dateStr), 1440);
    if (b <= a) return;
    const dur = b - a;
    r.loginTotal += dur;
    const ov = hrOverlap(a, b, shiftStart, shiftEnd);
    if (ov > 0) covered.push([Math.max(a, shiftStart), Math.min(b, shiftEnd)]);
    if (s.status === "Break") { r.breakIn += ov; return; }
    r.workTotal += dur;
    r.beforeWork += hrOverlap(a, b, 0, shiftStart);
    r.afterWork += hrOverlap(a, b, shiftEnd, 1440);
  });
  r.firstLogin = day && day.firstLogin ? hrTimeOf(day.firstLogin) : "";

  if (r.isToday && now.nowMin < shiftStart && !covered.length) {
    r.status = "notstarted"; r.label = "Shift not started yet";
    return r;
  }

  // ⏱️ الفجوات جوه الشيفت (لحد دلوقتي لو النهاردة)
  const limit = r.isToday ? Math.min(shiftEnd, now.nowMin) : shiftEnd;
  covered.sort((x, y) => x[0] - y[0]);
  let cursor = shiftStart;
  const gaps = [];
  covered.forEach(([a, b]) => { if (a > cursor) gaps.push([cursor, Math.min(a, limit)]); cursor = Math.max(cursor, b); });
  if (cursor < limit) gaps.push([cursor, limit]);
  gaps.filter(([a, b]) => b - a > PAY_GRACE_MIN).forEach(([a, b]) => {
    const mins = b - a;
    if (!covered.length || a === shiftStart) {
      r.late += mins;
      r.parts.push(`Late ${payMin(mins)} (${payClock(a)} → ${payClock(b)})`);
    } else if (b >= shiftEnd) {
      r.leftEarly += mins;
      r.parts.push(`Left early ${payMin(mins)} (${payClock(a)} → ${payClock(b)})`);
    } else if (r.isToday && b >= limit) {
      r.notLoggedNow += mins;
      r.parts.push(`Not logged in since ${payClock(a)} (${payMin(mins)})`);
    } else {
      r.away += mins;
      r.parts.push(`Away ${payMin(mins)} (${payClock(a)} → ${payClock(b)})`);
    }
  });
  r.extraBreak = Math.max(0, r.breakIn - HR_BREAK_ALLOWED_MIN);
  if (r.extraBreak > PAY_GRACE_MIN) r.parts.push(`Extra break ${payMin(r.extraBreak)} (took ${payMin(r.breakIn)} of 30m)`);
  else r.extraBreak = 0;

  r.owed = r.late + r.leftEarly + r.away + r.notLoggedNow + r.extraBreak;
  r.comp = r.afterWork + (r.earlyOn ? r.beforeWork : 0);
  r.remaining = Math.max(0, r.owed - r.comp);
  if (r.remaining <= PAY_GRACE_MIN) r.remaining = 0;

  // 🚫 No Show (يوم خلص): اليوم كله بيتخصم - بياخد تمن الدقايق اللي اشتغلها بس
  const noShow = !day || !day.firstLogin || r.loginTotal < HR_REQUIRED_MIN / 2;
  if (!r.isToday && noShow) {
    r.status = "noshow"; r.final = true;
    r.paidWorked = r.workTotal * rates.minute;
    r.deduction = Math.max(0, rates.day - r.paidWorked);
    r.label = "🚫 No Show";
    r.reason = `No Show - full day deducted (${payMoney(rates.day)})` +
      (r.workTotal > PAY_GRACE_MIN ? `, worked ${payMin(r.workTotal)} paid back ${payMoney(r.paidWorked)}` : ", no work logged");
    return r;
  }

  if (r.isToday) {
    r.status = "today";
    r.label = now.nowMin < shiftEnd ? "⏳ Shift in progress" : "⏳ Shift ended - can still make up today";
    r.deduction = r.remaining * rates.minute; // مؤقت - مش بيدخل في الخصومات
    if (now.nowMin >= shiftEnd && noShow) r.label = "⏳ No Show so far (today)";
  } else {
    r.final = true;
    r.deduction = r.remaining * rates.minute;
    r.status = r.remaining > 0 ? "deducted" : (r.owed > 0 ? "madeup" : "ok");
    r.label = r.remaining > 0 ? "➖ Deducted" : (r.owed > 0 ? "🔁 Made up after shift" : "✅ On time");
  }
  if (r.owed > 0) {
    r.reason = r.parts.join(" · ") +
      ` = missed ${payMin(r.owed)}; made up ${payMin(r.comp)}` +
      (r.earlyOn && r.beforeWork > 0 ? ` (incl. ${payMin(r.beforeWork)} before shift - admin)` : "") +
      (r.remaining > 0 ? ` → ${payMin(r.remaining)} × ${payMoney(rates.minute)} = ${payMoney(r.deduction)}` : " → nothing deducted");
  }
  return r;
}

// ملخص شهر لإيجنت واحد
function payComputeAgentMonth(payRow, agentName, month, reportDays, trackingStartDate) {
  const now = hrNowInfo();
  const rates = payRates(payRow.salary);
  const byDate = {};
  (reportDays || []).forEach(d => { byDate[d.date] = d; });
  const dates = hrMonthDates(month);
  const rows = dates.map(date => payComputeDay(agentName, date, byDate[date], trackingStartDate, now, rates, payEarlyOn(agentName, date, payRow.agent)));

  const daysInMonth = dates.length;
  let elapsed = 0;
  if (month < now.month) elapsed = daysInMonth;
  else if (month === now.month) elapsed = parseInt(now.today.slice(8, 10), 10);

  const s = {
    payName: payRow.agent, agent: agentName, month, rates, rows, daysInMonth, elapsed,
    shouldToDate: rates.salary * elapsed / daysInMonth,
    deductions: 0, deductedMin: 0, deductedDays: 0, noShows: 0, todayRow: null, todayPending: 0
  };
  rows.forEach(r => {
    if (r.status === "today") { s.todayRow = r; s.todayPending = r.deduction; return; }
    if (!r.final || r.deduction <= 0) return;
    s.deductions += r.deduction;
    s.deductedDays++;
    if (r.status === "noshow") s.noShows++; else s.deductedMin += r.remaining;
  });
  s.netToDate = Math.max(0, s.shouldToDate - s.deductions);
  s.monthAfter = Math.max(0, rates.salary - s.deductions);
  return s;
}

// ------------------------------------------------------------
// 🌐 السيرفر
// ------------------------------------------------------------
async function payFetchSettings() {
  const url = GOOGLE_SHEET_API_URL + "?action=compOptions&payroll=1&t=" + Date.now() + "&token=" + encodeURIComponent(payToken());
  const res = await fetch(url, { method: "GET", redirect: "follow" }).then(r => r.json());
  if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not load the payroll settings");
  payrollState.member = !!res.member;
  payrollState.meLoaded = true;
  if (res.isAdmin) {
    payrollState.agents = Array.isArray(res.agents) ? res.agents : [];
    payrollState.earlyCredits = Array.isArray(res.earlyCredits) ? res.earlyCredits : [];
    payrollState.settingsLoaded = true;
  }
  return res;
}

async function payPost(payload) {
  payload = Object.assign({ action: "requestLeave", type: "Payroll", token: payToken() }, payload);
  const res = await fetch(GOOGLE_SHEET_API_URL, { method: "POST", body: JSON.stringify(payload) }).then(r => r.json());
  return res;
}

// ------------------------------------------------------------
// 🖥️ تاب Payroll (أدمن بس)
// ------------------------------------------------------------
function payInitTab() {
  if (!payIsAdmin()) return;
  const monthSel = document.getElementById("payMonth");
  if (!monthSel) return;
  const now = hrNowInfo();
  const months = [];
  (Array.isArray(rosterData) ? rosterData : []).forEach(a => {
    const k = `${a.year}-${String(a.month).padStart(2, "0")}`;
    if (months.indexOf(k) === -1 && k <= now.month) months.push(k);
  });
  if (months.indexOf(now.month) === -1) months.push(now.month);
  months.sort().reverse();
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const keep = monthSel.value || payrollState.month || now.month;
  monthSel.innerHTML = months.map(k => `<option value="${k}">${names[parseInt(k.slice(5), 10) - 1]} ${k.slice(0, 4)}</option>`).join("");
  monthSel.value = months.indexOf(keep) !== -1 ? keep : months[0];
  payLoad(false);
  payStartAutoRefresh();
}

function payTabVisible() {
  const tab = document.getElementById("hr-tab-payroll");
  const page = document.getElementById("hr-page");
  return !!(tab && page && tab.style.display !== "none" && page.classList.contains("active-page") && document.visibilityState === "visible");
}

function payStartAutoRefresh() {
  if (payrollTimer) return;
  payrollTimer = setInterval(() => {
    if (!payTabVisible()) { clearInterval(payrollTimer); payrollTimer = null; return; }
    if (!payrollState.loading && !payrollState.busy) payLoad(true, true);
  }, PAY_AUTO_REFRESH_MS);
}

async function payLoad(force, silent) {
  const monthSel = document.getElementById("payMonth");
  const box = document.getElementById("payResult");
  if (!monthSel || !box) return;
  const month = monthSel.value;
  if (!force && payrollState.report && payrollState.month === month) { payRender(); return; }
  payrollState.month = month;
  payrollState.loading = true;
  payrollState.error = "";
  if (!silent) box.innerHTML = `<div class="swap-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading the payroll for ${leaveEsc(month)}...</div>`;
  try {
    const [settings, report] = await Promise.all([payFetchSettings(), hrFetchMonth(month, "")]);
    if (payrollState.month !== month) return;
    payrollState.report = report;
    payrollState.loadedAt = new Date();
  } catch (err) {
    payrollState.error = err.message || String(err);
  }
  payrollState.loading = false;
  payRender();
}

function payBuildSummaries() {
  const month = payrollState.month;
  const report = payrollState.report || {};
  const tracking = report.trackingStartDate || null;
  const byName = {};
  (report.agents || []).forEach(a => { byName[a.name] = a; });
  const list = [], problems = [];
  (payrollState.agents || []).forEach(p => {
    const matches = payRosterMatches(p.agent, month);
    if (matches.length !== 1) {
      problems.push({ p, matches });
      return;
    }
    const name = matches[0];
    list.push(payComputeAgentMonth(p, name, month, byName[name] ? byName[name].days : [], tracking));
  });
  list.sort((a, b) => a.agent.localeCompare(b.agent));
  return { list, problems };
}

function payCard(label, value, sub, tone) {
  return `<div class="ccp-metric-card hr-card ${tone ? "hr-" + tone : ""}">
      <div class="ccp-metric-label">${label}</div>
      <div class="ccp-metric-value">${value}</div>
      ${sub ? `<div class="hr-card-sub">${sub}</div>` : ""}
    </div>`;
}

function payRender() {
  const box = document.getElementById("payResult");
  if (!box) return;
  if (payrollState.error) {
    box.innerHTML = `<div class="swap-empty"><i class="fa-solid fa-triangle-exclamation"></i> ${leaveEsc(payrollState.error)}</div>`;
    return;
  }
  if (!payrollState.report) return;

  const { list, problems } = payBuildSummaries();
  const cur = (payrollState.agents[0] && payrollState.agents[0].currency) || "EGP";
  const t = { salary: 0, should: 0, ded: 0, net: 0, today: 0, todayAgents: 0 };
  list.forEach(s => {
    t.salary += s.rates.salary; t.should += s.shouldToDate; t.ded += s.deductions; t.net += s.netToDate;
    if (s.todayRow && s.todayRow.remaining > 0) { t.today += s.todayPending; t.todayAgents++; }
  });
  const isCurrent = payrollState.month === hrNowInfo().month;
  const first = list[0];
  const period = isCurrent && first ? `1 → ${first.elapsed} ${leaveEsc(leaveFmtDate(hrNowInfo().today).split(" ")[1] || "")} (${first.elapsed} of ${first.daysInMonth} days)` : "whole month";
  const at = payrollState.loadedAt ? payrollState.loadedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
  const q = v => String(v).replace(/'/g, "\\'");

  const problemsHtml = problems.map(x => `<div class="swap-info" style="margin-top:8px;"><span class="swap-late"><i class="fa-solid fa-triangle-exclamation"></i>
      <b>${leaveEsc(x.p.agent)}</b> ${x.matches.length ? `matches more than one agent in the roster (${x.matches.map(leaveEsc).join(", ")}).` : "was not found in this month's roster."}</span></div>`).join("");

  const rows = list.map(s => {
    const key = leaveEsc(s.agent);
    const tr = s.todayRow;
    const todayBadge = tr && tr.remaining > 0
      ? ` <span class="pay-today-badge" title="Today: still has time to make up after the shift - not deducted yet">⏳ ${payMin(tr.remaining)} today</span>` : "";
    const dedSub = s.deductions > 0
      ? `<div class="hr-card-sub">${s.deductedMin ? payMin(s.deductedMin) + " late/missed" : ""}${s.deductedMin && s.noShows ? " + " : ""}${s.noShows ? s.noShows + " No Show" : ""}</div>` : "";
    return `<tr class="${payrollState.detail === s.agent ? "pay-row-open" : ""}">
      <td class="hr-agent" onclick="payToggleDetail('${q(key)}')"><i class="fa-solid fa-chevron-${payrollState.detail === s.agent ? "down" : "right"}" style="font-size:10px;opacity:.5;"></i> ${key}${todayBadge}</td>
      <td><input type="number" min="0" step="100" class="combo-input pay-salary-input" id="paySal-${key}" value="${s.rates.salary}">
          <button type="button" class="swap-btn swap-btn-primary pay-mini-btn" onclick="paySaveSalary('${q(key)}')" title="Save salary"><i class="fa-solid fa-floppy-disk"></i></button>
          <div class="hr-card-sub">Day ${payMoney(s.rates.day)} · Hour ${payMoney(s.rates.hour)} · Min ${payMoney(s.rates.minute)}</div></td>
      <td class="pay-big">${payMoney(s.shouldToDate)}</td>
      <td class="pay-big ${s.deductions > 0 ? "hr-neg" : "hr-zero"}">${s.deductions > 0 ? "−" + payMoney(s.deductions) : "0.00"}${dedSub}</td>
      <td class="pay-big"><b>${payMoney(s.netToDate)}</b></td>
    </tr>${payrollState.detail === s.agent ? `<tr class="hr-details"><td colspan="5">${payDetailHtml(s)}</td></tr>` : ""}`;
  }).join("");

  box.innerHTML = `
    <div class="hr-section-title">💰 Payroll · ${leaveEsc(payrollState.month)} · ${period} <span style="opacity:.55;font-size:12px;font-weight:600;">updated ${leaveEsc(at)} · refreshes every minute</span></div>
    <div class="pay-big-cards">
      <div class="pay-big-card"><div class="pay-big-label">💵 Should get (if committed)</div><div class="pay-big-value">${payMoney(t.should)} <span>${cur}</span></div></div>
      <div class="pay-big-card pay-bad"><div class="pay-big-label">➖ Deductions</div><div class="pay-big-value">${t.ded > 0 ? "−" : ""}${payMoney(t.ded)} <span>${cur}</span></div></div>
      <div class="pay-big-card pay-good"><div class="pay-big-label">✅ Will get</div><div class="pay-big-value">${payMoney(t.net)} <span>${cur}</span></div></div>
    </div>
    ${isCurrent && t.todayAgents ? `<div class="swap-info" style="margin-top:8px;">⏳ <b>Today is still open:</b> ${t.todayAgents} agent${t.todayAgents === 1 ? " has" : "s have"} time to make up (${payMoney(t.today)} ${cur}). It's only deducted if they don't stay after their shift today.</div>` : ""}
    ${problemsHtml}
    <div class="table-scroll-wrapper" style="margin-top:12px;">
      <table class="roster-full-table hr-balance-table pay-table">
        <thead><tr><th>Agent</th><th>Monthly salary (${leaveEsc(cur)})</th><th>Should get</th><th>Deductions</th><th>Will get</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5">No agents in the payroll.</td></tr>`}
          ${list.length ? `<tr class="hr-total-row"><td class="hr-agent-total">Team total</td><td>${payMoney(t.salary)}</td>
            <td class="pay-big">${payMoney(t.should)}</td><td class="pay-big ${t.ded > 0 ? "hr-neg" : ""}">${t.ded > 0 ? "−" : ""}${payMoney(t.ded)}</td><td class="pay-big"><b>${payMoney(t.net)}</b></td></tr>` : ""}
        </tbody>
      </table>
    </div>
    <div class="swap-info" style="margin-top:10px;">
      Click an agent to see why. Late / away / left early / break over 30m must be made up the <b>same day after the shift</b> - what's left is deducted per minute.
      No Show = the day is deducted (minutes worked are paid). Days off, Leave, Sick Leave, Public Holiday, Day in Lieu and Compensated are paid.
    </div>`;
}

// 📝 تفاصيل الإيجنت: جملة لكل يوم بدل جدول
function payMissedWords(r) {
  const w = [];
  if (r.late) w.push(`late ${payMin(r.late)}`);
  if (r.away) w.push(`away ${payMin(r.away)}`);
  if (r.notLoggedNow) w.push(`not logged in ${payMin(r.notLoggedNow)}`);
  if (r.leftEarly) w.push(`left early ${payMin(r.leftEarly)}`);
  if (r.extraBreak) w.push(`break ${payMin(r.extraBreak)} over 30m`);
  return w.join(" + ");
}

function payDayLine(s, r) {
  const day = `<b>${leaveEsc(leaveFmtDate(r.date))}</b>`;
  const arrow = ` <span class="pay-arrow">→</span> `;
  const q = v => String(v).replace(/'/g, "\\'");
  const early = (r.beforeWork > PAY_GRACE_MIN && r.status !== "noshow")
    ? `<label class="pay-early" title="Admin only: count the time worked before the shift as making up for this day">
         <input type="checkbox" ${r.earlyOn ? "checked" : ""} onchange="paySetEarly('${q(leaveEsc(s.agent))}','${r.date}',this.checked)">
         count ${payMin(r.beforeWork)} worked before the shift</label>` : "";
  const madeUp = r.comp > 0 ? `stayed ${payMin(r.comp)} after the shift${r.earlyOn && r.beforeWork > 0 ? " (incl. before shift)" : ""}` : "didn't stay after the shift";

  if (r.status === "noshow") {
    return `<div class="pay-line pay-line-bad">🔴 ${day}: No Show${r.workTotal > PAY_GRACE_MIN ? ` (worked only ${payMin(r.workTotal)})` : ""}${arrow}<b>day deducted = ${payMoney(r.deduction)}</b></div>`;
  }
  if (r.status === "today") {
    const what = payMissedWords(r);
    if (r.remaining > 0) {
      return `<div class="pay-line pay-line-open">⏳ ${day} (today): ${what || "missed time"} so far${arrow}${madeUp}${arrow}<b>${payMin(r.remaining)} still to make up</b> <span style="opacity:.7">(not deducted yet)</span>${early}</div>`;
    }
    return r.owed > 0
      ? `<div class="pay-line pay-line-good">🟢 ${day} (today): ${what}${arrow}${madeUp}${arrow}<b>all made up</b>${early}</div>`
      : `<div class="pay-line pay-line-good">🟢 ${day} (today): nothing missed so far</div>`;
  }
  const what = payMissedWords(r);
  if (r.remaining > 0) {
    return `<div class="pay-line pay-line-bad">🔴 ${day}: ${what}${arrow}${madeUp}${arrow}<b>deducted ${payMin(r.remaining)} = ${payMoney(r.deduction)}</b>${early}</div>`;
  }
  if (r.owed > 0) {
    return `<div class="pay-line pay-line-good">🟢 ${day}: ${what}${arrow}${madeUp}${arrow}<b>no deduction</b>${early}</div>`;
  }
  return `<div class="pay-line">⚪ ${day}: on time${early}</div>`;
}

function payDetailHtml(s) {
  const show = r => r.status === "noshow" || r.status === "today" || r.remaining > 0 || (r.owed > 0 && payrollState.showMadeUp) || (r.beforeWork > PAY_GRACE_MIN && payrollState.showMadeUp && r.final);
  const madeUpCount = s.rows.filter(r => r.final && r.owed > 0 && r.remaining === 0 && r.status !== "noshow").length;
  const lines = s.rows.filter(show).map(r => payDayLine(s, r)).join("");
  const toggle = madeUpCount
    ? `<button type="button" class="swap-btn pay-mini-btn" style="margin-left:8px;" onclick="payToggleMadeUp()">${payrollState.showMadeUp ? "Hide" : "Show"} made-up days (${madeUpCount})</button>` : "";
  return `<div class="hr-detail">
    <div style="font-weight:800;margin-bottom:8px;">📋 ${leaveEsc(s.agent)}${toggle}</div>
    ${lines || `<div class="pay-line pay-line-good">✅ Nothing deducted this month so far.</div>`}
  </div>`;
}

function payToggleMadeUp() {
  payrollState.showMadeUp = !payrollState.showMadeUp;
  payRender();
}

function payToggleDetail(agent) {
  payrollState.detail = payrollState.detail === agent ? "" : agent;
  payRender();
}

function payMsg(text, kind) {
  const el = document.getElementById("payMsg");
  if (!el) return;
  if (!text) { el.style.display = "none"; return; }
  el.style.display = "block";
  el.className = "swap-msg" + (kind ? " swap-msg-" + kind : "");
  el.textContent = text;
}

async function payRun(payload, okText) {
  if (payrollState.busy) return;
  payrollState.busy = true;
  payMsg("Saving...", "info");
  try {
    const res = await payPost(payload);
    if (res && res.status === "success") {
      payMsg("✅ " + (res.message || okText || "Saved"), "ok");
      await payLoad(true, true);
    } else {
      payMsg("⚠️ " + ((res && res.message) || "Failed to save"), "error");
    }
  } catch (e) {
    payMsg("⚠️ Network error - please try again.", "error");
  } finally {
    payrollState.busy = false;
  }
}

function paySaveSalary(agent) {
  const el = document.getElementById("paySal-" + agent);
  const v = el ? Number(el.value) : NaN;
  if (!isFinite(v) || v < 0) { payMsg("⚠️ Please enter a valid salary.", "error"); return; }
  payRun({ op: "setSalary", agent, salary: v });
}

function paySetEarly(agent, date, on) {
  payRun({ op: "earlyCredit", agent, date, on: !!on });
}

// ------------------------------------------------------------
// 👋 كارت My Day: تعليمات + الدقايق اللي على الإيجنت النهاردة (لتيم المرتبات بس - من غير أي فلوس)
// ------------------------------------------------------------
function payEnsureMe() {
  if (payrollState.meLoaded) return Promise.resolve();
  if (payrollState.meLoading) return payrollState.meLoading;
  if (!payToken()) return Promise.resolve();
  payrollState.meLoading = payFetchSettings()
    .catch(() => { payrollState.meLoaded = true; payrollState.member = false; })
    .then(() => {
      payrollState.meLoading = null;
      if (payrollState.member && typeof loadMyDayCard === "function") loadMyDayCard(typeof myDayCardCurrentDate !== "undefined" ? myDayCardCurrentDate : undefined);
    });
  return payrollState.meLoading;
}

function payrollMyDayHtml(agentName, dateStr, day, trackingStartDate) {
  if (!payrollState.meLoaded) { payEnsureMe(); return ""; }
  if (!payrollState.member) return "";
  const now = hrNowInfo();
  const r = payComputeDay(agentName, dateStr, day, trackingStartDate, now, payRates(0), false);
  const isToday = dateStr === now.today;
  let shiftLine = "";
  if (r.range) shiftLine = `<b>${leaveEsc(r.code)}</b> · ${payClock(r.range[0])} – ${payClock(r.range[1])} · 8h = 7:30 work + 30m break`;
  else shiftLine = r.code ? `<b>${leaveEsc(r.code)}</b>` : "Not in the roster";

  let status = "", tone = "info";
  if (r.status === "paid" || r.status === "off") {
    status = `🌴 ${leaveEsc(r.label)} - nothing to make up.`;
  } else if (r.status === "notstarted") {
    status = `⏰ Your shift starts at <b>${payClock(r.range[0])}</b>. Log in on time - any late minute must be made up today after your shift.`;
  } else if (r.status === "today") {
    const endMin = r.range[1];
    if (r.remaining > 0) {
      tone = "bad";
      const stayUntil = now.nowMin < endMin ? endMin + r.remaining : now.nowMin + r.remaining;
      status = `⚠️ You have <b>${payMin(r.remaining)}</b> to make up today (${leaveEsc(r.parts.join(" · "))})` +
        (r.comp > 0 ? ` - already made up ${payMin(r.comp)}` : "") +
        `.<br>Stay logged in until <b>${payClock(stayUntil)}</b> today to make it up` +
        (now.nowMin < endMin ? " (if you don't miss any more time)" : "") +
        ` - <b>otherwise it will be deducted from your salary.</b>`;
    } else if (r.owed > 0) {
      tone = "good";
      status = `✅ You missed ${payMin(r.owed)} today and you've made it all up. Thank you!`;
    } else {
      tone = "good";
      status = `✅ No time to make up so far today. Keep it up!`;
    }
  } else if (r.status === "noshow") {
    tone = "bad";
    status = `🚫 This day was a No Show - the day is deducted (unless an admin approves a Compensation).`;
  } else if (r.status === "deducted") {
    tone = "bad";
    status = `➖ You missed ${payMin(r.owed)} this day (${leaveEsc(r.parts.join(" · "))}), made up ${payMin(r.comp)} → <b>${payMin(r.remaining)} deducted</b>.`;
  } else if (r.status === "madeup") {
    tone = "good";
    status = `✅ You missed ${payMin(r.owed)} this day and made it all up.`;
  } else if (r.status === "ok") {
    tone = "good";
    status = `✅ Full shift this day - nothing missed.`;
  } else if (r.status === "nodata") {
    status = "No login data for this day.";
  }

  return `
    <div class="pay-myday pay-myday-${tone}">
      <div class="pay-myday-head"><i class="fa-solid fa-clipboard-check"></i> Your shift rules ${isToday ? "· today" : "· " + leaveEsc(leaveFmtDate(dateStr))}: ${shiftLine}</div>
      ${status ? `<div class="pay-myday-status">${status}</div>` : ""}
      <ul class="pay-myday-rules">
        <li>Be logged in for your <b>whole shift</b> as per the roster.</li>
        <li>Your break is <b>30 minutes - it's your right, take it</b>. A shorter break does <b>not</b> make up for being late, and any minute over 30 must be made up.</li>
        <li>Late login, being logged out / away during the shift, leaving early, or a longer break → make it up the <b>same day</b> by staying <b>after your shift ends</b>. Time before your shift or on another day does not count.</li>
        <li>Any minutes not made up by the end of the day are <b>deducted from your salary</b>.</li>
        <li>No Show (or less than half a shift) = the day is deducted, unless a Compensation (a day off worked) is approved.</li>
        <li>Leave, Sick Leave, Public Holiday and Day in Lieu are paid - no deduction.</li>
      </ul>
    </div>`;
}
