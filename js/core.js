// ============================================================
// CORE: config, session/auto-logout, sheets logging, shared data, helpers, dev banner
// Split from the original script.js on 2026-09-06
// ============================================================

// ============================================================
// 🌐 GOOGLE SHEETS INTEGRATION URL & BACKEND API URL
// ============================================================
const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzhjZ7HOUzKzcmCMrzsIUQMnX9dsbS3_qrEM0-v696OjjlMX3A5wSJUkbs5BDEH7UyM/exec";
const PYTHON_BACKEND_NOC_URL = "https://help-spc.onrender.com/generate-noc";
const PYTHON_BACKEND_OWNER_NOC_URL = "https://help-spc.onrender.com/generate-owner-noc";
const PYTHON_BACKEND_RENT_NOC_URL = "https://help-spc.onrender.com/generate-rent-noc";
const PYTHON_BACKEND_MOVE_IN_URL = "https://help-spc.onrender.com/generate-move-in-clearance";
const PYTHON_BACKEND_AGENT_STATUS_URL = "https://help-spc.onrender.com/api/agent-status";

// ============================================================
// ⏱️ AUTO-LOGOUT ON INACTIVITY (20 MINUTES)
// ============================================================
let inactivityTimer;
const INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 دقيقة بالمللي ثانية

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  
  // التشغيل فقط إذا كان المستخدم مسجل دخول بالفعل
  if (localStorage.getItem("loggedInUser")) {
    inactivityTimer = setTimeout(autoLogoutUser, INACTIVITY_LIMIT);
  }
}

function autoLogoutUser() {
  // 1. مسح الجلسة وبيانات الدخول
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("userPassword");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userFullName");
  localStorage.removeItem("userEmail");
  
  // 2. تنظيف محركات البحث المفتوحة
  clearSearch();
  clearSchedSearch();
  clearMappingSearch();

  // 3. التوجيه الفوري لشاشة تسجيل الدخول
  navigateTo('login-page');
  
  // 4. إظهار رسالة تنبيه مخصصة
  alert("⚠️ Session expired due to 20 minutes of inactivity. Please log in again.");
}

// مراقبة أفعال المستخدم لإعادة ضبط المؤقت باستمرار عند التفاعل
['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
  window.addEventListener(event, resetInactivityTimer);
});

// ============================================================
// 📝 LOGGING FUNCTION TO GOOGLE SHEETS (NOC & CLEARANCE LOGS)
// ============================================================
function sendLogToGoogleSheet(logPayload) {
  const currentUser = localStorage.getItem("userFullName") || localStorage.getItem("loggedInUser") || "Unknown User";

  // حساب وقت وتاريخ الإمارات (Asia/Dubai) دائماً بغض النظر عن موقع الموظف
  const now = new Date();
  const options = {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  };
  
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  const uaeTimestamp = formatter.format(now).replace(",", "");

  const dataToSend = {
    action: "logNoc",
    user: currentUser,
    noc_type: logPayload.noc_type || "-",
    tenant_name: logPayload.tenant_name || "-",
    tenant_contract: logPayload.tenant_contract || "-",
    owner_name: logPayload.owner_name || "-",
    owner_contract: logPayload.owner_contract || "-",
    tower_name: logPayload.tower_name || "-",
    unit_no: logPayload.unit_no || "-",
    timestamp: uaeTimestamp
  };

  fetch(GOOGLE_SHEET_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dataToSend)
  }).catch(err => console.error("Error logging to Google Sheet:", err));
}

// ============================================================
// 🏢 DYNAMIC TOWERS, SYSTEM DATA, MAPPING DATA & USERS
// ============================================================
let towersData = {};
let scheduleData = [];
let rosterData = [];
let dynamicUnitMapping = [];
let dynamicUsers = {};

function parseMonthAndYear(val) {
  if (!val) return { month: 8, year: 2026 };
  let str = String(val).trim();
  
  if (str.includes("/") || str.includes("-")) {
    let parts = str.split(/[/|-]/);
    if (parts.length === 3) {
      return { month: parseInt(parts[1], 10), year: parseInt(parts[2], 10) };
    } else if (parts.length === 2) {
      return { month: parseInt(parts[0], 10), year: parseInt(parts[1], 10) };
    }
  }
  
  return { month: parseInt(str, 10) || 8, year: 2026 };
}

