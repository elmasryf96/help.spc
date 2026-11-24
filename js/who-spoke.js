// ============================================================
// 📞 WHO SPOKE TO - زرار فوق في الهيدر (جنب Dashboard) لأي يوزر عامل لوجن
// ============================================================
// بيفتح بوب أب: يكتب رقم موبايل العميل ويدوس Search -> آخر 3 مكالمات للرقم ده
// (هو اتصل بينا أو إحنا اتصلنا بيه) بالتاريخ والوقت ومين الإيجنت اللي رد / اتصل.
// السيرفر: WhoSpokeTo.gs (GET compOptions&whoSpoke=<رقم>) - قراءة بس من شيت Call Log.
// ============================================================

let whoSpokeBusy = false;

function whoSpokeEsc(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function whoSpokeDur(sec) {
  sec = Math.round(sec || 0);
  if (sec <= 0) return "0s";
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

function whoSpokeDate(d, t) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = String(d || "").split("-");
  const day = p.length === 3 ? `${parseInt(p[2], 10)} ${months[parseInt(p[1], 10) - 1]} ${p[0]}` : String(d || "");
  const tp = String(t || "").split(":").map(Number);
  let time = "";
  if (tp.length >= 2 && !isNaN(tp[0])) {
    const h12 = tp[0] % 12 === 0 ? 12 : tp[0] % 12;
    time = `${h12}:${String(tp[1]).padStart(2, "0")} ${tp[0] >= 12 ? "PM" : "AM"}`;
  }
  return { day, time };
}

function whoSpokeEnsureModal() {
  if (document.getElementById("whoSpokeModal")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div id="whoSpokeModal" class="modal-overlay" style="display:none; z-index: 10000;">
      <div class="modal-content" style="max-width: 620px; border-radius: 16px;">
        <div class="modal-header">
          <h3><i class="fa-solid fa-phone"></i> Who spoke to</h3>
          <button type="button" class="close-modal-btn" onclick="closeWhoSpokeModal()">✕</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <form onsubmit="whoSpokeSearch(); return false;" style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;">
            <div class="form-group" style="flex:1; min-width:200px; margin:0;">
              <label for="whoSpokeNumber"><i class="fa-solid fa-mobile-screen"></i> Customer mobile number:</label>
              <input type="tel" id="whoSpokeNumber" class="combo-input" placeholder="e.g. 0501234567" autocomplete="off">
            </div>
            <button type="submit" id="whoSpokeBtn" class="btn-primary" style="width:auto; padding: 10px 18px;">
              <i class="fa-solid fa-magnifying-glass"></i> Search
            </button>
          </form>
          <div id="whoSpokeResult" style="margin-top:14px;"></div>
        </div>
      </div>
    </div>`);
  document.getElementById("whoSpokeModal").addEventListener("click", e => {
    if (e.target.id === "whoSpokeModal") closeWhoSpokeModal();
  });
}

function openWhoSpokeModal() {
  whoSpokeEnsureModal();
  const modal = document.getElementById("whoSpokeModal");
  modal.style.display = "flex";
  const input = document.getElementById("whoSpokeNumber");
  if (input) setTimeout(() => input.focus(), 50);
}

function closeWhoSpokeModal() {
  const modal = document.getElementById("whoSpokeModal");
  if (modal) modal.style.display = "none";
}

async function whoSpokeSearch() {
  if (whoSpokeBusy) return;
  const input = document.getElementById("whoSpokeNumber");
  const box = document.getElementById("whoSpokeResult");
  const btn = document.getElementById("whoSpokeBtn");
  if (!input || !box) return;
  const number = input.value.trim();
  if (number.replace(/\D/g, "").length < 7) {
    box.innerHTML = `<div class="swap-msg swap-msg-error" style="display:block;">⚠️ Please enter the customer's mobile number (at least 7 digits).</div>`;
    return;
  }

  whoSpokeBusy = true;
  if (btn) btn.disabled = true;
  box.innerHTML = `<div class="swap-empty"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>`;
  try {
    const url = GOOGLE_SHEET_API_URL + "?action=compOptions&whoSpoke=" + encodeURIComponent(number) +
      "&t=" + Date.now() + "&token=" + encodeURIComponent(localStorage.getItem("sessionToken") || "");
    const res = await fetch(url, { method: "GET", redirect: "follow" }).then(r => r.json());
    if (!res || res.status !== "success") throw new Error((res && res.message) || "Search failed");
    box.innerHTML = whoSpokeResultHtml(res);
  } catch (err) {
    box.innerHTML = `<div class="swap-msg swap-msg-error" style="display:block;">⚠️ ${whoSpokeEsc(err.message || String(err))}</div>`;
  } finally {
    whoSpokeBusy = false;
    if (btn) btn.disabled = false;
  }
}

function whoSpokeResultHtml(res) {
  const calls = res.calls || [];
  if (!calls.length) {
    return `<div class="swap-empty"><i class="fa-solid fa-circle-info"></i> No calls found for <b>${whoSpokeEsc(res.number)}</b>.</div>`;
  }
  const rows = calls.map(c => {
    const { day, time } = whoSpokeDate(c.date, c.time);
    const out = c.direction === "Outbound";
    const answered = c.result === "Answered";
    const who = c.agent || "";
    let line, tone;
    if (out) {
      line = answered
        ? `📤 <b>${whoSpokeEsc(who || "An agent")}</b> called the customer - <b>answered</b> · talked ${whoSpokeDur(c.talkSeconds)}`
        : `📤 <b>${whoSpokeEsc(who || "An agent")}</b> called the customer - <b>no answer</b>${c.waitSeconds ? ` · rang ${whoSpokeDur(c.waitSeconds)}` : ""}`;
      tone = answered ? "good" : "bad";
    } else {
      line = answered
        ? `📥 Customer called us - answered by <b>${whoSpokeEsc(who || "an agent")}</b> · talked ${whoSpokeDur(c.talkSeconds)}`
        : `📥 Customer called us - <b>nobody answered</b>${c.result ? ` (${whoSpokeEsc(c.result)})` : ""}${c.waitSeconds ? ` · waited ${whoSpokeDur(c.waitSeconds)}` : ""}`;
      tone = answered ? "good" : "bad";
    }
    return `<div class="who-spoke-call who-spoke-${tone}">
        <div class="who-spoke-when"><i class="fa-regular fa-calendar"></i> ${whoSpokeEsc(day)} · ${whoSpokeEsc(time)}</div>
        <div>${line}</div>
      </div>`;
  }).join("");
  const more = res.total > calls.length ? `<div style="font-size:12px; opacity:.65; margin-top:6px;">Showing the last ${calls.length} of ${res.total} calls with this number.</div>` : "";
  return `<div style="font-weight:800; margin-bottom:8px;">Last ${calls.length} call${calls.length === 1 ? "" : "s"} with ${whoSpokeEsc(res.number)}</div>${rows}${more}`;
}

document.addEventListener("keydown", ev => {
  if (ev.key === "Escape") closeWhoSpokeModal();
});
