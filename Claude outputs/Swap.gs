// ============================================================
// 🔄 SHIFT SWAP - طلبات تبديل الشيفتات بين الإيجنتس (شيفت بشيفت في نفس اليوم بس، مفيش Day Off)
// ============================================================
// ملف جديد بالكامل (Swap.gs) - بيتضاف جنب Code.gs في نفس مشروع Apps Script.
// بيتنادى من doGet (action=swapRequests) ومن doPost (action=requestSwap / respondSwap)
// اللي في Code.gs.
//
// الفكرة:
//   1) الإيجنت (أ) يبعت طلب سواب لإيجنت (ب) في يوم معين -> بيتسجل في شيت "ShiftSwaps" بحالة Pending
//   2) الإيجنت (ب) يعمل Approve -> الشيفتين بيتبدلوا فعليًا في شيت Roster + إيميل للمديرين
//      أو Reject، والإيجنت (أ) يقدر يلغي (Cancel) طالما لسه Pending
//   3) الحد الأقصى: قبل بداية أقرب شيفت من الاتنين بساعتين (SWAP_CUTOFF_HOURS_) - بيتشيك وقت
//      إرسال الطلب ووقت الموافقة، ولو عدّى الوقت الطلب بيبقى Expired
//
// ⚙️ اختياري - إرسال الإيميل من إيميل الشركة: Project Settings > Script Properties > Add:
//   Property: SWAP_MAIL_FROM   Value: عنوان إيميل الشركة (لازم يكون مضاف كـ "Send mail as" في
//   Gmail بتاع الحساب اللي شغّال بيه السكريبت). لو مش متظبط أو فشل، الإيميل بيتبعت من حساب السكريبت نفسه.
// ------------------------------------------------------------

var SWAP_SHEET_NAME_ = "ShiftSwaps";
var SWAP_HEADERS_ = ["ID", "Created At", "Date", "Requester", "Requester Shift", "Target", "Target Shift", "Status", "Responded At", "Deadline"];
var SWAP_CUTOFF_HOURS_ = 2;
var SWAP_SHIFT_START_HOUR_ = { "Shift 1": 9, "Shift 2": 11, "Shift 3": 13 };

// أعمدة شيت ShiftSwaps (1-based) اللي بنعدلها بعد الإنشاء
var SWAP_COL_STATUS_ = 8;
var SWAP_COL_RESPONDED_AT_ = 9;

// بيسجّل إن قايمة الطلبات اتغيرت - بيتقرا مع checkForceLogout في doGet (Code.gs) وبيخلي الفرونت إند
// يسحب الطلبات بس لما فعلاً يحصل تغيير (مفيش Polling)
function swapMarkChanged_() {
  try {
    PropertiesService.getScriptProperties().setProperty("swapChangedAt", String(Date.now()));
  } catch (e) {
    // مايوقفش الطلب نفسه
  }
}

function swapPad_(n) {
  return (n < 10 ? "0" : "") + n;
}

function swapNow_() {
  return Utilities.formatDate(new Date(), "Asia/Dubai", "yyyy-MM-dd HH:mm:ss");
}

function swapErr_(message) {
  return { status: "error", message: message };
}