function fetchAllDataFromGoogleSheet() {
  const nocacheUrl = GOOGLE_SHEET_API_URL + "?t=" + new Date().getTime();

  return fetch(nocacheUrl, { 
    method: 'GET',
    redirect: 'follow',
    headers: {
      'Accept': 'application/json'
    }
  })
    .then(response => response.json())
    .then(data => {
      if (data.users && typeof data.users === "object") {
        dynamicUsers = data.users;
      }

      if (data.towers && typeof data.towers === "object") {
        towersData = data.towers;
        populateDatalist();
        handleSelection();
        if (document.getElementById("admin-page") && !document.getElementById("admin-page").classList.contains("hidden-page")) {
          renderAdminTable();
        }
      }

      let rawRoster = data.roster || data.Roster || data.ROSTER || data.rosters;
      if (rawRoster) {
        if (!Array.isArray(rawRoster) && typeof rawRoster === "object") {
          rawRoster = Object.values(rawRoster);
        }

        if (Array.isArray(rawRoster) && rawRoster.length > 0) {
          rosterData = rawRoster.map(agent => {
            let parsedDate = parseMonthAndYear(agent.month);
            return {
              name: agent.name || agent.Name || agent.Agent || agent.agent || "Unknown",
              dept: agent.dept || agent.Dept || agent.Department || agent.department || "Calls",
              lang: agent.lang || agent.Lang || agent.Language || agent.language || "Ara",
              month: parsedDate.month,
              year: parsedDate.year,
              schedule: agent.schedule || agent.Schedule || agent.days || agent.Days || {}
            };
          });

          populateAgentDropdown();
          renderRosterView();
          renderFullMonthlyTable();
          updateDashboardLiveWidget();
        }
      }

      let rawSchedule = data.schedule || data.Schedule || data.SCHEDULE;
      if (rawSchedule && Array.isArray(rawSchedule)) {
        let parsedSchedule = [];

        if (rawSchedule.length > 0 && rawSchedule[0].day && Array.isArray(rawSchedule[0].buildings)) {
          parsedSchedule = rawSchedule;
        } else {
          const groupedMap = {};

          rawSchedule.forEach(row => {
            Object.keys(row).forEach(dayKey => {
              const cleanDay = String(dayKey).trim();
              const building = String(row[dayKey]).trim();

              if (building && building !== "null" && building !== "" && cleanDay && cleanDay.toLowerCase() !== "null") {
                if (!groupedMap[cleanDay]) {
                  groupedMap[cleanDay] = [];
                }
                if (!groupedMap[cleanDay].includes(building)) {
                  groupedMap[cleanDay].push(building);
                }
              }
            });
          });

          parsedSchedule = Object.keys(groupedMap).map(day => ({
            day: day,
            buildings: groupedMap[day]
          }));
        }

        scheduleData = parsedSchedule;
      }

      if (data.unitMapping && Array.isArray(data.unitMapping)) {
        dynamicUnitMapping = data.unitMapping;
        renderUnitMappingTable();
      }

      renderScheduleCards(document.getElementById("schedSearchInput")?.value || "");

      console.log("✅ Google Sheet Live Synchronization Complete!");
    })
    .catch(err => {
      console.error("❌ Failed to fetch Google Sheet data:", err);
      renderScheduleCards(document.getElementById("schedSearchInput")?.value || "");
    });
}

// ============================================================
// 🗓 HELPER FUNCTIONS
// ============================================================
function getDayNameShort(dayNumber, customMonth, customYear) {
  const dateInput = document.getElementById("rosterDateInput");
  
  let targetYear = customYear || 2026;
  let targetMonth = customMonth || 8;

  if (!customMonth && dateInput && dateInput.value) {
    const parts = dateInput.value.split("-");
    targetYear = parseInt(parts[0], 10);
    targetMonth = parseInt(parts[1], 10);
  }

  const date = new Date(targetYear, targetMonth - 1, dayNumber);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getDefaultDepositAmountText(towerName) {
  const lowerName = towerName.toLowerCase();
  if (lowerName.includes("centurion")) {
    return "4,000 AED (For Offices)";
  } else if (lowerName.includes("reem bay") || lowerName.includes("torino")) {
    return "No Security Deposit Required by SPC";
  } else if (
    lowerName.includes("gemini") || lowerName.includes("elz") || 
    lowerName.includes("glamz") || lowerName.includes("lawnz") || 
    lowerName.includes("miraclz") || lowerName.includes("resortz") || 
    lowerName.includes("starz")
  ) {
    return "Studio & 1BHK: 1,000 AED\n2BHK: 2,000 AED\n3BHK+: 3,000 AED";
  } else if (lowerName.includes("bali")) {
    return "Capacity charges * 8";
  } else if (lowerName.includes("maison")) {
    return "Unit Capacity * 62.5 * 8";
  } else {
    return "Check prior owner or tenant account";
  }
}

let liveClockInterval = null;

// ============================================================
// 💖 Dynamic Developer Banner
// ============================================================
function createDevBanner(containerId, showFeedback = true) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (container.querySelector('.dev-banner-card')) return;

    const bannerHTML = `
        <div class="dev-banner-card">
            <div class="dev-banner-header">
                <i class="fa-solid fa-heart"></i>
                <h3>Designed & Developed with Love</h3>
            </div>
            <p>
                Built to support our team's daily efficiency by 
                <span class="dev-name-badge"><i class="fa-solid fa-user-gear"></i> Fares Elmasry</span>
            </p>
            ${showFeedback ? `
            <p style="margin-top: 6px; font-size: 11.5px; color: #5a6a75; font-weight: 700;">
                <i class="fa-solid fa-comments"></i> For any feedback, updates, or feature requests, contact me directly!
            </p>` : ''}
        </div>
    `;

    container.insertAdjacentHTML('beforeend', bannerHTML);
}
