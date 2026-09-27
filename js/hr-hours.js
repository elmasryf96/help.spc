// ============================================================
// ⏱️ HR & Payroll > Hours - ساعات الشغل الشهرية لكل إيجنت (من AgentStatusLog + الروستر)
// ============================================================
// القواعد اللي Faris طلبها (27 سبتمبر):
//   - كل يوم عليه Shift 1/2/3 في الروستر = 8 ساعات مطلوبة، منهم 30 دقيقة بريك حقه و 7:30 شغل صافي.
//     (عدد أيام الشغل بيتحسب من الروستر نفسه - عادة 26 يوم في الشهر، يوم أوف واحد في الأسبوع)
//   - "جوه الشيفت" = الوقت اللي كان فيه مش Away جوه مواعيد الشيفت (نفس حساب الأدهيرانس في CC Pulse).
//   - الناقص = 7:30 − الشغل الصافي جوه الشيفت (من غير البريك). يعني البريك اللي بيوفّره بيعوّض التأخير:
//       متأخر 10د + بريك 20د = مفيش ناقص (Late – compensated) / متأخر 10د + بريك 30د = ناقص 10د.
//   - سماح دقيقة واحدة بس (زي الـ Tardy) - أي ناقص/تأخير دقيقة أو أقل مايتحسبش.
//   - تصنيف كل يوم: ✅ Full day / 🔁 Late – compensated / ⚠️ Short day / 🚫 No Show
//     + ➕ Overtime (شغل برا مواعيد الشيفت) جنب التصنيف + ⭐ Worked day off للأيام الأوف اللي اشتغل فيها.
//   - أيام Leave / Sick / Public Holiday / Day in Lieu / Compensated مش بتدخل في المطلوب.
//   - الإيجنت يشوف ساعاته هو، والأدمن يشوف كل الإيجنتس + التفاصيل + Export to Excel.
// ============================================================

const HR_SHIFT_RANGES = { "Shift 1": [540, 1020], "Shift 2": [660, 1140], "Shift 3": [780, 1260] };
const HR_REQUIRED_MIN = 480;     // 8 ساعات
const HR_BREAK_ALLOWED_MIN = 30; // البريك المسموح
const HR_NET_REQUIRED_MIN = HR_REQUIRED_MIN - HR_BREAK_ALLOWED_MIN; // 7:30 شغل صافي
const HR_GRACE_MIN = 1;          // سماح دقيقة واحدة (زي الـ Tardy)

let hrHoursState = { month: "", agent: "", data: null, loading: false, error: "", detailAgent: "" };