function swapEscape_(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// نفس منطق parseMonthAndYear في js/core.js
function swapParseMonth_(val) {
  if (!val) return { month: 8, year: 2026 };
  var str = String(val).trim();
  if (str.indexOf("/") !== -1 || str.indexOf("-") !== -1) {
    var parts = str.split(/[\/|-]/);
    if (parts.length === 3) return { month: parseInt(parts[1], 10), year: parseInt(parts[2], 10) };
    if (parts.length === 2) return { month: parseInt(parts[0], 10), year: parseInt(parts[1], 10) };
  }
  return { month: parseInt(str, 10) || 8, year: 2026 };
}

function getOrCreateSwapSheet_(ss) {
  var sheet = ss.getSheetByName(SWAP_SHEET_NAME_);
  if (!sheet) {
    sheet = ss.insertSheet(SWAP_SHEET_NAME_);
    sheet.appendRow(SWAP_HEADERS_);
  }
  return sheet;
}

function swapReadRows_(sheet) {
  var values = sheet.getDataRange().getDisplayValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!String(r[0]).trim()) continue;
    rows.push({
      rowNum: i + 1,
      id: String(r[0]).trim(),
      createdAt: String(r[1]).replace(/^'/, "").trim(),
      date: String(r[2]).replace(/^'/, "").trim(),
      requester: String(r[3]).trim(),
      requesterShift: String(r[4]).trim(),
      target: String(r[5]).trim(),
      targetShift: String(r[6]).trim(),
      status: String(r[7]).trim(),
      respondedAt: String(r[8]).replace(/^'/, "").trim(),
      deadline: String(r[9]).replace(/^'/, "").trim()
    });
  }
  return rows;
}

// Pending وعدّى ميعاده = Expired (بنحسبها وقت القراءة، من غير ما نكتب في الشيت)
function swapEffectiveStatus_(row) {
  if (row.status === "Pending" && swapNow_() >= row.deadline) return "Expired";
  return row.status;
}

function swapDeadline_(dateStr, shiftA, shiftB) {
  var hour = Math.min(SWAP_SHIFT_START_HOUR_[shiftA], SWAP_SHIFT_START_HOUR_[shiftB]) - SWAP_CUTOFF_HOURS_;
  return dateStr + " " + swapPad_(hour) + ":00:00";
}

// اسم الإيجنت زي ما هو في الروستر = الاسم الكامل (fullName) لليوزر في شيت Users
function swapGetUserFullName_(ss, username) {
  var sheet = ss.getSheetByName("Users") || ss.getSheetByName("users");
  if (!sheet) return String(username || "").trim();
  var values = sheet.getDataRange().getValues();
  var wanted = String(username || "").trim().toLowerCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === wanted) {
      return values[i][3] ? String(values[i][3]).trim() : String(values[i][0]).trim();
    }
  }
  return String(username || "").trim();
}

// إيميلات كل المديرين (اليوزرز اللي رولهم admin ومسجلين إيميل في العمود E)
function swapGetManagerEmails_(ss) {
  var sheet = ss.getSheetByName("Users") || ss.getSheetByName("users");
  var emails = [];
  if (!sheet) return emails;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var role = String(values[i][2] || "user").trim().toLowerCase();
    var email = values[i][4] ? String(values[i][4]).trim() : "";
    if (role === "admin" && email && email.indexOf("@") !== -1 && emails.indexOf(email) === -1) {
      emails.push(email);
    }
  }
  return emails;
}

function swapLoadRoster_(ss) {
  var sheet = ss.getSheetByName("Roster") || ss.getSheetByName("roster") || ss.getSheetByName("ROSTER");
  if (!sheet) return null;
  return { sheet: sheet, values: sheet.getDataRange().getDisplayValues() };
}

// بيدور على صف الإيجنت في الروستر لشهر وسنة معينين - بيرجع { rowIdx, name, dept } أو null
function swapFindAgent_(roster, name, month, year) {
  var wanted = String(name || "").trim().toLowerCase();
  for (var i = 1; i < roster.values.length; i++) {
    if (String(roster.values[i][3]).trim().toLowerCase() !== wanted) continue;
    var my = swapParseMonth_(roster.values[i][0]);
    if (my.month === month && my.year === year) {
      return {
        rowIdx: i,
        name: String(roster.values[i][3]).trim(),
        dept: String(roster.values[i][1] || "Calls").trim()
      };
    }
  }
  return null;
}

// عمود اليوم في شيت الروستر (1-based): اليوم 1 = العمود E = 5
function swapDayCol_(day) {
  return 4 + day;
}

function swapShiftOf_(roster, agent, day) {
  return String(roster.values[agent.rowIdx][swapDayCol_(day) - 1] || "").trim();
}

