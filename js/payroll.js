// ============================================================
// 💰 HR & Payroll > Payroll - مرتبات تيم مصر (أدمن بس) + تعليمات الإيجنت في كارت My Day
// ============================================================
// القواعد اللي Faris طلبها (24 نوفمبر):
//   - مرتب شهري لكل إيجنت (أول مرة 17,000 جنيه للكل) والأدمن يقدر يزوده أو ينقصه لكل واحد لوحده.
//   - اليوم = المرتب ÷ 30 / الساعة = اليوم ÷ 8 / الدقيقة = الساعة ÷ 60.
//   - أيام الأوف و Leave و Sick Leave و Public Holiday و Day in Lieu و Compensated مدفوعة - مفيش خصم.
//   - كل يوم شيفت: التأخير + أي وقت مش لوجن جوه الشيفت (Away / خروج بدري) + البريك الزيادة عن 30 دقيقة
//     = دقايق لازم تتعوض. (اتغيرت 25 نوفمبر) ليها فرصتين: نفس اليوم بعد الشيفت، أو يوم الشغل اللي بعده
//     في الروستر (قبل الشيفت أو بعده) - جوه نفس الشهر بس. اللي مايتعوضش بيتخصم بالدقيقة. (شوف payAllocateMonth)
//   - إنهاء الخدمة (End service): الأدمن يقفل مرتب الإيجنت لحد يوم معين (عمود End Date في شيت Payroll).
//   - Export to Excel: Summary + Days (لحد اللحظة دي).
//   - البريك 30 دقيقة حق الإيجنت: لو أخد أقل، الباقي مابيعوضش أي تأخير.
//   - الشغل قبل الشيفت في نفس اليوم مش بيعوض أوتوماتيك - الأدمن بس يقدر يفعّله ليوم معين (PayrollEarlyCredits).
//     (في يوم الشغل اللي بعده، قبل الشيفت بيتحسب أوتوماتيك)
//   - No Show = ماعملش لوجن خالص في اليوم ده -> اليوم كله بيتخصم.
//     (اتغيرت 24 نوفمبر: لو اشتغل أي وقت - حتى أقل من نص الشيفت - بيتحسب يوم عادي: البريك 30د مدفوع
//      والخصم بالدقايق اللي فاتته بس، ومش بتتكتب كلمة No Show)
//     لو اتعمله Compensation واتوافق عليه، اليوم بيبقى Compensated في الروستر فمفيش خصم.
//   - مفيش أوفر تايم دلوقتي.
//   - الأيام اللي لسه فرصة تعويضها ماخلصتش بتبقى "مفتوحة" (⏳) ومش بتدخل في الخصومات.
//   - الأرقام كلها بتتحسب لحظيًا من AgentStatusLog - أي تعديل في الأكتيفيتي لوج بيظهر مع أول Refresh
//     (والتاب بيعمل Refresh لوحده كل دقيقة).
//   - الإيجنت بيشوف صفحة Payroll بتاعته هو بس + التعليمات والدقايق اللي عليه في كارت My Day.
// ============================================================

const PAY_DAYS_DIVISOR = 30;
const PAY_GRACE_MIN = 1;          // سماح دقيقة واحدة (نفس الـ Tardy)
const PAY_AUTO_REFRESH_MS = 60000;

