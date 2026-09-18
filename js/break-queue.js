// ============================================================
// ☕ BREAK QUEUE - دور بريك حقيقي جوه help.spc (مش كتابة يدوي في Teams)
// بوب أب عالمي شغال في الخلفية دايمًا - Added 2026-09-19, Redesigned 2026-09-19
//
// بداية/نهاية البريك الفعلية بتتحدد تلقائي من حالة الإيجنت الحقيقية على
// 3CX (مش زرار Start/End يدوي) - أول ما تغيّر حالتك لـ "Break" على 3CX
// النظام بيعتبرك بدأت بريكك تلقائي، وأول ما ترجع لأي حالة تانية بيعتبرك
// خلصت تلقائي. رصيد الـ30 دقيقة بردو بيتحسب من نفس البيانات الحقيقية
// (مش عداد منفصل) - فمفيش أي فرق ممكن يحصل مع اللي حصل فعليًا على 3CX.
// ============================================================

let _breakPollInterval = null;
let _breakTickInterval = null;
let _breakServerTimeOffsetMs = 0; // فرق توقيت السيرفر عن الجهاز - بيتحسب مع كل poll
let _breakLastKnownStatus = null; // آخر status معروف للطلب بتاعي - عشان نكتشف لما يتغير (مثلاً queued -> ready -> active) ونطلع تنبيه مرة واحدة بس
let _breakNearEndAlerted = false;
let _breakEndAlerted = false;
const BREAK_NEAR_END_WARNING_SECONDS = 15;

function getMyAgentName() {
  return localStorage.getItem("userFullName") || localStorage.getItem("loggedInUser") || "";
}

function formatBreakMMSS(totalSeconds) {
  const neg = totalSeconds < 0;
  const abs = Math.abs(Math.round(totalSeconds));
  const mm = String(Math.floor(abs / 60)).padStart(2, "0");
  const ss = String(abs % 60).padStart(2, "0");
  return (neg ? "-" : "") + mm + ":" + ss;
}

// بيحول قيمة حقل مدة البريك (خانة واحدة بس) لعدد ثواني - بيقبل "5" (يعني 5
// دقايق) أو "5:30" (يعني 5 دقايق و30 ثانية) أو "0:45" (45 ثانية بس)
function parseBreakDurationInput(raw) {
  const val = String(raw || "").trim();
  if (!val) return 0;
  if (val.includes(":")) {
    const parts = val.split(":");
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return (m * 60) + s;
  }
  const m = parseFloat(val);
  if (isNaN(m)) return 0;
  return Math.round(m * 60);
}

function formatUaeClockTime(epochSeconds) {
  try {
    return new Date(epochSeconds * 1000).toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return "-";
  }
}

// ============================================================
// 🔔 صوت + نوتيفكيشن ديسكتوب (من غير أي ملف خارجي - Web Audio API بس)
// ============================================================
function playBreakBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (delayMs, freq) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }, delayMs);
    };
    playTone(0, 880);
    playTone(180, 880);
  } catch (e) {
    console.warn("Beep failed:", e);
  }
}