// ------------------------------------------------------------
// ➕ إرسال طلب سواب جديد
// data: { date: "yyyy-MM-dd", target: "اسم الإيجنت التاني" }
// ------------------------------------------------------------
function requestSwap_(ss, data, session) {
  var date = String(data.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return swapErr_("Invalid date");

  var targetRaw = String(data.target || "").trim();
  if (!targetRaw) return swapErr_("Please choose an agent to swap with");

  var meRaw = swapGetUserFullName_(ss, session.username);
  if (meRaw.toLowerCase() === targetRaw.toLowerCase()) return swapErr_("You can't swap with yourself");

  var dp = date.split("-");
  var year = parseInt(dp[0], 10), month = parseInt(dp[1], 10), day = parseInt(dp[2], 10);

  var roster = swapLoadRoster_(ss);
  if (!roster) return swapErr_("Sheet Roster not found");

  var me = swapFindAgent_(roster, meRaw, month, year);
  if (!me) return swapErr_("Your name (" + meRaw + ") was not found in the roster for " + month + "/" + year);
  var target = swapFindAgent_(roster, targetRaw, month, year);
  if (!target) return swapErr_(targetRaw + " was not found in the roster for " + month + "/" + year);

  var myShift = swapShiftOf_(roster, me, day);
  var targetShift = swapShiftOf_(roster, target, day);

  if (!SWAP_SHIFT_START_HOUR_[myShift]) return swapErr_("You don't have a shift on " + date + " (only Shift 1/2/3 can be swapped - Day Off swaps are not allowed)");
  if (!SWAP_SHIFT_START_HOUR_[targetShift]) return swapErr_(target.name + " doesn't have a shift on " + date + " (Day Off swaps are not allowed)");
  if (myShift === targetShift) return swapErr_("You both have the same shift (" + myShift + ") on " + date + " - nothing to swap");

  var deadline = swapDeadline_(date, myShift, targetShift);
  if (swapNow_() >= deadline) {
    return swapErr_("Too late - swaps must be requested at least " + SWAP_CUTOFF_HOURS_ + " hours before the earlier shift starts (deadline was " + deadline + ")");
  }

  var sheet = getOrCreateSwapSheet_(ss);
  var rows = swapReadRows_(sheet);
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.date === date && swapEffectiveStatus_(r) === "Pending" &&
        (r.requester.toLowerCase() === me.name.toLowerCase() || r.target.toLowerCase() === me.name.toLowerCase())) {
      return swapErr_("You already have a pending swap request for " + date + " - cancel it or wait for a reply first");
    }
  }

  var id = Utilities.getUuid();
  sheet.appendRow([id, "'" + swapNow_(), "'" + date, me.name, myShift, target.name, targetShift, "Pending", "", "'" + deadline]);
  SpreadsheetApp.flush();
  swapMarkChanged_();

  return { status: "success", message: "Swap request sent to " + target.name, id: id };
}