// ------------------------------------------------------------
// 🧰 أدوات
// ------------------------------------------------------------
function hrFmt(min) {
  min = Math.round(min || 0);
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function hrTimeOf(ts) {
  const t = String(ts || "").split(" ")[1];
  return t ? t.slice(0, 5) : "--";
}

// "yyyy-MM-dd HH:mm:ss" -> دقايق من بداية اليوم dateStr (لو في يوم بعده بتبقى > 1440)
function hrMinOf(ts, dateStr) {
  const [d, t] = String(ts || "").split(" ");
  const p = String(t || "00:00:00").split(":").map(Number);
  let m = p[0] * 60 + p[1] + (p[2] || 0) / 60;
  if (d && dateStr && d > dateStr) m += 1440;
  return m;
}

function hrOverlap(a, b, s, e) {
  return Math.max(0, Math.min(b, e) - Math.max(a, s));
}

function hrMonthDates(month) {
  const [y, m] = month.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  const out = [];
  for (let d = 1; d <= n; d++) out.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  return out;
}

function hrNowInfo() {
  const u = getUAECurrentDate();
  return { today: `${u.year}-${u.month}-${u.day}`, nowMin: u.hour24 * 60 + u.minute, month: `${u.year}-${u.month}` };
}

// ------------------------------------------------------------
// 🧮 حساب يوم واحد
// ------------------------------------------------------------
function hrComputeDay(agentName, dateStr, day, trackingStartDate, now) {
  const code = (typeof leaveRosterCode === "function") ? leaveRosterCode(agentName, dateStr) : null;
  const kind = (typeof rosterLeaveKind === "function") ? rosterLeaveKind(code) : null;
  const range = HR_SHIFT_RANGES[code];
  const sessions = (day && day.sessions) || [];

  const r = {
    date: dateStr, code: code === null ? "" : (code || "OFF"), kind, isWorkDay: !!range, judged: false,
    firstLogin: day && day.firstLogin ? hrTimeOf(day.firstLogin) : "", lastLogout: day && day.endShift ? hrTimeOf(day.endShift) : "",
    inShiftWork: 0, inShiftBreak: 0, breakTotal: 0, outsideWork: 0, outsideBreak: 0, totalLogin: 0,
    net: 0, missing: 0, late: 0, earlyLeave: 0, extraBreak: 0, overtime: 0, dayOffWork: 0,
    category: "", categoryLabel: "", overtimeFlag: false, note: ""
  };

  if (dateStr > now.today) { r.category = "upcoming"; r.categoryLabel = "Upcoming"; return r; }
  // الإجازات بتتعد من الروستر حتى قبل بداية تسجيل اللوجن
  if (kind && trackingStartDate && dateStr < trackingStartDate) { r.category = "leave"; r.categoryLabel = kind; return r; }
  if (trackingStartDate && dateStr < trackingStartDate) { r.category = "nodata"; r.categoryLabel = "No login data"; return r; }

  const shiftStart = range ? range[0] : 0, shiftEnd = range ? range[1] : 0;
  let lastInShiftEnd = null;
  sessions.forEach(s => {
    const a = hrMinOf(s.start, dateStr), b = hrMinOf(s.end, dateStr);
    if (b <= a) return;
    const dur = b - a;
    const ov = range ? hrOverlap(a, b, shiftStart, shiftEnd) : 0;
    if (s.status === "Break") { r.breakTotal += dur; r.inShiftBreak += ov; }
    else { r.inShiftWork += ov; r.outsideWork += dur - ov; }
    if (range && ov > 0) lastInShiftEnd = Math.max(lastInShiftEnd === null ? 0 : lastInShiftEnd, Math.min(b, shiftEnd));
    r.totalLogin += dur;
  });
  r.outsideBreak = r.breakTotal - r.inShiftBreak;

  // 🌴 إجازة / تعويض / Public Holiday...
  if (kind) {
    r.category = "leave"; r.categoryLabel = kind;
    if (r.totalLogin > HR_GRACE_MIN) { r.note = `worked ${hrFmt(r.totalLogin)} anyway`; r.dayOffWork = r.totalLogin; }
    return r;
  }

  // 🏖️ يوم أوف
  if (!range) {
    if (r.totalLogin > HR_GRACE_MIN) {
      r.category = "dayoff-worked"; r.categoryLabel = "⭐ Worked day off"; r.dayOffWork = r.totalLogin;
    } else { r.category = "off"; r.categoryLabel = "Off"; }
    return r;
  }

  // ⏳ شيفت النهاردة لسه ماخلصش
  if (dateStr === now.today && now.nowMin < shiftEnd) {
    r.category = "inprogress"; r.categoryLabel = "⏳ In progress";
    return r;
  }

  r.judged = true;
  r.net = r.inShiftWork;
  const firstMin = day && day.firstLogin ? hrMinOf(day.firstLogin, dateStr) : null;
  if (firstMin !== null && firstMin - shiftStart > HR_GRACE_MIN) r.late = firstMin - shiftStart;
  if (lastInShiftEnd !== null && shiftEnd - lastInShiftEnd > HR_GRACE_MIN) r.earlyLeave = shiftEnd - lastInShiftEnd;
  r.extraBreak = Math.max(0, r.breakTotal - HR_BREAK_ALLOWED_MIN);
  r.missing = Math.max(0, HR_NET_REQUIRED_MIN - r.net);
  if (r.missing <= HR_GRACE_MIN) r.missing = 0;
  r.overtime = r.outsideWork > HR_GRACE_MIN ? r.outsideWork : 0;
  r.overtimeFlag = r.overtime > 0;

  // 🚫 No Show: ماجاش أو اشتغل أقل من نص الشيفت (نفس قاعدة CC Pulse)
  if (!day || !day.firstLogin || r.totalLogin < HR_REQUIRED_MIN / 2) {
    r.category = "noshow"; r.categoryLabel = "🚫 No Show";
  } else if (r.missing > 0) {
    r.category = "short"; r.categoryLabel = "⚠️ Short day";
  } else if (r.late > 0) {
    r.category = "latecomp"; r.categoryLabel = "🔁 Late – compensated";
  } else {
    r.category = "full"; r.categoryLabel = "✅ Full day";
  }
  return r;
}

// ملخص شهر لإيجنت واحد: days = [{date, sessions, firstLogin, endShift, totalLoginSeconds}] من التقرير
function hrComputeAgentMonth(agentName, month, reportDays, trackingStartDate) {
  const now = hrNowInfo();
  const byDate = {};
  (reportDays || []).forEach(d => { byDate[d.date] = d; });
  const rows = hrMonthDates(month).map(date => hrComputeDay(agentName, date, byDate[date], trackingStartDate, now));

  const s = {
    agent: agentName, month, rows, workDays: 0, required: 0, requiredNet: 0,
    inShiftWork: 0, inShiftBreak: 0, breakTotal: 0, extraBreak: 0, outside: 0, overtime: 0, dayOffWork: 0, totalLogin: 0,
    missing: 0, missingShort: 0, missingNoShow: 0, late: 0, lateCompensated: 0, earlyLeave: 0,
    full: 0, latecomp: 0, short: 0, noshow: 0, overtimeDays: 0, dayOffDays: 0, leave: {}, inprogress: 0, nodata: 0
  };
  rows.forEach(r => {
    s.totalLogin += r.totalLogin;
    s.breakTotal += r.breakTotal;
    if (r.category === "leave") { s.leave[r.kind] = (s.leave[r.kind] || 0) + 1; s.dayOffWork += r.dayOffWork; s.outside += r.dayOffWork; return; }
    if (r.category === "dayoff-worked") { s.dayOffDays++; s.dayOffWork += r.dayOffWork; s.outside += r.dayOffWork; return; }
    if (r.category === "inprogress") { s.inprogress++; return; }
    if (r.category === "nodata") { s.nodata++; return; }
    if (!r.judged) return;
    s.workDays++;
    s.required += HR_REQUIRED_MIN;
    s.requiredNet += HR_NET_REQUIRED_MIN;
    s.inShiftWork += r.inShiftWork;
    s.inShiftBreak += r.inShiftBreak;
    s.extraBreak += r.extraBreak;
    s.outside += r.outsideWork + r.outsideBreak;
    s.overtime += r.overtime;
    if (r.overtimeFlag) s.overtimeDays++;
    s.late += r.late;
    s.earlyLeave += r.earlyLeave;
    s[r.category] = (s[r.category] || 0) + 1;
    if (r.category === "latecomp") s.lateCompensated += r.late;
    if (r.category === "short") s.missingShort += r.missing;
    if (r.category === "noshow") s.missingNoShow += r.missing;
    s.missing += r.missing;
  });
  return s;
}

// ------------------------------------------------------------
// 🌐 السيرفر (نفس تقارير CC Pulse بالظبط)
// ------------------------------------------------------------
async function hrFetchMonth(month, agent) {
  const params = new URLSearchParams({ mode: "month", month, token: localStorage.getItem("sessionToken") || "", t: String(Date.now()) });
  if (agent) { params.set("action", "agentStatusReport"); params.set("name", agent); }
  else params.set("action", "allAgentsLoginTotals");
  const res = await fetch(`${GOOGLE_SHEET_API_URL}?${params.toString()}`, { method: "GET", redirect: "follow" }).then(r => r.json());
  if (!res || res.status === "error") throw new Error((res && res.message) || "Could not load the hours");
  return res;
}

// إيجنتس الشهر من الروستر (من غير Queue Support - مالهمش شيفتات)
function hrRosterAgents(month) {
  const [y, m] = month.split("-").map(Number);
  return (Array.isArray(rosterData) ? rosterData : [])
    .filter(a => a.year === y && a.month === m && a.dept !== "Queue Support")
    .map(a => ({ name: a.name, dept: a.dept }))
    .sort((a, b) => (a.dept || "").localeCompare(b.dept || "") || a.name.localeCompare(b.name));
}

// ------------------------------------------------------------
// 🖥️ التاب
// ------------------------------------------------------------
function hrInitHours() {
  const monthSel = document.getElementById("hrHoursMonth");
  const agentSel = document.getElementById("hrHoursAgent");
  if (!monthSel || !agentSel) return;
  const admin = (typeof leaveIsAdminUser === "function") && leaveIsAdminUser();
  const now = hrNowInfo();

  // الشهور اللي في الروستر (الأحدث الأول)
  const months = [];
  (Array.isArray(rosterData) ? rosterData : []).forEach(a => {
    const k = `${a.year}-${String(a.month).padStart(2, "0")}`;
    if (months.indexOf(k) === -1 && k <= now.month) months.push(k);
  });
  if (months.indexOf(now.month) === -1) months.push(now.month);
  months.sort().reverse();
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const keepM = monthSel.value || hrHoursState.month || now.month;
  monthSel.innerHTML = months.map(k => `<option value="${k}">${names[parseInt(k.slice(5), 10) - 1]} ${k.slice(0, 4)}</option>`).join("");
  monthSel.value = months.indexOf(keepM) !== -1 ? keepM : months[0];

  const agentGroup = document.getElementById("hrHoursAgentGroup");
  const exportBtn = document.getElementById("hrHoursExportBtn");
  if (agentGroup) agentGroup.style.display = admin ? "" : "none";
  if (exportBtn) exportBtn.style.display = admin ? "" : "none";
  if (admin) {
    const keepA = agentSel.value || hrHoursState.agent || "";
    const list = hrRosterAgents(monthSel.value);
    agentSel.innerHTML = `<option value="">👥 All agents</option>` + list.map(a => `<option value="${leaveEsc(a.name)}">${leaveEsc(a.name)}</option>`).join("");
    agentSel.value = (keepA === "" || list.some(a => a.name === keepA)) ? keepA : "";
  }
  hrLoadHours(false);
}

async function hrLoadHours(force) {
  const monthSel = document.getElementById("hrHoursMonth");
  const agentSel = document.getElementById("hrHoursAgent");
  const box = document.getElementById("hrHoursResult");
  if (!monthSel || !box) return;
  const admin = (typeof leaveIsAdminUser === "function") && leaveIsAdminUser();
  const month = monthSel.value;
  const agent = admin ? (agentSel ? agentSel.value : "") : ((typeof leaveMyName === "function") ? leaveMyName() : "");

  if (!force && hrHoursState.data && hrHoursState.month === month && hrHoursState.agent === agent) { hrRenderHours(); return; }
  hrHoursState = { month, agent, data: null, loading: true, error: "", detailAgent: "" };
  box.innerHTML = `<div class="swap-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading ${agent ? leaveEsc(agent) + "'s" : "all agents'"} hours for ${leaveEsc(month)}...</div>`;
  try {
    const res = await hrFetchMonth(month, agent);
    if (hrHoursState.month !== month || hrHoursState.agent !== agent) return; // اليوزر غيّر الاختيار في النص
    const tracking = res.trackingStartDate || null;
    let summaries;
    if (agent) {
      summaries = [hrComputeAgentMonth(agent, month, res.days || [], tracking)];
    } else {
      const byName = {};
      (res.agents || []).forEach(a => { byName[a.name] = a; });
      summaries = hrRosterAgents(month).map(a => {
        const s = hrComputeAgentMonth(a.name, month, byName[a.name] ? byName[a.name].days : [], tracking);
        s.dept = a.dept;
        return s;
      });
    }
    hrHoursState.data = { summaries, trackingStartDate: tracking };
  } catch (err) {
    hrHoursState.error = err.message || String(err);
  }
  hrHoursState.loading = false;
  hrRenderHours();
}

function hrCard(label, value, sub, tone) {
  return `<div class="ccp-metric-card hr-card ${tone ? "hr-" + tone : ""}">
      <div class="ccp-metric-label">${label}</div>
      <div class="ccp-metric-value">${value}</div>
      ${sub ? `<div class="hr-card-sub">${sub}</div>` : ""}
    </div>`;
}

function hrSummaryHtml(s) {
  const leaveTxt = Object.keys(s.leave).map(k => `${k}: ${s.leave[k]}`).join(" · ");
  return `
    <div class="hr-section-title">🗓️ Hours · ${leaveEsc(s.agent)} · ${leaveEsc(s.month)}</div>
    <div class="ccp-metrics-grid">
      ${hrCard("Required (shift days)", hrFmt(s.required), `${s.workDays} working day${s.workDays === 1 ? "" : "s"} × 8h (7:30 work + 30m break)`)}
      ${hrCard("✅ Worked inside shift", hrFmt(s.inShiftWork + s.inShiftBreak), `work ${hrFmt(s.inShiftWork)} + break ${hrFmt(s.inShiftBreak)}`, "good")}
      ${hrCard("⏱️ Worked outside shift", hrFmt(s.outside), `overtime ${hrFmt(s.overtime)} · days off ${hrFmt(s.dayOffWork)}`)}
      ${hrCard("📊 Total worked", hrFmt(s.totalLogin), "inside + outside")}
      ${hrCard("📐 Balance vs required", hrFmtSigned(hrBalance(s)), `${hrFmt(s.totalLogin)} worked of ${hrFmt(s.required)} required`, Math.abs(hrBalance(s)) <= HR_GRACE_MIN ? "" : (hrBalance(s) > 0 ? "good" : "bad"))}
      ${hrCard("➖ Missing time", hrFmt(s.missing), `short days ${hrFmt(s.missingShort)} · no show ${hrFmt(s.missingNoShow)}`, s.missing > 0 ? "bad" : "good")}
      ${hrCard("☕ Break taken", hrFmt(s.breakTotal), s.extraBreak > 0 ? `<b style="color:#b91c1c">extra ${hrFmt(s.extraBreak)}</b> over 30m/day` : "within 30m/day")}
      ${hrCard("⏰ Late (total)", hrFmt(s.late), `compensated ${hrFmt(s.lateCompensated)}`)}
      ${hrCard("🚪 Left early (total)", hrFmt(s.earlyLeave), "before shift end")}
    </div>
    <div class="hr-section-title">📋 Days</div>
    <div class="ccp-metrics-grid">
      ${hrCard("✅ Full day", s.full || 0, "on time, full 7:30", "good")}
      ${hrCard("🔁 Late – compensated", s.latecomp || 0, `late ${hrFmt(s.lateCompensated)}, covered from break`, "warn")}
      ${hrCard("⚠️ Short day", s.short || 0, `missing ${hrFmt(s.missingShort)}`, (s.short || 0) ? "bad" : "")}
      ${hrCard("🚫 No Show", s.noshow || 0, `missing ${hrFmt(s.missingNoShow)}`, (s.noshow || 0) ? "bad" : "")}
      ${hrCard("➕ Overtime days", s.overtimeDays, `total ${hrFmt(s.overtime)}`)}
      ${hrCard("⭐ Worked day off", s.dayOffDays, `total ${hrFmt(s.dayOffWork)}`)}
      ${hrCard("🌴 Leave days", Object.values(s.leave).reduce((a, b) => a + b, 0), leaveTxt || "none")}
      ${s.inprogress ? hrCard("⏳ In progress", s.inprogress, "today's shift not finished") : ""}
    </div>`;
}

function hrDaysTableHtml(s) {
  const rows = s.rows.filter(r => r.category !== "upcoming").map(r => {
    const tone = { full: "good", latecomp: "warn", short: "bad", noshow: "bad", "dayoff-worked": "info", leave: "leave" }[r.category] || "";
    const dash = v => (v > 0 ? hrFmt(v) : "—");
    return `<tr class="hr-row-${tone}">
      <td>${leaveEsc(leaveFmtDate(r.date))}</td>
      <td>${leaveEsc(r.code || "-")}</td>
      <td>${leaveEsc(r.firstLogin || "—")}</td>
      <td>${leaveEsc(r.lastLogout || "—")}</td>
      <td>${r.isWorkDay && r.category !== "nodata" ? hrFmt(r.inShiftWork) : "—"}</td>
      <td>${r.isWorkDay && r.category !== "nodata" ? hrFmt(r.inShiftBreak) : "—"}</td>
      <td>${dash(r.outsideWork + r.outsideBreak)}</td>
      <td><b>${dash(r.totalLogin)}</b></td>
      <td>${dash(r.late)}</td>
      <td>${dash(r.earlyLeave)}</td>
      <td>${dash(r.extraBreak)}</td>
      <td>${r.missing > 0 ? `<b style="color:#b91c1c">${hrFmt(r.missing)}</b>` : "—"}</td>
      <td>${dash(r.overtime)}</td>
      <td class="hr-status"><b>${leaveEsc(r.categoryLabel)}</b>${r.overtimeFlag ? " <span class='hr-ot'>➕ OT</span>" : ""}${r.note ? ` <span style="opacity:.7">(${leaveEsc(r.note)})</span>` : ""}</td>
    </tr>`;
  }).join("");
  return `<div class="table-scroll-wrapper"><table class="roster-full-table hr-hours-table">
      <thead><tr><th>Day</th><th>Roster</th><th>First login</th><th>Last logout</th><th>In shift (work)</th><th>In shift (break)</th>
      <th>Outside shift</th><th>Total</th><th>Late</th><th>Left early</th><th>Extra break</th><th>Missing</th><th>Overtime</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
}

// الفرق بين اللي اشتغله فعلاً (الإجمالي كله) واللي المفروض يشتغله: "+1h 20m" زيادة أو "−2h 05m" نقص
function hrBalance(s) {
  return s.totalLogin - s.required;
}

function hrFmtSigned(min) {
  min = Math.round(min || 0);
  if (Math.abs(min) <= HR_GRACE_MIN) return "±0";
  return (min > 0 ? "+" : "−") + hrFmt(Math.abs(min));
}

function hrBalanceCell(min) {
  const cls = Math.abs(min) <= HR_GRACE_MIN ? "hr-zero" : (min > 0 ? "hr-pos" : "hr-neg");
  return `<td class="${cls}"><b>${hrFmtSigned(min)}</b></td>`;
}

function hrTeamTableHtml(list) {
  const cnt = (v, cls) => `<td class="${v ? (cls || "") : "hr-zero"}">${v}</td>`;
  const tm = (v, cls) => `<td class="${v > 0 ? (cls || "") : "hr-zero"}">${hrFmt(v)}</td>`;
  const row = (s, i) => `
      <td>${s.workDays}</td>
      <td>${hrFmt(s.required)}</td>
      <td>${hrFmt(s.inShiftWork + s.inShiftBreak)}</td>
      <td>${hrFmt(s.outside)}</td>
      <td><b>${hrFmt(s.totalLogin)}</b></td>
      ${hrBalanceCell(hrBalance(s))}
      ${tm(s.missing, "hr-neg")}
      ${cnt(s.full || 0)}${cnt(s.latecomp || 0)}${cnt(s.short || 0, "hr-neg")}${cnt(s.noshow || 0, "hr-neg")}
      ${tm(s.overtime)}${cnt(s.dayOffDays)}${tm(s.extraBreak, "hr-neg")}`;
  const rows = list.map((s, i) => `<tr>
      <td class="hr-agent" data-hr-hours-agent="${i}">${leaveEsc(s.agent)}</td>
      <td>${leaveEsc(s.dept || "")}</td>${row(s, i)}
    </tr>`).join("");

  // 📊 إجمالي التيم كله
  const sum = { workDays: 0, required: 0, inShiftWork: 0, inShiftBreak: 0, outside: 0, totalLogin: 0, missing: 0, full: 0, latecomp: 0, short: 0, noshow: 0, overtime: 0, dayOffDays: 0, extraBreak: 0 };
  list.forEach(s => Object.keys(sum).forEach(k => { sum[k] += s[k] || 0; }));
  const totalRow = list.length ? `<tr class="hr-total-row"><td class="hr-agent-total">📊 Team total</td><td>${list.length} agents</td>${row(sum)}</tr>` : "";

  return `<div class="table-scroll-wrapper"><table class="roster-full-table hr-balance-table">
      <thead><tr><th>Agent</th><th>Team</th><th>Work days</th><th>Required</th><th>In shift</th><th>Outside</th><th>Total</th>
      <th title="Total worked − Required">Balance</th><th>Missing</th>
      <th>✅ Full</th><th>🔁 Late-comp</th><th>⚠️ Short</th><th>🚫 No Show</th><th>➕ Overtime</th><th>⭐ Day off</th><th>☕ Extra break</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="16">No agents in the roster for this month.</td></tr>`}${totalRow}</tbody></table></div>
    <div class="swap-info" style="margin-top:8px;"><b>Balance</b> = Total worked − Required (green = worked more, red = worked less). <b>Missing</b> only counts time missing inside the shift, even if he worked extra outside it. Click an agent to see every day.</div>`;
}

function hrRenderHours() {
  const box = document.getElementById("hrHoursResult");
  if (!box) return;
  if (hrHoursState.loading) return;
  if (hrHoursState.error) { box.innerHTML = `<div class="swap-empty"><i class="fa-solid fa-triangle-exclamation"></i> ${leaveEsc(hrHoursState.error)}</div>`; return; }
  if (!hrHoursState.data) { box.innerHTML = ""; return; }
  const list = hrHoursState.data.summaries;
  const tracking = hrHoursState.data.trackingStartDate;
  const trackNote = tracking && tracking.slice(0, 7) === hrHoursState.month
    ? `<div class="swap-info" style="margin-bottom:10px;">ℹ️ Login tracking started on <b>${leaveEsc(tracking)}</b> - days before it are not counted.</div>` : "";

  if (hrHoursState.agent) {
    const s = list[0];
    box.innerHTML = trackNote + hrSummaryHtml(s) + hrDaysTableHtml(s);
    return;
  }
  const detail = list.find(s => s.agent === hrHoursState.detailAgent);
  box.innerHTML = trackNote + hrTeamTableHtml(list) +
    (detail ? `<div id="hrHoursDetail" class="hr-detail">${hrSummaryHtml(detail)}${hrDaysTableHtml(detail)}</div>` : "");
}

// ------------------------------------------------------------
// 📥 Export to Excel (أدمن) - شيت Summary + شيت Days (كل إيجنت × كل يوم)
// ------------------------------------------------------------
async function hrExportHours() {
  if (!hrHoursState.data) { alert("Load the hours first."); return; }
  const btn = document.getElementById("hrHoursExportBtn");
  const old = btn ? btn.innerHTML : "";
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...'; }
  try {
    if (typeof ccpLoadExcelJs_ !== "function") throw new Error("Excel library not available");
    const ExcelJS = await ccpLoadExcelJs_();
    const wb = new ExcelJS.Workbook();
    const h = min => Math.round((min || 0) / 60 * 100) / 100; // ساعات بكسور عشان المرتبات
    const styleHeader = row => row.eachCell(c => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    const list = hrHoursState.data.summaries;
    const ws = wb.addWorksheet("Summary", { views: [{ state: "frozen", xSplit: 1, ySplit: 2 }] });
    ws.addRow([`HR & Payroll - Hours - ${hrHoursState.month}  (hours in decimals, e.g. 7.5 = 7h 30m)`]).font = { bold: true, size: 13 };
    const head = ["Agent", "Team", "Work days", "Required (h)", "Required net work (h)", "In shift work (h)", "In shift break (h)", "Outside shift (h)",
      "Overtime (h)", "Day-off work (h)", "Total worked (h)", "Balance vs required (h)", "Missing (h)", "Missing - short days (h)", "Missing - no show (h)",
      "Late total (h)", "Late compensated (h)", "Left early (h)", "Break total (h)", "Extra break (h)",
      "Full days", "Late-compensated days", "Short days", "No Show days", "Overtime days", "Worked day off days", "Leave days"];
    styleHeader(ws.addRow(head));
    list.forEach(s => ws.addRow([s.agent, s.dept || "", s.workDays, h(s.required), h(s.requiredNet), h(s.inShiftWork), h(s.inShiftBreak), h(s.outside),
      h(s.overtime), h(s.dayOffWork), h(s.totalLogin), h(hrBalance(s)), h(s.missing), h(s.missingShort), h(s.missingNoShow),
      h(s.late), h(s.lateCompensated), h(s.earlyLeave), h(s.breakTotal), h(s.extraBreak),
      s.full || 0, s.latecomp || 0, s.short || 0, s.noshow || 0, s.overtimeDays, s.dayOffDays, Object.values(s.leave).reduce((a, b) => a + b, 0)]));
    ws.columns.forEach((c, i) => { c.width = i === 0 ? 24 : 14; });

    const wd = wb.addWorksheet("Days", { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
    styleHeader(wd.addRow(["Agent", "Date", "Roster", "Status", "First login", "Last logout", "In shift work (h)", "In shift break (h)",
      "Outside shift (h)", "Total (h)", "Late (min)", "Left early (min)", "Extra break (min)", "Missing (min)", "Overtime (min)"]));
    list.forEach(s => s.rows.filter(r => r.category !== "upcoming").forEach(r => {
      wd.addRow([s.agent, r.date, r.code, r.categoryLabel.replace(/^[^\w]+/, "") + (r.overtimeFlag ? " + Overtime" : ""), r.firstLogin, r.lastLogout,
        h(r.inShiftWork), h(r.inShiftBreak), h(r.outsideWork + r.outsideBreak), h(r.totalLogin),
        Math.round(r.late), Math.round(r.earlyLeave), Math.round(r.extraBreak), Math.round(r.missing), Math.round(r.overtime)]);
    }));
    wd.columns.forEach((c, i) => { c.width = i === 0 ? 24 : (i === 3 ? 26 : 13); });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hr-hours_${hrHoursState.month}${hrHoursState.agent ? "_" + hrHoursState.agent.replace(/\s+/g, "-") : ""}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Could not export: " + (err.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = old; }
  }
}

document.addEventListener("click", function (ev) {
  const cell = ev.target && ev.target.closest && ev.target.closest("[data-hr-hours-agent]");
  if (!cell || !hrHoursState.data) return;
  const s = hrHoursState.data.summaries[parseInt(cell.getAttribute("data-hr-hours-agent"), 10)];
  if (!s) return;
  hrHoursState.detailAgent = hrHoursState.detailAgent === s.agent ? "" : s.agent;
  hrRenderHours();
  const d = document.getElementById("hrHoursDetail");
  if (d) d.scrollIntoView({ behavior: "smooth", block: "start" });
});
