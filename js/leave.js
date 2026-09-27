// ============================================================
// 🌴 LEAVE & SICK LEAVE + تعديل الروستر من الأدمن (Leave.gs في Google Apps Script)
// ============================================================
// - تاب "Leave" في صفحة الروستر: الإيجنت يقدّم على Leave أو Sick Leave (من تاريخ لتاريخ، من غير مهلة،
//   والسيك لازم معاه مرفق). الأدمن بيوافق أو يرفض من نفس التاب، ولما يوافق الروستر بيتحدث لوحده.
// - عدّاد أيام الإجازة (Leave / Sick Leave) بالتواريخ - بيتحسب من خانات الروستر نفسها، فأي إجازة
//   مكتوبة في الشيت بأي طريقة بتتعد.
// - الأدمن يقدر يدوس على أي خانة في جدول Full Monthly Roster ويغيّرها (Shift 1/2/3 / OFF / Leave / Sick Leave).
//   الإيجنت بيوصله تنبيه في البورتال بس.
// - مفيش Polling جديد: auth.js بيسأل السيرفر كل 15 ثانية أصلاً (checkForceLogout) والرد فيه
//   leaveChangedAt و rosterChangedAt - بنسحب القايمة/الروستر بس لما القيمة تتغير.
// ============================================================

const LEAVE_CODE = "Leave";
const SICK_LEAVE_CODE = "Sick Leave";
const ROSTER_WORK_SHIFTS = ["Shift 1", "Shift 2", "Shift 3"];
const PUBLIC_HOLIDAY_CODE = "Public Holiday";
const DAY_IN_LIEU_CODE = "Day in Lieu";
const COMPENSATED_CODE = "Compensated";
const COMPENSATION_TYPE = "Compensation";
const ROSTER_EDIT_CODES = ["Shift 1", "Shift 2", "Shift 3", "OFF", LEAVE_CODE, SICK_LEAVE_CODE, PUBLIC_HOLIDAY_CODE, DAY_IN_LIEU_CODE];
const LIEU_REASONS = ["Worked Public Holiday", "Worked Day Off"];
const LEAVE_MAX_FILE_BYTES = 10 * 1024 * 1024;
const LEAVE_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

let leaveState = { requests: [], notifications: [], compensations: [], lieuCredits: [], me: "", isAdmin: false, busy: false, loaded: false };
let leaveCompOptions = { agent: "", absent: [], worked: [], loading: false, error: "" };
let leaveLastSignal = null;
let leaveLastRosterSignal = null;