// ------------------------------------------------------------
// ✅❌↩️ الرد على طلب سواب
// data: { id, decision: "approve" | "reject" | "cancel" }
//   approve / reject: الإيجنت المطلوب منه السواب بس
//   cancel: صاحب الطلب بس
// ------------------------------------------------------------
function respondSwap_(ss, data, session) {
  var id = String(data.id || "").trim();
  var decision = String(data.decision || "").trim();
  if (["approve", "reject", "cancel"].indexOf(decision) === -1) return swapErr_("Invalid decision");

  var meName = swapGetUserFullName_(ss, session.username).toLowerCase();

  var sheet = getOrCreateSwapSheet_(ss);
  var rows = swapReadRows_(sheet);
  var req = null;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === id) { req = rows[i]; break; }
  }
  if (!req) return swapErr_("Swap request not found");

  var effective = swapEffectiveStatus_(req);
  if (effective === "Expired" && req.status === "Pending") {
    sheet.getRange(req.rowNum, SWAP_COL_STATUS_).setValue("Expired");
    SpreadsheetApp.flush();
  swapMarkChanged_();
    return swapErr_("This request expired (the deadline was " + req.deadline + ")");
  }
  if (effective !== "Pending") return swapErr_("This request is no longer pending (" + effective + ")");

  if (decision === "cancel") {
    if (meName !== req.requester.toLowerCase()) return swapErr_("Only the agent who sent the request can cancel it");
    sheet.getRange(req.rowNum, SWAP_COL_STATUS_).setValue("Cancelled");
    sheet.getRange(req.rowNum, SWAP_COL_RESPONDED_AT_).setValue("'" + swapNow_());
    SpreadsheetApp.flush();
  swapMarkChanged_();
    return { status: "success", message: "Request cancelled" };
  }

  if (meName !== req.target.toLowerCase()) return swapErr_("Only " + req.target + " can reply to this request");

  if (decision === "reject") {
    sheet.getRange(req.rowNum, SWAP_COL_STATUS_).setValue("Rejected");
    sheet.getRange(req.rowNum, SWAP_COL_RESPONDED_AT_).setValue("'" + swapNow_());
    SpreadsheetApp.flush();
  swapMarkChanged_();
    return { status: "success", message: "Request rejected" };
  }

  // approve: نتأكد إن الشيفتين لسه زي ما كانوا وقت الطلب قبل ما نبدل (ممكن الروستر اتعدل في النص)
  var dp = req.date.split("-");
  var year = parseInt(dp[0], 10), month = parseInt(dp[1], 10), day = parseInt(dp[2], 10);

  var roster = swapLoadRoster_(ss);
  if (!roster) return swapErr_("Sheet Roster not found");
  var a = swapFindAgent_(roster, req.requester, month, year);
  var b = swapFindAgent_(roster, req.target, month, year);
  if (!a || !b) return swapErr_("One of the agents was not found in the roster anymore");

  if (swapShiftOf_(roster, a, day) !== req.requesterShift || swapShiftOf_(roster, b, day) !== req.targetShift) {
    sheet.getRange(req.rowNum, SWAP_COL_STATUS_).setValue("Outdated");
    sheet.getRange(req.rowNum, SWAP_COL_RESPONDED_AT_).setValue("'" + swapNow_());
    SpreadsheetApp.flush();
  swapMarkChanged_();
    return swapErr_("The roster changed since this request was sent - the shifts no longer match. Please send a new request.");
  }

  var col = swapDayCol_(day);
  roster.sheet.getRange(a.rowIdx + 1, col).setValue(req.targetShift);
  roster.sheet.getRange(b.rowIdx + 1, col).setValue(req.requesterShift);

  sheet.getRange(req.rowNum, SWAP_COL_STATUS_).setValue("Approved");
  sheet.getRange(req.rowNum, SWAP_COL_RESPONDED_AT_).setValue("'" + swapNow_());
  SpreadsheetApp.flush();
  swapMarkChanged_();

  // تعديل من السكريبت مبيشغّلش onEditMasterSheets (Force Logout)، فلازم نمسح الكاش يدوي عشان الروستر يتحدث فورًا
  invalidateFullDataCache_();

  var emailSent = false;
  try {
    emailSent = swapSendManagerEmail_(ss, req, a.dept, b.dept);
  } catch (mailErr) {
    emailSent = false; // فشل الإيميل ميلغيش السواب اللي اتعمل خلاص
  }

  return { status: "success", message: "Swap approved - the roster has been updated", emailSent: emailSent };
}

// ------------------------------------------------------------
// 📥 قايمة الطلبات لليوزر الحالي (آخر 14 يوم + المستقبل)
// الأدمن بيشوف كل الطلبات، والإيجنت بيشوف بس اللي هو طرف فيها
// ------------------------------------------------------------
function listSwapRequests_(ss, username, role) {
  var meName = swapGetUserFullName_(ss, username);
  var meLower = meName.toLowerCase();
  var isAdminUser = (role === "admin");

  var cutoffDate = Utilities.formatDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), "Asia/Dubai", "yyyy-MM-dd");

  var sheet = ss.getSheetByName(SWAP_SHEET_NAME_);
  var out = [];
  if (sheet) {
    var rows = swapReadRows_(sheet);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.date < cutoffDate) continue;
      var involved = (r.requester.toLowerCase() === meLower || r.target.toLowerCase() === meLower);
      if (!isAdminUser && !involved) continue;

      var eff = swapEffectiveStatus_(r);
      out.push({
        id: r.id,
        createdAt: r.createdAt,
        date: r.date,
        requester: r.requester,
        requesterShift: r.requesterShift,
        target: r.target,
        targetShift: r.targetShift,
        status: eff,
        respondedAt: r.respondedAt,
        deadline: r.deadline,
        canApprove: eff === "Pending" && r.target.toLowerCase() === meLower,
        canCancel: eff === "Pending" && r.requester.toLowerCase() === meLower
      });
    }
  }

  out.sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : (x.createdAt > y.createdAt ? -1 : 0); });

  return { status: "success", me: meName, isAdmin: isAdminUser, cutoffHours: SWAP_CUTOFF_HOURS_, requests: out };
}

