// ============================================================
// FINAL BILL CALCULATOR PAGE
// Split from the original script.js on 2026-09-06
// ============================================================

// ============================================================
// 🧮 FINAL BILL CALCULATOR FUNCTIONS
// ============================================================
function initCalculatorPage() {
  const dateInput = document.getElementById("moveOutDate");
  if (dateInput && !dateInput.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    onMoveOutDateChange();
  } else {
    calculateFinalBill();
  }
}

function onMoveOutDateChange() {
  const dateInput = document.getElementById("moveOutDate");
  const exitDaysInput = document.getElementById("exitDays");
  const toggle = document.getElementById("summerToggle");

  if (dateInput && dateInput.value) {
    const parts = dateInput.value.split("-");
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (exitDaysInput) exitDaysInput.value = day;

    if (toggle) {
      toggle.checked = [7, 8, 9, 10].includes(month);
    }
  }
  toggleSummerAdjustment();
  calculateFinalBill();
}

function toggleSummerAdjustment() {
  const toggle = document.getElementById("summerToggle");
  const percWrapper = document.getElementById("customPercWrapper");
  const summerRow = document.getElementById("resSummerRow");

  if (toggle && percWrapper) {
    if (toggle.checked) {
      percWrapper.style.display = "inline-flex";
      if (summerRow) summerRow.style.display = "flex";
    } else {
      percWrapper.style.display = "none";
      if (summerRow) summerRow.style.display = "none";
    }
  }
  calculateFinalBill();
}

function calculateFinalBill() {
  const prevReading = parseFloat(document.getElementById("prevReading")?.value) || 0;
  const currReading = parseFloat(document.getElementById("currReading")?.value) || 0;
  const exitDays = parseFloat(document.getElementById("exitDays")?.value) || 0;
  const isSummer = document.getElementById("summerToggle")?.checked || false;
  const summerPerc = parseFloat(document.getElementById("summerPerc")?.value) || 0;

  const lastMonthUsage = Math.max(0, currReading - prevReading);
  const dailyAvg = lastMonthUsage / 30;
  
  const baseCurrentUsage = dailyAvg * exitDays;

  let summerAddition = 0;
  if (isSummer) {
    summerAddition = baseCurrentUsage * (summerPerc / 100);
  }

  const finalCurrentUsage = baseCurrentUsage + summerAddition;
  const roundedFinalUsage = Math.ceil(finalCurrentUsage);
  const roundedFinalReading = currReading + roundedFinalUsage;

  if (document.getElementById("resLastMonthUsage")) document.getElementById("resLastMonthUsage").innerText = `${Math.round(lastMonthUsage)} Units`;
  if (document.getElementById("resDailyAvg")) document.getElementById("resDailyAvg").innerText = `${dailyAvg.toFixed(2)} Units/day`;
  if (document.getElementById("resDaysLabel")) document.getElementById("resDaysLabel").innerText = exitDays;
  if (document.getElementById("resBaseEstimated")) document.getElementById("resBaseEstimated").innerText = `${Math.ceil(baseCurrentUsage)} Units`;
  if (document.getElementById("resPercLabel")) document.getElementById("resPercLabel").innerText = summerPerc;
  if (document.getElementById("resSummerAddition")) document.getElementById("resSummerAddition").innerText = `+${Math.ceil(summerAddition)} Units`;
  if (document.getElementById("resFinalCurrentUsage")) document.getElementById("resFinalCurrentUsage").innerText = `${roundedFinalUsage} Units`;

  if (document.getElementById("rsPreviousVal")) {
    document.getElementById("rsPreviousVal").innerText = (currReading || 0).toLocaleString();
  }
  if (document.getElementById("rsCurrentVal")) {
    document.getElementById("rsCurrentVal").innerText = (roundedFinalReading || 0).toLocaleString();
  }
}

function copyReading(elementId, btnElement) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const textValue = el.innerText;
  const cleanValue = textValue.replace(/,/g, '').trim();

  navigator.clipboard.writeText(cleanValue).then(() => {
    btnElement.classList.add('copied');
    const icon = btnElement.querySelector('i');
    if (icon) icon.className = 'fa-solid fa-check';

    setTimeout(() => {
      btnElement.classList.remove('copied');
      if (icon) icon.className = 'fa-regular fa-copy';
    }, 1200);
  }).catch(err => {
    console.error("Failed to copy:", err);
  });
}