function requestBreakNotificationPermission() {
  if (window.Notification && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showBreakNotification(title, body) {
  playBreakBeep();
  try {
    if (window.Notification && Notification.permission === "granted") {
      new Notification(title, { body, icon: undefined });
    }
  } catch (e) {
    console.warn("Notification failed:", e);
  }
}

// ============================================================
// 🌍 تشغيل عالمي في الخلفية - بيتنادى مرة واحدة بس بعد تسجيل الدخول (من
// init.js ومن auth.js) وفضل شغال طول ما اليوزر مسجل دخول، بغض النظر هو
// فاتح أنهي صفحة أو حتى لو البوب أب نفسه مقفول - عشان التنبيهات والعداد
// يفضلوا شغالين في الخلفية زي ما فارس طلب بالظبط
// ============================================================
function initBreakQueueGlobal() {
  requestBreakNotificationPermission();
  refreshBreakStatus();
  if (!_breakPollInterval) {
    _breakPollInterval = setInterval(refreshBreakStatus, 4000);
  }
}

function stopBreakQueuePolling() {
  if (_breakPollInterval) {
    clearInterval(_breakPollInterval);
    _breakPollInterval = null;
  }
  stopBreakLocalTick();
  _breakLastKnownStatus = null;
  _breakNearEndAlerted = false;
  _breakEndAlerted = false;
}

function stopBreakLocalTick() {
  if (_breakTickInterval) {
    clearInterval(_breakTickInterval);
    _breakTickInterval = null;
  }
}

// ============================================================
// 🪟 فتح/قفل البوب أب - البيانات بتتحدث في الخلفية بغض النظر هو مفتوح
// ولا لأ، فلما يتفتح بيبقى شايف آخر حالة على طول
// ============================================================
function openBreakQueueModal() {
  const modal = document.getElementById("breakQueueModal");
  if (modal) modal.style.display = "flex";
  updateUIForRole();
  refreshBreakStatus();
}

function closeBreakQueueModal() {
  const modal = document.getElementById("breakQueueModal");
  if (modal) modal.style.display = "none";
}

// ============================================================
// 🔄 تحديث الحالة من السيرفر
// ============================================================
function refreshBreakStatus() {
  const agent = getMyAgentName();
  if (!agent) return;

  fetch(`${PYTHON_BACKEND_BREAK_STATUS_URL}?agent=${encodeURIComponent(agent)}`)
    .then(r => r.json())
    .then(data => {
      _breakServerTimeOffsetMs = (data.server_time * 1000) - Date.now();
      window._lastBreakStatusData = data;
      if (typeof updateUIForRole === "function") updateUIForRole();
      renderBreakAdminPanel(data);
      renderBreakLiveOverview(data);
      renderMyBreakBudget(data);
      renderMyBreakState(data);
      updateBreakNavButtonLabel(data);
    })
    .catch(err => console.warn("Break status fetch failed:", err));
}

function renderMyBreakBudget(data) {
  const el = document.getElementById("myBreakBudgetText");
  if (el) el.textContent = formatBreakMMSS(data.budget_remaining_seconds);
}

// ============================================================
// 🔘 تحديث زرار "My Break" اللي جمب البروفايل - بيبان عليه لايف
// الحالة الحالية حتى لو البوب أب مقفول (عداد شغال/جاي دورك/مكانك في الطابور)
// ============================================================
function updateBreakNavButtonLabel(data) {
  document.querySelectorAll(".myBreakNavBtnLabel").forEach(label => {
    const record = data.my_record;
    if (!record) {
      label.textContent = "My Break";
      label.style.color = "";
      return;
    }
    if (record.status === "queued") {
      const idx = (data.queue || []).findIndex(r => r.id === record.id);
      label.textContent = `Queued #${idx >= 0 ? (idx + 1) : "-"}`;
      label.style.color = "#64748b";
    } else if (record.status === "ready") {
      label.textContent = "Ready!";
      label.style.color = "#d97706";
    } else if (record.status === "active") {
      const nowServerMs = Date.now() + _breakServerTimeOffsetMs;
      const elapsedSeconds = (nowServerMs - (record.started_at * 1000)) / 1000;
      const remaining = record.requested_seconds - elapsedSeconds;
      label.textContent = formatBreakMMSS(remaining);
      label.style.color = remaining <= 0 ? "#dc2626" : "#16a34a";
    }
  });
}

function renderBreakLiveOverview(data) {
  const container = document.getElementById("breakLiveOverview");
  if (!container) return;

  let html = "";

  const onBreakList = (data.active || []);
  const readyList = (data.ready || []);
  const queueList = (data.queue || []);

  if (onBreakList.length === 0 && readyList.length === 0 && queueList.length === 0) {
    html += `<div style="text-align:center; color:#64748b; padding: 10px 0;">No one is on break right now.</div>`;
  }

  onBreakList.forEach(r => {
    html += `<div class="break-overview-row" style="display:flex; justify-content:space-between; padding:8px 10px; background:#f0fdf4; border-radius:8px; margin-bottom:6px;">
      <span><i class="fa-solid fa-mug-hot" style="color:#16a34a;"></i> <strong>${r.agent}</strong></span>
      <span style="color:#16a34a; font-weight:800;">On Break</span>
    </div>`;
  });

  readyList.forEach(r => {
    html += `<div class="break-overview-row" style="display:flex; justify-content:space-between; padding:8px 10px; background:#fffbeb; border-radius:8px; margin-bottom:6px;">
      <span><i class="fa-solid fa-bell" style="color:#d97706;"></i> <strong>${r.agent}</strong></span>
      <span style="color:#d97706; font-weight:800;">Ready to Start</span>
    </div>`;
  });

  queueList.forEach((r, idx) => {
    html += `<div class="break-overview-row" style="display:flex; justify-content:space-between; padding:8px 10px; background:#f8fafc; border-radius:8px; margin-bottom:6px;">
      <span>#${idx + 1} <strong>${r.agent}</strong></span>
      <span style="color:#64748b;">Waiting (${formatBreakMMSS(r.requested_seconds)})</span>
    </div>`;
  });

  container.innerHTML = html;
}

function renderBreakAdminPanel(data) {
  const card = document.getElementById("breakAdminControlsCard");
  if (card) card.style.display = (typeof isAdmin === "function" && isAdmin()) ? "block" : "none";

  const label = document.getElementById("breakCapCurrentLabel");
  if (label) label.textContent = data.cap;

  const note = document.getElementById("breakCapExpiryNote");
  if (note) {
    if (data.cap_expires_at) {
      note.textContent = `⏱️ Will revert to 1 at ${formatUaeClockTime(data.cap_expires_at)} (UAE time).`;
    } else if (data.cap !== 1) {
      note.textContent = `♾️ No time limit set - stays at ${data.cap} until manually reset.`;
    } else {
      note.textContent = "";
    }
  }
}

function renderMyBreakState(data) {
  const formDiv = document.getElementById("breakRequestForm");
  const queuedDiv = document.getElementById("breakQueuedStatus");
  const readyDiv = document.getElementById("breakReadyStatus");
  const activeDiv = document.getElementById("breakActiveStatus");
  [formDiv, queuedDiv, readyDiv, activeDiv].forEach(d => d && d.classList.add("hidden-page"));

  const record = data.my_record;
  const newStatus = record ? record.status : null;

  // 🔔 اكتشاف التحول لحالة "ready" (جاله دوره) - نطلع تنبيه مرة واحدة بس -
  // ده بيشتغل حتى لو البوب أب مقفول لأن الـ poll شغال دايمًا في الخلفية
  if (newStatus === "ready" && _breakLastKnownStatus !== "ready") {
    showBreakNotification("☕ It's your turn!", "Switch your 3CX status to Break now to start.");
  }
  _breakLastKnownStatus = newStatus;

  if (!record) {
    if (formDiv) formDiv.classList.remove("hidden-page");
    stopBreakLocalTick();
    return;
  }

  if (record.status === "queued") {
    if (queuedDiv) queuedDiv.classList.remove("hidden-page");
    const posEl = document.getElementById("myQueuePosition");
    const durEl = document.getElementById("myQueuedDuration");
    if (posEl) {
      const idx = (data.queue || []).findIndex(r => r.id === record.id);
      posEl.textContent = idx >= 0 ? (idx + 1) : "-";
    }
    if (durEl) durEl.textContent = formatBreakMMSS(record.requested_seconds);
    stopBreakLocalTick();
  } else if (record.status === "ready") {
    if (readyDiv) readyDiv.classList.remove("hidden-page");
    const durEl = document.getElementById("myReadyDuration");
    if (durEl) durEl.textContent = formatBreakMMSS(record.requested_seconds);
    stopBreakLocalTick();
  } else if (record.status === "active") {
    if (activeDiv) activeDiv.classList.remove("hidden-page");
    window._activeBreakRecord = record;
    if (!_breakTickInterval) {
      _breakNearEndAlerted = false;
      _breakEndAlerted = false;
      _breakTickInterval = setInterval(tickMyBreakTimer, 1000);
      tickMyBreakTimer();
    }
  }
}

function tickMyBreakTimer() {
  const record = window._activeBreakRecord;
  if (!record) return;
  const nowServerMs = Date.now() + _breakServerTimeOffsetMs;
  const elapsedSeconds = (nowServerMs - (record.started_at * 1000)) / 1000;
  const remaining = record.requested_seconds - elapsedSeconds;

  const display = document.getElementById("myBreakTimerDisplay");
  const overrunNote = document.getElementById("myBreakOverrunNote");
  if (display) display.textContent = formatBreakMMSS(remaining);

  document.querySelectorAll(".myBreakNavBtnLabel").forEach(label => {
    label.textContent = formatBreakMMSS(remaining);
    label.style.color = remaining <= 0 ? "#dc2626" : "#16a34a";
  });

  if (remaining <= 0) {
    if (overrunNote) overrunNote.style.display = "block";
    if (!_breakEndAlerted) {
      _breakEndAlerted = true;
      showBreakNotification("⏰ Break time is up!", "Your break has ended - please return.");
    }
  } else {
    if (overrunNote) overrunNote.style.display = "none";
    if (remaining <= BREAK_NEAR_END_WARNING_SECONDS && !_breakNearEndAlerted) {
      _breakNearEndAlerted = true;
      showBreakNotification("⏳ Break ending soon", `Your break ends in ${Math.ceil(remaining)} seconds.`);
    }
  }
}

// ============================================================
// 🎬 أكشنز المستخدم - Request/Cancel بس. مفيش Start/End يدوي خالص: بداية
// ونهاية البريك الفعلية بتتحدد تلقائي من حالتك الحقيقية على 3CX
// ============================================================
function requestMyBreak() {
  const agent = getMyAgentName();
  const totalSeconds = parseBreakDurationInput(document.getElementById("breakReqDuration")?.value);

  if (totalSeconds <= 0) {
    alert("⚠️ Please enter a valid break duration (e.g. 5 or 5:30).");
    return;
  }

  fetch(PYTHON_BACKEND_BREAK_REQUEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent, requested_seconds: totalSeconds })
  })
    .then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to request break");
      }
      return r.json();
    })
    .then(() => refreshBreakStatus())
    .catch(err => alert(`❌ ${err.message}`));
}