// ------------------------------------------------------------
// 🧰 أدوات
// ------------------------------------------------------------
function leaveEsc(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function leavePad(n) {
  return (n < 10 ? "0" : "") + n;
}

function leaveToday() {
  const u = getUAECurrentDate();
  return `${u.year}-${u.month}-${u.day}`;
}

// "2026-09-07" -> "7 Sep"
function leaveFmtDate(d) {
  const p = String(d || "").split("-");
  if (p.length !== 3) return String(d || "");
  return `${parseInt(p[2], 10)} ${LEAVE_MONTHS_SHORT[parseInt(p[1], 10) - 1]}`;
}

function leaveFmtRange(from, to) {
  return from === to ? leaveFmtDate(from) : `${leaveFmtDate(from)} – ${leaveFmtDate(to)}`;
}

// أي كود في الروستر -> "Leave" أو "Sick Leave" أو null (بيقبل الأشكال اللي ممكن الأدمن يكتبها بإيده في الشيت)
function rosterLeaveKind(code) {
  const c = String(code || "").trim().toLowerCase();
  if (c === "leave" || c === "annual leave" || c === "al" || c === "vacation") return LEAVE_CODE;
  if (c === "sick leave" || c === "sick" || c === "sl") return SICK_LEAVE_CODE;
  if (c === "public holiday" || c === "holiday" || c === "ph") return PUBLIC_HOLIDAY_CODE;
  if (c === "day in lieu" || c === "lieu" || c === "dil") return DAY_IN_LIEU_CODE;
  if (c === "compensated") return COMPENSATED_CODE;
  return null;
}

// ⭐ رصيد Day in Lieu مسجل لإيجنت في يوم (من LieuCredits) - أو null
function leaveLieuCreditFor(name, dateStr) {
  const wanted = String(name || "").trim().toLowerCase();
  return (leaveState.lieuCredits || []).find(c => c.date === dateStr && String(c.agent).trim().toLowerCase() === wanted) || null;
}

// 🔁 تعويض متوافق عليه: بيرجع { absentDate, workedDate } لو اليوم ده طرف فيه - أو null
function leaveCompensationFor(name, dateStr) {
  const wanted = String(name || "").trim().toLowerCase();
  return (leaveState.compensations || []).find(c => String(c.agent).trim().toLowerCase() === wanted && (c.absentDate === dateStr || c.workedDate === dateStr)) || null;
}

function leaveFmtDuration(sec) {
  sec = Math.round(sec || 0);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function rosterIsWorkShift(code) {
  return ROSTER_WORK_SHIFTS.indexOf(String(code || "").trim()) !== -1;
}

function leaveIcon(kind) {
  if (kind === SICK_LEAVE_CODE) return "fa-kit-medical";
  if (kind === PUBLIC_HOLIDAY_CODE) return "fa-flag";
  if (kind === DAY_IN_LIEU_CODE || kind === COMPENSATED_CODE || kind === COMPENSATION_TYPE) return "fa-arrows-rotate";
  return "fa-umbrella-beach";
}

function leaveToken() {
  return localStorage.getItem("sessionToken") || "";
}

function leaveMyName() {
  return leaveState.me || localStorage.getItem("userFullName") || localStorage.getItem("loggedInUser") || "";
}

function leaveIsAdminUser() {
  return leaveState.isAdmin || (typeof isAdmin === "function" && isAdmin());
}

// كل التواريخ من from لـ to (الاتنين داخلين)
function leaveDatesBetween(from, to) {
  const out = [];
  const a = from.split("-").map(Number), b = to.split("-").map(Number);
  const d = new Date(Date.UTC(a[0], a[1] - 1, a[2]));
  const end = new Date(Date.UTC(b[0], b[1] - 1, b[2]));
  while (d.getTime() <= end.getTime() && out.length < 400) {
    out.push(`${d.getUTCFullYear()}-${leavePad(d.getUTCMonth() + 1)}-${leavePad(d.getUTCDate())}`);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// كود خانة إيجنت في تاريخ من rosterData - أو null لو مش موجود في الروستر للشهر ده
function leaveRosterCode(name, dateStr) {
  if (!Array.isArray(rosterData) || !name || !dateStr) return null;
  const p = dateStr.split("-").map(Number);
  const wanted = String(name).trim().toLowerCase();
  const entry = rosterData.find(a => String(a.name).trim().toLowerCase() === wanted && a.month === p[1] && a.year === p[0]);
  if (!entry) return null;
  return String((entry.schedule && entry.schedule[p[2]]) || "").trim();
}

// ------------------------------------------------------------
// 🔢 العدّاد: Leave / Sick Leave / Public Holiday / Compensated / Day in Lieu لإيجنت في فترة
// (من خانات الروستر نفسها + رصيد LieuCredits للـ Day in Lieu المستحق)
// ------------------------------------------------------------
function leaveCountFor(name, fromDate, toDate) {
  const out = { leave: [], sick: [], holiday: [], compensated: [], lieuUsed: [], lieuEarned: [] };
  if (!name) return out;
  const wanted = String(name).trim().toLowerCase();
  const key = { [LEAVE_CODE]: "leave", [SICK_LEAVE_CODE]: "sick", [PUBLIC_HOLIDAY_CODE]: "holiday", [COMPENSATED_CODE]: "compensated", [DAY_IN_LIEU_CODE]: "lieuUsed" };
  (Array.isArray(rosterData) ? rosterData : []).forEach(entry => {
    if (String(entry.name).trim().toLowerCase() !== wanted || !entry.schedule) return;
    const daysInMonth = new Date(entry.year, entry.month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${entry.year}-${leavePad(entry.month)}-${leavePad(d)}`;
      if ((fromDate && dateStr < fromDate) || (toDate && dateStr > toDate)) continue;
      const k = key[rosterLeaveKind(entry.schedule[d])];
      if (k && out[k].indexOf(dateStr) === -1) out[k].push(dateStr);
    }
  });
  (leaveState.lieuCredits || []).forEach(c => {
    if (String(c.agent).trim().toLowerCase() !== wanted) return;
    if ((fromDate && c.date < fromDate) || (toDate && c.date > toDate)) return;
    if (out.lieuEarned.indexOf(c.date) === -1) out.lieuEarned.push(c.date);
  });
  Object.keys(out).forEach(k => out[k].sort());
  return out;
}

// بلوك العداد: عدد الأيام + التواريخ نفسها
function leaveCounterHtml(name, fromDate, toDate, title) {
  const c = leaveCountFor(name, fromDate, toDate);
  const dates = list => list.length ? list.map(leaveFmtDate).join(", ") : "—";
  const item = (cls, icon, label, list) => `
    <div class="leave-counter-item ${cls}">
      <div class="leave-counter-top"><i class="fa-solid ${icon}"></i> ${label}: <b>${list.length}</b> day${list.length === 1 ? "" : "s"}</div>
      <div class="leave-counter-dates">${dates(list)}</div>
    </div>`;
  const left = c.lieuEarned.length - c.lieuUsed.length;
  const lieu = `
    <div class="leave-counter-item is-lieu">
      <div class="leave-counter-top"><i class="fa-solid fa-arrows-rotate"></i> Day in Lieu: earned <b>${c.lieuEarned.length}</b> · taken <b>${c.lieuUsed.length}</b> · left <b style="${left < 0 ? "color:#b91c1c" : ""}">${left}</b></div>
      <div class="leave-counter-dates">⭐ Earned: ${dates(c.lieuEarned)}<br>🔁 Taken: ${dates(c.lieuUsed)}</div>
    </div>`;
  return `<div class="leave-counter">
      <div class="leave-counter-title"><i class="fa-solid fa-calendar-check"></i> ${leaveEsc(title || "Leave counter")}</div>
      <div class="leave-counter-grid">
        ${item("is-leave", "fa-umbrella-beach", "Leave", c.leave)}
        ${item("is-sick", "fa-kit-medical", "Sick Leave", c.sick)}
        ${item("is-holiday", "fa-flag", "Public Holiday", c.holiday)}
        ${item("is-comp", "fa-arrows-rotate", "Compensated", c.compensated)}
        ${lieu}
      </div>
    </div>`;
}

// ------------------------------------------------------------
// 🌐 السيرفر
// ------------------------------------------------------------
function leavePost(payload) {
  return fetch(GOOGLE_SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ token: leaveToken() }, payload))
  }).then(r => r.json());
}

function leaveFetchList() {
  const token = leaveToken();
  if (!token) return Promise.reject(new Error("Not logged in"));
  const url = GOOGLE_SHEET_API_URL + "?action=leaveList&t=" + Date.now() + "&token=" + encodeURIComponent(token);
  return fetch(url, { method: "GET", redirect: "follow" })
    .then(r => r.json())
    .then(res => {
      if (!res || res.status !== "success") throw new Error((res && res.message) || "Failed to load leave requests");
      leaveState.requests = Array.isArray(res.requests) ? res.requests : [];
      leaveState.notifications = Array.isArray(res.notifications) ? res.notifications : [];
      leaveState.compensations = Array.isArray(res.compensations) ? res.compensations : [];
      leaveState.lieuCredits = Array.isArray(res.lieuCredits) ? res.lieuCredits : [];
      leaveState.me = res.me || leaveState.me;
      leaveState.isAdmin = !!res.isAdmin;
      leaveState.loaded = true;
      leaveUpdateBadges();
      leaveShowNotifications();
      if (typeof notesUpdateBell === "function") notesUpdateBell();
      return res;
    });
}

// 🔔 بيتنادى من auth.js مع كل checkForceLogout (كل 15 ثانية)
function leaveOnServerSignal(leaveValue, rosterValue) {
  if (!localStorage.getItem("loggedInUser") || !leaveToken()) {
    leaveLastSignal = null;
    leaveLastRosterSignal = null;
    if (leaveState.requests.length || leaveState.notifications.length) {
      leaveState = { requests: [], notifications: [], compensations: [], lieuCredits: [], me: "", isAdmin: false, busy: false, loaded: false };
      leaveUpdateBadges();
    }
    return;
  }

  // 📅 الروستر اتغير من السكريبت (موافقة إجازة / تعديل أدمن) -> نسحبه من جديد
  const rv = String(rosterValue === undefined || rosterValue === null ? "0" : rosterValue);
  if (leaveLastRosterSignal === null) {
    leaveLastRosterSignal = rv; // أول مرة بعد فتح الصفحة: الروستر لسه متحمّل أصلاً
  } else if (rv !== leaveLastRosterSignal) {
    leaveLastRosterSignal = rv;
    if (typeof fetchAllDataFromGoogleSheet === "function") {
      Promise.resolve(fetchAllDataFromGoogleSheet()).then(leaveAfterRosterRefresh).catch(() => {});
    }
  }

  // 🌴 قايمة الإجازات / التنبيهات
  const v = String(leaveValue === undefined || leaveValue === null ? "0" : leaveValue);
  if (v === leaveLastSignal) return;
  const isFirst = (leaveLastSignal === null);
  leaveLastSignal = v;
  if (isFirst && v === "0") return; // مفيش ولا طلب ولا تعديل اتعمل على السيرفر أصلاً

  leaveFetchList().then(() => {
    if (leaveTabVisible()) leaveRenderTab();
    leaveAfterRosterRefresh();
    if (typeof renderFullMonthlyTable === "function") renderFullMonthlyTable();
  }).catch(() => { /* هدوء - هيتعاد مع الإشارة الجاية */ });
}

// بعد ما الروستر يتسحب من جديد: نحدّث اللي مش بيتحدث لوحده في core.js
function leaveAfterRosterRefresh() {
  const agentTab = document.getElementById("tab-agent-view");
  if (agentTab && agentTab.style.display === "block" && typeof renderAgentLookup === "function") renderAgentLookup();
  if (leaveTabVisible()) leaveRenderTab();
}

function leaveTabVisible() {
  const tab = document.getElementById("tab-leave-view");
  const page = document.getElementById("roster-page");
  return !!(tab && tab.style.display === "block" && page && !page.classList.contains("hidden-page"));
}

// ------------------------------------------------------------
// 🔴 البادج + الفقاعة (للأدمن: طلبات مستنية موافقته)
// ------------------------------------------------------------
function leavePendingForMe() {
  return leaveState.requests.filter(r => r.canDecide).length;
}

function leaveUpdateBadges() {
  const n = leavePendingForMe();
  const badge = document.getElementById("leaveTabBadge");
  if (badge) {
    badge.textContent = String(n);
    badge.style.display = n > 0 ? "inline-block" : "none";
  }

  let pill = document.getElementById("leaveNotifyPill");
  const loggedIn = !!localStorage.getItem("loggedInUser");
  const lookingAtIt = leaveTabVisible();
  if (n > 0 && loggedIn && !lookingAtIt) {
    if (!pill) {
      pill = document.createElement("button");
      pill.id = "leaveNotifyPill";
      pill.className = "leave-notify-pill";
      pill.onclick = openLeaveFromNotification;
      document.body.appendChild(pill);
    }
    pill.innerHTML = `<i class="fa-solid fa-umbrella-beach"></i> ${n} leave request${n > 1 ? "s" : ""} waiting for approval`;
    pill.style.display = "block";
  } else if (pill) {
    pill.style.display = "none";
  }
}

function openLeaveFromNotification() {
  if (typeof navigateTo === "function") navigateTo("roster-page");
  switchRosterTab("leave-view");
}

// ------------------------------------------------------------
// 🔔 تنبيهات الإيجنت (الأدمن غيّر شيفته / رد على طلبه) - كل تنبيه بيظهر مرة واحدة بس
// ------------------------------------------------------------
function leaveSeenKey() {
  return "leaveSeenNotifs:" + String(localStorage.getItem("loggedInUser") || "").toLowerCase();
}

function leaveGetSeen() {
  try {
    const raw = localStorage.getItem(leaveSeenKey());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function leaveSetSeen(list) {
  try { localStorage.setItem(leaveSeenKey(), JSON.stringify(list.slice(-200))); } catch (e) { /* مش مهم */ }
}

function leaveNotificationText(n) {
  const by = n.by ? ` by <b>${leaveEsc(n.by)}</b>` : "";
  if (n.kind === "change") {
    return `<i class="fa-solid fa-calendar-days"></i> Your roster changed on <b>${leaveEsc(leaveFmtDate(n.date))}</b>: ` +
      `${leaveEsc(n.from || "-")} → <b>${leaveEsc(n.to)}</b>${by}`;
  }
  const verb = n.status === "Approved" ? "approved ✅" : (n.status === "Rejected" ? "rejected ❌" : "cancelled");
  if (n.type === COMPENSATION_TYPE) {
    return `<i class="fa-solid fa-arrows-rotate"></i> Your <b>Compensation</b> (absent ${leaveEsc(leaveFmtDate(n.from))} ↔ worked ${leaveEsc(leaveFmtDate(n.to))}) was <b>${verb}</b>${by}` +
      (n.note ? `<div class="leave-toast-note">“${leaveEsc(n.note)}”</div>` : "");
  }
  return `<i class="fa-solid ${leaveIcon(n.type)}"></i> Your <b>${leaveEsc(n.type)}</b> (${leaveEsc(leaveFmtRange(n.from, n.to))}) was <b>${verb}</b>${by}` +
    (n.note ? `<div class="leave-toast-note">“${leaveEsc(n.note)}”</div>` : "");
}

// نص التنبيه من غير HTML (للجرس 🔔 وإشعار سطح المكتب)
function leaveNotificationPlain(n) {
  const by = n.by ? ` by ${n.by}` : "";
  if (n.kind === "change") {
    return { title: "📅 Your roster changed", text: `${leaveFmtDate(n.date)}: ${n.from || "-"} → ${n.to}${by}` };
  }
  const verb = n.status === "Approved" ? "approved ✅" : (n.status === "Rejected" ? "rejected ❌" : "cancelled");
  if (n.type === COMPENSATION_TYPE) {
    return { title: `🔁 Compensation ${verb}`, text: `Absent ${leaveFmtDate(n.from)} ↔ worked ${leaveFmtDate(n.to)}${by}${n.note ? ` — “${n.note}”` : ""}` };
  }
  return { title: `${n.type === SICK_LEAVE_CODE ? "🤒" : "🌴"} ${n.type} ${verb}`, text: `${leaveFmtRange(n.from, n.to)}${by}${n.note ? ` — “${n.note}”` : ""}` };
}

function leavePendingPlain(r) {
  const icon = r.type === COMPENSATION_TYPE ? "🔁" : (r.type === SICK_LEAVE_CODE ? "🤒" : "🌴");
  const what = r.type === COMPENSATION_TYPE ? `absent ${leaveFmtDate(r.from)} ↔ worked ${leaveFmtDate(r.to)}` : `${leaveFmtRange(r.from, r.to)} · ${(r.days || []).length} day${(r.days || []).length === 1 ? "" : "s"}`;
  return { title: `${icon} ${r.type} request — waiting for approval`, text: `${r.agent} · ${what}` };
}

// 🔔 عناصر الجرس (notes.js -> notesBellItems بتناديها):
//   الأدمن: كل طلب مستني موافقته (بيفضل ظاهر لحد ما يتردّ عليه)
//   أي يوزر: تنبيهاته اللي لسه ماشافهاش (رد على طلبه / الأدمن غيّر شيفته)
function leaveBellSeenKey() {
  return "leaveBellSeen:" + String(localStorage.getItem("loggedInUser") || "").toLowerCase();
}

function leaveBellGetSeen() {
  try { const a = JSON.parse(localStorage.getItem(leaveBellSeenKey()) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

function leaveBellSetSeen(list) {
  try { localStorage.setItem(leaveBellSeenKey(), JSON.stringify(list.slice(-300))); } catch (e) { /* مش مهم */ }
}

function leaveBellItems() {
  if (!localStorage.getItem("loggedInUser")) return [];
  const items = [];
  leaveState.requests.filter(r => r.canDecide).forEach(r => {
    const t = leavePendingPlain(r);
    items.push({ id: "pend:" + r.id, overdue: false, title: t.title, text: t.text, sort: "0" + r.createdAt });
  });
  const seen = leaveBellGetSeen();
  leaveState.notifications.filter(n => seen.indexOf(n.id) === -1).forEach(n => {
    const t = leaveNotificationPlain(n);
    items.push({ id: "n:" + n.id, overdue: false, title: t.title, text: t.text, sort: "1" + n.at });
  });
  return items;
}

// بيتنادى لما اليوزر يفتح تاب Leave - كل تنبيهاته تتعلّم إنها اتشافت
function leaveMarkAllBellSeen() {
  const seen = leaveBellGetSeen();
  leaveState.notifications.forEach(n => { if (seen.indexOf(n.id) === -1) seen.push(n.id); });
  leaveBellSetSeen(seen);
  if (typeof notesUpdateBell === "function") notesUpdateBell();
}

function leaveShowNotifications() {
  const fresh = [];

  // تنبيهات اليوزر (رد على طلبه / تغيير في شيفته) - كل واحد بيطلع Toast مرة واحدة بس
  const seen = leaveGetSeen();
  leaveState.notifications.filter(n => seen.indexOf(n.id) === -1).forEach(n => {
    fresh.push({ key: n.id, html: leaveNotificationText(n), plain: leaveNotificationPlain(n) });
  });

  // 👑 الأدمن: طلب جديد مستني موافقته
  leaveState.requests.filter(r => r.canDecide && seen.indexOf("pend:" + r.id) === -1).forEach(r => {
    const t = leavePendingPlain(r);
    fresh.push({ key: "pend:" + r.id, html: `<b>${leaveEsc(t.title)}</b><br>${leaveEsc(t.text)}`, plain: t });
  });

  if (!fresh.length) return;

  let box = document.getElementById("leaveToastBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "leaveToastBox";
    box.className = "leave-toast-box";
    document.body.appendChild(box);
  }
  fresh.slice(-5).forEach(f => {
    const t = document.createElement("div");
    t.className = "leave-toast";
    t.innerHTML = `<div class="leave-toast-text">${f.html}</div><button type="button" class="leave-toast-close" title="Dismiss">&times;</button>`;
    t.querySelector(".leave-toast-close").onclick = (e) => { e.stopPropagation(); t.remove(); };
    t.onclick = () => { t.remove(); openLeaveFromNotification(); };
    t.style.cursor = "pointer";
    box.appendChild(t);
    setTimeout(() => t.remove(), 20000);
    // 🖥️ إشعار سطح المكتب (نفس إذن الريمايندرز في notes.js)
    if (typeof notesDesktopNotify === "function") notesDesktopNotify("leave-" + f.key, f.plain.title, f.plain.text, false, null);
  });
  // بيتعلّم إنه طلع Toast - عشان مايطلعش تاني بعد Refresh (بس بيفضل في الجرس 🔔 لحد ما يتشاف)
  leaveSetSeen(seen.concat(fresh.map(f => f.key)));
}

// ------------------------------------------------------------
// 📝 تاب Leave
// ------------------------------------------------------------
function initLeaveTab() {
  leaveMarkAllBellSeen();
  const today = leaveToday();
  const fromEl = document.getElementById("leaveFromInput");
  const toEl = document.getElementById("leaveToInput");
  if (fromEl && !fromEl.value) fromEl.value = today;
  if (toEl && !toEl.value) toEl.value = fromEl ? fromEl.value : today;
  leaveShowMsg("", "");
  leaveRenderTab();
  leaveFetchList()
    .then(() => { leaveMarkAllBellSeen(); leaveRenderTab(); })
    .catch(err => {
      const box = document.getElementById("leaveListsContainer");
      if (box && !leaveState.loaded) box.innerHTML = `<div class="swap-empty"><i class="fa-solid fa-triangle-exclamation"></i> ${leaveEsc(err.message)}</div>`;
    });
}

function leaveRenderTab() {
  leaveUpdateForm();
  leaveRenderCounter();
  leaveRenderLists();
  leaveUpdateBadges();
}

function leaveShowMsg(text, kind) {
  const el = document.getElementById("leaveFormMsg");
  if (!el) return;
  el.textContent = text || "";
  el.className = "swap-msg" + (kind ? " swap-msg-" + kind : "");
  el.style.display = text ? "block" : "none";
}

// أيام الشغل اللي هتتحسب إجازة (من rosterData) - نفس القاعدة اللي على السيرفر
function leavePreviewDays(from, to) {
  const me = leaveMyName();
  const out = { work: [], skipped: 0, missingMonth: null };
  leaveDatesBetween(from, to).forEach(d => {
    const code = leaveRosterCode(me, d);
    if (code === null) { if (!out.missingMonth) out.missingMonth = d; return; }
    if (rosterIsWorkShift(code)) out.work.push({ date: d, shift: code });
    else out.skipped++;
  });
  return out;
}

function leaveIsCompMode() {
  const t = document.getElementById("leaveTypeSelect");
  return !!(t && t.value === COMPENSATION_TYPE);
}

// الإيجنت اللي التعويض ليه: الأدمن يقدر يختار أي إيجنت، غير كده أنا
function leaveCompTargetAgent() {
  const sel = document.getElementById("leaveCompAgent");
  return (leaveIsAdminUser() && sel && sel.value) ? sel.value : leaveMyName();
}

function leaveFillCompAgentSelect() {
  const group = document.getElementById("leaveCompAgentGroup");
  const sel = document.getElementById("leaveCompAgent");
  if (!group || !sel) return;
  if (!leaveIsAdminUser()) { group.style.display = "none"; return; }
  group.style.display = "";
  if (sel.options.length > 1) return;
  const me = leaveMyName();
  const names = [];
  (Array.isArray(rosterData) ? rosterData : []).forEach(a => { if (a.dept !== "Queue Support" && names.indexOf(a.name) === -1) names.push(a.name); });
  names.sort((x, y) => x.localeCompare(y));
  sel.innerHTML = names.map(n => `<option value="${leaveEsc(n)}"${n.toLowerCase() === me.toLowerCase() ? " selected" : ""}>${leaveEsc(n)}</option>`).join("");
}

// بيسحب أيام الغياب (No Show) وأيام الأوف اللي اشتغلها الإيجنت من السيرفر (Leave.gs -> compOptions_)
async function leaveLoadCompOptions(force) {
  const agent = leaveCompTargetAgent();
  if (!force && leaveCompOptions.agent === agent && !leaveCompOptions.error && !leaveCompOptions.loading) return;
  leaveCompOptions = { agent, absent: [], worked: [], loading: true, error: "" };
  leaveUpdateForm();
  try {
    const url = GOOGLE_SHEET_API_URL + "?action=compOptions&t=" + Date.now() + "&agent=" + encodeURIComponent(agent) + "&token=" + encodeURIComponent(leaveToken());
    const res = await fetch(url, { method: "GET", redirect: "follow" }).then(r => r.json());
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not load the days");
    if (leaveCompTargetAgent() !== agent) return; // اليوزر غيّر الإيجنت في النص
    leaveCompOptions = { agent, absent: res.absent || [], worked: res.worked || [], loading: false, error: "" };
  } catch (err) {
    leaveCompOptions = { agent, absent: [], worked: [], loading: false, error: err.message || String(err) };
  }
  leaveUpdateForm();
}

function leaveUpdateCompForm(info, btn) {
  const absentSel = document.getElementById("leaveCompAbsent");
  const workedSel = document.getElementById("leaveCompWorked");
  if (!absentSel || !workedSel) return;
  leaveFillCompAgentSelect();

  const agent = leaveCompTargetAgent();
  if (leaveCompOptions.agent !== agent && !leaveCompOptions.loading) { leaveLoadCompOptions(); return; }
  if (leaveCompOptions.loading) {
    info.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading ${leaveEsc(agent)}'s days...`;
    return;
  }
  if (leaveCompOptions.error) {
    info.innerHTML = `<span class="swap-late"><i class="fa-solid fa-triangle-exclamation"></i> ${leaveEsc(leaveCompOptions.error)}</span>`;
    return;
  }

  const keepA = absentSel.value, keepW = workedSel.value;
  absentSel.innerHTML = `<option value="">-- Choose the absent day --</option>` + leaveCompOptions.absent.map(d =>
    `<option value="${d.date}">${leaveFmtDate(d.date)} · ${leaveEsc(d.shift)} · login ${leaveFmtDuration(d.loginSec)}</option>`).join("");
  workedSel.innerHTML = `<option value="">-- Choose the day off worked --</option>` + leaveCompOptions.worked.map(d =>
    `<option value="${d.date}">${leaveFmtDate(d.date)} · ${leaveEsc(d.code || "OFF")} · worked ${leaveFmtDuration(d.loginSec)}</option>`).join("");
  if (leaveCompOptions.absent.some(d => d.date === keepA)) absentSel.value = keepA;
  if (leaveCompOptions.worked.some(d => d.date === keepW)) workedSel.value = keepW;

  const who = agent.toLowerCase() === leaveMyName().toLowerCase() ? "You have" : `${leaveEsc(agent)} has`;
  if (!leaveCompOptions.absent.length || !leaveCompOptions.worked.length) {
    info.innerHTML = `<i class="fa-solid fa-circle-info"></i> ` +
      (!leaveCompOptions.absent.length ? `${who} no No Show days to compensate in the last 60 days.` : `${who} no day off with at least 4h of work in the last 60 days.`) +
      ` <span style="opacity:.75">(A compensation needs a No Show day + a day off worked for at least half a shift.)</span>`;
    btn.disabled = true;
    return;
  }

  if (absentSel.value && workedSel.value) {
    info.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> <b>${leaveFmtDate(absentSel.value)}</b> will become <b>Compensated</b> (not a No Show, not counted in adherence) — made up on <b>${leaveFmtDate(workedSel.value)}</b>.` +
      (leaveIsAdminUser() ? ` <span style="opacity:.75">As an admin, it's saved and approved right away.</span>` : ` <span style="opacity:.75">An admin needs to approve it.</span>`);
    btn.disabled = !!leaveState.busy;
  } else {
    info.innerHTML = `Choose the absent day (No Show) and the day off that was worked instead — in any order.`;
    btn.disabled = true;
  }
}

function leaveUpdateForm() {
  const typeEl = document.getElementById("leaveTypeSelect");
  const fromEl = document.getElementById("leaveFromInput");
  const toEl = document.getElementById("leaveToInput");
  const fileRow = document.getElementById("leaveFileRow");
  const info = document.getElementById("leaveFormInfo");
  const btn = document.getElementById("leaveSendBtn");
  if (!typeEl || !fromEl || !toEl || !info || !btn) return;

  // 🔁 Compensation: فورم مختلف (يوم غياب + يوم أوف اتشغل) بدل من / إلى
  const comp = leaveIsCompMode();
  ["leaveFromGroup", "leaveToGroup"].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = comp ? "none" : ""; });
  const compRow = document.getElementById("leaveCompRow");
  if (compRow) compRow.style.display = comp ? "" : "none";
  if (comp) {
    if (fileRow) fileRow.style.display = "none";
    leaveUpdateCompForm(info, btn);
    return;
  }

  const isSick = typeEl.value === SICK_LEAVE_CODE;
  if (fileRow) fileRow.style.display = isSick ? "" : "none";

  if (fromEl.value && (!toEl.value || toEl.value < fromEl.value)) toEl.value = fromEl.value;
  toEl.min = fromEl.value || "";

  const from = fromEl.value, to = toEl.value;
  btn.disabled = true;
  if (!from || !to) { info.innerHTML = "Pick the first and last day."; return; }

  const days = leaveDatesBetween(from, to);
  if (days.length > 62) { info.innerHTML = `<span class="swap-late"><i class="fa-solid fa-ban"></i> A request can cover up to 62 days — please split it.</span>`; return; }

  const pv = leavePreviewDays(from, to);
  if (pv.missingMonth) {
    const p = pv.missingMonth.split("-");
    info.innerHTML = `<i class="fa-solid fa-circle-info"></i> Your name (<b>${leaveEsc(leaveMyName())}</b>) was not found in the roster for ${parseInt(p[1], 10)}/${p[0]}.`;
    return;
  }
  if (!pv.work.length) {
    info.innerHTML = `<i class="fa-solid fa-circle-info"></i> You have no working shifts in this period — days off and days already on leave are not counted.`;
    return;
  }

  info.innerHTML =
    `<b>${pv.work.length}</b> working day${pv.work.length === 1 ? "" : "s"} will be counted as <b>${leaveEsc(typeEl.value)}</b>` +
    (pv.skipped ? ` <span style="opacity:.75">(${pv.skipped} day${pv.skipped === 1 ? "" : "s"} off / already on leave not counted)</span>` : "") +
    `<div class="leave-days-chips">${pv.work.map(d => `<span class="swap-shift">${leaveEsc(leaveFmtDate(d.date))} · ${leaveEsc(d.shift)}</span>`).join(" ")}</div>` +
    (isSick ? `<div style="margin-top:6px;"><i class="fa-solid fa-paperclip"></i> The sick leave certificate is <b>required</b>.</div>` : "");
  btn.disabled = !!leaveState.busy;
}

function leaveReadFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(new Error("Could not read " + file.name));
    r.readAsDataURL(file);
  });
}

async function leaveSendRequest() {
  if (leaveState.busy) return;
  const typeEl = document.getElementById("leaveTypeSelect");
  const fromEl = document.getElementById("leaveFromInput");
  const toEl = document.getElementById("leaveToInput");
  const reasonEl = document.getElementById("leaveReasonInput");
  const fileEl = document.getElementById("leaveFileInput");
  const btn = document.getElementById("leaveSendBtn");
  if (!typeEl || !fromEl || !toEl) return;

  const type = typeEl.value;
  if (type === COMPENSATION_TYPE) { await leaveSendCompensation(); return; }
  const from = fromEl.value, to = toEl.value;
  if (!from || !to) { leaveShowMsg("Please choose the dates.", "error"); return; }

  const file = fileEl && fileEl.files && fileEl.files[0] ? fileEl.files[0] : null;
  if (type === SICK_LEAVE_CODE && !file) { leaveShowMsg("⚠️ Please attach the sick leave certificate.", "error"); return; }
  if (file && file.size > LEAVE_MAX_FILE_BYTES) { leaveShowMsg("⚠️ The file is bigger than 10 MB.", "error"); return; }

  const pv = leavePreviewDays(from, to);
  if (!confirm(`Send a ${type} request for ${pv.work.length} working day${pv.work.length === 1 ? "" : "s"} (${leaveFmtRange(from, to)})?\n\nThe admins will be notified by email.`)) return;

  leaveState.busy = true;
  if (btn) btn.disabled = true;
  leaveShowMsg(file ? "Uploading the certificate and sending..." : "Sending request...", "info");
  try {
    const payload = { action: "requestLeave", type, from, to, reason: reasonEl ? reasonEl.value : "" };
    if (file && type === SICK_LEAVE_CODE) {
      payload.fileName = file.name;
      payload.fileMime = file.type || "application/octet-stream";
      payload.fileB64 = await leaveReadFileB64(file);
    }
    const res = await leavePost(payload);
    if (res && res.status === "success") {
      let msg = "✅ " + (res.message || "Request sent");
      if (res.emailSent === false) msg += " (the email to the admins could not be sent - they'll still see it here)";
      leaveShowMsg(msg, "ok");
      if (reasonEl) reasonEl.value = "";
      if (fileEl) fileEl.value = "";
      await leaveFetchList().catch(() => {});
    } else {
      leaveShowMsg("⚠️ " + ((res && res.message) || "Failed to send request"), "error");
    }
  } catch (err) {
    leaveShowMsg("⚠️ Network error - please try again.", "error");
  } finally {
    leaveState.busy = false;
    leaveRenderTab();
  }
}

async function leaveSendCompensation() {
  const absentEl = document.getElementById("leaveCompAbsent");
  const workedEl = document.getElementById("leaveCompWorked");
  const reasonEl = document.getElementById("leaveReasonInput");
  const btn = document.getElementById("leaveSendBtn");
  const agent = leaveCompTargetAgent();
  if (!absentEl || !workedEl || !absentEl.value || !workedEl.value) { leaveShowMsg("Please choose both days.", "error"); return; }
  const isAdminNow = leaveIsAdminUser();
  const forWho = agent.toLowerCase() === leaveMyName().toLowerCase() ? "" : ` for ${agent}`;
  if (!confirm(`${isAdminNow ? "Save" : "Send"} this compensation${forWho}?\n\nAbsent: ${leaveFmtDate(absentEl.value)}\nWorked instead: ${leaveFmtDate(workedEl.value)}${isAdminNow ? "\n\nIt will be approved and the roster updated right away." : "\n\nAn admin needs to approve it."}`)) return;

  leaveState.busy = true;
  if (btn) btn.disabled = true;
  leaveShowMsg("Saving...", "info");
  try {
    const res = await leavePost({ action: "requestLeave", type: COMPENSATION_TYPE, agent, absentDate: absentEl.value, workedDate: workedEl.value, reason: reasonEl ? reasonEl.value : "" });
    if (res && res.status === "success") {
      leaveShowMsg("✅ " + (res.message || "Saved"), "ok");
      if (reasonEl) reasonEl.value = "";
      if (res.rosterChanged && typeof fetchAllDataFromGoogleSheet === "function") await fetchAllDataFromGoogleSheet();
      await leaveFetchList().catch(() => {});
      leaveState.busy = false;
      await leaveLoadCompOptions(true);
    } else {
      leaveShowMsg("⚠️ " + ((res && res.message) || "Failed to save"), "error");
    }
  } catch (err) {
    leaveShowMsg("⚠️ Network error - please try again.", "error");
  } finally {
    leaveState.busy = false;
    leaveRenderTab();
  }
}

async function leaveRespond(id, decision) {
  if (leaveState.busy) return;
  const req = leaveState.requests.find(r => r.id === id);
  if (!req) return;

  let note = "";
  const who = req.mine ? "your" : `${req.agent}'s`;
  if (decision === "approve" && req.type === COMPENSATION_TYPE) {
    if (!confirm(`Approve ${who} compensation?\n\nAbsent: ${leaveFmtDate(req.from)} -> becomes Compensated\nWorked instead: ${leaveFmtDate(req.to)}`)) return;
  } else if (decision === "approve") {
    if (!confirm(`Approve ${who} ${req.type} (${leaveFmtRange(req.from, req.to)}, ${req.days.length} day${req.days.length === 1 ? "" : "s"})?\n\nThe roster will be updated right away.`)) return;
  } else if (decision === "reject") {
    const n = prompt(`Reject ${who} ${req.type} (${leaveFmtRange(req.from, req.to)})?\n\nOptional note for the agent:`, "");
    if (n === null) return;
    note = n;
  } else if (decision === "cancel") {
    const msg = req.status === "Approved"
      ? `Cancel this approved ${req.type}?\n\nThe original shifts will be put back in the roster.`
      : "Cancel this leave request?";
    if (!confirm(msg)) return;
  }

  leaveState.busy = true;
  leaveRenderLists();
  try {
    const res = await leavePost({ action: "respondLeave", id, decision, note });
    if (res && res.status === "success") {
      if (res.rosterChanged && typeof fetchAllDataFromGoogleSheet === "function") {
        await fetchAllDataFromGoogleSheet(); // الروستر اتغير - نسحب النسخة الجديدة فورًا
      }
      await leaveFetchList().catch(() => {});
      leaveCompOptions.agent = ""; // الأيام المتاحة للتعويض ممكن تكون اتغيرت
      leaveShowMsg("✅ " + (res.message || "Done"), "ok");
    } else {
      leaveShowMsg("⚠️ " + ((res && res.message) || "Something went wrong"), "error");
      await leaveFetchList().catch(() => {});
    }
  } catch (err) {
    leaveShowMsg("⚠️ Network error - please try again.", "error");
  } finally {
    leaveState.busy = false;
    leaveRenderTab();
  }
}

async function leaveOpenAttachment(id, btn) {
  const req = leaveState.requests.find(r => r.id === id);
  if (!req || !req.attachment) return;
  const previewable = /^(image\/|application\/pdf|text\/plain)/.test(req.attachment.mime || "");
  const win = previewable ? window.open("", "_blank") : null;
  if (win) win.document.write('<p style="font-family:Arial;padding:20px">Loading ' + leaveEsc(req.attachment.name) + '...</p>');
  const oldHtml = btn ? btn.innerHTML : "";
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...'; }
  try {
    const url = GOOGLE_SHEET_API_URL + "?action=leaveAttachment&t=" + Date.now() + "&id=" + encodeURIComponent(id) + "&token=" + encodeURIComponent(leaveToken());
    const res = await fetch(url, { method: "GET", redirect: "follow" }).then(r => r.json());
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not open the file");
    const bin = atob(res.dataB64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blobUrl = URL.createObjectURL(new Blob([bytes], { type: res.mime || "application/octet-stream" }));
    if (win) {
      win.location.href = blobUrl;
    } else {
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = res.name || req.attachment.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  } catch (err) {
    if (win) win.close();
    alert(err.message || String(err));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = oldHtml; }
  }
}

// عدّادي أنا: السنة كلها
function leaveRenderCounter() {
  const box = document.getElementById("leaveMyCounter");
  if (!box) return;
  const u = getUAECurrentDate();
  box.innerHTML = leaveCounterHtml(leaveMyName(), `${u.year}-01-01`, `${u.year}-12-31`, `My leave · ${u.year}`);
}

function leaveStatusBadge(status) {
  return `<span class="swap-status swap-status-${leaveEsc(String(status).toLowerCase())}">${leaveEsc(status)}</span>`;
}

function leaveCardHtml(r) {
  const busy = leaveState.busy ? " disabled" : "";
  const who = r.mine ? "You" : leaveEsc(r.agent);
  let actions = "";
  if (r.canDecide) {
    actions += `<button class="swap-btn swap-btn-ok" data-leave-action="approve" data-leave-id="${leaveEsc(r.id)}"${busy}><i class="fa-solid fa-check"></i> Approve</button>` +
      `<button class="swap-btn swap-btn-no" data-leave-action="reject" data-leave-id="${leaveEsc(r.id)}"${busy}><i class="fa-solid fa-xmark"></i> Reject</button>`;
  }
  if (r.canCancel) {
    actions += `<button class="swap-btn swap-btn-no" data-leave-action="cancel" data-leave-id="${leaveEsc(r.id)}"${busy}><i class="fa-solid fa-rotate-left"></i> ${r.status === "Approved" ? "Cancel leave" : "Cancel request"}</button>`;
  }
  const attach = r.attachment
    ? `<button class="swap-btn leave-btn-file" data-leave-action="file" data-leave-id="${leaveEsc(r.id)}"><i class="fa-solid fa-paperclip"></i> ${leaveEsc(r.attachment.name)}</button>`
    : "";

  const isComp = r.type === COMPENSATION_TYPE;
  const ex = r.extra || {};
  const daysChips = isComp
    ? `<span class="swap-shift">🚫 Absent ${leaveEsc(leaveFmtDate(r.from))} · ${leaveEsc((r.days && r.days[0] && r.days[0].shift) || "")} · login ${leaveFmtDuration(ex.absentLoginSec)}</span>` +
      ` <i class="fa-solid fa-arrow-right-arrow-left"></i> ` +
      `<span class="swap-shift">⭐ Worked ${leaveEsc(leaveFmtDate(r.to))} · ${leaveEsc(ex.workedCode || "OFF")} · ${leaveFmtDuration(ex.workedLoginSec)}</span>`
    : (r.days || []).map(d => `<span class="swap-shift">${leaveEsc(leaveFmtDate(d.date))} · ${leaveEsc(d.shift)}</span>`).join(" ");
  const decided = r.decidedAt ? ` · ${leaveEsc(r.status.toLowerCase())} by ${leaveEsc(r.decidedBy || "-")} ${leaveEsc(r.decidedAt)}` : "";
  const emailInfo = (leaveIsAdminUser() && r.email && r.email !== "Sent") ? ` · email: ${leaveEsc(r.email)}` : "";

  return `<div class="swap-card leave-card ${r.type === SICK_LEAVE_CODE ? "is-sick" : (isComp ? "is-comp" : "is-leave")}">
    <div class="swap-card-main"><i class="fa-solid ${leaveIcon(r.type)}"></i> <b>${who}</b>${r.dept && !r.mine ? ` <span style="opacity:.7">(${leaveEsc(r.dept)})</span>` : ""} · <b>${leaveEsc(r.type)}</b> · ${isComp ? `absent ${leaveEsc(leaveFmtDate(r.from))}, worked ${leaveEsc(leaveFmtDate(r.to))}` : `${leaveEsc(leaveFmtRange(r.from, r.to))} · <b>${(r.days || []).length}</b> day${(r.days || []).length === 1 ? "" : "s"}`}</div>
    <div class="leave-days-chips">${daysChips}</div>
    ${r.reason ? `<div class="swap-card-meta"><i class="fa-regular fa-comment"></i> ${leaveEsc(r.reason)}</div>` : ""}
    ${r.adminNote ? `<div class="swap-card-meta"><i class="fa-solid fa-user-shield"></i> Admin note: ${leaveEsc(r.adminNote)}</div>` : ""}
    <div class="swap-card-meta">sent ${leaveEsc(r.createdAt)}${decided}${emailInfo}</div>
    <div class="swap-card-actions">${leaveStatusBadge(r.status)}${attach}${actions}</div>
  </div>`;
}

function leaveRenderLists() {
  const box = document.getElementById("leaveListsContainer");
  if (!box) return;
  if (!leaveState.loaded) { box.innerHTML = `<div class="swap-empty">Loading...</div>`; return; }

  const section = (title, icon, items, emptyText) =>
    `<div class="swap-section"><h4><i class="fa-solid ${icon}"></i> ${title} <span class="swap-count">${items.length}</span></h4>` +
    (items.length ? items.map(leaveCardHtml).join("") : `<div class="swap-empty">${emptyText}</div>`) + `</div>`;

  const mine = leaveState.requests.filter(r => r.mine);
  if (leaveIsAdminUser()) {
    const waiting = leaveState.requests.filter(r => r.canDecide && !r.mine);
    const others = leaveState.requests.filter(r => !r.mine && !r.canDecide);
    box.innerHTML =
      section("Waiting for approval", "fa-inbox", waiting, "No leave requests waiting.") +
      section("My requests", "fa-paper-plane", mine, "You have no leave requests.") +
      section("All requests (last 60 days)", "fa-clock-rotate-left", others.slice(0, 60), "Nothing here yet.");
  } else {
    box.innerHTML = section("My requests", "fa-paper-plane", mine, "You have no leave requests yet.");
  }
}

// ------------------------------------------------------------
// ✏️ الأدمن يغيّر خانة في جدول Full Monthly Roster
// roster.js بيحط data-rc-agent / data-rc-date على كل خانة لما اليوزر أدمن
// ------------------------------------------------------------
function leaveCloseCellMenu() {
  const m = document.getElementById("rosterCellMenu");
  if (m) m.remove();
}

function leaveOpenCellMenu(td) {
  leaveCloseCellMenu();
  const agent = td.getAttribute("data-rc-agent");
  const date = td.getAttribute("data-rc-date");
  const current = leaveRosterCode(agent, date) || "";
  const credit = leaveLieuCreditFor(agent, date);
  const comp = leaveCompensationFor(agent, date);

  const menu = document.createElement("div");
  menu.id = "rosterCellMenu";
  menu.className = "roster-cell-menu";
  menu.innerHTML =
    `<div class="rcm-title"><b>${leaveEsc(agent)}</b><br>${leaveEsc(leaveFmtDate(date))} · now: <b>${leaveEsc(current || "-")}</b></div>` +
    ROSTER_EDIT_CODES.map(code => {
      const kind = rosterLeaveKind(code);
      const icon = kind ? leaveIcon(kind) : (code === "OFF" ? "fa-mug-hot" : (code === "Shift 1" ? "fa-sun" : (code === "Shift 2" ? "fa-cloud-sun" : "fa-moon")));
      const isCurrent = code.toLowerCase() === current.toLowerCase();
      return `<button type="button" class="rcm-option${isCurrent ? " is-current" : ""}" data-rc-code="${leaveEsc(code)}"${isCurrent ? " disabled" : ""}><i class="fa-solid ${icon}"></i> ${leaveEsc(code)}</button>`;
    }).join("") +
    // ⭐ رصيد Day in Lieu: مش بيغيّر الخانة - بيسجل إن الإيجنت اشتغل اليوم ده (Public Holiday / يوم أوف)
    `<div class="rcm-sep">⭐ Day in Lieu credit</div>` +
    LIEU_REASONS.map(reason => {
      const on = credit && credit.reason === reason;
      return `<button type="button" class="rcm-option rcm-star${on ? " is-current" : ""}" data-rc-credit="${leaveEsc(reason)}"${on ? " disabled" : ""}>⭐ ${leaveEsc(reason)}</button>`;
    }).join("") +
    (credit ? `<button type="button" class="rcm-option rcm-star" data-rc-credit-off="1">✖ Remove ⭐ credit</button>` : "") +
    (comp ? `<div class="rcm-note">🔁 ${comp.absentDate === date ? `Compensated — worked ${leaveEsc(leaveFmtDate(comp.workedDate))}` : `Worked day off — compensates ${leaveEsc(leaveFmtDate(comp.absentDate))}`}</div>` : "") +
    `<div class="rcm-msg" style="display:none;"></div>`;

  document.body.appendChild(menu);
  const rect = td.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 4;
  if (left + mw > window.scrollX + document.documentElement.clientWidth - 8) left = window.scrollX + document.documentElement.clientWidth - mw - 8;
  if (rect.bottom + mh + 8 > window.innerHeight) top = rect.top + window.scrollY - mh - 4;
  menu.style.left = Math.max(8, left) + "px";
  menu.style.top = Math.max(8, top) + "px";

  menu.querySelectorAll("[data-rc-code]").forEach(btn => {
    btn.onclick = () => leaveSetCell(agent, date, btn.getAttribute("data-rc-code"), menu);
  });
  menu.querySelectorAll("[data-rc-credit]").forEach(btn => {
    btn.onclick = () => leaveSetCredit(agent, date, btn.getAttribute("data-rc-credit"), true, menu);
  });
  menu.querySelectorAll("[data-rc-credit-off]").forEach(btn => {
    btn.onclick = () => leaveSetCredit(agent, date, "", false, menu);
  });
}

async function leaveSetCredit(agent, date, reason, on, menu) {
  const msg = menu.querySelector(".rcm-msg");
  menu.querySelectorAll("button").forEach(b => { b.disabled = true; });
  if (msg) { msg.style.display = "block"; msg.textContent = "Saving..."; }
  try {
    const res = await leavePost({ action: "setLieuCredit", agent, date, reason, on });
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not save");
    // نحدّث النسخة المحلية فورًا
    const wanted = agent.trim().toLowerCase();
    leaveState.lieuCredits = (leaveState.lieuCredits || []).filter(c => !(c.date === date && String(c.agent).trim().toLowerCase() === wanted));
    if (on) leaveState.lieuCredits.push({ date, agent, reason });
    leaveCloseCellMenu();
    if (typeof renderFullMonthlyTable === "function") renderFullMonthlyTable();
    const agentTab = document.getElementById("tab-agent-view");
    if (agentTab && agentTab.style.display === "block" && typeof renderAgentLookup === "function") renderAgentLookup();
    leaveFlashCell(agent, date);
  } catch (err) {
    if (msg) { msg.textContent = "⚠️ " + (err.message || err); msg.style.color = "#b91c1c"; }
    menu.querySelectorAll("button").forEach(b => { if (!b.classList.contains("is-current")) b.disabled = false; });
  }
}

async function leaveSetCell(agent, date, code, menu) {
  const msg = menu.querySelector(".rcm-msg");
  menu.querySelectorAll("button").forEach(b => { b.disabled = true; });
  if (msg) { msg.style.display = "block"; msg.textContent = "Saving..."; }
  try {
    const res = await leavePost({ action: "setRosterCell", agent, date, code });
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not save");
    // نحدّث النسخة المحلية فورًا (والباقيين هيسحبوا الروستر لوحدهم من إشارة rosterChangedAt)
    const p = date.split("-").map(Number);
    const entry = (rosterData || []).find(a => String(a.name).trim().toLowerCase() === agent.trim().toLowerCase() && a.month === p[1] && a.year === p[0]);
    if (entry && entry.schedule) entry.schedule[p[2]] = code;
    leaveCloseCellMenu();
    if (typeof renderFullMonthlyTable === "function") renderFullMonthlyTable();
    if (typeof renderRosterView === "function") renderRosterView();
    const agentTab = document.getElementById("tab-agent-view");
    if (agentTab && agentTab.style.display === "block" && typeof renderAgentLookup === "function") renderAgentLookup();
    leaveFlashCell(agent, date);
  } catch (err) {
    if (msg) { msg.textContent = "⚠️ " + (err.message || err); msg.style.color = "#b91c1c"; }
    menu.querySelectorAll("button").forEach(b => { if (!b.classList.contains("is-current")) b.disabled = false; });
  }
}

function leaveFlashCell(agent, date) {
  const sel = `td[data-rc-agent="${CSS.escape(agent)}"][data-rc-date="${CSS.escape(date)}"]`;
  const td = document.querySelector(sel);
  if (!td) return;
  td.classList.add("rc-saved");
  setTimeout(() => td.classList.remove("rc-saved"), 1500);
}

// زرار "Manage Agents & Roster" (أدمن) - بيفتح الجدول الكامل في وضع التعديل
function openAgentManagementModal() {
  switchRosterTab("full-sheet-view");
  const hint = document.getElementById("rosterEditHint");
  if (hint) {
    hint.style.display = "block";
    hint.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function closeAgentManagementModal() {
  const m = document.getElementById("agentManagementModal");
  if (m) m.style.display = "none";
}

// event delegation - أزرار الكروت وخانات الجدول بتتبني ديناميك
document.addEventListener("click", function (ev) {
  const target = ev.target;
  if (!target || !target.closest) return;

  // 🔔 عنصر إجازة في الجرس -> يتعلّم إنه اتشاف ويفتح تاب Leave
  const bellItem = target.closest("[data-leave-bell]");
  if (bellItem) {
    const bid = bellItem.getAttribute("data-leave-bell");
    if (bid.indexOf("n:") === 0) {
      const seenList = leaveBellGetSeen();
      seenList.push(bid.slice(2));
      leaveBellSetSeen(seenList);
    }
    if (typeof notesHideBellPanel === "function") notesHideBellPanel();
    openLeaveFromNotification();
    return;
  }

  const actionBtn = target.closest("[data-leave-action]");
  if (actionBtn && !actionBtn.disabled) {
    const id = actionBtn.getAttribute("data-leave-id");
    const action = actionBtn.getAttribute("data-leave-action");
    if (action === "file") leaveOpenAttachment(id, actionBtn);
    else leaveRespond(id, action);
    return;
  }

  if (target.closest("#rosterCellMenu")) return;
  const cell = target.closest("td[data-rc-agent]");
  if (cell && leaveIsAdminUser()) {
    leaveOpenCellMenu(cell);
    return;
  }
  leaveCloseCellMenu();
});

document.addEventListener("keydown", function (ev) {
  if (ev.key === "Escape") leaveCloseCellMenu();
});