let payrollState = {
  meLoaded: false, meLoading: null, member: false,
  agents: [], earlyCredits: [], settingsLoaded: false,
  month: "", report: null, loading: false, error: "", detail: "", busy: false
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

  // 🚫 No Show (يوم خلص): ماعملش لوجن خالص -> اليوم كله بيتخصم. لو اشتغل أي وقت بيتحسب بالدقايق زي أي يوم
  const noShow = !day || !day.firstLogin || r.loginTotal <= PAY_GRACE_MIN;
  if (!r.isToday && noShow) {
    r.status = "noshow"; r.final = true;
    r.paidWorked = r.workTotal * rates.minute;
    r.deduction = Math.max(0, rates.day - r.paidWorked);
    r.label = "🚫 No Show";
    r.reason = `No Show - didn't log in, full day deducted (${payMoney(rates.day)})` +
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

// ------------------------------------------------------------
// 📅 دورة المرتب (اتغيرت 25 نوفمبر): من يوم 26 لحد يوم 25 في الشهر اللي بعده
//   - اسم الدورة = شهر القبض: دورة "2026-12" = 26 نوفمبر -> 25 ديسمبر
//   - التعويض بيعدّي الشهور عادي (يوم 31 يتعوض يوم 1)
//   - الخصم بيتحسب في الدورة اللي فيها آخر يوم تعويض له (settle day):
//     يعني تأخير يوم 25 اللي اتعوض/اتخصم يوم 26 بيروح للدورة الجديدة -> الدورة القديمة بتتقفل يوم 25 بالليل وماتتغيرش
//   - (دي حاجة جوا الإدارة - مش مكتوبة في تعليمات الإيجنت)
// ------------------------------------------------------------
const PAY_CYCLE_END_DAY = 25;
const PAY_CYCLE_LOOK_DAYS = 14; // أيام قبل/بعد الدورة عشان نعرف يوم الشغل اللي قبلها/بعدها

function payAddDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function payDatesBetween(a, b) {
  const out = [];
  for (let d = a; d <= b; d = payAddDays(d, 1)) out.push(d);
  return out;
}

// الدورة اللي التاريخ ده فيها (اسمها شهر القبض)
function payCycleOf(dateStr) {
  const y = parseInt(dateStr.slice(0, 4), 10), m = parseInt(dateStr.slice(5, 7), 10), d = parseInt(dateStr.slice(8, 10), 10);
  if (d <= PAY_CYCLE_END_DAY) return dateStr.slice(0, 7);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

function payCycleRange(key) {
  const y = parseInt(key.slice(0, 4), 10), m = parseInt(key.slice(5, 7), 10);
  const end = `${key}-${String(PAY_CYCLE_END_DAY).padStart(2, "0")}`;
  const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  const start = `${py}-${String(pm).padStart(2, "0")}-${String(PAY_CYCLE_END_DAY + 1).padStart(2, "0")}`;
  return { key, start, end, dates: payDatesBetween(start, end) };
}

function payCycleLabel(key) {
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const r = payCycleRange(key);
  return `${names[parseInt(key.slice(5), 10) - 1]} ${key.slice(0, 4)} (${leaveFmtDate(r.start)} – ${leaveFmtDate(r.end)})`;
}

// الشهور (التقويم) اللي محتاجين داتا اللوجن بتاعها عشان نحسب من a لـ b (لحد النهاردة بس)
function payMonthsBetween(a, b) {
  const today = hrNowInfo().today;
  if (b > today) b = today;
  const out = [];
  for (let k = a.slice(0, 7); k <= b.slice(0, 7);) {
    out.push(k);
    const y = parseInt(k.slice(0, 4), 10), m = parseInt(k.slice(5, 7), 10);
    k = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  return out;
}

// بيسحب داتا اللوجن لكذا شهر ويجمعها: { agents: [{name, days}], trackingStartDate }
async function payFetchDays(fromDate, toDate, agent) {
  const months = payMonthsBetween(fromDate, toDate);
  const reps = await Promise.all(months.map(m => hrFetchMonth(m, agent || "").catch(err => {
    // شهر قديم مالوش داتا مايوقفش الحسبة - غير الشهر الحالي
    if (m === hrNowInfo().month) throw err;
    return null;
  })));
  const byName = {};
  let tracking = null;
  reps.forEach(rep => {
    if (!rep) return;
    if (rep.trackingStartDate && (!tracking || rep.trackingStartDate < tracking)) tracking = rep.trackingStartDate;
    if (agent) {
      byName[agent] = (byName[agent] || []).concat(rep.days || []);
    } else {
      (rep.agents || []).forEach(a => { byName[a.name] = (byName[a.name] || []).concat(a.days || []); });
    }
  });
  return { agents: Object.keys(byName).map(n => ({ name: n, days: byName[n] })), trackingStartDate: tracking };
}

// ملخص شهر لإيجنت واحد
// 🔁 التعويض (اتغير 25 نوفمبر): الوقت الفايت في يوم ليه فرصتين بس:
//   1) نفس اليوم - بعد الشيفت (وقبل الشيفت لو الأدمن علّم عليه بس)
//   2) يوم الشغل اللي بعده في الروستر (بيعدّي الأوف والإجازات) - قبل الشيفت أو بعده، أوتوماتيك
//   - التعويض بيعدّي الشهور عادي (اتغيرت 25 نوفمبر) - الخصم بيتحسب في دورة المرتب بتاعة آخر يوم تعويض
//   - الوقت الزيادة في يوم التعويض بيغطي دين اليوم اللي قبله الأول (آخر فرصة ليه)، والباقي يغطي اليوم نفسه
//   - اللي مايتعوضش لحد آخر يوم التعويض بيتخصم - مابيترحلش أكتر من يوم شغل واحد
//   - لحد ما فرصة التعويض تخلص اليوم بيفضل "مفتوح" (⏳) ومش بيدخل في الخصومات
//   - انتهاء الخدمة (End service): الأيام بعد آخر يوم مش بتتحسب، والتعويض مايعدّيش آخر يوم
function payIsWorkRow(r) {
  return !!(r.range && !r.kind && r.code !== "" && r.status !== "paid" && r.status !== "off" && r.status !== "noroster" && r.status !== "nodata" && r.status !== "ended");
}

function payAllocateMonth(rows, rates, now) {
  const work = rows.filter(payIsWorkRow);
  let carry = null; // { row, amount }
  const closeRow = (r, amount, open) => {
    r.remaining = amount > PAY_GRACE_MIN ? amount : 0;
    r.deduction = r.remaining * rates.minute;
    r.open = !!open && r.remaining > 0;
    r.final = !r.open;
  };
  for (let i = 0; i < work.length; i++) {
    const r = work[i];
    if (r.status === "upcoming") {
      // يوم التعويض لسه ماجاش -> الدين مفتوح لحد آخره
      if (carry) { closeRow(carry.row, carry.amount, true); carry = null; }
      break;
    }
    let before = r.status === "noshow" ? 0 : r.beforeWork;
    let after = r.status === "noshow" ? 0 : r.afterWork;

    // 1) دين يوم الشغل اللي فات (النهاردة آخر فرصة ليه)
    if (carry) {
      const c = carry.row;
      const b = Math.min(carry.amount, before); before -= b; carry.amount -= b;
      const a = Math.min(carry.amount, after); after -= a; carry.amount -= a;
      c.nextDate = r.date; c.nextBefore = b; c.nextAfter = a;
      closeRow(c, carry.amount, r.isToday); // لو يوم التعويض هو النهاردة -> لسه مفتوح
      carry = null;
    }

    // 2) اليوم نفسه
    if (r.status === "noshow") continue; // No Show بيتخصم يوم كامل (اتحسب في payComputeDay)
    let own = r.owed;
    r.sameAfter = Math.min(own, after); after -= r.sameAfter; own -= r.sameAfter;
    r.sameBefore = r.earlyOn ? Math.min(own, before) : 0; before -= r.sameBefore; own -= r.sameBefore;
    r.comp = r.sameAfter + r.sameBefore;
    if (own <= PAY_GRACE_MIN) { closeRow(r, 0, false); continue; }
    const next = work[i + 1];
    r.deadline = next ? next.date : r.date;
    if (next) {
      carry = { row: r, amount: own };
      r.remaining = own; r.open = true; r.final = false; // هيتقفل في اللفة الجاية
    } else {
      closeRow(r, own, r.isToday); // مفيش يوم شغل تاني في الشهر -> النهاردة آخر فرصة
    }
  }
  if (carry) closeRow(carry.row, carry.amount, true);

  // الحالة + السبب لكل يوم
  rows.forEach(r => {
    if (!payIsWorkRow(r) || r.status === "upcoming" || r.status === "noshow" || r.status === "notstarted" && !r.owed) return;
    r.madeUp = (r.sameAfter || 0) + (r.sameBefore || 0) + (r.nextBefore || 0) + (r.nextAfter || 0);
    if (r.open) { r.status = "open"; r.label = "⏳ Can still make up"; }
    else if (r.remaining > 0) { r.status = "deducted"; r.label = "➖ Deducted"; }
    else if (r.owed > 0) { r.status = "madeup"; r.label = "🔁 Made up"; }
    else if (!r.isToday) { r.status = "ok"; r.label = "✅ On time"; }
    if (r.owed > 0) {
      const how = [];
      if (r.sameAfter) how.push(`${payMin(r.sameAfter)} after the shift`);
      if (r.sameBefore) how.push(`${payMin(r.sameBefore)} before the shift (admin)`);
      if (r.nextBefore || r.nextAfter) how.push(`${payMin((r.nextBefore || 0) + (r.nextAfter || 0))} on ${leaveFmtDate(r.nextDate)}`);
      r.reason = r.parts.join(" · ") + ` = missed ${payMin(r.owed)}; made up ${how.length ? how.join(" + ") : "0m"}` +
        (r.open ? ` → ${payMin(r.remaining)} still open until end of ${leaveFmtDate(r.deadline || r.date)}`
          : (r.remaining > 0 ? ` → ${payMin(r.remaining)} × ${payMoney(rates.minute)} = ${payMoney(r.deduction)}` : " → nothing deducted"));
    }
  });
}

// ملخص دورة مرتب لإيجنت واحد (من 26 لـ 25) - بيحسب كمان أيام قبل/بعد الدورة عشان التعويض اللي بيعدّي الحدود
function payComputeAgentCycle(payRow, agentName, key, reportDays, trackingStartDate) {
  const now = hrNowInfo();
  const rates = payRates(payRow.salary);
  const cyc = payCycleRange(key);
  const byDate = {};
  (reportDays || []).forEach(d => { byDate[d.date] = d; });
  const endDate = payRow.endDate || "";
  const ext = payDatesBetween(payAddDays(cyc.start, -PAY_CYCLE_LOOK_DAYS), payAddDays(cyc.end, PAY_CYCLE_LOOK_DAYS));
  const rows = ext.map(date => {
    if (endDate && date > endDate) {
      return { date, code: "", kind: null, range: null, status: "ended", label: "After end of service", final: true, owed: 0, remaining: 0, deduction: 0, parts: [] };
    }
    return payComputeDay(agentName, date, byDate[date], trackingStartDate, now, rates, payEarlyOn(agentName, date, payRow.agent));
  });
  payAllocateMonth(rows, rates, now);

  // اليوم اللي الخصم بيتحسب فيه = آخر فرصة تعويض (يوم الشغل اللي بعده لو اترحّل)
  rows.forEach(r => { r.settleDate = r.status === "noshow" ? r.date : (r.nextDate || r.deadline || r.date); r.inCycle = r.date >= cyc.start && r.date <= cyc.end; });
  const counts = r => r.settleDate >= cyc.start && r.settleDate <= cyc.end;

  const cycleLen = cyc.dates.length;
  let elapsed = cyc.dates.filter(d => d <= now.today).length;
  let paidDays = cycleLen;
  if (endDate && endDate <= cyc.end) {
    paidDays = endDate < cyc.start ? 0 : cyc.dates.filter(d => d <= endDate).length;
    elapsed = Math.min(elapsed, paidDays);
  }

  const s = {
    payName: payRow.agent, agent: agentName, month: key, cycle: cyc, rates, endDate,
    // الأيام اللي بتتعرض: أيام الدورة + أي يوم قبلها خصمه بيتحسب في الدورة دي (ديون يوم 25 اللي فات)
    rows: rows.filter(r => r.inCycle || (r.date < cyc.start && counts(r) && (r.owed > 0 || r.status === "noshow"))),
    daysInMonth: cycleLen, elapsed, paidDays,
    ended: !!(endDate && endDate <= now.today),
    shouldToDate: rates.salary * elapsed / cycleLen,
    deductions: 0, deductedMin: 0, deductedDays: 0, noShows: 0,
    todayRow: null, openAmount: 0, openMin: 0
  };
  rows.forEach(r => {
    if (r.isToday && payIsWorkRow(r)) s.todayRow = r;
    if (!counts(r)) return;
    if (r.open) { s.openAmount += r.deduction; s.openMin += r.remaining; return; }
    if (!r.final || !(r.deduction > 0)) return;
    s.deductions += r.deduction;
    s.deductedDays++;
    if (r.status === "noshow") s.noShows++; else s.deductedMin += r.remaining;
  });
  s.netToDate = Math.max(0, s.shouldToDate - s.deductions);
  s.monthAfter = Math.max(0, rates.salary * paidDays / cycleLen - s.deductions);
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
  payrollState.meName = res.me || "";
  payrollState.meLoaded = true;
  payrollState.meToken = payToken();
  if (Array.isArray(res.agents)) {
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
  if (!payIsAdmin() && !payrollState.member) return;
  const exportBtn = document.getElementById("payExportBtn");
  if (exportBtn) exportBtn.style.display = payIsAdmin() ? "" : "none";
  const monthSel = document.getElementById("payMonth");
  if (!monthSel) return;
  const now = hrNowInfo();
  // 📅 الدورات (26 -> 25) - من شهور الروستر + الدورة الحالية
  const cur = payCycleOf(now.today);
  const keys = [];
  (Array.isArray(rosterData) ? rosterData : []).forEach(a => {
    const k = `${a.year}-${String(a.month).padStart(2, "0")}`;
    if (keys.indexOf(k) === -1 && k <= cur) keys.push(k);
  });
  if (keys.indexOf(cur) === -1) keys.push(cur);
  keys.sort().reverse();
  const keep = monthSel.value || payrollState.month || cur;
  monthSel.innerHTML = keys.map(k => `<option value="${k}">${leaveEsc(payCycleLabel(k))}${k === cur ? " - current" : ""}</option>`).join("");
  monthSel.value = keys.indexOf(keep) !== -1 ? keep : keys[0];
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
  if (!silent) box.innerHTML = `<div class="swap-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading the payroll for ${leaveEsc(payCycleLabel(month))}...</div>`;
  try {
    // الإيجنت بيسحب تقريره هو بس، والأدمن كل الإيجنتس - الدورة + أيام قبلها/بعدها (التعويض بيعدّي الحدود)
    const cyc = payCycleRange(month);
    const [settings, report] = await Promise.all([payFetchSettings(),
      payFetchDays(payAddDays(cyc.start, -PAY_CYCLE_LOOK_DAYS), payAddDays(cyc.end, PAY_CYCLE_LOOK_DAYS), payIsAdmin() ? "" : leaveMyName())]);
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
  const admin = payIsAdmin();
  const cyc = payCycleRange(month);
  const list = [], problems = [];
  (payrollState.agents || []).forEach(p => {
    // 🚪 خدمته انتهت قبل الشهر ده -> مش بيظهر
    if (p.endDate && p.endDate < cyc.start) return;
    // الإيجنت: نفسه بس (بالاسم بتاعه في الروستر)
    let matches = admin ? payRosterMatches(p.agent, month) : [leaveMyName()];
    if (admin && !matches.length) matches = payRosterMatches(p.agent, cyc.start.slice(0, 7)); // روستر الشهر اللي فات
    if (matches.length !== 1) {
      problems.push({ p, matches });
      return;
    }
    const name = matches[0];
    list.push(payComputeAgentCycle(p, name, month, byName[name] ? byName[name].days : [], tracking));
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
  const t = { salary: 0, should: 0, ded: 0, net: 0, open: 0, openAgents: 0 };
  list.forEach(s => {
    t.salary += s.rates.salary; t.should += s.shouldToDate; t.ded += s.deductions; t.net += s.netToDate;
    if (s.openMin > 0) { t.open += s.openAmount; t.openAgents++; }
  });
  const isCurrent = payrollState.month === payCycleOf(hrNowInfo().today);
  const first = list[0];
  const period = first ? (isCurrent ? `${leaveEsc(payCycleLabel(payrollState.month))} · day ${first.elapsed} of ${first.daysInMonth}` : leaveEsc(payCycleLabel(payrollState.month))) : leaveEsc(payCycleLabel(payrollState.month));
  const at = payrollState.loadedAt ? payrollState.loadedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
  const q = v => String(v).replace(/'/g, "\\'");
  const admin = payIsAdmin();
  // 👤 الإيجنت: التفاصيل بتاعته مفتوحة على طول
  if (!admin && list[0]) payrollState.detail = list[0].agent;

  const problemsHtml = problems.map(x => `<div class="swap-info" style="margin-top:8px;"><span class="swap-late"><i class="fa-solid fa-triangle-exclamation"></i>
      <b>${leaveEsc(x.p.agent)}</b> ${x.matches.length ? `matches more than one agent in the roster (${x.matches.map(leaveEsc).join(", ")}).` : "was not found in this month's roster."}</span></div>`).join("");

  const rows = list.map(s => {
    const key = leaveEsc(s.agent);
    const todayBadge = (s.openMin > 0
      ? ` <span class="pay-today-badge" title="Still has a chance to make this up (same day after the shift or next working day) - not deducted yet">⏳ ${payMin(s.openMin)} open</span>` : "") +
      (s.endDate ? ` <span class="pay-today-badge pay-ended-badge" title="Service ended - salary counted until this day">🚪 ended ${leaveEsc(leaveFmtDate(s.endDate))}</span>` : "");
    const endBtn = !admin ? "" : (s.endDate
      ? `<button type="button" class="swap-btn pay-mini-btn" onclick="payEndService('${q(key)}', true)" title="Undo end of service"><i class="fa-solid fa-rotate-left"></i></button>`
      : `<button type="button" class="swap-btn pay-mini-btn" onclick="payEndService('${q(key)}', false)" title="End of service - close his salary until a day"><i class="fa-solid fa-door-open"></i></button>`);
    const dedSub = s.deductions > 0
      ? `<div class="hr-card-sub">${s.deductedMin ? payMin(s.deductedMin) + " late/missed" : ""}${s.deductedMin && s.noShows ? " + " : ""}${s.noShows ? s.noShows + " No Show" : ""}</div>` : "";
    return `<tr class="${payrollState.detail === s.agent ? "pay-row-open" : ""}">
      <td class="hr-agent" onclick="${admin ? `payToggleDetail('${q(key)}')` : ""}"><i class="fa-solid fa-chevron-${payrollState.detail === s.agent ? "down" : "right"}" style="font-size:10px;opacity:.5;"></i> ${key}${todayBadge}</td>
      <td>${admin ? `<input type="number" min="0" step="100" class="combo-input pay-salary-input" id="paySal-${key}" value="${s.rates.salary}">
          <button type="button" class="swap-btn swap-btn-primary pay-mini-btn" onclick="paySaveSalary('${q(key)}')" title="Save salary"><i class="fa-solid fa-floppy-disk"></i></button>${endBtn}` : `<b>${payMoney(s.rates.salary)}</b>`}
          <div class="hr-card-sub">Day ${payMoney(s.rates.day)} · Hour ${payMoney(s.rates.hour)} · Min ${payMoney(s.rates.minute)}</div></td>
      <td class="pay-big">${payMoney(s.shouldToDate)}</td>
      <td class="pay-big ${s.deductions > 0 ? "hr-neg" : "hr-zero"}">${s.deductions > 0 ? "−" + payMoney(s.deductions) : "0.00"}${dedSub}</td>
      <td class="pay-big"><b>${payMoney(s.netToDate)}</b></td>
    </tr>${payrollState.detail === s.agent ? `<tr class="hr-details"><td colspan="5">${payDetailHtml(s)}</td></tr>` : ""}`;
  }).join("");

  box.innerHTML = `
    <div class="hr-section-title">💰 ${admin ? "Payroll" : "My payroll"} · ${period} <span style="opacity:.55;font-size:12px;font-weight:600;">updated ${leaveEsc(at)} · refreshes every minute</span></div>
    <div class="pay-big-cards">
      <div class="pay-big-card"><div class="pay-big-label">💵 Should get (if committed)</div><div class="pay-big-value">${payMoney(t.should)} <span>${cur}</span></div></div>
      <div class="pay-big-card pay-bad"><div class="pay-big-label">➖ Deductions</div><div class="pay-big-value">${t.ded > 0 ? "−" : ""}${payMoney(t.ded)} <span>${cur}</span></div></div>
      <div class="pay-big-card pay-good"><div class="pay-big-label">✅ Will get</div><div class="pay-big-value">${payMoney(t.net)} <span>${cur}</span></div></div>
    </div>
    ${t.openAgents ? `<div class="swap-info" style="margin-top:8px;">⏳ <b>Still open:</b> ${admin ? `${t.openAgents} agent${t.openAgents === 1 ? " has" : "s have"} time they can still make up (${payMoney(t.open)} ${cur}) - the same day after the shift or on their next working day. It's only deducted if they don't.` : `you have ${payMin(list[0] ? list[0].openMin : 0)} you can still make up (${payMoney(t.open)} ${cur}) - the same day after your shift or on your next working day. It's only deducted if you don't.`}</div>` : ""}
    ${admin ? problemsHtml : ""}
    <div class="table-scroll-wrapper" style="margin-top:12px;">
      <table class="roster-full-table hr-balance-table pay-table">
        <thead><tr><th>Agent</th><th>Monthly salary (${leaveEsc(cur)})</th><th>Should get</th><th>Deductions</th><th>Will get</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5">${admin ? "No agents in the payroll." : "Your name was not found in this month's roster."}</td></tr>`}
          ${list.length && admin ? `<tr class="hr-total-row"><td class="hr-agent-total">Team total</td><td>${payMoney(t.salary)}</td>
            <td class="pay-big">${payMoney(t.should)}</td><td class="pay-big ${t.ded > 0 ? "hr-neg" : ""}">${t.ded > 0 ? "−" : ""}${payMoney(t.ded)}</td><td class="pay-big"><b>${payMoney(t.net)}</b></td></tr>` : ""}
        </tbody>
      </table>
    </div>
    <div class="swap-info" style="margin-top:10px;">
      ${admin ? "Click an agent to see why. " : ""}Late / away / left early / break over 30m can be made up the <b>same day after the shift</b> or on the <b>next working day</b> (before or after the shift) - what's left is deducted per minute.
      No Show (didn't log in at all) = the whole day is deducted; if he worked part of the shift, only the missed minutes are deducted. Days off, Leave, Sick Leave, Public Holiday, Day in Lieu and Compensated are paid.
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
  const early = (r.beforeWork > PAY_GRACE_MIN && r.status !== "noshow" && !payIsAdmin())
    ? (r.earlyOn ? ` <span class="pay-early">✓ ${payMin(r.beforeWork)} before the shift counted by admin</span>` : "")
    : (r.beforeWork > PAY_GRACE_MIN && r.status !== "noshow")
    ? `<label class="pay-early" title="Admin only: count the time worked before the shift on the same day">
         <input type="checkbox" ${r.earlyOn ? "checked" : ""} onchange="paySetEarly('${q(leaveEsc(s.agent))}','${r.date}',this.checked)">
         count ${payMin(r.beforeWork)} before the shift (same day)</label>` : "";

  if (r.status === "noshow") {
    return `<div class="pay-line pay-line-bad">🔴 ${day}: No Show - didn't log in${arrow}<b>whole day deducted = ${payMoney(r.deduction)}</b></div>`;
  }
  const what = payMissedWords(r);
  const how = [];
  if (r.sameAfter >= 1) how.push(`stayed ${payMin(r.sameAfter)} after the shift`);
  if (r.sameBefore >= 1) how.push(`${payMin(r.sameBefore)} before the shift (admin)`);
  const nextTotal = (r.nextBefore || 0) + (r.nextAfter || 0);
  if (nextTotal >= 1) {
    const bits = [];
    if (r.nextBefore >= 1) bits.push(`${payMin(r.nextBefore)} before`);
    if (r.nextAfter >= 1) bits.push(`${payMin(r.nextAfter)} after`);
    how.push(`made up ${payMin(nextTotal)} on ${leaveEsc(leaveFmtDate(r.nextDate))} (${bits.join(" + ")} the shift)`);
  }
  const madeUp = how.length ? how.join(" + ") : "nothing made up yet";
  // 📅 (أدمن بس) خصم بيتحسب في دورة تانية - يوم 25 اللي اتعوض/اتخصم في الدورة الجديدة
  const cyc = s.cycle;
  const periodNote = !payIsAdmin() || !cyc ? "" :
    (r.date < cyc.start ? ` <span class="pay-period-note">from the previous period</span>` :
      ((r.settleDate || r.date) > cyc.end ? ` <span class="pay-period-note">→ counted in the next period</span>` : ""));
  const todayTag = r.isToday ? " (today)" : "";

  if (r.status === "open") {
    const until = r.deadline && r.deadline !== r.date ? `until end of ${leaveEsc(leaveFmtDate(r.deadline))}` : "until end of today";
    return `<div class="pay-line pay-line-open">⏳ ${day}${todayTag}: ${what || "missed time"}${arrow}${madeUp}${arrow}<b>${payMin(r.remaining)} still open</b> <span style="opacity:.7">(can make up ${until} - not deducted yet)</span>${periodNote}${early}</div>`;
  }
  if (r.status === "deducted") {
    return `<div class="pay-line pay-line-bad">🔴 ${day}: ${what}${arrow}${madeUp}${arrow}<b>deducted ${payMin(r.remaining)} = ${payMoney(r.deduction)}</b>${periodNote}${early}</div>`;
  }
  if (r.owed > 0) {
    return `<div class="pay-line pay-line-good">🟢 ${day}${todayTag}: ${what}${arrow}${madeUp}${arrow}<b>no deduction</b>${periodNote}${early}</div>`;
  }
  if (r.isToday) return `<div class="pay-line pay-line-good">🟢 ${day} (today): nothing missed so far${early}</div>`;
  return `<div class="pay-line">⚪ ${day}: on time${early}</div>`;
}

function payDetailHtml(s) {
  // كل الأيام اللي فيها وقت فايت بتظهر دايمًا (أحمر = اتخصم / أخضر = اتعوض / أصفر = لسه مفتوح)
  // + النهاردة + اليوم اللي الأدمن حسب فيه الشغل قبل الشيفت
  const show = r => r.status === "noshow" || (r.isToday && payIsWorkRow(r)) || r.owed > 0 || (r.earlyOn && r.beforeWork > 0);
  const lines = s.rows.filter(show).map(r => payDayLine(s, r)).join("");
  const ended = s.endDate ? `<div class="pay-line pay-line-bad">🚪 Service ended on <b>${leaveEsc(leaveFmtDate(s.endDate))}</b> - salary counted until that day only.</div>` : "";
  return `<div class="hr-detail">
    <div style="font-weight:800;margin-bottom:8px;">📋 ${leaveEsc(s.agent)}</div>
    ${ended}
    ${lines || `<div class="pay-line pay-line-good">✅ Nothing missed this month so far.</div>`}
  </div>`;
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

// 🚪 إنهاء الخدمة: المرتب بيتحسب لحد آخر يوم بس (والتعويض مابيعدّيش اليوم ده) - undo = يرجع عادي
function payEndService(agent, undo) {
  if (undo) {
    if (!confirm(`Undo end of service for ${agent}?\n\nHis salary will be counted for the whole month again.`)) return;
    payRun({ op: "setEndDate", agent, date: "" });
    return;
  }
  const today = hrNowInfo().today;
  const d = prompt(`End of service for ${agent}\n\nLast working day to pay (YYYY-MM-DD):`, today);
  if (d === null) return;
  const date = String(d).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { payMsg("⚠️ Please write the date like " + today, "error"); return; }
  if (!confirm(`Close ${agent}'s salary on ${leaveFmtDate(date)}?\n\nSalary and deductions are counted until that day only. Any time he still had to make up after it is deducted. You can undo this any time.`)) return;
  payRun({ op: "setEndDate", agent, date });
}

// 📥 Excel: شيت Summary (كل إيجنت) + شيت Days (كل يوم فيه وقت فايت / خصم) - لحد اللحظة دي
async function payExportExcel() {
  if (!payrollState.report) { alert("Load the payroll first."); return; }
  const btn = document.getElementById("payExportBtn");
  const old = btn ? btn.innerHTML : "";
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...'; }
  try {
    if (typeof ccpLoadExcelJs_ !== "function") throw new Error("Excel library not available");
    const ExcelJS = await ccpLoadExcelJs_();
    const wb = new ExcelJS.Workbook();
    const m2 = n => Math.round((n || 0) * 100) / 100;
    const styleHeader = row => row.eachCell(c => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    const { list } = payBuildSummaries();
    const cur = (payrollState.agents[0] && payrollState.agents[0].currency) || "EGP";
    const asOf = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const ws = wb.addWorksheet("Summary", { views: [{ state: "frozen", xSplit: 1, ySplit: 2 }] });
    ws.addRow([`Payroll - ${payCycleLabel(payrollState.month)} - as of ${asOf} (UAE) - amounts in ${cur}`]).font = { bold: true, size: 13 };
    styleHeader(ws.addRow(["Agent", "Monthly salary", "Day rate", "Hour rate", "Minute rate", "Days counted", "Should get (if committed)",
      "Deductions", "Will get", "Still open (can make up)", "Month salary after deductions", "Deducted minutes", "No Show days", "Service ended"]));
    const tot = { sal: 0, should: 0, ded: 0, net: 0, open: 0, month: 0 };
    list.forEach(s => {
      ws.addRow([s.agent, m2(s.rates.salary), m2(s.rates.day), m2(s.rates.hour), m2(s.rates.minute), s.elapsed, m2(s.shouldToDate),
        m2(s.deductions), m2(s.netToDate), m2(s.openAmount), m2(s.monthAfter), Math.round(s.deductedMin), s.noShows, s.endDate || ""]);
      tot.sal += s.rates.salary; tot.should += s.shouldToDate; tot.ded += s.deductions; tot.net += s.netToDate; tot.open += s.openAmount; tot.month += s.monthAfter;
    });
    const tr = ws.addRow(["Team total", m2(tot.sal), "", "", "", "", m2(tot.should), m2(tot.ded), m2(tot.net), m2(tot.open), m2(tot.month), "", "", ""]);
    tr.font = { bold: true };
    ws.columns.forEach((c, i) => { c.width = i === 0 ? 24 : 15; });

    const wd = wb.addWorksheet("Days", { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
    styleHeader(wd.addRow(["Agent", "Date", "Roster", "Status", "Late (min)", "Away (min)", "Left early (min)", "Extra break (min)", "Missed (min)",
      "Made up same day (min)", "Made up next working day (min)", "Next working day", "Deducted / open (min)", "Amount", "Counted in payroll", "Reason"]));
    list.forEach(s => s.rows.filter(r => r.status === "noshow" || r.owed > 0).forEach(r => {
      wd.addRow([s.agent, r.date, r.code, String(r.label || r.status).replace(/^[^\w]+/, ""),
        Math.round(r.late || 0), Math.round((r.away || 0) + (r.notLoggedNow || 0)), Math.round(r.leftEarly || 0), Math.round(r.extraBreak || 0), Math.round(r.owed || 0),
        Math.round((r.sameAfter || 0) + (r.sameBefore || 0)), Math.round((r.nextBefore || 0) + (r.nextAfter || 0)), r.nextDate || "",
        r.status === "noshow" ? "Full day" : Math.round(r.remaining || 0), r.open ? `open (${m2(r.deduction)})` : m2(r.deduction),
        payCycleOf(r.settleDate || r.date) === payrollState.month ? "This period" : "Next period", r.reason || ""]);
    }));
    wd.columns.forEach((c, i) => { c.width = i === 0 ? 22 : (i === 15 ? 70 : 13); });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${payrollState.month}_as-of-${hrNowInfo().today}.xlsx`;
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

function paySetEarly(agent, date, on) {
  payRun({ op: "earlyCredit", agent, date, on: !!on });
}

// ------------------------------------------------------------
// 👋 كارت My Day: تعليمات + الدقايق اللي على الإيجنت النهاردة (لتيم المرتبات بس - من غير أي فلوس)
// ------------------------------------------------------------
function payEnsureMe() {
  const tok = payToken();
  if (!tok) return Promise.resolve();
  // 🔄 يوزر تاني عمل لوجن في نفس الصفحة (من غير Refresh) -> ننسى بيانات اليوزر اللي قبله
  if (payrollState.meToken !== tok) {
    payrollState.meToken = tok;
    payrollState.meLoaded = false; payrollState.member = false;
    payrollState.agents = []; payrollState.earlyCredits = []; payrollState.report = null; payrollState.detail = "";
    payrollState.meRetryAt = 0;
  }
  if (payrollState.meLoaded) return Promise.resolve();
  if (payrollState.meLoading) return payrollState.meLoading;
  if (payrollState.meRetryAt && Date.now() < payrollState.meRetryAt) return Promise.resolve();
  payrollState.meLoading = payFetchSettings()
    .catch(err => {
      // فشل (نت / سيرفر) -> نحاول تاني بعد دقيقة بدل ما نعتبره مش من التيم على طول
      console.warn("Payroll: could not check membership -", err && err.message);
      payrollState.meRetryAt = Date.now() + 60000;
    })
    .then(() => {
      payrollState.meLoading = null;
      if (payrollState.meLoaded) console.log("Payroll: " + (payrollState.meName || "") + " member=" + payrollState.member);
      if (payrollState.member && typeof loadMyDayCard === "function") loadMyDayCard(typeof myDayCardCurrentDate !== "undefined" ? myDayCardCurrentDate : undefined);
    });
  return payrollState.meLoading;
}

// الإيجنت: داتا الشهر بتاعه (عشان التعويض في يوم الشغل اللي بعده) - كاش دقيقة
let payMyMonthCache = { key: "", at: 0, report: null, loading: false };

function payMyMonthData(agentName, dateStr) {
  // من 14 يوم قبل التاريخ لحد التاريخ (عشان دين يوم الشغل اللي فات حتى لو في شهر تاني)
  const from = payAddDays(dateStr, -PAY_CYCLE_LOOK_DAYS);
  const key = agentName + "|" + dateStr;
  const fresh = payMyMonthCache.key === key && payMyMonthCache.report && (Date.now() - payMyMonthCache.at < PAY_AUTO_REFRESH_MS);
  if (!fresh && !payMyMonthCache.loading) {
    payMyMonthCache.loading = true;
    payFetchDays(from, dateStr, agentName)
      .then(res => {
        const a = res.agents[0];
        payMyMonthCache = { key, at: Date.now(), report: { days: a ? a.days : [], trackingStartDate: res.trackingStartDate }, loading: false };
        if (typeof loadMyDayCard === "function") loadMyDayCard(typeof myDayCardCurrentDate !== "undefined" ? myDayCardCurrentDate : undefined);
      })
      .catch(() => { payMyMonthCache.loading = false; payMyMonthCache.at = Date.now(); payMyMonthCache.key = key; });
  }
  return payMyMonthCache.key === key ? payMyMonthCache.report : null;
}

function payrollMyDayHtml(agentName, dateStr, day, trackingStartDate) {
  if (!payrollState.meLoaded || payrollState.meToken !== payToken()) { payEnsureMe(); return ""; }
  if (!payrollState.member) return "";
  const now = hrNowInfo();
  const isToday = dateStr === now.today;
  const month = payCycleOf(dateStr);
  const payRow = (payrollState.agents && payrollState.agents[0]) || { agent: agentName, salary: 0 };

  // الشهر كله (لو جه) - وإلا النهاردة لوحده لحد ما الداتا توصل
  const rep = payMyMonthData(agentName, dateStr);
  let rows;
  if (rep && Array.isArray(rep.days)) {
    const days = rep.days.slice();
    if (day && !days.some(d => d.date === dateStr)) days.push(day);
    else if (day) for (let i = 0; i < days.length; i++) if (days[i].date === dateStr) days[i] = day; // داتا الكارت أحدث
    rows = payComputeAgentCycle(payRow, agentName, month, days, trackingStartDate || rep.trackingStartDate).rows;
  } else {
    rows = payComputeAgentCycle(payRow, agentName, month, day ? [day] : [], trackingStartDate).rows;
  }
  const r = rows.find(x => x.date === dateStr) || payComputeDay(agentName, dateStr, day, trackingStartDate, now, payRates(0), false);
  const work = rows.filter(payIsWorkRow);
  const idx = work.findIndex(x => x.date === dateStr);
  const nextWork = idx >= 0 ? work[idx + 1] : null;

  let shiftLine = "";
  if (r.range) shiftLine = `<b>${leaveEsc(r.code)}</b> · ${payClock(r.range[0])} – ${payClock(r.range[1])} · 8h = 7:30 work + 30m break`;
  else shiftLine = r.code ? `<b>${leaveEsc(r.code)}</b>` : "Not in the roster";

  const msgs = [];
  let tone = "info";
  // دين من يوم الشغل اللي فات - النهاردة آخر فرصة
  if (isToday) {
    const prev = rows.find(x => x.open && x.deadline === dateStr && x.date !== dateStr);
    if (prev) {
      tone = "bad";
      msgs.push(`⚠️ From <b>${leaveEsc(leaveFmtDate(prev.date))}</b> you still have <b>${payMin(prev.remaining)}</b> to make up - <b>today is your last chance</b> (before or after your shift), otherwise it will be deducted from your salary.`);
    }
  }

  if (r.status === "paid" || r.status === "off") {
    msgs.push(`🌴 ${leaveEsc(r.label)} - nothing to make up.`);
  } else if (r.status === "notstarted") {
    msgs.push(`⏰ Your shift starts at <b>${payClock(r.range[0])}</b>. Log in on time.`);
  } else if (r.status === "noshow") {
    tone = "bad";
    msgs.push(`🚫 No Show - you didn't log in this day, so the whole day is deducted (unless an admin approves a Compensation).`);
  } else if (r.status === "open" && r.date === dateStr) {
    tone = "bad";
    const chance = r.deadline && r.deadline !== r.date
      ? `today after your shift, or on your next shift <b>${leaveEsc(leaveFmtDate(r.deadline))}</b> (before or after it)`
      : `today after your shift`;
    msgs.push(`⚠️ You have <b>${payMin(r.remaining)}</b> to make up${isToday ? " today" : ""} (${leaveEsc(payMissedWords(r))})` +
      (r.madeUp >= 1 ? ` - already made up ${payMin(r.madeUp)}` : "") + `. Make it up ${chance} - <b>otherwise it will be deducted from your salary.</b>`);
  } else if (r.status === "deducted") {
    tone = "bad";
    msgs.push(`➖ You missed ${payMin(r.owed)} this day (${leaveEsc(payMissedWords(r))}), made up ${payMin(r.madeUp || 0)} → <b>${payMin(r.remaining)} deducted</b>.`);
  } else if (r.owed > 0) {
    if (tone !== "bad") tone = "good";
    msgs.push(`✅ You missed ${payMin(r.owed)} ${isToday ? "today" : "this day"} and made it all up. Thank you!`);
  } else if (r.status === "nodata") {
    msgs.push("No login data for this day.");
  } else if (payIsWorkRow(r)) {
    if (tone !== "bad") tone = "good";
    msgs.push(isToday ? `✅ No time to make up so far today. Keep it up!` : `✅ Full shift this day - nothing missed.`);
  }

  // ⏰ يقعد لحد إمتى عشان يخلّص كل اللي عليه النهاردة
  if (isToday && r.range) {
    const prev = rows.find(x => x.open && x.deadline === dateStr && x.date !== dateStr);
    const total = (prev ? prev.remaining : 0) + (r.status === "open" ? r.remaining : 0);
    if (total >= 1) {
      const endMin = r.range[1];
      const stayUntil = now.nowMin < endMin ? endMin + total : now.nowMin + total;
      msgs.push(`🕒 To clear everything today, stay logged in until <b>${payClock(Math.min(stayUntil, 1439))}</b>` + (now.nowMin < endMin ? " (if you don't miss any more time)." : "."));
    }
  }

  return `
    <div class="pay-myday pay-myday-${tone}">
      <div class="pay-myday-head"><i class="fa-solid fa-clipboard-check"></i> Your shift rules ${isToday ? "· today" : "· " + leaveEsc(leaveFmtDate(dateStr))}: ${shiftLine}</div>
      ${msgs.length ? `<div class="pay-myday-status">${msgs.join("<br>")}</div>` : ""}
      <ul class="pay-myday-rules">
        <li>Be logged in for your <b>whole shift</b> as per the roster.</li>
        <li>Your break is <b>30 minutes - it's your right, take it</b>. A shorter break does <b>not</b> make up for being late, and any minute over 30 must be made up.</li>
        <li>Late login, being logged out / away during the shift, leaving early, or a longer break → you have <b>2 chances</b> to make it up: the <b>same day after your shift</b>, or on your <b>next working day</b> (coming in before your shift or staying after it). Days off and leave in between don't count.</li>
        <li>Coming in early on the <b>same day</b> does not count as making up.</li>
        <li>Anything not made up by the end of your next working day is <b>deducted from your salary</b>.</li>
        <li>Not logging in at all (No Show) = the whole day is deducted, unless a Compensation (a day off worked) is approved. If you work part of the shift, only the missed minutes are deducted.</li>
        <li>Leave, Sick Leave, Public Holiday and Day in Lieu are paid - no deduction.</li>
      </ul>
    </div>`;
}