// ------------------------------------------------------------
// ✉️ إيميل للمديرين لما سواب يتم بنجاح - بيرجع true لو اتبعت فعلاً
// ------------------------------------------------------------
function swapSendManagerEmail_(ss, req, requesterDept, targetDept) {
  var recipients = swapGetManagerEmails_(ss);
  if (recipients.length === 0) return false;

  var subject = "Shift Swap: " + req.requester + " ⇄ " + req.target + " (" + req.date + ")";

  var plain =
    "A shift swap was approved and the roster has been updated.\n\n" +
    "Date: " + req.date + "\n" +
    req.requester + " (" + requesterDept + "): " + req.requesterShift + " -> " + req.targetShift + "\n" +
    req.target + " (" + targetDept + "): " + req.targetShift + " -> " + req.requesterShift + "\n\n" +
    "Requested at: " + req.createdAt + "\n" +
    "Approved at: " + swapNow_() + " (UAE time)\n";

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;">' +
    '<p>A shift swap was approved and the roster has been updated.</p>' +
    '<table style="border-collapse:collapse;min-width:420px;">' +
    '<tr style="background:#f3f4f6;"><th style="text-align:left;padding:8px;border:1px solid #d1d5db;">Agent</th>' +
    '<th style="text-align:left;padding:8px;border:1px solid #d1d5db;">Team</th>' +
    '<th style="text-align:left;padding:8px;border:1px solid #d1d5db;">Before</th>' +
    '<th style="text-align:left;padding:8px;border:1px solid #d1d5db;">After</th></tr>' +
    '<tr><td style="padding:8px;border:1px solid #d1d5db;"><b>' + swapEscape_(req.requester) + '</b></td>' +
    '<td style="padding:8px;border:1px solid #d1d5db;">' + swapEscape_(requesterDept) + '</td>' +
    '<td style="padding:8px;border:1px solid #d1d5db;">' + swapEscape_(req.requesterShift) + '</td>' +
    '<td style="padding:8px;border:1px solid #d1d5db;"><b>' + swapEscape_(req.targetShift) + '</b></td></tr>' +
    '<tr><td style="padding:8px;border:1px solid #d1d5db;"><b>' + swapEscape_(req.target) + '</b></td>' +
    '<td style="padding:8px;border:1px solid #d1d5db;">' + swapEscape_(targetDept) + '</td>' +
    '<td style="padding:8px;border:1px solid #d1d5db;">' + swapEscape_(req.targetShift) + '</td>' +
    '<td style="padding:8px;border:1px solid #d1d5db;"><b>' + swapEscape_(req.requesterShift) + '</b></td></tr>' +
    '</table>' +
    '<p style="margin-top:12px;"><b>Date:</b> ' + swapEscape_(req.date) + '<br>' +
    '<b>Requested at:</b> ' + swapEscape_(req.createdAt) + '<br>' +
    '<b>Approved at:</b> ' + swapEscape_(swapNow_()) + ' (UAE time)</p>' +
    '</div>';

  var to = recipients.join(",");
  var fromAddress = PropertiesService.getScriptProperties().getProperty("SWAP_MAIL_FROM");

  if (fromAddress) {
    try {
      GmailApp.sendEmail(to, subject, plain, { htmlBody: html, from: fromAddress, name: "SPC Help" });
      return true;
    } catch (aliasErr) {
      // العنوان مش مضاف كـ "Send mail as" - نكمل بالإرسال العادي بدل ما الإيميل يضيع
    }
  }

  MailApp.sendEmail({ to: to, subject: subject, body: plain, htmlBody: html, name: "SPC Help" });
  return true;
}
