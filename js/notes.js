// ============================================================
// 📝 NOTES & REMINDERS (added 2026-09-25)
// - صفحة My Notes: نوتس Pinned (من غير معاد) و Reminder (بمعاد) + Assign ليوزر تاني
// - 🔔 جرس في الهيدر: ريمايندرز جه معادها + نوت جديدة جاتلك + حد خلّص نوت انت بعتهاله + تحديثات
// - ⏰ منبّه بصوت لما معاد الريمايندر ييجي - مش بيقف غير لما اليوزر يدوس Done / Snooze / Dismiss
// الداتا في شيت "Notes" من خلال Apps Script (Notes.gs) - والإيميلات بتتبعت من هناك
// ============================================================

const NOTES_TICK_SECONDS = 20;           // كل قد إيه نشيك على معاد الريمايندرز (في المتصفح)
const NOTES_ALARM_LOOKBACK_HOURS = 24;   // ريمايندر عدّى معاده بأكتر من كده مش بيرن (بيفضل ظاهر Overdue في الجرس بس)

let notesState = {
  notes: [], users: [], me: null, loaded: false, busy: false,
  tab: "mine", editingId: null, type: "Pinned", owner: ""   // owner = اليوزر اللي الداتا دي بتاعته
};
let notesLastSignal = null;
let notesTickTimer = null;
let notesRinging = [];        // IDs النوتس اللي بترن دلوقتي
let notesDesktopPopups = {};  // id -> Notification
let notesTitleBlinkTimer = null;
let notesOriginalTitle = document.title;

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

function notesIsOverdue(n) {
  return n.status === "Open" && n.type === "Reminder" && n.due && n.due <= notesNowMinute(0);
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
  notesState = { notes: [], users: [], me: null, loaded: false, busy: false, tab: "mine", editingId: null, type: "Pinned", owner: "" };
  notesLastSignal = null;
  notesHideBellPanel();
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
      const tab = n.status === "Done" ? "done" : (n.isAssignee ? "mine" : "assigned");
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
    notesRenderList();
  }
  notesUpdateBell();
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
function notesSetType(type) {
  notesState.type = type === "Reminder" ? "Reminder" : "Pinned";
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
}

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
  notesSetType("Pinned");
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
    hint.textContent = n.isOwner ? "" : `Assigned to you by ${n.ownerName} - only they can reassign it.`;
    hint.style.display = n.isOwner ? "none" : "block";
  }
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

  const payload = { action: "saveNote", title, details, type, due, assignee, updateText };
  if (notesState.editingId) payload.id = notesState.editingId;

  const btn = document.getElementById("noteSaveBtn");
  const oldLabel = btn ? btn.innerHTML : "";
  notesState.busy = true;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }
  try {
    const res = await notesPost(payload);
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Could not save the note");
    notesResetComposer();
    notesShowMsg(res.message || "Saved", "ok");
    await notesFetch().catch(() => {});
    notesSwitchTab(assignee.toLowerCase() === notesLoggedInUser().toLowerCase() ? "mine" : "assigned");
  } catch (err) {
    notesShowMsg(err.message || String(err), "error");
    if (btn) btn.innerHTML = oldLabel;
  } finally {
    notesState.busy = false;
    if (btn) btn.disabled = false;
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
      n.status = done ? "Done" : "Open";
      n.doneAt = done ? notesNowMinute(0) + ":00" : "";
      n.doneBy = done ? notesLoggedInUser() : "";
      n.doneByName = done ? ((notesState.me && notesState.me.fullName) || "") : "";
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
  const mine = all.filter(n => n.status === "Open" && n.isAssignee);
  const assigned = all.filter(n => n.isOwner && !n.isAssignee);
  const done = all.filter(n => n.status === "Done" && (n.isAssignee || n.isOwner));

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
    const pinned = mine.filter(n => n.type === "Pinned").sort(notesSortOpen);
    box.innerHTML =
      (overdue.length ? section("Overdue", "fa-triangle-exclamation", overdue, "") : "") +
      section("Reminders", "fa-alarm-clock", upcoming, "No upcoming reminders.") +
      section("Pinned", "fa-thumbtack", pinned, "No pinned notes. Pin anything you need to see every day.");
  }
}

