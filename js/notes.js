// ============================================================
// 📝 NOTES & REMINDERS (added 2026-09-25)
// - صفحة My Notes: نوتس Note (من غير معاد) و Reminder (بمعاد) + Assign / Share + 📌 Pin شخصي
// - 🔔 جرس في الهيدر: ريمايندرز جه معادها + نوت جديدة جاتلك + حد خلّص نوت انت بعتهاله + تحديثات
// - ⏰ منبّه بصوت لما معاد الريمايندر ييجي - مش بيقف غير لما اليوزر يدوس Done / Snooze / Dismiss
// الداتا في شيت "Notes" من خلال Apps Script (Notes.gs) - والإيميلات بتتبعت من هناك
// ============================================================

const NOTES_TICK_SECONDS = 20;           // كل قد إيه نشيك على معاد الريمايندرز (في المتصفح)
const NOTES_ALARM_LOOKBACK_HOURS = 24;   // ريمايندر عدّى معاده بأكتر من كده مش بيرن (بيفضل ظاهر Overdue في الجرس بس)

let notesState = {
  notes: [], users: [], me: null, loaded: false, busy: false,
  tab: "mine", editingId: null, type: "Note", pin: false, owner: "",  // owner = اليوزر اللي الداتا دي بتاعته
  share: [],          // usernames اللي في الـ Share في الـ Composer
  pendingFiles: [],   // ملفات مستنية تترفع مع الحفظ
  maxFileBytes: 10 * 1024 * 1024
};
let notesLastSignal = null;
let notesTickTimer = null;
let notesRinging = [];        // IDs النوتس اللي بترن دلوقتي
let notesDesktopPopups = {};  // id -> Notification
let notesTitleBlinkTimer = null;
let notesOriginalTitle = document.title;
let notesRevealed = new Set(); // IDs النوتس اللي تفاصيلها ظاهرة دلوقتي (أي حاجة غيرها متغطية) - مش بيتحفظ، بيرجع مخفي مع أي Refresh

