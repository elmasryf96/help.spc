// ============================================================
// GLASS THEME: تحكم في وضع الزجاج (Glass) / Lite
// - أول ما الصفحة تفتح، سكريبت صغير في head.html بيقرر (قبل الرسم) لو الجهاز ضعيف
//   ولا لأ، ويضيف class "glass-lite" على <html> (يقفل البلور).
// - الاختيار اليدوي محفوظ في localStorage["glassMode"] = "on" | "off" (لو مفيش = تلقائي).
// - الملف ده بيضيف زرار "Glass" في منيو البروفايل (في كل الصفحات) عشان أي موظف يقفله/يفتحه.
// ============================================================

function glassIsLite() {
  return document.documentElement.classList.contains("glass-lite");
}

function glassRefreshToggleLabels() {
  const lite = glassIsLite();
  document.querySelectorAll(".glass-toggle-state").forEach(el => {
    el.textContent = lite ? "Off" : "On";
  });
}

function toggleGlassMode(event) {
  if (event) event.stopPropagation();
  const nowLite = !glassIsLite();
  document.documentElement.classList.toggle("glass-lite", nowLite);
  try { localStorage.setItem("glassMode", nowLite ? "off" : "on"); } catch (e) {}
  glassRefreshToggleLabels();
}

function glassInjectToggleButtons() {
  document.querySelectorAll(".profile-dropdown-menu").forEach(menu => {
    if (menu.querySelector(".glass-toggle-btn")) return;
    const btn = document.createElement("button");
    btn.className = "dropdown-item glass-toggle-btn";
    btn.type = "button";
    btn.innerHTML = '<i class="fa-solid fa-droplet" style="color:#d97706;"></i> Glass effect <span class="glass-toggle-state"></span>';
    btn.addEventListener("click", toggleGlassMode);
    // قبل الفاصل الأخير (اللي قبل Logout) عشان يفضل Logout آخر حاجة
    const dividers = menu.querySelectorAll(".dropdown-divider");
    const lastDivider = dividers[dividers.length - 1];
    if (lastDivider) menu.insertBefore(btn, lastDivider);
    else menu.appendChild(btn);
  });
  glassRefreshToggleLabels();
}

document.addEventListener("DOMContentLoaded", glassInjectToggleButtons);