function notesCardHtml(n, seen) {
  const overdue = notesIsOverdue(n);
  const isDone = n.status === "Done";
  const tags = [];
  const id = notesEsc(n.id);

  if (n.type === "Reminder" && n.due) {
    tags.push(overdue
      ? `<span class="note-tag note-tag-overdue"><i class="fa-solid fa-clock"></i> Overdue &middot; ${notesEsc(notesNiceDue(n.due))}</span>`
      : `<span class="note-tag note-tag-due"><i class="fa-solid fa-clock"></i> ${notesEsc(notesNiceDue(n.due))}</span>`);
  } else {
    tags.push(`<span class="note-tag"><i class="fa-solid fa-thumbtack"></i> Pinned</span>`);
  }
  if (n.isAssignee && !n.isOwner) tags.push(`<span class="note-tag note-tag-from"><i class="fa-solid fa-user-tag"></i> From ${notesEsc(n.ownerName)}</span>`);
  if (n.isOwner && !n.isAssignee) tags.push(`<span class="note-tag note-tag-from"><i class="fa-solid fa-share"></i> To ${notesEsc(n.assigneeName)}</span>`);
  if (isDone) tags.push(`<span class="note-tag note-tag-done"><i class="fa-solid fa-check"></i> Done${n.doneByName && !n.isAssignee ? " by " + notesEsc(n.doneByName) : ""} &middot; ${notesEsc(notesNiceStamp(n.doneAt))}</span>`);
  if (seen && notesUnseenKeys(n, seen).length) tags.push(`<span class="note-tag note-tag-new">NEW</span>`);

  const updates = (n.updates || []);
  const updatesHtml = updates.length
    ? `<details class="note-updates"${updates.length <= 2 ? " open" : ""}><summary>${updates.length} update${updates.length > 1 ? "s" : ""}</summary>` +
      updates.slice().reverse().map(u => `<div class="note-update"><div class="note-update-meta">${notesEsc(u.byName || u.by)} &middot; ${notesEsc(notesNiceStamp(u.at))}</div>${notesEsc(u.text)}</div>`).join("") +
      `</details>`
    : "";

  const b = (action, cls, icon, label) => `<button type="button" class="notes-btn notes-btn-sm ${cls}" data-note-action="${action}" data-note-id="${id}"><i class="fa-solid ${icon}"></i> ${label}</button>`;
  const actions = [];
  if (!isDone) {
    if (n.isAssignee) actions.push(b("done", "notes-btn-ok", "fa-check", "Done"));
    actions.push(b("edit", "notes-btn-ghost", "fa-pen", n.isOwner ? "Edit" : "Update / Reschedule"));
  } else {
    actions.push(b("restore", "notes-btn-ghost", "fa-rotate-left", "Restore"));
  }
  if (n.canDelete) actions.push(b("delete", "notes-btn-danger", "fa-trash", isDone ? "Delete forever" : "Delete"));
  if (!isDone && n.calendarUrl) actions.push(`<a class="note-cal-link" href="${notesEsc(n.calendarUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-regular fa-calendar-plus"></i> Add to my Calendar</a>`);

  return `<div class="note-card${overdue ? " note-overdue" : ""}${isDone ? " note-done" : ""}" id="note-card-${id}">
    <div class="note-card-top"><div class="note-title">${n.type === "Reminder" ? "⏰" : "📌"} ${notesEsc(n.title)}</div></div>
    ${n.details ? `<div class="note-details">${notesEsc(n.details)}</div>` : ""}
    <div class="note-meta">${tags.join("")}</div>
    ${updatesHtml}
    <div class="note-actions">${actions.join("")}</div>
  </div>`;
}

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

// ------------------------------------------------------------
// 🔔 الجرس
// ------------------------------------------------------------
// المفاتيح اللي "لسه ماتشافتش" لنوت معينة: a: اتعملتلي Assign / d: اتعملت Done من حد تاني / u: تحديث من حد تاني
function notesUnseenKeys(n, seen) {
  const keys = [];
  const me = notesLoggedInUser().toLowerCase();
  if (n.isAssignee && !n.isOwner && n.status === "Open" && !seen["a:" + n.id]) keys.push("a:" + n.id);
  if (n.isOwner && !n.isAssignee && n.status === "Done" && !seen["d:" + n.id + "|" + n.doneAt]) keys.push("d:" + n.id + "|" + n.doneAt);
  const last = (n.updates || [])[(n.updates || []).length - 1];
  if (last && String(last.by).toLowerCase() !== me && !seen["u:" + n.id + "|" + last.at]) keys.push("u:" + n.id + "|" + last.at);
  return keys;
}

function notesBellItems() {
  if (!notesState.loaded) return [];
  const seen = notesLoad("seen");
  const items = [];
  notesState.notes.forEach(n => {
    if (n.isAssignee && notesIsOverdue(n)) {
      items.push({ id: n.id, overdue: true, title: n.title, text: `⏰ Due ${notesNiceDue(n.due)}`, sort: "0" + n.due });
    }
    notesUnseenKeys(n, seen).forEach(k => {
      let text = "";
      if (k.startsWith("a:")) text = `📥 New note from ${n.ownerName}`;
      else if (k.startsWith("d:")) text = `✅ Done by ${n.doneByName || n.assigneeName}`;
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
    if (n.isAssignee && !n.isOwner && n.status === "Open" && (!old || !old.isAssignee)) {
      notesToast(`📥 New note from ${n.ownerName}`, n.title, n.id);
    } else if (old && n.isOwner && !n.isAssignee && n.status === "Done" && old.status !== "Done") {
      notesToast(`✅ Done by ${n.doneByName || n.assigneeName}`, n.title, n.id);
    } else if (old && (n.updates || []).length > (old.updates || []).length) {
      const last = n.updates[n.updates.length - 1];
      if (String(last.by).toLowerCase() !== me) notesToast(`💬 Update from ${last.byName || last.by}`, n.title, n.id);
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
    if (notesTick.lastMinute !== minute) { notesTick.lastMinute = minute; notesRenderList(); }
  }
  if (!notesState.loaded) return;

  const now = notesNowMinute(0);
  const oldest = notesNowMinute(-NOTES_ALARM_LOOKBACK_HOURS * 60);
  const store = notesLoad("alarm");
  let added = false;

  notesState.notes.forEach(n => {
    if (n.status !== "Open" || !n.isAssignee || n.type !== "Reminder" || !n.due) return;
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
    const keep = n && n.status === "Open" && n.type === "Reminder" && n.due <= now && !store["x:" + id + "|" + n.due];
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