// ------------------------------------------------------------
// أدوات
// ------------------------------------------------------------
function notesEsc(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function notesPad(n) {
  return (n < 10 ? "0" : "") + n;
}

function notesToken() {
  return localStorage.getItem("sessionToken") || "";
}

function notesLoggedInUser() {
  return localStorage.getItem("loggedInUser") || "";
}

// الوقت الحالي بتوقيت الإمارات بصيغة "yyyy-MM-dd HH:mm" (نفس صيغة عمود Due في الشيت - مقارنة نصية مباشرة)
function notesNowMinute(offsetMinutes) {
  const d = new Date(Date.now() + 4 * 60 * 60 * 1000 + (offsetMinutes || 0) * 60 * 1000);
  return `${d.getUTCFullYear()}-${notesPad(d.getUTCMonth() + 1)}-${notesPad(d.getUTCDate())} ${notesPad(d.getUTCHours())}:${notesPad(d.getUTCMinutes())}`;
}

function notesTodayStr(offsetDays) {
  return notesNowMinute((offsetDays || 0) * 24 * 60).slice(0, 10);
}

// "2026-09-26 14:30" -> "2:30 PM"
function notesNiceTime(hhmm) {
  const p = String(hhmm || "").split(":");
  let h = parseInt(p[0], 10);
  if (isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${p[1]} ${period}`;
}

// "2026-09-26 14:30" -> "Today, 2:30 PM" / "Tomorrow, 9:00 AM" / "Sat 27 Sep, 9:00 AM"
function notesNiceDue(due) {
  if (!due || due.length < 16) return due || "";
  const date = due.slice(0, 10), time = notesNiceTime(due.slice(11, 16));
  if (date === notesTodayStr(0)) return `Today, ${time}`;
  if (date === notesTodayStr(1)) return `Tomorrow, ${time}`;
  if (date === notesTodayStr(-1)) return `Yesterday, ${time}`;
  const p = date.split("-").map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yearPart = p[0] !== Number(notesTodayStr(0).slice(0, 4)) ? ` ${p[0]}` : "";
  return `${days[d.getUTCDay()]} ${p[2]} ${months[p[1] - 1]}${yearPart}, ${time}`;
}

function notesNiceStamp(ts) {
  return ts ? notesNiceDue(String(ts).slice(0, 16)) : "";
}

// النوت مفتوحة "عندي أنا": أنا عضو فيها (Assignee أو في الـ Share) ولسه ماعملتش Done
function notesIsMineOpen(n) {
  return !!(n.isMember && !n.myDone);
}

function notesIsOverdue(n) {
  const open = n.isMember ? !n.myDone : n.status === "Open";
  return open && n.type === "Reminder" && n.due && n.due <= notesNowMinute(0);
}

function notesFmtSize(bytes) {
  const b = Number(bytes) || 0;
  if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + " MB";
  if (b >= 1024) return Math.round(b / 1024) + " KB";
  return b + " B";
}

// ------------------------------------------------------------
// localStorage (لكل يوزر لوحده): اللي اتشاف في الجرس + المنبّهات اللي اتقفلت/اتأجلت
// ------------------------------------------------------------
function notesStoreKey(kind) {
  return `notes:${kind}:${(notesState.owner || notesLoggedInUser()).toLowerCase()}`;
}

function notesLoad(kind) {
  try {
    const v = JSON.parse(localStorage.getItem(notesStoreKey(kind)) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch (e) {
    return {};
  }
}

function notesSave_(kind, obj) {
  try { localStorage.setItem(notesStoreKey(kind), JSON.stringify(obj)); } catch (e) { /* مش مهم */ }
}

// بيشيل أي حاجة متخزنة لنوتس اتمسحت خلاص عشان التخزين مايكبرش
function notesPruneStores() {
  const ids = new Set(notesState.notes.map(n => n.id));
  ["seen", "alarm"].forEach(kind => {
    const obj = notesLoad(kind);
    let changed = false;
    Object.keys(obj).forEach(k => {
      const id = k.replace(/^[a-z]:/, "").split("|")[0];
      if (!ids.has(id)) { delete obj[k]; changed = true; }
    });
    if (changed) notesSave_(kind, obj);
  });
}

// ------------------------------------------------------------
// 🌐 السيرفر
// ------------------------------------------------------------
function notesFetch() {
  const token = notesToken();
  if (!token) return Promise.reject(new Error("Please log in again"));
  const url = GOOGLE_SHEET_API_URL + "?action=notesList&t=" + Date.now() + "&token=" + encodeURIComponent(token);
  return fetch(url, { method: "GET", redirect: "follow" })
    .then(r => r.json())
    .then(res => {
      if (!res || res.status !== "success") throw new Error((res && res.message) || "Failed to load notes");
      const previous = notesState.loaded && notesState.owner === notesLoggedInUser() ? notesState.notes : null;
      notesState.notes = Array.isArray(res.notes) ? res.notes : [];
      notesState.users = Array.isArray(res.users) ? res.users : [];
      notesState.me = res.me || null;
      if (res.maxFileBytes) notesState.maxFileBytes = res.maxFileBytes;
      notesState.owner = notesLoggedInUser();
      notesState.loaded = true;
      notesPruneStores();
      if (previous) notesAnnounceChanges(previous, notesState.notes);
      notesAfterDataChange();
      return res;
    });
}

function notesPost(payload) {
  return fetch(GOOGLE_SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ token: notesToken() }, payload))
  }).then(r => r.json());
}

// 🔔 مفيش Polling مخصوص: auth.js بيسأل السيرفر كل 15 ثانية أصلاً (checkForceLogout)، والرد فيه
// notesChangedAt - لو اتغيرت عن آخر مرة بنسحب النوتس (نوت جديدة / Done / تحديث / إيميل تذكير اتبعت)
function notesOnServerSignal(value) {
  const user = notesLoggedInUser();
  if (!user || !notesToken()) {
    // ⚠️ مش بنمسح النوتس هنا عمدًا: لو اتعمل Auto-logout بسبب الخمول، المنبّه لازم يفضل يرن في معاده.
    // المسح الفعلي بيحصل بس مع Logout يدوي (notesClearAll من handleLogout في auth.js)
    notesLastSignal = null;
    notesUpdateBell();
    return;
  }
  if (notesState.owner && notesState.owner !== user) notesClearAll(); // يوزر تاني دخل على نفس الجهاز

  const v = String(value === undefined || value === null ? "0" : value);
  if (v === notesLastSignal) return;
  const isFirst = (notesLastSignal === null);
  notesLastSignal = v;
  if (isFirst && v === "0" && notesState.loaded) return;

  notesFetch().catch(() => { /* هدوء - هتتعاد مع الإشارة الجاية */ });
}

// بيتنادى من handleLogout (خروج يدوي) - بيمسح كل حاجة ويوقف أي منبّه
function notesClearAll() {
  notesStopAllRinging();
  notesState = { notes: [], users: [], me: null, loaded: false, busy: false, tab: "mine", editingId: null, type: "Note", pin: false, owner: "",
    share: [], pendingFiles: [], maxFileBytes: 10 * 1024 * 1024 };
  notesLastSignal = null;
  notesRevealed.clear();
  notesHideBellPanel();
  notesClosePinnedDrawer();
  notesUpdateBell();
}

// ------------------------------------------------------------
// 📄 الصفحة
// ------------------------------------------------------------
function initNotesPage() {
  notesUpdateDesktopAlertsBtn();
  notesFillAssigneeSelect();
  if (!notesState.editingId) notesResetComposer();
  notesRenderList();
  notesFetch()
    .then(() => { notesFillAssigneeSelect(); notesRenderList(); notesMarkAllSeen(true); })
    .catch(err => {
      const box = document.getElementById("notesListContainer");
      if (box && !notesState.loaded) box.innerHTML = `<div class="notes-empty"><i class="fa-solid fa-triangle-exclamation"></i> ${notesEsc(err.message)}</div>`;
    });
}

function notesOpenPage(highlightId) {
  notesHideBellPanel();
  navigateTo("notes-page");
  if (highlightId) {
    const n = notesState.notes.find(x => x.id === highlightId);
    if (n) {
      const tab = n.isMember ? (n.myDone ? "done" : "mine") : (n.status === "Done" ? "done" : "assigned");
      notesSwitchTab(tab);
      setTimeout(() => {
        const card = document.getElementById("note-card-" + highlightId);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("note-flash");
          setTimeout(() => card.classList.remove("note-flash"), 2500);
        }
      }, 150);
    }
  }
}

function notesPageIsOpen() {
  const page = document.getElementById("notes-page");
  return !!(page && page.classList.contains("active-page"));
}

function notesAfterDataChange() {
  if (notesPageIsOpen()) {
    notesFillAssigneeSelect();
    // لو اليوزر بيكتب رد جوه كارت دلوقتي، مانعيدش الرسم (هيضيّع الـ focus) - الـ tick هيرسم بعد ما يخلص
    const box = document.getElementById("notesListContainer");
    const typing = box && document.activeElement && box.contains(document.activeElement);
    if (typing) notesTick.lastMinute = null; else notesRenderList();
  }
  notesUpdateBell();
  notesRenderPinnedDrawer();
  notesTick();
}

function notesSwitchTab(tab) {
  notesState.tab = tab;
  document.querySelectorAll("[data-notes-tab]").forEach(b => b.classList.toggle("active", b.getAttribute("data-notes-tab") === tab));
  notesRenderList();
}

function notesShowMsg(text, kind) {
  const el = document.getElementById("notesFormMsg");
  if (!el) return;
  el.textContent = text || "";
  el.className = "notes-msg" + (kind ? " notes-msg-" + kind : "");
  el.style.display = text ? "block" : "none";
  if (kind === "ok") setTimeout(() => { if (el.textContent === text) el.style.display = "none"; }, 4000);
}

// ------------------------------------------------------------
// ✍️ Composer
// ------------------------------------------------------------
function notesSetPinChoice(on) {
  notesState.pin = !!on;
  const cb = document.getElementById("notePinCheck");
  if (cb) cb.checked = notesState.pin;
}

function notesSetType(type) {
  notesState.type = type === "Reminder" ? "Reminder" : "Note";
  document.querySelectorAll(".notes-type-btn").forEach(b => b.classList.toggle("active", b.getAttribute("data-note-type") === notesState.type));
  const row = document.getElementById("noteDueRow");
  if (row) row.style.display = notesState.type === "Reminder" ? "flex" : "none";
  const dateEl = document.getElementById("noteDueDate");
  if (notesState.type === "Reminder" && dateEl && !dateEl.value) notesQuickDue("1h");
  if (dateEl) dateEl.min = notesTodayStr(0);
}

function notesQuickDue(kind) {
  let due;
  if (kind === "1h") {
    // بعد ساعة من دلوقتي، متقربة لأقرب 5 دقايق لقدام (مثلاً 2:07 -> 3:10)
    const m = parseInt(notesNowMinute(0).slice(14, 16), 10);
    due = notesNowMinute(60 + ((5 - (m % 5)) % 5));
  } else if (kind === "eod") {
    due = notesTodayStr(0) + " 17:00";
  } else {
    due = notesTodayStr(1) + " 09:00";
  }
  const dateEl = document.getElementById("noteDueDate");
  const timeEl = document.getElementById("noteDueTime");
  if (dateEl) dateEl.value = due.slice(0, 10);
  if (timeEl) timeEl.value = due.slice(11, 16);
}

function notesFillAssigneeSelect() {
  const sel = document.getElementById("noteAssigneeSelect");
  if (!sel) return;
  const current = sel.value;
  const meUser = (notesState.me && notesState.me.username) || notesLoggedInUser();
  const others = notesState.users.filter(u => u.username.toLowerCase() !== meUser.toLowerCase());
  sel.innerHTML = `<option value="">Me</option>` +
    others.map(u => `<option value="${notesEsc(u.username)}">${notesEsc(u.fullName)}</option>`).join("");
  if (current && others.some(u => u.username === current)) sel.value = current;
  notesRenderShareChips();
}

// ------------------------------------------------------------
// 👥 Share with (Chips)
// ------------------------------------------------------------
function notesMeUser() {
  return ((notesState.me && notesState.me.username) || notesLoggedInUser());
}

function notesUserFullName(username) {
  const u = notesState.users.find(x => x.username.toLowerCase() === String(username).toLowerCase());
  return u ? u.fullName : username;
}

function notesCurrentAssignee() {
  const sel = document.getElementById("noteAssigneeSelect");
  return (sel && sel.value) ? sel.value : notesMeUser();
}

function notesRenderShareChips() {
  const chips = document.getElementById("noteShareChips");
  const sel = document.getElementById("noteShareSelect");
  const editing = notesState.editingId ? notesState.notes.find(x => x.id === notesState.editingId) : null;
  const locked = !!(editing && !editing.isOwner);
  const assignee = notesCurrentAssignee().toLowerCase();
  // اللي اتعمله Assign مايبقاش في الـ Share كمان
  notesState.share = notesState.share.filter(u => u.toLowerCase() !== assignee);

  if (chips) {
    chips.innerHTML = notesState.share.map(u =>
      `<span class="notes-person-chip">${notesEsc(notesUserFullName(u))}${locked ? "" : `<button type="button" data-share-remove="${notesEsc(u)}" aria-label="Remove">&times;</button>`}</span>`
    ).join("");
  }
  if (sel) {
    const taken = new Set(notesState.share.map(u => u.toLowerCase()).concat([assignee]));
    const options = notesState.users.filter(u => !taken.has(u.username.toLowerCase()));
    sel.innerHTML = `<option value="">+ Add person...</option>` +
      options.map(u => `<option value="${notesEsc(u.username)}">${notesEsc(u.username.toLowerCase() === notesMeUser().toLowerCase() ? u.fullName + " (me)" : u.fullName)}</option>`).join("");
    sel.value = "";
    sel.disabled = locked;
  }
}

function notesAddShare(username) {
  if (!username) return;
  if (!notesState.share.some(u => u.toLowerCase() === username.toLowerCase())) notesState.share.push(username);
  notesRenderShareChips();
}

// ------------------------------------------------------------
// 📎 Attachments (Composer)
// ------------------------------------------------------------
function notesAddFiles(fileList) {
  const input = document.getElementById("noteFileInput");
  const tooBig = [];
  Array.from(fileList || []).forEach(f => {
    if (f.size > notesState.maxFileBytes) { tooBig.push(f.name); return; }
    notesState.pendingFiles.push(f);
  });
  if (input) input.value = "";
  if (tooBig.length) notesShowMsg(`Too big (max ${notesFmtSize(notesState.maxFileBytes)}): ${tooBig.join(", ")}`, "error");
  notesRenderComposerFiles();
}

function notesRenderComposerFiles() {
  const box = document.getElementById("noteFilesList");
  if (!box) return;
  const editing = notesState.editingId ? notesState.notes.find(x => x.id === notesState.editingId) : null;
  const existing = editing ? (editing.attachments || []) : [];
  box.innerHTML =
    existing.map(a => `<span class="notes-file-chip"><button type="button" class="notes-file-open" data-note-file="${notesEsc(editing.id)}|${notesEsc(a.fileId)}"><i class="fa-solid fa-paperclip"></i> ${notesEsc(a.name)}</button>` +
      (a.canDelete ? `<button type="button" class="notes-file-x" data-file-remove="${notesEsc(editing.id)}|${notesEsc(a.fileId)}" aria-label="Remove file">&times;</button>` : "") + `</span>`).join("") +
    notesState.pendingFiles.map((f, i) => `<span class="notes-file-chip notes-file-pending"><i class="fa-solid fa-arrow-up-from-bracket"></i> ${notesEsc(f.name)} <small>${notesFmtSize(f.size)}</small>` +
      `<button type="button" class="notes-file-x" data-pending-remove="${i}" aria-label="Remove file">&times;</button></span>`).join("");
}

function notesReadFileB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(new Error("Could not read " + file.name));
    r.readAsDataURL(file);
  });
}

async function notesUploadPending(noteId) {
  const files = notesState.pendingFiles.slice();
  const failed = [];
  for (let i = 0; i < files.length; i++) {
    notesShowMsg(`Uploading ${i + 1} of ${files.length}: ${files[i].name}...`, "info");
    try {
      const dataB64 = await notesReadFileB64(files[i]);
      const res = await notesPost({ action: "uploadNoteAttachment", id: noteId, name: files[i].name, mime: files[i].type || "application/octet-stream", dataB64 });
      if (!res || res.status !== "success") throw new Error((res && res.message) || "Upload failed");
    } catch (err) {
      failed.push(`${files[i].name} (${err.message || err})`);
    }
  }
  notesState.pendingFiles = [];
  return failed;
}

async function notesRemoveAttachment(noteId, fileId) {
  const n = notesState.notes.find(x => x.id === noteId);
  const a = n && (n.attachments || []).find(x => x.fileId === fileId);
  if (!a || !confirm(`Remove "${a.name}" from this note?`)) return;
  try {
    const res = await notesPost({ action: "deleteNoteAttachment", id: noteId, fileId });
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not remove the file");
    n.attachments = n.attachments.filter(x => x.fileId !== fileId);
    notesRenderComposerFiles();
    notesAfterDataChange();
    notesFetch().catch(() => {});
  } catch (err) {
    alert(err.message || String(err));
  }
}

// 📂 فتح/تحميل مرفق: بيتجاب من السيرفر بتوكن اليوزر (مفيش لينك Public) - الصور والـ PDF بتتفتح في تاب جديد، والباقي بيتحمّل
async function notesOpenFile(noteId, fileId, btn) {
  const n = notesState.notes.find(x => x.id === noteId);
  const a = n && (n.attachments || []).find(x => x.fileId === fileId);
  if (!a) return;
  const previewable = /^(image\/|application\/pdf|text\/plain)/.test(a.mime || "");
  const win = previewable ? window.open("", "_blank") : null;
  if (win) win.document.write('<p style="font-family:Arial;padding:20px">Loading ' + notesEsc(a.name) + '...</p>');
  const oldHtml = btn ? btn.innerHTML : "";
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + notesEsc(a.name); }
  try {
    const url = GOOGLE_SHEET_API_URL + "?action=notesAttachment&t=" + Date.now() + "&id=" + encodeURIComponent(noteId) +
      "&fileId=" + encodeURIComponent(fileId) + "&token=" + encodeURIComponent(notesToken());
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
      link.download = res.name || a.name;
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

function notesAttachmentsHtml(n) {
  const list = n.attachments || [];
  if (!list.length) return "";
  return `<div class="note-files">` + list.map(a =>
    `<button type="button" class="notes-file-open" data-note-file="${notesEsc(n.id)}|${notesEsc(a.fileId)}" title="${notesEsc(a.byName)} &middot; ${notesEsc(notesFmtSize(a.size))}"><i class="fa-solid fa-paperclip"></i> ${notesEsc(a.name)}</button>`
  ).join("") + `</div>`;
}

document.addEventListener("click", function (ev) {
  const t = ev.target;
  if (!t.closest) return;
  const shareX = t.closest("[data-share-remove]");
  if (shareX) {
    const u = shareX.getAttribute("data-share-remove");
    notesState.share = notesState.share.filter(x => x !== u);
    notesRenderShareChips();
    return;
  }
  const pendingX = t.closest("[data-pending-remove]");
  if (pendingX) {
    notesState.pendingFiles.splice(parseInt(pendingX.getAttribute("data-pending-remove"), 10), 1);
    notesRenderComposerFiles();
    return;
  }
  const fileX = t.closest("[data-file-remove]");
  if (fileX) {
    const parts = fileX.getAttribute("data-file-remove").split("|");
    notesRemoveAttachment(parts[0], parts[1]);
    return;
  }
  const fileOpen = t.closest("[data-note-file]");
  if (fileOpen && !fileOpen.disabled) {
    const parts = fileOpen.getAttribute("data-note-file").split("|");
    notesOpenFile(parts[0], parts[1], fileOpen);
  }
});

function notesResetComposer() {
  notesState.editingId = null;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set("noteTitleInput", "");
  set("noteDetailsInput", "");
  set("noteUpdateInput", "");
  set("noteDueDate", "");
  set("noteDueTime", "");
  set("noteAssigneeSelect", "");
  const sel = document.getElementById("noteAssigneeSelect");
  if (sel) sel.disabled = false;
  const hint = document.getElementById("noteAssigneeHint");
  if (hint) hint.style.display = "none";
  notesState.share = [];
  notesState.pendingFiles = [];
  notesRenderShareChips();
  notesRenderComposerFiles();
  notesSetType("Note");
  notesSetPinChoice(false);
  const title = document.getElementById("notesComposerTitle");
  if (title) title.textContent = "New Note";
  const updRow = document.getElementById("noteUpdateRow");
  if (updRow) updRow.style.display = "none";
  const cancel = document.getElementById("noteCancelEditBtn");
  if (cancel) cancel.style.display = "none";
  const save = document.getElementById("noteSaveBtn");
  if (save) save.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Note';
}

function notesStartEdit(id) {
  const n = notesState.notes.find(x => x.id === id);
  if (!n) return;
  notesState.editingId = id;
  const set = (elId, v) => { const el = document.getElementById(elId); if (el) el.value = v; };
  set("noteTitleInput", n.title);
  set("noteDetailsInput", n.details);
  set("noteUpdateInput", "");
  notesSetType(n.type);
  notesSetPinChoice(!!n.pinned);
  if (n.type === "Reminder" && n.due) {
    set("noteDueDate", n.due.slice(0, 10));
    set("noteDueTime", n.due.slice(11, 16));
  }
  notesFillAssigneeSelect();
  const meUser = ((notesState.me && notesState.me.username) || notesLoggedInUser()).toLowerCase();
  const sel = document.getElementById("noteAssigneeSelect");
  if (sel) {
    if (n.assignee.toLowerCase() === meUser) {
      sel.value = "";
    } else {
      if (!Array.from(sel.options).some(o => o.value === n.assignee)) {
        sel.insertAdjacentHTML("beforeend", `<option value="${notesEsc(n.assignee)}">${notesEsc(n.assigneeName)}</option>`);
      }
      sel.value = n.assignee;
    }
    sel.disabled = !n.isOwner;
  }
  const hint = document.getElementById("noteAssigneeHint");
  if (hint) {
    hint.textContent = n.isOwner ? "" : `This note is from ${n.ownerName} - only they can change who it's assigned or shared to.`;
    hint.style.display = n.isOwner ? "none" : "block";
  }
  notesState.share = (n.sharedWith || []).map(u => u.username);
  notesState.pendingFiles = [];
  notesRenderShareChips();
  notesRenderComposerFiles();
  const title = document.getElementById("notesComposerTitle");
  if (title) title.textContent = "Edit Note";
  const updRow = document.getElementById("noteUpdateRow");
  if (updRow) updRow.style.display = "block";
  const cancel = document.getElementById("noteCancelEditBtn");
  if (cancel) cancel.style.display = "inline-flex";
  const save = document.getElementById("noteSaveBtn");
  if (save) save.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
  notesShowMsg("", "");
  const card = document.getElementById("notesComposerCard");
  if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function notesSave() {
  if (notesState.busy) return;
  notesUnlockAudio(); // أي ضغطة زرار بتفتح الصوت للمنبّه بعد كده
  notesAskDesktopPermissionOnce();

  const title = (document.getElementById("noteTitleInput").value || "").trim();
  const details = (document.getElementById("noteDetailsInput").value || "").trim();
  const updateText = (document.getElementById("noteUpdateInput").value || "").trim();
  const sel = document.getElementById("noteAssigneeSelect");
  const assignee = sel && sel.value ? sel.value : ((notesState.me && notesState.me.username) || notesLoggedInUser());
  const type = notesState.type;
  let due = "";

  if (!title) { notesShowMsg("Please write a title for the note.", "error"); return; }
  if (type === "Reminder") {
    const d = document.getElementById("noteDueDate").value;
    const t = document.getElementById("noteDueTime").value;
    if (!d || !t) { notesShowMsg("Please choose a date and time for the reminder.", "error"); return; }
    due = `${d} ${t.slice(0, 5)}`;
    const old = notesState.editingId ? notesState.notes.find(x => x.id === notesState.editingId) : null;
    const dueChanged = !old || old.due !== due || old.type !== "Reminder";
    if (dueChanged && due <= notesNowMinute(0)) { notesShowMsg("This time has already passed - please choose a time in the future.", "error"); return; }
  }

  const payload = { action: "saveNote", title, details, type, due, assignee, updateText, sharedWith: notesState.share.slice(), pinned: notesState.pin };
  if (notesState.editingId) payload.id = notesState.editingId;

  const btn = document.getElementById("noteSaveBtn");
  const oldLabel = btn ? btn.innerHTML : "";
  notesState.busy = true;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }
  try {
    const res = await notesPost(payload);
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not save the note");
    const iAmMember = assignee.toLowerCase() === notesMeUser().toLowerCase() || notesState.share.some(u => u.toLowerCase() === notesMeUser().toLowerCase());
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
    const failed = notesState.pendingFiles.length ? await notesUploadPending(res.id) : [];
    notesResetComposer();
    if (failed.length) notesShowMsg(`Note saved, but these files failed: ${failed.join(" · ")}`, "error");
    else notesShowMsg(res.message || "Saved", "ok");
    await notesFetch().catch(() => {});
    notesSwitchTab(iAmMember ? "mine" : "assigned");
  } catch (err) {
    notesShowMsg(err.message || String(err), "error");
  } finally {
    notesState.busy = false;
    if (btn) { btn.disabled = false; btn.innerHTML = notesState.editingId ? '<i class="fa-solid fa-floppy-disk"></i> Save Changes' : '<i class="fa-solid fa-floppy-disk"></i> Save Note'; }
  }
}

async function notesSetDone(id, done, fromAlarm) {
  if (!notesToken()) { alert("Please log in again to update this note."); return false; }
  try {
    const res = await notesPost({ action: "setNoteStatus", id, done: !!done });
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not update the note");
    // تحديث فوري محلي لحد ما الداتا الجديدة توصل
    const n = notesState.notes.find(x => x.id === id);
    if (n) {
      if (n.isMember) n.myDone = !!done;
      if (!n.isMember || n.memberCount <= 1) n.status = done ? "Done" : "Open";
    }
    notesAfterDataChange();
    notesFetch().catch(() => {});
    return true;
  } catch (err) {
    alert(err.message || String(err));
    return false;
  }
}

async function notesDelete(id) {
  const n = notesState.notes.find(x => x.id === id);
  if (!n) return;
  if (!confirm(`Delete "${n.title}" permanently? This can't be undone.`)) return;
  try {
    const res = await notesPost({ action: "deleteNote", id });
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not delete the note");
    notesState.notes = notesState.notes.filter(x => x.id !== id);
    notesStopRinging(id);
    if (notesState.editingId === id) notesResetComposer();
    notesAfterDataChange();
    notesFetch().catch(() => {});
  } catch (err) {
    alert(err.message || String(err));
  }
}

// ------------------------------------------------------------
// 🗂️ القوايم
// ------------------------------------------------------------
function notesSortOpen(a, b) {
  // الريمايندرز حسب المعاد (الأقرب/المتأخر الأول)، والـ Pinned الأحدث الأول
  if (a.type === "Reminder" && b.type === "Reminder") return a.due < b.due ? -1 : (a.due > b.due ? 1 : 0);
  return a.createdAt < b.createdAt ? 1 : -1;
}

function notesRenderList() {
  const box = document.getElementById("notesListContainer");
  if (!box) return;
  const all = notesState.notes;
  const mine = all.filter(notesIsMineOpen);
  const assigned = all.filter(n => n.isOwner && !n.isMember);
  const done = all.filter(n => (n.isMember && n.myDone) || (!n.isMember && n.isOwner && n.status === "Done"));

  const setCount = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
  setCount("notesCountMine", mine.length);
  setCount("notesCountAssigned", assigned.filter(n => n.status === "Open").length);
  setCount("notesCountDone", done.length);

  if (!notesState.loaded) { box.innerHTML = `<div class="notes-empty">Loading...</div>`; return; }

  const seen = notesLoad("seen");
  const section = (title, icon, items, emptyText) =>
    `<div class="notes-section"><h4><i class="fa-solid ${icon}"></i> ${title} <span class="notes-count">${items.length}</span></h4>` +
    (items.length ? items.map(n => notesCardHtml(n, seen)).join("") : `<div class="notes-empty">${emptyText}</div>`) +
    `</div>`;

  if (notesState.tab === "assigned") {
    const open = assigned.filter(n => n.status === "Open").sort(notesSortOpen);
    const finished = assigned.filter(n => n.status === "Done").sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
    box.innerHTML =
      section("Waiting on others", "fa-hourglass-half", open, "Nothing assigned to others right now.") +
      section("Done by others", "fa-circle-check", finished.slice(0, 50), "Nothing here yet.");
  } else if (notesState.tab === "done") {
    const list = done.slice().sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
    box.innerHTML = section("Done", "fa-box-archive", list, "No done notes yet. When you mark a note as done it moves here.");
  } else {
    const overdue = mine.filter(notesIsOverdue).sort(notesSortOpen);
    const upcoming = mine.filter(n => n.type === "Reminder" && !notesIsOverdue(n)).sort(notesSortOpen);
    const pinned = mine.filter(n => n.type !== "Reminder" && n.pinned).sort(notesSortOpen);
    const plain = mine.filter(n => n.type !== "Reminder" && !n.pinned).sort(notesSortOpen);
    box.innerHTML =
      (overdue.length ? section("Overdue", "fa-triangle-exclamation", overdue, "") : "") +
      section("Reminders", "fa-alarm-clock", upcoming, "No upcoming reminders.") +
      (pinned.length ? section("Pinned", "fa-thumbtack", pinned, "") : "") +
      section("Notes", "fa-note-sticky", plain, "No notes yet.");
  }
}

function notesCardHtml(n, seen) {
  const overdue = notesIsOverdue(n);
  const isDone = n.isMember ? n.myDone : n.status === "Done";
  const tags = [];
  const id = notesEsc(n.id);

  if (n.type === "Reminder" && n.due) {
    tags.push(overdue
      ? `<span class="note-tag note-tag-overdue"><i class="fa-solid fa-clock"></i> Overdue &middot; ${notesEsc(notesNiceDue(n.due))}</span>`
      : `<span class="note-tag note-tag-due"><i class="fa-solid fa-clock"></i> ${notesEsc(notesNiceDue(n.due))}</span>`);
  }
  if (n.pinned) tags.push(`<span class="note-tag note-tag-pin"><i class="fa-solid fa-thumbtack"></i> Pinned</span>`);
  const shared = (n.sharedWith || []).length > 0;
  if (n.isMember && !n.isOwner) tags.push(`<span class="note-tag note-tag-from"><i class="fa-solid fa-user-tag"></i> From ${notesEsc(n.ownerName)}</span>`);
  if (n.isOwner && !n.isMember) tags.push(`<span class="note-tag note-tag-from"><i class="fa-solid fa-share"></i> To ${notesEsc(n.assigneeName)}</span>`);
  if (shared) {
    // كل الأعضاء (غيري) - واللي خلّص نصيبه عليه ✓
    const me = notesMeUser().toLowerCase();
    const doneSet = new Set((n.doneFor || []).map(d => d.username.toLowerCase()));
    const people = [{ username: n.assignee, fullName: n.assigneeName }].concat(n.sharedWith)
      .filter((p, i, arr) => arr.findIndex(x => x.username.toLowerCase() === p.username.toLowerCase()) === i)
      .filter(p => p.username.toLowerCase() !== me);
    if (people.length) {
      tags.push(`<span class="note-tag note-tag-share"><i class="fa-solid fa-user-group"></i> With ${people.map(p =>
        notesEsc(p.fullName) + (doneSet.has(p.username.toLowerCase()) ? " ✓" : "")).join(", ")}</span>`);
    }
  }
  if (isDone) {
    const when = n.isMember ? n.myDoneAt : n.doneAt;
    const by = !n.isMember && n.doneByName ? " by " + notesEsc(n.doneByName) : "";
    tags.push(`<span class="note-tag note-tag-done"><i class="fa-solid fa-check"></i> Done${by} &middot; ${notesEsc(notesNiceStamp(when))}</span>`);
  } else if (!n.isMember && (n.doneFor || []).length) {
    tags.push(`<span class="note-tag note-tag-done"><i class="fa-solid fa-list-check"></i> ${n.doneFor.length} of ${n.memberCount} done</span>`);
  }
  if ((n.attachments || []).length) tags.push(`<span class="note-tag"><i class="fa-solid fa-paperclip"></i> ${n.attachments.length}</span>`);
  if (seen && notesUnseenKeys(n, seen).length) tags.push(`<span class="note-tag note-tag-new">NEW</span>`);

  const updatesHtml = notesThreadHtml(n);

  const b = (action, cls, icon, label) => `<button type="button" class="notes-btn notes-btn-sm ${cls}" data-note-action="${action}" data-note-id="${id}"><i class="fa-solid ${icon}"></i> ${label}</button>`;
  const actions = [];
  if (n.pinned && n.details) actions.push(notesRevealBtnHtml(n.id));
  if (!isDone) {
    if (n.isMember) actions.push(b("done", "notes-btn-ok", "fa-check", shared ? "Done (for me)" : "Done"));
    actions.push(`<button type="button" class="notes-btn notes-btn-sm notes-btn-reply" data-note-reply-toggle="${id}"><i class="fa-solid fa-reply"></i> Reply</button>`);
    actions.push(b("edit", "notes-btn-ghost", "fa-pen", n.isOwner ? "Edit" : "Edit / Reschedule"));
  } else {
    actions.push(b("restore", "notes-btn-ghost", "fa-rotate-left", "Restore"));
  }
  if (!isDone) actions.push(`<button type="button" class="notes-btn notes-btn-sm notes-btn-ghost" data-note-pin="${id}" title="${n.pinned ? "Remove from your Pinned panel" : "Add to your Pinned panel (details hidden until you press Show)"}"><i class="fa-solid fa-thumbtack"></i> ${n.pinned ? "Unpin" : "Pin"}</button>`);
  if (n.canDelete) actions.push(b("delete", "notes-btn-danger", "fa-trash", isDone ? "Delete forever" : "Delete"));
  if (!isDone && n.calendarUrl) actions.push(`<a class="note-cal-link" href="${notesEsc(n.calendarUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-regular fa-calendar-plus"></i> Add to my Calendar</a>`);

  return `<div class="note-card${overdue ? " note-overdue" : ""}${isDone ? " note-done" : ""}" id="note-card-${id}">
    <div class="note-card-top"><div class="note-title">${n.type === "Reminder" ? "⏰" : (n.pinned ? "📌" : "📝")} ${notesEsc(n.title)}</div></div>
    ${n.details ? (n.pinned ? notesSecretHtml(n) : `<div class="note-details">${notesEsc(n.details)}</div>`) : ""}
    ${notesAttachmentsHtml(n)}
    <div class="note-meta">${tags.join("")}</div>
    ${updatesHtml}
    <div class="note-actions">${actions.join("")}</div>
    ${notesReplyBoxHtml(n)}
  </div>`;
}

// ------------------------------------------------------------
// 💬 الردود (Thread) + خانة الرد جوه الكارت
// ------------------------------------------------------------
let notesReplyOpen = new Set();   // IDs النوتس اللي خانة الرد فيها مفتوحة
let notesReplyDrafts = {};        // id -> النص اللي بيتكتب (عشان مايضيعش لو الكارت اترسم تاني)
let notesReplyFiles = {};         // id -> [File]
let notesReplyBusy = new Set();
const NOTES_THREAD_VISIBLE = 3;

function notesThreadHtml(n) {
  const list = (n.updates || []);
  if (!list.length) return "";
  const me = notesMeUser().toLowerCase();
  const item = u => {
    const mine = String(u.by).toLowerCase() === me;
    return `<div class="note-update${mine ? " note-update-mine" : ""}"><div class="note-update-meta">${mine ? "You" : notesEsc(u.byName || u.by)} &middot; ${notesEsc(notesNiceStamp(u.at))}</div>${notesEsc(u.text)}</div>`;
  };
  const older = list.slice(0, Math.max(0, list.length - NOTES_THREAD_VISIBLE));
  const recent = list.slice(-NOTES_THREAD_VISIBLE);
  return `<div class="note-thread"><div class="note-thread-head"><i class="fa-solid fa-comments"></i> Replies (${list.length})</div>` +
    (older.length ? `<details class="note-updates"><summary>Show ${older.length} older</summary>${older.map(item).join("")}</details>` : "") +
    recent.map(item).join("") + `</div>`;
}

function notesReplyBoxHtml(n) {
  if (!notesReplyOpen.has(n.id)) return "";
  const id = notesEsc(n.id);
  const files = notesReplyFiles[n.id] || [];
  const busy = notesReplyBusy.has(n.id);
  return `<div class="note-reply-box">
    <textarea class="combo-input notes-textarea notes-textarea-sm" data-reply-input="${id}" maxlength="1000" placeholder="Write a reply..."${busy ? " disabled" : ""}>${notesEsc(notesReplyDrafts[n.id] || "")}</textarea>
    <div class="notes-chips">${files.map((f, i) => `<span class="notes-file-chip notes-file-pending"><i class="fa-solid fa-arrow-up-from-bracket"></i> ${notesEsc(f.name)} <small>${notesFmtSize(f.size)}</small><button type="button" class="notes-file-x" data-reply-file-remove="${id}|${i}" aria-label="Remove file">&times;</button></span>`).join("")}</div>
    <div class="note-reply-actions">
      <input type="file" multiple style="display: none;" data-reply-file-input="${id}">
      <button type="button" class="notes-btn notes-btn-sm notes-btn-ghost" data-reply-attach="${id}"${busy ? " disabled" : ""}><i class="fa-solid fa-paperclip"></i> Attach</button>
      <button type="button" class="notes-btn notes-btn-sm notes-btn-primary" data-reply-send="${id}"${busy ? " disabled" : ""}>${busy ? '<i class="fa-solid fa-spinner fa-spin"></i> Sending...' : '<i class="fa-solid fa-paper-plane"></i> Send'}</button>
      <button type="button" class="notes-btn notes-btn-sm notes-btn-ghost" data-note-reply-toggle="${id}"${busy ? " disabled" : ""}>Cancel</button>
    </div>
  </div>`;
}

async function notesSendReply(id) {
  const text = String(notesReplyDrafts[id] || "").trim();
  const files = (notesReplyFiles[id] || []).slice();
  if (!text && !files.length) { alert("Write a reply or attach a file first."); return; }
  notesReplyBusy.add(id);
  notesRenderList();
  const failed = [];
  try {
    if (text) {
      const res = await notesPost({ action: "addNoteComment", id, text });
      if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not send the reply");
    }
    for (const f of files) {
      try {
        const dataB64 = await notesReadFileB64(f);
        const r = await notesPost({ action: "uploadNoteAttachment", id, name: f.name, mime: f.type || "application/octet-stream", dataB64 });
        if (!r || r.status !== "success") throw new Error((r && r.message) || "Upload failed");
      } catch (err) {
        failed.push(`${f.name} (${err.message || err})`);
      }
    }
    delete notesReplyDrafts[id];
    delete notesReplyFiles[id];
    notesReplyOpen.delete(id);
    if (failed.length) alert("Reply sent, but these files failed: " + failed.join(" · "));
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    notesReplyBusy.delete(id);
    await notesFetch().catch(() => {});
    notesRenderList();
  }
}

document.addEventListener("input", function (ev) {
  const t = ev.target;
  if (t && t.getAttribute && t.hasAttribute("data-reply-input")) notesReplyDrafts[t.getAttribute("data-reply-input")] = t.value;
});

document.addEventListener("change", function (ev) {
  const t = ev.target;
  if (!t || !t.hasAttribute || !t.hasAttribute("data-reply-file-input")) return;
  const id = t.getAttribute("data-reply-file-input");
  const list = notesReplyFiles[id] || (notesReplyFiles[id] = []);
  const tooBig = [];
  Array.from(t.files || []).forEach(f => { if (f.size > notesState.maxFileBytes) tooBig.push(f.name); else list.push(f); });
  if (tooBig.length) alert(`Too big (max ${notesFmtSize(notesState.maxFileBytes)}): ${tooBig.join(", ")}`);
  notesRenderList();
});

document.addEventListener("click", function (ev) {
  const t = ev.target;
  if (!t.closest) return;
  const toggle = t.closest("[data-note-reply-toggle]");
  if (toggle && !toggle.disabled) {
    const id = toggle.getAttribute("data-note-reply-toggle");
    if (notesReplyOpen.has(id)) notesReplyOpen.delete(id); else notesReplyOpen.add(id);
    notesRenderList();
    if (notesReplyOpen.has(id)) {
      const box = document.querySelector(`[data-reply-input="${CSS.escape(id)}"]`);
      if (box) box.focus();
    }
    return;
  }
  const attach = t.closest("[data-reply-attach]");
  if (attach && !attach.disabled) {
    const input = document.querySelector(`[data-reply-file-input="${CSS.escape(attach.getAttribute("data-reply-attach"))}"]`);
    if (input) input.click();
    return;
  }
  const rm = t.closest("[data-reply-file-remove]");
  if (rm) {
    const parts = rm.getAttribute("data-reply-file-remove").split("|");
    (notesReplyFiles[parts[0]] || []).splice(parseInt(parts[1], 10), 1);
    notesRenderList();
    return;
  }
  const send = t.closest("[data-reply-send]");
  if (send && !send.disabled) notesSendReply(send.getAttribute("data-reply-send"));
});

// event delegation - أزرار الكروت بتتبني ديناميك
document.addEventListener("click", function (ev) {
  const btn = ev.target.closest && ev.target.closest("[data-note-action]");
  if (!btn || btn.disabled) return;
  const id = btn.getAttribute("data-note-id");
  const action = btn.getAttribute("data-note-action");
  if (action === "edit") notesStartEdit(id);
  else if (action === "delete") notesDelete(id);
  else if (action === "done" || action === "restore") {
    btn.disabled = true;
    notesSetDone(id, action === "done").finally(() => { btn.disabled = false; });
  }
});


// ============================================================
// 📌 PINNED: تفاصيل النوت الـ Pinned متغطية (Blur) لحد ما اليوزر يظهرها بزرار 👁️
// + لوحة جانبية (زرار 📌 في الهيدر) فيها كل الـ Pinned، فاتحة فوق أي صفحة لحد ما تتقفل
// ============================================================
function notesSecretHtml(n) {
  const shown = notesRevealed.has(n.id);
  return `<div class="note-details note-secret${shown ? "" : " is-hidden"}" data-secret-id="${notesEsc(n.id)}"${shown ? "" : ' title="Hidden - press Show to see it"'}>${notesEsc(n.details)}</div>`;
}

function notesRevealBtnHtml(id) {
  const shown = notesRevealed.has(id);
  return `<button type="button" class="notes-btn notes-btn-sm notes-btn-ghost" data-note-reveal="${notesEsc(id)}">` +
    `<i class="fa-solid ${shown ? "fa-eye-slash" : "fa-eye"}"></i> ${shown ? "Hide" : "Show"}</button>`;
}

function notesMyPinned() {
  return notesState.notes
    .filter(n => notesIsMineOpen(n) && n.pinned)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function notesToggleReveal(id) {
  if (notesRevealed.has(id)) notesRevealed.delete(id); else notesRevealed.add(id);
  notesRefreshSecrets();
}

// بيحدّث الـ Blur والزراير في الصفحة واللوحة من غير ما يعيد رسم كل حاجة
function notesRefreshSecrets() {
  document.querySelectorAll("[data-secret-id]").forEach(el => {
    const shown = notesRevealed.has(el.getAttribute("data-secret-id"));
    el.classList.toggle("is-hidden", !shown);
    if (shown) el.removeAttribute("title"); else el.setAttribute("title", "Hidden - press Show to see it");
  });
  document.querySelectorAll("[data-note-reveal]").forEach(btn => {
    const shown = notesRevealed.has(btn.getAttribute("data-note-reveal"));
    btn.innerHTML = `<i class="fa-solid ${shown ? "fa-eye-slash" : "fa-eye"}"></i> ${shown ? "Hide" : "Show"}`;
  });
  notesUpdateShowAllBtn();
}

function notesUpdateShowAllBtn() {
  const btn = document.getElementById("notesPinnedShowAllBtn");
  if (!btn) return;
  const withDetails = notesMyPinned().filter(n => n.details);
  const anyHidden = withDetails.some(n => !notesRevealed.has(n.id));
  btn.style.display = withDetails.length ? "inline-flex" : "none";
  btn.innerHTML = anyHidden ? '<i class="fa-solid fa-eye"></i> Show all' : '<i class="fa-solid fa-eye-slash"></i> Hide all';
}

function notesPinnedToggleAll() {
  const withDetails = notesMyPinned().filter(n => n.details);
  const anyHidden = withDetails.some(n => !notesRevealed.has(n.id));
  withDetails.forEach(n => { if (anyHidden) notesRevealed.add(n.id); else notesRevealed.delete(n.id); });
  notesRefreshSecrets();
}

function notesPinnedDrawerIsOpen() {
  const d = document.getElementById("notesPinnedDrawer");
  return !!(d && d.style.display !== "none");
}

function notesTogglePinnedDrawer(ev) {
  if (ev) ev.stopPropagation();
  if (notesPinnedDrawerIsOpen()) { notesClosePinnedDrawer(); return; }
  notesOpenPinnedDrawer();
}

function notesOpenPinnedDrawer() {
  const d = document.getElementById("notesPinnedDrawer");
  if (!d || !notesLoggedInUser()) return;
  notesHideBellPanel();
  d.style.display = "flex";
  try { localStorage.setItem("notesPinnedOpen", "1"); } catch (e) { /* مش مهم */ }
  notesRenderPinnedDrawer();
  if (!notesState.loaded && notesToken()) notesFetch().catch(() => {});
}

// القفل بيخبّي كل التفاصيل تاني - المرة الجاية تفتح متغطية
function notesClosePinnedDrawer() {
  const d = document.getElementById("notesPinnedDrawer");
  if (d) d.style.display = "none";
  try { localStorage.removeItem("notesPinnedOpen"); } catch (e) { /* مش مهم */ }
  notesMyPinned().forEach(n => notesRevealed.delete(n.id));
  notesRefreshSecrets();
}

function notesRenderPinnedDrawer() {
  const list = document.getElementById("notesPinnedList");
  if (!list || !notesPinnedDrawerIsOpen()) return;
  if (!notesLoggedInUser()) { notesClosePinnedDrawer(); return; }
  if (!notesState.loaded) { list.innerHTML = `<div class="notes-empty">Loading...</div>`; return; }

  const pinned = notesMyPinned();
  list.innerHTML = pinned.length
    ? pinned.map(n => `<div class="notes-pinned-item">
        <div class="notes-pinned-item-top">
          <div class="note-title">${n.type === "Reminder" ? "⏰" : "📌"} ${notesEsc(n.title)}</div>
          <div class="notes-pinned-item-btns">
            ${n.details ? notesRevealBtnHtml(n.id) : ""}
            <button type="button" class="notes-icon-btn" data-note-edit-from-drawer="${notesEsc(n.id)}" title="Edit" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>
          </div>
        </div>
        ${n.details ? notesSecretHtml(n) : ""}
        ${notesAttachmentsHtml(n)}
      </div>`).join("")
    : `<div class="notes-empty">No pinned notes yet.<br>Press <b>📌 Pin</b> on any note in My Notes, or tick <b>Pin it</b> when you write one.</div>`;
  notesUpdateShowAllBtn();
}

function notesNewPinnedFromDrawer() {
  notesOpenPage();
  notesResetComposer();
  notesSetPinChoice(true);
  const t = document.getElementById("noteTitleInput");
  if (t) setTimeout(() => t.focus(), 100);
}

async function notesTogglePin(id, btn) {
  const n = notesState.notes.find(x => x.id === id);
  if (!n) return;
  const want = !n.pinned;
  if (btn) btn.disabled = true;
  n.pinned = want; // تحديث فوري محلي
  notesAfterDataChange();
  try {
    const res = await notesPost({ action: "setNotePin", id, pinned: want });
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not update the pin");
  } catch (err) {
    n.pinned = !want;
    notesAfterDataChange();
    alert(err.message || String(err));
  }
  notesFetch().catch(() => {});
}

document.addEventListener("click", function (ev) {
  const pinBtn = ev.target.closest && ev.target.closest("[data-note-pin]");
  if (pinBtn && !pinBtn.disabled) { notesTogglePin(pinBtn.getAttribute("data-note-pin"), pinBtn); return; }
  const reveal = ev.target.closest && ev.target.closest("[data-note-reveal]");
  if (reveal) { notesToggleReveal(reveal.getAttribute("data-note-reveal")); return; }
  const edit = ev.target.closest && ev.target.closest("[data-note-edit-from-drawer]");
  if (edit) {
    const id = edit.getAttribute("data-note-edit-from-drawer");
    notesOpenPage();
    setTimeout(() => notesStartEdit(id), 100);
  }
});

// لو اللوحة كانت مفتوحة قبل الـ Refresh، ترجع مفتوحة (بس التفاصيل متغطية)
document.addEventListener("DOMContentLoaded", () => {
  try {
    if (localStorage.getItem("notesPinnedOpen") === "1" && notesLoggedInUser()) setTimeout(notesOpenPinnedDrawer, 300);
  } catch (e) { /* مش مهم */ }
});

// ------------------------------------------------------------
// 🔔 الجرس
// ------------------------------------------------------------
// المفاتيح اللي "لسه ماتشافتش" لنوت معينة: a: اتعملتلي Assign / d: اتعملت Done من حد تاني / u: تحديث من حد تاني
function notesUnseenKeys(n, seen) {
  const keys = [];
  const me = notesLoggedInUser().toLowerCase();
  if (n.isMember && !n.isOwner && !n.myDone && !seen["a:" + n.id]) keys.push("a:" + n.id);
  // Done من حد تاني (لصاحب النوت أو لباقي الأعضاء في الـ Share)
  (n.doneFor || []).forEach(d => {
    const k = "d:" + n.id + "|" + d.username.toLowerCase() + "|" + d.at;
    if (d.username.toLowerCase() !== me && (n.isOwner || n.isMember) && !seen[k]) keys.push(k);
  });
  const last = (n.updates || [])[(n.updates || []).length - 1];
  if (last && String(last.by).toLowerCase() !== me && !seen["u:" + n.id + "|" + last.at]) keys.push("u:" + n.id + "|" + last.at);
  return keys;
}

function notesBellItems() {
  if (!notesState.loaded) return [];
  const seen = notesLoad("seen");
  const items = [];
  notesState.notes.forEach(n => {
    if (n.isMember && notesIsOverdue(n)) {
      items.push({ id: n.id, overdue: true, title: n.title, text: `⏰ Due ${notesNiceDue(n.due)}`, sort: "0" + n.due });
    }
    notesUnseenKeys(n, seen).forEach(k => {
      let text = "";
      if (k.startsWith("a:")) text = `📥 New note from ${n.ownerName}`;
      else if (k.startsWith("d:")) {
        const who = (n.doneFor || []).find(d => k.indexOf("|" + d.username.toLowerCase() + "|") !== -1);
        text = `✅ Done by ${who ? who.fullName : n.assigneeName}`;
      }
      else {
        const last = n.updates[n.updates.length - 1];
        text = `💬 ${last.byName || last.by}: ${String(last.text).slice(0, 80)}`;
      }
      items.push({ id: n.id, overdue: false, title: n.title, text, sort: "1" + (n.updatedAt || "") });
    });
  });
  return items.sort((a, b) => (a.sort < b.sort ? -1 : 1));
}

function notesUpdateBell() {
  const loggedIn = !!notesLoggedInUser();
  const count = loggedIn ? notesBellItems().length : 0;
  document.querySelectorAll(".notes-bell-badge").forEach(el => {
    el.textContent = count > 99 ? "99+" : String(count);
    el.style.display = count > 0 ? "inline-block" : "none";
  });
  const panel = document.getElementById("notesBellPanel");
  if (panel && panel.style.display !== "none") notesRenderBellPanel();
}

function notesRenderBellPanel() {
  const list = document.getElementById("notesBellList");
  if (!list) return;
  const items = notesBellItems();
  list.innerHTML = items.length
    ? items.map(it => `<button type="button" class="notes-bell-item${it.overdue ? " overdue" : ""}" data-note-open="${notesEsc(it.id)}"><b>${notesEsc(it.title)}</b>${notesEsc(it.text)}</button>`).join("")
    : `<div class="notes-empty">You're all caught up 🎉</div>`;
}

function notesToggleBellPanel(ev) {
  if (ev) ev.stopPropagation();
  notesUnlockAudio();
  const panel = document.getElementById("notesBellPanel");
  if (!panel) return;
  if (panel.style.display !== "none") { notesHideBellPanel(); return; }
  notesRenderBellPanel();
  panel.style.display = "flex";
  if (!notesState.loaded && notesToken()) notesFetch().catch(() => {});
}

function notesHideBellPanel() {
  const panel = document.getElementById("notesBellPanel");
  if (panel) panel.style.display = "none";
}

// silent=true: من غير ما نعيد رسم القايمة (بتتنادى بعد ما صفحة النوتس تتفتح وترسم الـ NEW)
function notesMarkAllSeen(silent) {
  const seen = notesLoad("seen");
  notesState.notes.forEach(n => notesUnseenKeys(n, seen).forEach(k => { seen[k] = 1; }));
  notesSave_("seen", seen);
  notesUpdateBell();
  if (!silent && notesPageIsOpen()) notesRenderList();
}

document.addEventListener("click", function (ev) {
  const item = ev.target.closest && ev.target.closest("[data-note-open]");
  if (item) { notesOpenPage(item.getAttribute("data-note-open")); return; }
  // أي ضغطة برا اللوحة بتقفلها
  const panel = document.getElementById("notesBellPanel");
  const inside = ev.target.closest && (ev.target.closest("#notesBellPanel") || ev.target.closest(".notes-bell-btn"));
  if (panel && panel.style.display !== "none" && !inside) notesHideBellPanel();
});

// ------------------------------------------------------------
// 📣 إشعار صغير (Toast) + إشعار سطح المكتب للحاجات الجديدة اللي وصلت وانت فاتح البورتال
// ------------------------------------------------------------
function notesAnnounceChanges(before, after) {
  const beforeMap = {};
  before.forEach(n => { beforeMap[n.id] = n; });
  const me = notesLoggedInUser().toLowerCase();
  after.forEach(n => {
    const old = beforeMap[n.id];
    const newDone = old ? (n.doneFor || []).filter(d => d.username.toLowerCase() !== me &&
      !(old.doneFor || []).some(o => o.username.toLowerCase() === d.username.toLowerCase())) : [];
    if (n.isMember && !n.isOwner && !n.myDone && (!old || !old.isMember)) {
      notesToast(`${(n.sharedWith || []).length ? "👥 Shared with you by" : "📥 New note from"} ${n.ownerName}`, n.title, n.id);
    } else if (newDone.length) {
      notesToast(`✅ Done by ${newDone.map(d => d.fullName).join(", ")}`, n.title, n.id);
    } else if (old && (n.updates || []).length > (old.updates || []).length) {
      const last = n.updates[n.updates.length - 1];
      if (String(last.by).toLowerCase() !== me) notesToast(`💬 Reply from ${last.byName || last.by}`, n.title, n.id);
    }
  });
}

function notesToast(head, text, noteId) {
  const stack = document.getElementById("notesToastStack");
  if (!stack) return;
  const el = document.createElement("div");
  el.className = "notes-toast";
  el.innerHTML = `<div><b>${notesEsc(head)}</b>${notesEsc(text)}</div><button type="button" class="notes-toast-x" aria-label="Close">&times;</button>`;
  el.onclick = (e) => {
    if (e.target.closest(".notes-toast-x")) { el.remove(); return; }
    el.remove();
    notesOpenPage(noteId);
  };
  stack.appendChild(el);
  setTimeout(() => el.remove(), 12000);
  notesDesktopNotify("note-" + noteId + "-" + Date.now(), head, text, false, noteId);
}

// ------------------------------------------------------------
// 🖥️ إشعارات سطح المكتب (Windows notifications) - اختياري، لو اليوزر وافق
// ------------------------------------------------------------
function notesDesktopSupported() {
  return typeof window.Notification !== "undefined";
}

function notesUpdateDesktopAlertsBtn() {
  const btn = document.getElementById("notesDesktopAlertsBtn");
  if (!btn) return;
  btn.style.display = notesDesktopSupported() && Notification.permission === "default" ? "inline-flex" : "none";
}

function notesEnableDesktopAlerts() {
  notesUnlockAudio();
  if (!notesDesktopSupported()) return;
  Notification.requestPermission().then(() => notesUpdateDesktopAlertsBtn()).catch(() => {});
}

function notesAskDesktopPermissionOnce() {
  try {
    if (notesDesktopSupported() && Notification.permission === "default" && !localStorage.getItem("notesAskedDesktop")) {
      localStorage.setItem("notesAskedDesktop", "1");
      Notification.requestPermission().then(() => notesUpdateDesktopAlertsBtn()).catch(() => {});
    }
  } catch (e) { /* مش مهم */ }
}

function notesDesktopNotify(tag, title, body, sticky, noteId) {
  try {
    if (!notesDesktopSupported() || Notification.permission !== "granted") return null;
    const n = new Notification(title, { body, tag, requireInteraction: !!sticky, renotify: true });
    n.onclick = () => { window.focus(); if (noteId) notesOpenPage(noteId); n.close(); };
    return n;
  } catch (e) {
    return null;
  }
}

// ------------------------------------------------------------
// 🔊 صوت المنبّه (Web Audio - مفيش ملف صوت) - بيلف لوحده (loop) لحد ما يتقفل
// ------------------------------------------------------------
let notesAudioCtx = null;
let notesAudioBuffer = null;
let notesAudioSource = null;

function notesGetAudioCtx() {
  if (!notesAudioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    notesAudioCtx = new AC();
  }
  return notesAudioCtx;
}

// "بيب بيب بيب" وبعدين سكوت - 1.6 ثانية بتتكرر
function notesBuildAlarmBuffer(ctx) {
  const sr = ctx.sampleRate;
  const total = Math.floor(sr * 1.6);
  const buf = ctx.createBuffer(1, total, sr);
  const data = buf.getChannelData(0);
  const beeps = [0, 0.22, 0.44];
  const beepLen = 0.15, fade = 0.008;
  beeps.forEach(start => {
    const s0 = Math.floor(start * sr), len = Math.floor(beepLen * sr);
    for (let i = 0; i < len && s0 + i < total; i++) {
      const t = i / sr;
      let env = 1;
      if (t < fade) env = t / fade;
      else if (t > beepLen - fade) env = Math.max(0, (beepLen - t) / fade);
      data[s0 + i] = 0.6 * env * (Math.sin(2 * Math.PI * 880 * t) * 0.7 + Math.sin(2 * Math.PI * 1760 * t) * 0.3);
    }
  });
  return buf;
}

// المتصفح مش بيسمح بصوت غير بعد أول تفاعل من اليوزر (ضغطة/زرار) - فبنفتح الصوت مع أول ضغطة في أي حتة
function notesUnlockAudio() {
  const ctx = notesGetAudioCtx();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}
["click", "keydown", "touchstart"].forEach(evt => document.addEventListener(evt, notesUnlockAudio, { passive: true }));

function notesStartSound() {
  const ctx = notesGetAudioCtx();
  if (!ctx || notesAudioSource) return;
  if (!notesAudioBuffer) notesAudioBuffer = notesBuildAlarmBuffer(ctx);
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const src = ctx.createBufferSource();
  src.buffer = notesAudioBuffer;
  src.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  src.connect(gain).connect(ctx.destination);
  src.start();
  notesAudioSource = src;
}

function notesStopSound() {
  if (!notesAudioSource) return;
  try { notesAudioSource.stop(); } catch (e) { /* خلاص واقف */ }
  try { notesAudioSource.disconnect(); } catch (e) { /* مش مهم */ }
  notesAudioSource = null;
}

// ------------------------------------------------------------
// ⏰ المنبّه
// ------------------------------------------------------------
// alarm store: { "x:<id>|<due>": 1 } = اتقفل (Dismiss/Done) ، { "s:<id>|<due>": "yyyy-MM-dd HH:mm" } = متأجل لحد الوقت ده
function notesTick() {
  if (notesPageIsOpen() && notesState.loaded) {
    // تحديث كلمة Overdue / Today مع مرور الوقت (مرة كل دقيقة بس)
    const minute = notesNowMinute(0);
    const box = document.getElementById("notesListContainer");
    const typing = box && document.activeElement && box.contains(document.activeElement);
    if (notesTick.lastMinute !== minute && !typing) { notesTick.lastMinute = minute; notesRenderList(); }
  }
  if (!notesState.loaded) return;

  const now = notesNowMinute(0);
  const oldest = notesNowMinute(-NOTES_ALARM_LOOKBACK_HOURS * 60);
  const store = notesLoad("alarm");
  let added = false;

  notesState.notes.forEach(n => {
    if (!notesIsMineOpen(n) || n.type !== "Reminder" || !n.due) return;
    if (n.due > now || n.due < oldest) return;
    const key = n.id + "|" + n.due;
    if (store["x:" + key]) return;
    const snoozedUntil = store["s:" + key];
    if (snoozedUntil && snoozedUntil > now) return;
    if (notesRinging.indexOf(n.id) === -1) {
      notesRinging.push(n.id);
      added = true;
      notesDesktopPopups[n.id] = notesDesktopNotify("alarm-" + n.id, "⏰ Reminder: " + n.title, n.details || notesNiceDue(n.due), true, n.id);
    }
  });

  // أي نوت بترن واتقفلت/اتمسحت/اتأجلت من تاب تاني أو من جهاز تاني -> تقف هنا كمان
  notesRinging = notesRinging.filter(id => {
    const n = notesState.notes.find(x => x.id === id);
    const keep = n && notesIsMineOpen(n) && n.type === "Reminder" && n.due <= now && !store["x:" + id + "|" + n.due];
    if (!keep) notesCloseDesktopPopup(id);
    return keep;
  });

  if (added || notesRinging.length) notesRenderAlarm();
  else notesHideAlarm();
  notesUpdateBell();
}

function notesRenderAlarm() {
  const modal = document.getElementById("notesAlarmModal");
  const list = document.getElementById("notesAlarmList");
  if (!modal || !list) return;
  if (!notesRinging.length) { notesHideAlarm(); return; }

  list.innerHTML = notesRinging.map(id => {
    const n = notesState.notes.find(x => x.id === id);
    if (!n) return "";
    const eid = notesEsc(id);
    return `<div class="notes-alarm-item">
      <div class="note-title">⏰ ${notesEsc(n.title)}</div>
      ${n.details ? `<div class="note-details">${notesEsc(n.details)}</div>` : ""}
      <div class="note-meta"><span class="note-tag note-tag-overdue"><i class="fa-solid fa-clock"></i> ${notesEsc(notesNiceDue(n.due))}</span>${!n.isOwner ? `<span class="note-tag note-tag-from">From ${notesEsc(n.ownerName)}</span>` : ""}</div>
      <div class="notes-alarm-actions">
        <button type="button" class="notes-btn notes-btn-sm notes-btn-ok" onclick="notesAlarmDone('${eid}', this)"><i class="fa-solid fa-check"></i> Done</button>
        <select class="notes-snooze-select" id="notesSnooze-${eid}">
          <option value="5">5 min</option><option value="15" selected>15 min</option><option value="30">30 min</option><option value="60">1 hour</option>
        </select>
        <button type="button" class="notes-btn notes-btn-sm notes-btn-primary" onclick="notesAlarmSnooze('${eid}')"><i class="fa-solid fa-bed"></i> Snooze</button>
        <button type="button" class="notes-btn notes-btn-sm notes-btn-ghost" onclick="notesAlarmDismiss('${eid}')"><i class="fa-solid fa-xmark"></i> Dismiss</button>
      </div>
    </div>`;
  }).join("");

  modal.style.display = "flex";
  notesStartSound();
  notesStartTitleBlink();
}

function notesHideAlarm() {
  const modal = document.getElementById("notesAlarmModal");
  if (modal) modal.style.display = "none";
  notesStopSound();
  notesStopTitleBlink();
}

function notesCloseDesktopPopup(id) {
  const p = notesDesktopPopups[id];
  if (p) { try { p.close(); } catch (e) { /* خلاص مقفول */ } }
  delete notesDesktopPopups[id];
}

function notesStopRinging(id) {
  notesRinging = notesRinging.filter(x => x !== id);
  notesCloseDesktopPopup(id);
  if (notesRinging.length) notesRenderAlarm(); else notesHideAlarm();
}

function notesStopAllRinging() {
  notesRinging.slice().forEach(id => notesCloseDesktopPopup(id));
  notesRinging = [];
  notesHideAlarm();
}

function notesMarkAlarmHandled(id) {
  const n = notesState.notes.find(x => x.id === id);
  if (!n) return;
  const store = notesLoad("alarm");
  store["x:" + id + "|" + n.due] = 1;
  delete store["s:" + id + "|" + n.due];
  notesSave_("alarm", store);
}

function notesAlarmDismiss(id) {
  notesMarkAlarmHandled(id);
  notesStopRinging(id);
}

function notesAlarmDismissAll() {
  notesRinging.slice().forEach(id => notesMarkAlarmHandled(id));
  notesStopAllRinging();
}

function notesAlarmSnooze(id) {
  const n = notesState.notes.find(x => x.id === id);
  if (!n) { notesStopRinging(id); return; }
  const sel = document.getElementById("notesSnooze-" + id);
  const minutes = parseInt(sel ? sel.value : "15", 10) || 15;
  const store = notesLoad("alarm");
  store["s:" + id + "|" + n.due] = notesNowMinute(minutes);
  notesSave_("alarm", store);
  notesStopRinging(id);
}

async function notesAlarmDone(id, btn) {
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
  // المنبّه بيسكت فورًا، والـ Done بيتبعت للسيرفر في الخلفية
  notesMarkAlarmHandled(id);
  notesStopRinging(id);
  await notesSetDone(id, true, true);
}

function notesStartTitleBlink() {
  if (notesTitleBlinkTimer) return;
  notesOriginalTitle = document.title.indexOf("⏰") === 0 ? notesOriginalTitle : document.title;
  let on = false;
  notesTitleBlinkTimer = setInterval(() => {
    on = !on;
    document.title = on ? "⏰ Reminder!" : notesOriginalTitle;
  }, 1000);
}

function notesStopTitleBlink() {
  if (!notesTitleBlinkTimer) return;
  clearInterval(notesTitleBlinkTimer);
  notesTitleBlinkTimer = null;
  document.title = notesOriginalTitle;
}

// بيشتغل طول ما الصفحة مفتوحة (حتى لو اليوزر في صفحة تانية جوه البورتال أو التاب في الخلفية)
function notesStartTicking() {
  if (notesTickTimer) return;
  notesTickTimer = setInterval(notesTick, NOTES_TICK_SECONDS * 1000);
}
notesStartTicking();