function cancelMyBreak() {
  const agent = getMyAgentName();
  const data = window._lastBreakStatusData;
  const record = (data && data.my_record) || null;
  if (!record) return;
  fetch(PYTHON_BACKEND_BREAK_CANCEL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent, id: record.id })
  })
    .then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to cancel");
      }
      return r.json();
    })
    .then(() => refreshBreakStatus())
    .catch(err => alert(`❌ ${err.message}`));
}

// ============================================================
// 👑 تحكم الأدمن في السقف - بيختار وقت الرجوع للـ default بتوقيت الإمارات
// (ساعة:دقيقة) بدل ما يحدد عدد دقايق يعدها
// ============================================================
function applyBreakCapChange() {
  const cap = parseInt(document.getElementById("breakCapInput")?.value || "1", 10) || 1;
  const revertTime = document.getElementById("breakCapRevertTime")?.value || null; // "HH:MM" أو فاضي

  fetch(PYTHON_BACKEND_BREAK_SET_CAP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cap, revert_at_uae_time: revertTime || null })
  })
    .then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update cap");
      }
      return r.json();
    })
    .then(() => refreshBreakStatus())
    .catch(err => alert(`❌ ${err.message}`));
}

function revertBreakCapToDefault() {
  fetch(PYTHON_BACKEND_BREAK_SET_CAP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cap: 1, revert_at_uae_time: null })
  })
    .then(() => refreshBreakStatus())
    .catch(err => alert(`❌ ${err.message}`));
}
