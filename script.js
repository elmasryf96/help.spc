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

  fetch(nocacheUrl, { 
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

// ============================================================
// 🔽 PROFILE DROPDOWN CONTROLS
// ============================================================
function toggleProfileDropdown(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const dropdown = document.getElementById("profileDropdown");
  if (dropdown) {
    dropdown.classList.toggle("show-menu");
  }
}

function hideProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  if (dropdown) {
    dropdown.classList.remove("show-menu");
  }
}

document.addEventListener("click", (e) => {
  const menuWrapper = document.querySelector(".user-menu-wrapper");
  if (menuWrapper && !menuWrapper.contains(e.target)) {
    hideProfileDropdown();
  }
});

// ============================================================
// 👁️ TOGGLE PASSWORD VISIBILITY (EYE BUTTON)
// ============================================================
function togglePassVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const icon = btn.querySelector('i');

  if (input.type === "password") {
    input.type = "text";
    if (icon) {
      icon.className = "fa-solid fa-eye-slash";
    }
    btn.style.color = "#d97706";
  } else {
    input.type = "password";
    if (icon) {
      icon.className = "fa-solid fa-eye";
    }
    btn.style.color = "#64748b";
  }
}

// ============================================================
// 🔐 LOGIN, AUTHENTICATION & PROFILE MODAL
// ============================================================
function handleLogin(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
  }
  
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("login-error");

  let userObj = dynamicUsers[user];

  if (!userObj) {
    const fallbackUsers = {
      "0": { password: "0", role: "admin", fullName: "Admin2", email: "Admin@Test.com" },
      "SPC": { password: "SPC@2026", role: "user", fullName: "SPC Team", email: "SPCteam@test.com" }
    };
    userObj = fallbackUsers[user];
  }

  if (userObj && String(userObj.password) === String(pass)) {
    if (errorMsg) errorMsg.style.display = "none";
    localStorage.setItem("loggedInUser", user);
    localStorage.setItem("userPassword", pass);
    localStorage.setItem("userRole", userObj.role || "user");
    localStorage.setItem("userFullName", userObj.fullName || user);
    localStorage.setItem("userEmail", userObj.email || "");

    updateUserProfileUI();
    resetInactivityTimer(); // تشغيل مؤقت الخمول عند تسجيل الدخول الناجح
    navigateTo('home-page');
  } else {
    if (errorMsg) errorMsg.style.display = "block";
  }

  return false;
}

function updateUserProfileUI() {
  const fullName = localStorage.getItem("userFullName") || localStorage.getItem("loggedInUser") || "SPC Team";
  const email = localStorage.getItem("userEmail") || "No email registered";

  const displayEl = document.getElementById("displayUserFullName");
  if (displayEl) displayEl.innerText = fullName;

  const dropdownName = document.getElementById("dropdownFullName");
  if (dropdownName) dropdownName.innerText = fullName;

  const dropdownEmail = document.getElementById("dropdownEmail");
  if (dropdownEmail) dropdownEmail.innerText = email;

  const avatarEl = document.getElementById("userAvatarText");
  if (avatarEl) {
    const parts = fullName.trim().split(" ");
    let initials = parts[0] ? parts[0][0] : "U";
    if (parts.length > 1) initials += parts[parts.length - 1][0];
    avatarEl.innerText = initials.toUpperCase();
  }
}

function openChangePasswordModal() {
  const username = localStorage.getItem("loggedInUser") || "-";
  const fullName = localStorage.getItem("userFullName") || username;
  const email = localStorage.getItem("userEmail") || "No email registered";

  if (document.getElementById("modalProfileFullName")) document.getElementById("modalProfileFullName").innerText = fullName;
  if (document.getElementById("modalProfileUsername")) document.getElementById("modalProfileUsername").innerText = "@" + username;
  if (document.getElementById("modalProfileEmail")) document.getElementById("modalProfileEmail").innerText = email;

  if (document.getElementById("oldPasswordInput")) document.getElementById("oldPasswordInput").value = "";
  if (document.getElementById("newPasswordInput")) document.getElementById("newPasswordInput").value = "";
  if (document.getElementById("confirmPasswordInput")) document.getElementById("confirmPasswordInput").value = "";
  
  const msgEl = document.getElementById("passChangeMsg");
  if (msgEl) msgEl.style.display = "none";

  const modal = document.getElementById("changePasswordModal");
  if (modal) modal.style.display = "flex";
}

function closeChangePasswordModal() {
  const modal = document.getElementById("changePasswordModal");
  if (modal) modal.style.display = "none";
}

function submitPasswordChange() {
  const oldPass = document.getElementById("oldPasswordInput").value.trim();
  const newPass = document.getElementById("newPasswordInput").value.trim();
  const confirmPass = document.getElementById("confirmPasswordInput").value.trim();
  const msgEl = document.getElementById("passChangeMsg");
  const username = localStorage.getItem("loggedInUser");

  const currentSavedPass = localStorage.getItem("userPassword") || (dynamicUsers[username] ? dynamicUsers[username].password : null);
  if (currentSavedPass && String(oldPass) !== String(currentSavedPass)) {
    msgEl.style.color = "#ef4444";
    msgEl.innerText = "❌ Current password is incorrect!";
    msgEl.style.display = "block";
    return;
  }

  if (newPass !== confirmPass) {
    msgEl.style.color = "#ef4444";
    msgEl.innerText = "❌ New passwords do not match!";
    msgEl.style.display = "block";
    return;
  }

  msgEl.style.color = "#d97706";
  msgEl.innerText = "⏳ Updating password in Google Sheet...";
  msgEl.style.display = "block";

  fetch(GOOGLE_SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "changePassword",
      username: username,
      newPassword: newPass
    })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      msgEl.style.color = "#22c55e";
      msgEl.innerText = "✅ Password updated successfully in Google Sheet!";
      
      localStorage.setItem("userPassword", newPass);
      if (dynamicUsers[username]) {
        dynamicUsers[username].password = newPass;
      }

      setTimeout(() => {
        fetchAllDataFromGoogleSheet();
        closeChangePasswordModal();
      }, 1200);
    } else {
      msgEl.style.color = "#ef4444";
      msgEl.innerText = "❌ Error: " + (res.message || "Failed to update in Sheet");
    }
  })
  .catch(err => {
    msgEl.style.color = "#ef4444";
    msgEl.innerText = "❌ Network error. Check connection!";
  });
}

function handleLogout() {
  clearTimeout(inactivityTimer); // إيقاف مؤقت الخمول عند الخروج اليدوي
  const userInp = document.getElementById("username");
  if (userInp) userInp.value = "";
  const passInp = document.getElementById("password");
  if (passInp) passInp.value = "";
  const errorMsg = document.getElementById("login-error");
  if (errorMsg) errorMsg.style.display = "none";
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("userPassword");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userFullName");
  localStorage.removeItem("userEmail");
  clearSearch();
  clearSchedSearch();
  clearMappingSearch();
  navigateTo('login-page');
}

function isAdmin() {
  return localStorage.getItem("userRole") === "admin";
}

function updateUIForRole() {
  const adminMiniBtn = document.getElementById("adminMiniBtn");
  if (adminMiniBtn) adminMiniBtn.style.display = isAdmin() ? "inline-flex" : "none";
  const addTowerBtn = document.getElementById("directAddTowerBtn");
  if (addTowerBtn) addTowerBtn.style.display = isAdmin() ? "inline-flex" : "none";
  const rosterAdminBtn = document.getElementById("adminRosterManageBtn");
  if (rosterAdminBtn) rosterAdminBtn.style.display = isAdmin() ? "inline-flex" : "none";
  const ccPulseMenuCard = document.getElementById("ccPulseMenuCard");
  if (ccPulseMenuCard) ccPulseMenuCard.style.display = isAdmin() ? "block" : "none";
  updateUserProfileUI();
}

// ============================================================
// 📄 NOC GENERATOR LOGIC & AUTOMATIC LOGGING
// ============================================================
function initNocPage() {
    const dateInput = document.getElementById("nocDate");
    if (dateInput && !dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    toggleNocFormType();
}

function toggleNocFormType() {
    const typeSelect = document.getElementById("nocTypeSelect");
    if (!typeSelect) return;

    const nocType = typeSelect.value;

    const labelTenantName = document.getElementById("labelTenantName");
    const labelTenantContract = document.getElementById("labelTenantContract");
    const labelOwnerName = document.getElementById("labelOwnerName");
    const labelOwnerContract = document.getElementById("labelOwnerContract");
    const section1Title = document.getElementById("section1Title");
    const section2Title = document.getElementById("section2Title");

    const groupTenantName = document.getElementById("groupTenantName");
    const groupTenantContract = document.getElementById("groupTenantContract");
    const groupOwnerName = document.getElementById("groupOwnerName");
    const groupOwnerContract = document.getElementById("groupOwnerContract");
    const groupMoveInAccountType = document.getElementById("groupMoveInAccountType");
    const groupMoveInSpcAccount = document.getElementById("groupMoveInSpcAccount");

    if (nocType === "movein") {
        if (section2Title) section2Title.style.display = "none";
        if (groupOwnerName) groupOwnerName.style.display = "none";
        if (groupOwnerContract) groupOwnerContract.style.display = "none";

        if (groupTenantName) groupTenantName.style.display = "block";
        if (groupTenantContract) groupTenantContract.style.display = "none";
        if (groupMoveInAccountType) groupMoveInAccountType.style.display = "block";
        if (groupMoveInSpcAccount) groupMoveInSpcAccount.style.display = "block";

        if (section1Title) section1Title.innerHTML = `<i class="fa-solid fa-file-circle-check" style="color: #d97706;"></i> Move-In Clearance Details`;
        if (labelTenantName) labelTenantName.innerHTML = `<i class="fa-solid fa-user"></i> Account Holder Full Name:`;
    } else if (nocType === "rent") {
        if (section2Title) section2Title.style.display = "none";
        if (groupOwnerName) groupOwnerName.style.display = "none";
        if (groupOwnerContract) groupOwnerContract.style.display = "none";

        if (groupTenantName) groupTenantName.style.display = "block";
        if (groupTenantContract) groupTenantContract.style.display = "block";
        if (groupMoveInAccountType) groupMoveInAccountType.style.display = "none";
        if (groupMoveInSpcAccount) groupMoveInSpcAccount.style.display = "none";

        if (section1Title) section1Title.innerHTML = `<i class="fa-solid fa-user-check" style="color: #d97706;"></i> 1. Owner Information`;
        if (labelTenantName) labelTenantName.innerHTML = `<i class="fa-solid fa-user"></i> Owner Consumer Name:`;
        if (labelTenantContract) labelTenantContract.innerHTML = `<i class="fa-solid fa-file-signature"></i> Contract Number:`;
    } else if (nocType === "owner") {
        if (section2Title) section2Title.style.display = "block";
        if (groupOwnerName) groupOwnerName.style.display = "block";
        if (groupOwnerContract) groupOwnerContract.style.display = "block";

        if (groupTenantName) groupTenantName.style.display = "block";
        if (groupTenantContract) groupTenantContract.style.display = "block";
        if (groupMoveInAccountType) groupMoveInAccountType.style.display = "none";
        if (groupMoveInSpcAccount) groupMoveInSpcAccount.style.display = "none";

        if (section1Title) section1Title.innerHTML = `<i class="fa-solid fa-user-check" style="color: #d97706;"></i> 1. Current Owner Information`;
        if (section2Title) section2Title.innerHTML = `<i class="fa-solid fa-user-tie" style="color: #d97706;"></i> 2. New Owner Information`;

        if (labelTenantName) labelTenantName.innerHTML = `<i class="fa-solid fa-user"></i> Current Owner Consumer Name:`;
        if (labelTenantContract) labelTenantContract.innerHTML = `<i class="fa-solid fa-file-signature"></i> Current Owner Contract Number:`;
        if (labelOwnerName) labelOwnerName.innerHTML = `<i class="fa-solid fa-user"></i> New Owner Consumer Name:`;
        if (labelOwnerContract) labelOwnerContract.innerHTML = `<i class="fa-solid fa-file-invoice"></i> New Owner Contract Number:`;
    } else {
        if (section2Title) section2Title.style.display = "block";
        if (groupOwnerName) groupOwnerName.style.display = "block";
        if (groupOwnerContract) groupOwnerContract.style.display = "block";

        if (groupTenantName) groupTenantName.style.display = "block";
        if (groupTenantContract) groupTenantContract.style.display = "block";
        if (groupMoveInAccountType) groupMoveInAccountType.style.display = "none";
        if (groupMoveInSpcAccount) groupMoveInSpcAccount.style.display = "none";

        if (section1Title) section1Title.innerHTML = `<i class="fa-solid fa-user-check" style="color: #d97706;"></i> 1. Tenant & Property Details`;
        if (section2Title) section2Title.innerHTML = `<i class="fa-solid fa-user-tie" style="color: #d97706;"></i> 2. Owner Details (Optional)`;

        if (labelTenantName) labelTenantName.innerHTML = `<i class="fa-solid fa-user"></i> Tenant Consumer Name:`;
        if (labelTenantContract) labelTenantContract.innerHTML = `<i class="fa-solid fa-file-signature"></i> Tenant Contract Number:`;
        if (labelOwnerName) labelOwnerName.innerHTML = `<i class="fa-solid fa-user"></i> Owner Consumer Name:`;
        if (labelOwnerContract) labelOwnerContract.innerHTML = `<i class="fa-solid fa-file-invoice"></i> Owner Contract Number:`;
    }
}

function handleNocSubmission() {
    const btn = document.getElementById("btnNocSubmit");
    const originalText = btn.innerHTML;
    const nocType = document.getElementById("nocTypeSelect").value;

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF... Please wait.`;

    let targetUrl = PYTHON_BACKEND_NOC_URL;
    let payload = {};
    let logPayload = {};
    let downloadFileName = `NOC_${document.getElementById("nocUnitNo").value.trim() || "Document"}.pdf`;

    if (nocType === "movein") {
        targetUrl = PYTHON_BACKEND_MOVE_IN_URL;
        payload = {
            account_holder_name: document.getElementById("nocTenantName").value.trim() || "N/A",
            account_type: document.getElementById("moveInAccountType").value,
            tower_name: document.getElementById("nocTowerName").value.trim() || "N/A",
            unit_no: document.getElementById("nocUnitNo").value.trim() || "N/A",
            spc_account_no: document.getElementById("moveInSpcAccount").value.trim() || "N/A",
            noc_date: document.getElementById("nocDate").value
        };
        downloadFileName = `Move_In_Clearance_${payload.unit_no}.pdf`;

        logPayload = {
            noc_type: "Move-In Clearance",
            tenant_name: payload.account_holder_name,
            tenant_contract: payload.spc_account_no,
            owner_name: "-",
            owner_contract: "-",
            tower_name: payload.tower_name,
            unit_no: payload.unit_no
        };
    } else if (nocType === "rent") {
        targetUrl = PYTHON_BACKEND_RENT_NOC_URL;
        payload = {
            owner_name: document.getElementById("nocTenantName").value.trim() || "N/A",
            owner_contract: document.getElementById("nocTenantContract").value.trim() || "N/A",
            tower_name: document.getElementById("nocTowerName").value.trim() || "N/A",
            unit_no: document.getElementById("nocUnitNo").value.trim() || "N/A",
            noc_date: document.getElementById("nocDate").value
        };
        downloadFileName = `Owner_Clearance_For_Rent_${payload.unit_no}.pdf`;

        logPayload = {
            noc_type: "Owner Clearance For Rent",
            tenant_name: "-",
            tenant_contract: "-",
            owner_name: payload.owner_name,
            owner_contract: payload.owner_contract,
            tower_name: payload.tower_name,
            unit_no: payload.unit_no
        };
    } else if (nocType === "owner") {
        targetUrl = PYTHON_BACKEND_OWNER_NOC_URL;
        payload = {
            owner_name: document.getElementById("nocTenantName").value.trim() || "N/A",
            owner_contract: document.getElementById("nocTenantContract").value.trim() || "N/A",
            new_owner_name: document.getElementById("nocOwnerName").value.trim() || "N/A",
            new_owner_contract: document.getElementById("nocOwnerContract").value.trim() || "N/A",
            tower_name: document.getElementById("nocTowerName").value.trim() || "N/A",
            unit_no: document.getElementById("nocUnitNo").value.trim() || "N/A",
            noc_date: document.getElementById("nocDate").value
        };
        downloadFileName = `Owner_NOC_${payload.unit_no}.pdf`;

        logPayload = {
            noc_type: "Owner NOC",
            tenant_name: "-",
            tenant_contract: "-",
            owner_name: `${payload.owner_name} ➔ ${payload.new_owner_name}`,
            owner_contract: `${payload.owner_contract} / ${payload.new_owner_contract}`,
            tower_name: payload.tower_name,
            unit_no: payload.unit_no
        };
    } else {
        payload = {
            tenant_name: document.getElementById("nocTenantName").value.trim() || "N/A",
            tower_name: document.getElementById("nocTowerName").value.trim() || "N/A",
            unit_no: document.getElementById("nocUnitNo").value.trim() || "N/A",
            tenant_contract: document.getElementById("nocTenantContract").value.trim() || "N/A",
            noc_date: document.getElementById("nocDate").value,
            owner_name: document.getElementById("nocOwnerName").value.trim() || "N/A",
            owner_contract: document.getElementById("nocOwnerContract").value.trim() || "N/A"
        };
        downloadFileName = `Tenant_NOC_${payload.unit_no}.pdf`;

        logPayload = {
            noc_type: "Tenant NOC",
            tenant_name: payload.tenant_name,
            tenant_contract: payload.tenant_contract,
            owner_name: payload.owner_name,
            owner_contract: payload.owner_contract,
            tower_name: payload.tower_name,
            unit_no: payload.unit_no
        };
    }

    fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) throw new Error("Failed to generate PDF");
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        // 🟢 إرسال اللوج تلقائياً بعد نجاح تنزيل ملف الـ PDF
        sendLogToGoogleSheet(logPayload);

        btn.disabled = false;
        btn.innerHTML = originalText;
    })
    .catch(err => {
        alert("❌ Error generating PDF. Please check backend connection!");
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}

// ============================================================
// 🧭 NAVIGATION
// ============================================================
function navigateTo(pageId) {
  if (pageId === 'admin-page' && !isAdmin()) {
    alert("⛔ Access Denied! Admin privileges required.");
    return;
  }
  if (pageId === 'cc-pulse-page' && !isAdmin()) {
    alert("⛔ Access Denied! Admin privileges required.");
    return;
  }

  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active-page');
    page.classList.add('hidden-page');
  });

  stopCcPulsePolling();

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.remove('hidden-page');
    targetPage.classList.add('active-page');
    
    const bannerMap = {
      'home-page': { id: 'home-banner-container', feedback: true },
      'login-page': { id: 'login-banner-container', feedback: true },
      'towers-page': { id: 'towers-banner-container', feedback: false },
      'unit-mapping-page': { id: 'unit-mapping-banner-container', feedback: false },
      'calculator-page': { id: 'calculator-banner-container', feedback: false },
      'noc-page': { id: 'noc-banner-container', feedback: false },
      'tech-page': { id: 'tech-banner-container', feedback: false },
      'roster-page': { id: 'roster-banner-container', feedback: false },
      'admin-page': { id: 'admin-banner-container', feedback: false }
    };

    if (bannerMap[pageId]) {
      createDevBanner(bannerMap[pageId].id, bannerMap[pageId].feedback);
    }
    
    if (pageId === 'home-page') {
      updateDashboardLiveWidget();
      updateUIForRole();
    } else if (pageId === 'towers-page') {
      updateUIForRole();
      handleSelection();
    } else if (pageId === 'unit-mapping-page') {
      renderUnitMappingTable();
    } else if (pageId === 'calculator-page') {
      initCalculatorPage();
    } else if (pageId === 'noc-page') {
      initNocPage();
    } else if (pageId === 'tech-page') {
      renderScheduleCards();
    } else if (pageId === 'roster-page') {
      initRosterPage();
      updateUIForRole();
    } else if (pageId === 'admin-page') {
      renderAdminTable();
      renderAdminAgentsTable();
      switchAdminTab('towers');
    } else if (pageId === 'cc-pulse-page') {
      initCcPulsePage();
    }
  }
}

// ============================================================
// 🔗 DYNAMIC UNIT MAPPING SEARCH & RENDER LOGIC
// ============================================================
function onTowerMappingChange() {
  const select = document.getElementById("mappingTowerSelect");
  const bannerText = document.getElementById("selectedMappingTowerName");
  if (select && bannerText) {
    bannerText.innerText = select.options[select.selectedIndex].text;
  }
  clearMappingSearch();
}

function renderUnitMappingTable(filterText = "") {
  const table = document.getElementById("unitMappingTable");
  const towerSelect = document.getElementById("mappingTowerSelect");
  if (!table) return;

  const currentTower = towerSelect ? towerSelect.value.toLowerCase() : "fairmont";
  const search = filterText.toLowerCase().trim();

  let matches = dynamicUnitMapping.filter(item => {
    const itemTower = (item.tower || "").toLowerCase();
    if (itemTower !== currentTower) return false;

    if (!search) return true;

    if (currentTower === "fairmont") {
      return (item.nic || "").toLowerCase().includes(search) ||
             (item.adm || "").toLowerCase().includes(search) ||
             (item.spc || "").toLowerCase().includes(search);
    } else {
      return (item.titledeed || "").toLowerCase().includes(search) ||
             (item.physical || "").toLowerCase().includes(search) ||
             (item.type || "").toLowerCase().includes(search) ||
             (item.meter1 || "").toLowerCase().includes(search) ||
             (item.meter2 || "").toLowerCase().includes(search);
    }
  });

  if (matches.length === 0) {
    table.innerHTML = `<div class="admin-empty" style="padding: 20px; text-align: center;"><i class="fa-solid fa-magnifying-glass-minus"></i> No matching units found</div>`;
    return;
  }

  if (currentTower === "fairmont") {
    let html = `<thead>
      <tr>
        <th style="text-align: center; width: 60px;">S.No</th>
        <th style="text-align: center;">NIC #</th>
        <th style="text-align: center;">ADM #</th>
        <th style="text-align: center; background: #fef08a; color: #854d0e;">SPC Apt Ref</th>
      </tr>
    </thead>
    <tbody>`;

    matches.forEach((item, index) => {
      html += `<tr>
        <td style="text-align: center; font-weight: bold; color: #64748b;">${index + 1}</td>
        <td style="text-align: center; font-weight: 800; color: var(--dark-navy);">${item.nic || '-'}</td>
        <td style="text-align: center; font-weight: 800; color: #2563eb;">${item.adm || '-'}</td>
        <td style="text-align: center; font-weight: 800; color: #166534; background: #f0fdf4;">${item.spc || '-'}</td>
      </tr>`;
    });

    html += `</tbody>`;
    table.innerHTML = html;

  } else {
    let html = `<thead>
      <tr>
        <th style="text-align: center; width: 50px;">#</th>
        <th style="text-align: center;">Title Deed / SPA Apt</th>
        <th style="text-align: center; background: #fef08a; color: #854d0e;">Physical Apt (Register)</th>
        <th style="text-align: center;">Unit Type</th>
        <th style="text-align: center;">Area (SQ.M)</th>
        <th style="text-align: center;">Meter No 1</th>
        <th style="text-align: center;">Meter No 2</th>
      </tr>
    </thead>
    <tbody>`;

    matches.forEach((item, index) => {
      let meter2Display = item.meter2 ? `<span style="font-weight: 800; color: #d97706;">${item.meter2}</span>` : `-`;
      html += `<tr>
        <td style="text-align: center; font-weight: bold; color: #64748b;">${index + 1}</td>
        <td style="text-align: center; font-weight: 800; color: #2563eb;">${item.titledeed || '-'}</td>
        <td style="text-align: center; font-weight: 800; color: #166534; background: #f0fdf4;">${item.physical || '-'}</td>
        <td style="text-align: center; font-weight: 700; color: var(--dark-navy);">${item.type || '-'}</td>
        <td style="text-align: center; font-weight: 600; color: #64748b;">${item.area || '-'}</td>
        <td style="text-align: center; font-weight: 800; color: #0284c7;">${item.meter1 || '-'}</td>
        <td style="text-align: center;">${meter2Display}</td>
      </tr>`;
    });

    html += `</tbody>`;
    table.innerHTML = html;
  }
}

function filterMappingTable() {
  const input = document.getElementById("mappingSearchInput");
  if (!input) return;
  const val = input.value;
  const clearBtn = document.getElementById("clearMappingBtn");
  if (clearBtn) clearBtn.style.display = val.length > 0 ? "block" : "none";
  renderUnitMappingTable(val);
}

function clearMappingSearch() {
  const input = document.getElementById("mappingSearchInput");
  if (input) {
    input.value = "";
    const clearBtn = document.getElementById("clearMappingBtn");
    if (clearBtn) clearBtn.style.display = "none";
    renderUnitMappingTable("");
    input.focus();
  }
}

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

// ============================================================
// 🏢 TOWERS MASTER DATA
// ============================================================
function populateDatalist() {
  const datalist = document.getElementById("towersList");
  if (datalist) {
    datalist.innerHTML = "";
    Object.keys(towersData).sort().forEach(tower => {
      let option = document.createElement("option");
      option.value = tower;
      datalist.appendChild(option);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchAllDataFromGoogleSheet();
  startGlobalLiveClock();
  updateDashboardLiveWidget();
  
  const loggedUser = localStorage.getItem("loggedInUser");
  if (loggedUser) {
    resetInactivityTimer(); // تفعيل المؤقت فور تحميل الصفحة لو كان مسجل دخول
    navigateTo('home-page');
  }
});

function toggleCustomDepositInput(selectEl) {
  const customInput = document.getElementById("direct_custom_deposit");
  if (customInput) {
    if (selectEl.value === "CUSTOM") {
      customInput.style.display = "block";
      customInput.focus();
    } else {
      customInput.style.display = "none";
    }
  }
}

function updateFields(data, towerName = "") {
  const userIsAdmin = isAdmin();
  const fields = ["client", "location", "bank", "deposit", "billing", "late", "activation", "disconnection", "noc", "final"];

  const adminControls = document.getElementById("directAdminControls");
  if (adminControls) {
    adminControls.style.display = (userIsAdmin && data && towerName) ? "flex" : "none";
  }

  if (data) {
    let isShifted = String(data.billing).trim().toLowerCase() === "yes" || String(data.billing).trim().toLowerCase() === "no";

    let correctData = {
      client: data.client,
      location: data.location,
      bank: data.bank,
      deposit: data.deposit,
      online: isShifted ? data.billing : data.online,
      billing: isShifted ? data.late : data.billing,
      late: isShifted ? data.activation : data.late,
      activation: isShifted ? data.disconnection : data.activation,
      disconnection: isShifted ? data.noc : data.disconnection,
      noc: isShifted ? data.final : data.noc,
      final: isShifted ? data.deposit_amount : data.final,
      deposit_amount: isShifted ? "" : data.deposit_amount,
      maintenance: data.maintenance ? String(data.maintenance).trim() : ""
    };

    fields.forEach(f => {
      const el = document.getElementById(f);
      if (!el) return;

      if (userIsAdmin) {
        let val = correctData[f] !== undefined ? correctData[f] : "";
        if (f === "location") {
          el.innerHTML = `
            <select id="direct_input_${f}" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold;">
              <option value="Dubai" ${val === 'Dubai' ? 'selected' : ''}>Dubai</option>
              <option value="Abudhabi" ${val === 'Abudhabi' ? 'selected' : ''}>Abu Dhabi</option>
              <option value="Ajman" ${val === 'Ajman' ? 'selected' : ''}>Ajman</option>
            </select>`;
        } else if (f === "bank") {
          el.innerHTML = `
            <select id="direct_input_${f}" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold;">
              <option value="SPC" ${val === 'SPC' ? 'selected' : ''}>SPC</option>
              <option value="Client" ${val === 'Client' ? 'selected' : ''}>Client</option>
            </select>`;
        } else if (f === "deposit") {
          const isStandard = (val === 'SPC' || val === 'Client');
          const customVal = isStandard ? '' : val;

          el.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
              <select id="direct_input_${f}" onchange="toggleCustomDepositInput(this)" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold;">
                <option value="SPC" ${val === 'SPC' ? 'selected' : ''}>SPC</option>
                <option value="Client" ${val === 'Client' ? 'selected' : ''}>Client</option>
                <option value="CUSTOM" ${!isStandard && val !== '' ? 'selected' : ''}>➕ Custom Value...</option>
              </select>
              <input type="text" id="direct_custom_deposit" value="${customVal}" placeholder="Type custom value..." style="display: ${!isStandard && val !== '' ? 'block' : 'none'}; padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold; width: 130px; font-size: 11px;">
            </div>`;
        } else {
          el.innerHTML = `<input type="text" id="direct_input_${f}" value="${val}" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold; width: 140px; text-align: center;">`;
        }
      } else {
        let val = correctData[f] !== undefined && correctData[f] !== "" ? correctData[f] : "-";
        if (typeof val === "number" || (!isNaN(val) && val !== "" && f !== "client" && f !== "location" && f !== "bank" && f !== "deposit")) {
          val = parseFloat(val).toFixed(2) + " AED";
        }
        el.innerText = val;
      }
    });

    const mainRow = document.getElementById("maintenance_row");
    const mainEl = document.getElementById("maintenance");
    if (correctData.maintenance && correctData.maintenance !== "-" && correctData.maintenance !== "" && correctData.maintenance !== "null") {
      let mainVal = correctData.maintenance;
      if (!isNaN(mainVal) && mainVal !== "") {
        mainVal = parseFloat(mainVal).toFixed(2) + " AED";
      }
      if (mainEl) {
        mainEl.innerText = mainVal;
        mainEl.className = "val-maintenance-red";
      }
      if (mainRow) {
        mainRow.style.setProperty("display", "flex", "important");
        mainRow.className = "maintenance-single-row";
      }
    } else {
      if (mainRow) {
        mainRow.style.setProperty("display", "none", "important");
      }
    }

    const onlineEl = document.getElementById("online");
    if (onlineEl) {
      if (userIsAdmin) {
        onlineEl.innerText = "";
        onlineEl.className = "val";
        onlineEl.style.cssText = "";
        onlineEl.innerHTML = `
          <select id="direct_input_online" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold;">
            <option value="Yes" ${correctData.online === 'Yes' ? 'selected' : ''}>Yes</option>
            <option value="No" ${correctData.online === 'No' ? 'selected' : ''}>No</option>
          </select>`;
      } else {
        const isOnline = (correctData.online === "Yes" || String(correctData.online).toLowerCase() === "yes");
        if (isOnline) {
          onlineEl.innerText = "Yes";
          onlineEl.className = "val";
          onlineEl.style.cssText = "";
        } else if (correctData.online === "No" || String(correctData.online).toLowerCase() === "no") {
          onlineEl.innerText = "Bank Transfer or Cash Deposit Only (Do not share payment links or SPC bank details)";
          onlineEl.className = "val-maintenance-red";
          onlineEl.style.cssText = `
            font-size: 12.5px !important;
            padding: 6px 14px !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2) !important;
            white-space: normal !important;
            text-align: center !important;
            margin: 0 auto !important;
            flex: 1 !important;
            max-width: 80% !important;
          `;
        } else {
          onlineEl.innerText = "-";
          onlineEl.className = "val";
          onlineEl.style.cssText = "";
        }
      }
    }

    const depositAmt = document.getElementById("deposit_amount");
    if (depositAmt) {
      if (userIsAdmin) {
        let currentVal = (correctData.deposit_amount !== undefined && String(correctData.deposit_amount).trim() !== "") 
          ? correctData.deposit_amount 
          : getDefaultDepositAmountText(towerName);

        depositAmt.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end; width: 100%;">
            <textarea id="direct_input_deposit_amount" rows="3" placeholder="Enter details line by line..." style="padding: 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold; width: 220px; font-size: 12px; font-family: inherit; resize: vertical;">${currentVal}</textarea>
          </div>
        `;
      } else {
        if (correctData.deposit_amount && String(correctData.deposit_amount).trim() !== "") {
          let textVal = String(correctData.deposit_amount);
          
          let lines = textVal
            .split(/\n|(?=2BHK)|(?=3BHK)/g)
            .map(l => l.trim())
            .filter(l => l !== '');

          if (lines.length > 1) {
            let badgesHTML = lines.map(line => `<div class="val badge-clean" style="margin-bottom: 4px; display: block; text-align: center;">${line}</div>`).join('');
            depositAmt.innerHTML = `<div class="badge-list">${badgesHTML}</div>`;
          } else {
            depositAmt.innerHTML = `<div class="val badge-clean">${textVal}</div>`;
          }
        } else {
          depositAmt.innerHTML = `<div class="val badge-clean">${getDefaultDepositAmountText(towerName)}</div>`;
        }
      }
    }
  } else {
    fields.forEach(f => {
      const el = document.getElementById(f);
      if(el) el.innerText = "-";
    });
    const mainRow = document.getElementById("maintenance_row");
    if (mainRow) {
      mainRow.style.setProperty("display", "none", "important");
    }
    
    const onlineEl = document.getElementById("online");
    if (onlineEl) {
      onlineEl.innerText = "-";
      onlineEl.className = "val";
      onlineEl.style.cssText = "";
    }
    const depositAmt = document.getElementById("deposit_amount");
    if (depositAmt) depositAmt.innerHTML = `<div class="val">-</div>`;
  }

  const warningRow = document.getElementById("tower_warning_row");
  if (warningRow) {
    const lowerTower = towerName.toLowerCase();
    if (lowerTower.includes("amaya") || lowerTower.includes("yasmina")) {
      warningRow.classList.remove("hidden-page");
    } else {
      warningRow.classList.add("hidden-page");
    }
  }
}

function handleSelection() {
  const input = document.getElementById("towerInput");
  if (!input) return;
  const val = input.value.trim();
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) clearBtn.style.display = val.length > 0 ? "block" : "none";
  if (towersData[val]) {
    updateFields(towersData[val], val);
  } else {
    const matchedKey = Object.keys(towersData).find(key => key.toLowerCase() === val.toLowerCase());
    updateFields(matchedKey ? towersData[matchedKey] : null, matchedKey || "");
  }
}

function clearSearch() {
  const input = document.getElementById("towerInput");
  if (input) {
    input.value = ""; 
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) clearBtn.style.display = "none"; 
    updateFields(null); 
    input.focus();
  }
}

// ============================================================
// 📋 TECHNICAL SCHEDULE FUNCTIONS
// ============================================================
function renderScheduleCards(filterText = "") {
  const container = document.getElementById("schedGridContainer");
  if (!container) return;
  container.innerHTML = "";
  const searchVal = filterText.toLowerCase().trim();
  let globalIndex = 1;
  let hasMatches = false;

  scheduleData.forEach((group) => {
    const dayMatch = (group.day || "").toLowerCase().includes(searchVal);
    const matchedBuildings = (group.buildings || []).filter(b => dayMatch || b.toLowerCase().includes(searchVal));
    
    if (matchedBuildings.length > 0) {
      hasMatches = true;
      const card = document.createElement("div");
      card.className = "day-card";
      let listItemsHTML = "";

      matchedBuildings.forEach((b) => {
        listItemsHTML += `
          <li class="b-item" style="display:flex; align-items:center;">
            <span class="b-no">${globalIndex++}</span>
            <span class="b-name">${b}</span>
          </li>`;
      });

      card.innerHTML = `
        <div class="day-card-header">
          <i class="fa-solid fa-calendar-check"></i>
          <h3>${group.day}</h3>
          <span class="count-badge">${matchedBuildings.length} Buildings</span>
        </div>
        <ul class="b-list">${listItemsHTML}</ul>
      `;
      container.appendChild(card);
    } else {
      globalIndex += (group.buildings || []).length;
    }
  });

  if (!hasMatches) {
    container.innerHTML = `<div class="no-sched-results"><i class="fa-solid fa-circle-exclamation"></i><p>No buildings or schedule found matching "${filterText}"</p></div>`;
  }
}

function filterScheduleCards() {
  const input = document.getElementById("schedSearchInput");
  if (!input) return;
  const val = input.value;
  const clearBtn = document.getElementById("clearSchedBtn");
  if (clearBtn) clearBtn.style.display = val.length > 0 ? "block" : "none";
  renderScheduleCards(val);
}

function clearSchedSearch() {
  const input = document.getElementById("schedSearchInput");
  if (input) {
    input.value = "";
    const clearBtn = document.getElementById("clearSchedBtn");
    if (clearBtn) clearBtn.style.display = "none";
    renderScheduleCards("");
    input.focus();
  }
}

// ============================================================
// 📅 TIME & ROSTER FUNCTIONS
// ============================================================
function getUAECurrentDate() {
  const now = new Date();
  const uaeTimeMs = now.getTime() + (4 * 60 * 60 * 1000);
  const uaeDate = new Date(uaeTimeMs);

  const uaeHours = uaeDate.getUTCHours();
  const period = uaeHours >= 12 ? "PM" : "AM";
  let hour12 = uaeHours % 12;
  if (hour12 === 0) hour12 = 12;

  return { 
    year: String(uaeDate.getUTCFullYear()), 
    month: String(uaeDate.getUTCMonth() + 1).padStart(2, '0'), 
    day: String(uaeDate.getUTCDate()).padStart(2, '0'), 
    hour: hour12, 
    hour24: uaeHours, 
    minute: uaeDate.getUTCMinutes(), 
    second: uaeDate.getUTCSeconds(), 
    period: period 
  };
}

function startGlobalLiveClock() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  const updateClock = () => {
    const uae = getUAECurrentDate();
    const secStr = String(uae.second).padStart(2, '0');
    const minStr = String(uae.minute).padStart(2, '0');
    const hrStr = String(uae.hour).padStart(2, '0');
    const clockText = `${hrStr}:${minStr}:${secStr} ${uae.period} (GST)`;
    const clockEl = document.getElementById("uaeClockText");
    if (clockEl) clockEl.innerText = clockText;
    const homeClockEl = document.getElementById("homeClockText");
    if (homeClockEl) homeClockEl.innerText = clockText;
    updateActiveSummary();
    updateDashboardLiveWidget();
  };
  updateClock();
  liveClockInterval = setInterval(updateClock, 1000);
}

function isShiftActiveNow(shiftCode) {
  const uae = getUAECurrentDate();
  const current24Hour = uae.hour24;
  if (shiftCode === "Shift 1" && current24Hour >= 9 && current24Hour < 17) return true;
  if (shiftCode === "Shift 2" && current24Hour >= 11 && current24Hour < 19) return true;
  if (shiftCode === "Shift 3" && current24Hour >= 13 && current24Hour < 21) return true;
  return false;
}

function updateDashboardLiveWidget() {
  const container = document.getElementById("homeActiveAgentsGrid");
  if (!container) return;
  const uae = getUAECurrentDate();
  const dayNum = parseInt(uae.day, 10);
  const monthNum = parseInt(uae.month, 10);
  const yearNum = parseInt(uae.year, 10);
  let activeByTeam = { "Calls": [], "Call Outs": [], "Emails": [] };
  
  if (Array.isArray(rosterData)) {
    rosterData.forEach(agent => {
      const aMonth = parseInt(agent.month || monthNum, 10);
      const aYear = parseInt(agent.year || yearNum, 10);
      
      if (aMonth === monthNum && aYear === yearNum && agent && agent.schedule) {
        const shift = agent.schedule[dayNum];
        if (shift && shift !== "" && shift !== "OFF+" && shift !== "null" && isShiftActiveNow(shift)) {
          if (activeByTeam[agent.dept]) {
            activeByTeam[agent.dept].push({ name: agent.name, shift: shift, lang: agent.lang });
          }
        }
      }
    });
  }

  let html = "";
  const teams = ["Calls", "Call Outs", "Emails"];
  teams.forEach(teamName => {
    const agents = activeByTeam[teamName] || [];
    let agentsPillsHTML = agents.length === 0 ? `<span class="hl-none-text"><i class="fa-solid fa-moon"></i> No active agents</span>` : agents.map(a => `<div class="hl-agent-chip"><span class="hl-chip-name">${a.name}</span><span class="hl-chip-shift">${a.shift}</span></div>`).join('');
    html += `<div class="hl-team-box"><div class="hl-team-title"><div class="hl-tt-left"><i class="fa-solid ${teamName === 'Calls' ? 'fa-headset' : teamName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i><span>${teamName} Team</span></div><span class="hl-team-badge">${agents.length} Active</span></div><div class="hl-team-list">${agentsPillsHTML}</div></div>`;
  });
  container.innerHTML = html;
}

// ============================================================
// 📅 ROSTER PAGE FUNCTIONS
// ============================================================
function initRosterPage() {
  const dateInput = document.getElementById("rosterDateInput");
  const uaeNow = getUAECurrentDate();
  if (dateInput && !dateInput.value) {
    dateInput.value = `${uaeNow.year}-${uaeNow.month}-${uaeNow.day}`;
  }
  
  switchRosterTab('live-view');
  
  populateAgentDropdown();
  renderRosterView();
  renderFullMonthlyTable();
}

function switchRosterTab(tabKey) {
  const tabs = {
    'live-view': { content: 'tab-live-view', btn: 'tabLiveBtn' },
    'agent-view': { content: 'tab-agent-view', btn: 'tabAgentBtn' },
    'full-sheet-view': { content: 'tab-full-sheet-view', btn: 'tabFullBtn' }
  };

  Object.keys(tabs).forEach(key => {
    const contentEl = document.getElementById(tabs[key].content);
    const btnEl = document.getElementById(tabs[key].btn);
    if (contentEl) {
      contentEl.classList.add("hidden-tab");
      contentEl.style.display = "none";
    }
    if (btnEl) btnEl.classList.remove("active");
  });

  const selected = tabs[tabKey];
  if (selected) {
    const targetContent = document.getElementById(selected.content);
    const targetBtn = document.getElementById(selected.btn);
    if (targetContent) {
      targetContent.classList.remove("hidden-tab");
      targetContent.style.display = "block";
    }
    if (targetBtn) targetBtn.classList.add("active");
  }
}

function resetRosterToToday() {
  const dateInput = document.getElementById("rosterDateInput");
  const uae = getUAECurrentDate();
  if (dateInput) {
    dateInput.value = `${uae.year}-${uae.month}-${uae.day}`;
    renderRosterView();
    renderFullMonthlyTable();
  }
}

function renderRosterView() {
  const dateInput = document.getElementById("rosterDateInput");
  if (!dateInput || !dateInput.value) return;
  const [selectedYear, selectedMonth, selectedDay] = dateInput.value.split("-");
  const dayNum = parseInt(selectedDay, 10);
  const monthNum = parseInt(selectedMonth, 10);
  const yearNum = parseInt(selectedYear, 10);

  const container = document.getElementById("rosterDeptContainer");
  if (!container) return;
  container.innerHTML = "";
  const depts = ["Calls", "Call Outs", "Emails"];

  depts.forEach(deptName => {
    const deptAgents = Array.isArray(rosterData) ? rosterData.filter(a => {
      const aMonth = parseInt(a.month, 10);
      const aYear = parseInt(a.year, 10);
      return a.dept === deptName && aMonth === monthNum && aYear === yearNum;
    }) : [];

    const hasAnyScheduleData = deptAgents.some(agent => {
      const shift = agent.schedule ? agent.schedule[dayNum] : "";
      return shift && String(shift).trim() !== "" && String(shift).trim() !== "null";
    });

    const card = document.createElement("div");
    card.className = "dept-roster-card";
    let rowsHTML = "";

    if (deptAgents.length === 0 || !hasAnyScheduleData) {
      rowsHTML = `<div style="padding: 20px; text-align: center; color: #94a3b8; font-weight: 600; font-size: 13px;">
        <i class="fa-solid fa-calendar-xmark" style="font-size: 18px; margin-bottom: 6px; display: block; color: #cbd5e1;"></i>
        No schedule posted for Day ${dayNum} yet
      </div>`;
    } else {
      deptAgents.forEach(agent => {
        const shift = (agent.schedule && agent.schedule[dayNum]) ? agent.schedule[dayNum] : "";
        
        if (!shift || String(shift).trim() === "" || String(shift).trim() === "null") return;

        const isActive = isShiftActiveNow(shift);
        let shiftBadgeClass = "shift-off-badge";
        let shiftIcon = `<i class="fa-solid fa-mug-hot"></i>`;
        if (shift === "Shift 1") { shiftBadgeClass = "shift1-badge"; shiftIcon = `<i class="fa-solid fa-sun"></i>`; }
        else if (shift === "Shift 2") { shiftBadgeClass = "shift2-badge"; shiftIcon = `<i class="fa-solid fa-cloud-sun"></i>`; }
        else if (shift === "Shift 3") { shiftBadgeClass = "shift3-badge"; shiftIcon = `<i class="fa-solid fa-moon"></i>`; }
        
        let livePulseHTML = isActive ? `<span class="live-active-tag"><i class="fa-solid fa-circle"></i> ON DUTY</span>` : ``;
        rowsHTML += `<div class="roster-agent-row ${isActive ? 'highlight-active-agent' : ''}"><div class="agent-profile"><span class="lang-pill ${(agent.lang || 'Ara').toLowerCase()}">${agent.lang || 'Ara'}</span><span class="agent-name">${agent.name}</span></div><div class="agent-status-wrapper">${livePulseHTML}<span class="shift-badge ${shiftBadgeClass}">${shiftIcon} ${shift}</span></div></div>`;
      });
    }

    card.innerHTML = `<div class="dept-card-header"><i class="fa-solid ${deptName === 'Calls' ? 'fa-headset' : deptName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i><h3>${deptName} Team</h3><span class="dept-count">${deptAgents.length} Agents</span></div><div class="dept-agent-list">${rowsHTML}</div>`;
    container.appendChild(card);
  });
  updateActiveSummary();
}

function updateActiveSummary() {
  const dateInput = document.getElementById("rosterDateInput");
  const summaryContainer = document.getElementById("activeAgentsSummary");
  const summaryTitle = document.getElementById("activeSummaryTitle");
  if (!dateInput || !summaryContainer) return;
  
  const [selectedYear, selectedMonth, selectedDay] = dateInput.value.split("-");
  const dayNum = parseInt(selectedDay, 10);
  const monthNum = parseInt(selectedMonth, 10);
  const yearNum = parseInt(selectedYear, 10);

  const uae = getUAECurrentDate();
  const isTodaySelected = (monthNum === parseInt(uae.month, 10) && dayNum === parseInt(uae.day, 10) && yearNum === parseInt(uae.year, 10));
  
  if (summaryTitle) {
    summaryTitle.innerText = isTodaySelected ? "Active On Shift Right Now (UAE Time)" : `Scheduled Duty Roster for Day ${dayNum}`;
  }
  
  let activeAgentsList = [];
  if (Array.isArray(rosterData)) {
    rosterData.forEach(agent => {
      const aMonth = parseInt(agent.month, 10);
      const aYear = parseInt(agent.year, 10);

      if (aMonth === monthNum && aYear === yearNum && agent && agent.schedule) {
        const shift = agent.schedule[dayNum];
        if (shift && shift !== "" && shift !== "OFF+" && shift !== "null") {
          if (isTodaySelected ? isShiftActiveNow(shift) : true) {
            activeAgentsList.push({ name: agent.name, dept: agent.dept, shift: shift, lang: agent.lang });
          }
        }
      }
    });
  }
  summaryContainer.innerHTML = activeAgentsList.length === 0 ? `<span class="no-active-msg"><i class="fa-solid fa-bed"></i> No agents active on shift at this time.</span>` : activeAgentsList.map(item => `<div class="active-agent-pill"><span class="pill-dept">${item.dept} Team</span><span class="pill-name">${item.name}</span><span class="pill-shift">${item.shift}</span></div>`).join('');
}

// ============================================================
// 👤 AGENT INDIVIDUAL LOOKUP
// ============================================================
function populateAgentDropdown() {
  const dropdown = document.getElementById("agentDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = `<option value="">-- Select Agent Name --</option>`;
  if (!Array.isArray(rosterData)) return;

  const uniqueAgentNames = [];
  rosterData.forEach(agent => {
    if (!uniqueAgentNames.includes(agent.name)) {
      uniqueAgentNames.push(agent.name);
    }
  });

  uniqueAgentNames.sort().forEach(name => {
    let opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    dropdown.appendChild(opt);
  });
}

function clearAgentDateFilter() {
  const filterDateInput = document.getElementById("agentDateFilter");
  if (filterDateInput) {
    filterDateInput.value = "";
  }
  renderAgentLookup();
}

function renderAgentLookup() {
  const dropdown = document.getElementById("agentDropdown");
  const monthSelect = document.getElementById("agentMonthSelect");
  const filterDateInput = document.getElementById("agentDateFilter");
  const container = document.getElementById("agentResultContainer");
  if (!dropdown || !container) return;
  
  const agentName = dropdown.value;
  if (!agentName) {
    container.innerHTML = `<div class="no-sched-results"><i class="fa-solid fa-hand-pointer"></i><p>Please select an agent name above to view their schedule.</p></div>`;
    return;
  }

  let targetMonth = 9;
  let targetYear = 2026;

  if (monthSelect && monthSelect.value) {
    const [m, y] = monthSelect.value.split("-");
    targetMonth = parseInt(m, 10);
    targetYear = parseInt(y, 10);
  }

  let selectedDay = null;
  if (filterDateInput && filterDateInput.value) {
    const parts = filterDateInput.value.split("-");
    const filterYr = parseInt(parts[0], 10);
    const filterMo = parseInt(parts[1], 10);
    
    if (filterYr === targetYear && filterMo === targetMonth) {
      selectedDay = parseInt(parts[2], 10);
    }
  }

  const agent = rosterData.find(a => a.name === agentName && parseInt(a.month, 10) === targetMonth && parseInt(a.year, 10) === targetYear);

  if (!agent) {
    container.innerHTML = `<div class="no-sched-results"><i class="fa-solid fa-circle-exclamation"></i><p>No schedule records found for ${agentName} in ${targetMonth}/${targetYear}.</p></div>`;
    return;
  }

  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

  let cardsHTML = "";
  for (let day = 1; day <= daysInMonth; day++) {
    if (selectedDay !== null && day !== selectedDay) continue;

    const shift = (agent.schedule && agent.schedule[day]) ? agent.schedule[day] : "";
    if (!shift || shift === "" || shift === "null") continue;

    const dayName = getDayNameShort(day, targetMonth, targetYear);
    let cardClass = "shift-off-card";
    let icon = `<i class="fa-solid fa-bed"></i>`;
    if (shift === "Shift 1") { cardClass = "shift1-card"; icon = `<i class="fa-solid fa-sun"></i>`; }
    else if (shift === "Shift 2") { cardClass = "shift2-card"; icon = `<i class="fa-solid fa-cloud-sun"></i>`; }
    else if (shift === "Shift 3") { cardClass = "shift3-card"; icon = `<i class="fa-solid fa-moon"></i>`; }
    
    cardsHTML += `<div class="agent-day-card ${cardClass}"><div class="adc-day-number">Day ${day} (${dayName})</div><div class="adc-shift-type">${icon} ${shift}</div></div>`;
  }

  if (cardsHTML === "") {
    cardsHTML = `<div style="grid-column: 1/-1; padding: 30px; text-align: center; color: #94a3b8; font-weight: 600;">
      <i class="fa-solid fa-calendar-xmark" style="font-size: 24px; margin-bottom: 8px; display: block; color: #cbd5e1;"></i>
      No schedule published for this agent in the selected period.
    </div>`;
  }

  container.innerHTML = `<div class="agent-info-banner"><div class="aip-left"><span class="lang-pill ${(agent.lang || 'Ara').toLowerCase()}">${agent.lang || 'Ara'}</span><h2>${agent.name}</h2><span class="team-tag"><i class="fa-solid fa-users"></i> ${agent.dept} Team</span></div><div class="aip-right"><span class="month-label">Monthly Schedule (${targetMonth}/${targetYear})</span></div></div><div class="agent-days-grid">${cardsHTML}</div>`;
}

// ============================================================
// 📊 FULL MONTHLY TABLE
// ============================================================
function renderFullMonthlyTable() {
  const table = document.getElementById("monthlyRosterTable");
  const monthSelect = document.getElementById("fullRosterMonthSelect");
  const dateInput = document.getElementById("rosterDateInput");
  if (!table) return;

  const uae = getUAECurrentDate();
  let monthNum = parseInt(uae.month, 10);
  let yearNum = parseInt(uae.year, 10);

  if (monthSelect && monthSelect.value) {
    const [m, y] = monthSelect.value.split("-");
    monthNum = parseInt(m, 10);
    yearNum = parseInt(y, 10);
  } 
  else if (dateInput && dateInput.value) {
    const parts = dateInput.value.split("-");
    yearNum = parseInt(parts[0], 10);
    monthNum = parseInt(parts[1], 10);
  }

  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  let headerHTML = `<thead><tr><th class="sticky-col first-col">Team</th><th class="sticky-col second-col">Agent Name</th>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayName = getDayNameShort(d, monthNum, yearNum);
    headerHTML += `<th>Day ${d}<br><span style="font-size: 9px; opacity: 0.8;">${dayName}</span></th>`;
  }
  headerHTML += `</tr></thead>`;
  let bodyHTML = `<tbody>`;
  const depts = ["Calls", "Call Outs", "Emails"];

  depts.forEach(deptName => {
    const teamAgents = Array.isArray(rosterData) ? rosterData.filter(a => {
      const aMonth = parseInt(a.month, 10);
      const aYear = parseInt(a.year, 10);
      return a.dept === deptName && aMonth === monthNum && aYear === yearNum;
    }) : [];

    teamAgents.forEach((agent, idx) => {
      bodyHTML += `<tr>`;
      if (idx === 0) {
        bodyHTML += `<td rowspan="${teamAgents.length}" class="sticky-col first-col dept-cell">${deptName} Team</td>`;
      }
      bodyHTML += `<td class="sticky-col second-col name-cell"><strong>${agent.name}</strong> <span class="lang-mini">${agent.lang || 'Ara'}</span></td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const shift = (agent.schedule && agent.schedule[d]) ? agent.schedule[d] : "";
        let cellClass = "cell-off";
        let displayVal = shift;

        if (!shift || String(shift).trim() === "" || String(shift).trim() === "null") {
          cellClass = "";
          displayVal = "-";
        } else if (shift === "Shift 1") cellClass = "cell-shift1";
        else if (shift === "Shift 2") cellClass = "cell-shift2";
        else if (shift === "Shift 3") cellClass = "cell-shift3";

        bodyHTML += `<td class="${cellClass}">${displayVal}</td>`;
      }
      bodyHTML += `</tr>`;
    });
  });
  bodyHTML += `</tbody>`;
  table.innerHTML = headerHTML + bodyHTML;
}

// ============================================================
// 👑 ADMIN PANEL
// ============================================================
function switchAdminTab(tab) {
  document.querySelectorAll(".admin-tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.add("hidden-tab"));
  if (tab === 'towers') {
    document.querySelector(".admin-tab-btn:nth-child(1)")?.classList.add("active");
    document.getElementById("admin-tab-towers")?.classList.remove("hidden-tab");
    renderAdminTable();
  } else if (tab === 'agents') {
    document.querySelector(".admin-tab-btn:nth-child(2)")?.classList.add("active");
    document.getElementById("admin-tab-agents")?.classList.remove("hidden-tab");
    renderAdminAgentsTable();
  }
}

function renderAdminTable(filter = "") {
  const table = document.getElementById("adminTowersTable");
  if (!table) return;
  
  const searchTerm = filter.toLowerCase().trim();
  const keys = Object.keys(towersData).filter(name => name.toLowerCase().includes(searchTerm));
  
  if (keys.length === 0) {
    table.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-building-circle-exclamation"></i>No towers found matching "${filter}"</div>`;
    return;
  }
  
  let html = `<thead><tr>
    <th style="min-width:30px;position:sticky;left:0;background:#fffbe6;z-index:6;">#</th>
    <th style="min-width:140px;position:sticky;left:30px;background:#fffbe6;z-index:6;">Tower Name</th>
    <th style="min-width:100px;">Client</th>
    <th style="min-width:80px;">Location</th>
    <th style="min-width:70px;">Bank</th>
    <th style="min-width:120px;">Deposit Refund</th>
    <th style="min-width:130px;">Deposit Amount</th>
    <th style="min-width:60px;">Online</th>
    <th style="min-width:70px;">Billing</th>
    <th style="min-width:70px;">Late</th>
    <th style="min-width:70px;">Activation</th>
    <th style="min-width:70px;">Disconnection</th>
    <th style="min-width:60px;">NOC</th>
    <th style="min-width:60px;">Final</th>
  </tr></thead><tbody>`;
  
  keys.forEach((name, index) => {
    const data = towersData[name];
    let displayDepositAmt = (data.deposit_amount !== undefined && data.deposit_amount.trim() !== "") 
      ? data.deposit_amount 
      : getDefaultDepositAmountText(name);
    
    let depositAmtFormatted = displayDepositAmt.replace(/\n/g, '<br>');

    html += `<tr>
      <td style="position:sticky;left:0;background:#ffffff;z-index:3;">${index + 1}</td>
      <td style="position:sticky;left:30px;background:#ffffff;z-index:3;"><strong>${name}</strong></td>
      <td>${data.client || '-'}</td>
      <td>${data.location || '-'}</td>
      <td>${data.bank || '-'}</td>
      <td><span class="deposit-badge">${data.deposit || '-'}</span></td>
      <td><span class="deposit-badge">${depositAmtFormatted}</span></td>
      <td>${data.online || '-'}</td>
      <td>${data.billing || '-'}</td>
      <td>${data.late || '-'}</td>
      <td>${data.activation || '-'}</td>
      <td>${data.disconnection || '-'}</td>
      <td>${data.noc || '-'}</td>
      <td>${data.final || '-'}</td>
    </tr>`;
  });
  
  html += `</tbody>`;
  table.innerHTML = html;
}

function renderAdminAgentsTable(filter = "") {
  const table = document.getElementById("adminAgentsTable");
  if (!table) return;
  const searchTerm = filter.toLowerCase().trim();
  let filteredAgents = Array.isArray(rosterData) ? rosterData.filter(a => a.name.toLowerCase().includes(searchTerm) || a.dept.toLowerCase().includes(searchTerm)) : [];
  if (filteredAgents.length === 0) {
    table.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-users-slash"></i>No agents found matching "${filter}"</div>`;
    return;
  }
  let html = `<thead><tr><th>#</th><th>Name</th><th>Department</th><th>Language</th><th>Schedule Overview (1-31)</th></tr></thead><tbody>`;
  filteredAgents.forEach((agent, index) => {
    let schedSummary = "";
    for (let d = 1; d <= 31; d++) {
      const shift = (agent.schedule && agent.schedule[d]) ? agent.schedule[d] : "";
      let short = (!shift || shift === "" || shift === "null") ? "⚪" : shift === "OFF+" ? "⚪" : shift === "Shift 1" ? "🟦" : shift === "Shift 2" ? "🟧" : "🟪";
      schedSummary += `<span title="Day ${d}: ${shift || 'No Shift'}" style="display:inline-block;width:16px;font-size:10px;">${short}</span>`;
    }
    html += `<tr><td>${index + 1}</td><td><strong>${agent.name}</strong></td><td>${agent.dept}</td><td><span class="lang-pill ${(agent.lang || 'Ara').toLowerCase()}">${agent.lang || 'Ara'}</span></td><td style="min-width:200px;max-width:300px;overflow-x:auto;font-size:10px;white-space:nowrap;">${schedSummary}</td></tr>`;
  });
  html += `</tbody>`;
  table.innerHTML = html;
}


// ============================================================
// 📡 CC PULSE - LIVE AGENT STATUS (ADMIN ONLY)
// ============================================================
let ccPulsePollTimer = null;
let ccPulseTickTimer = null;
let ccPulseAgentsCache = [];
let ccPulseMode = "day";

function initCcPulsePage() {
  const uae = getUAECurrentDate();
  const todayStr = `${uae.year}-${uae.month}-${uae.day}`;

  const dayInput = document.getElementById("ccpDayInput");
  if (dayInput) dayInput.value = todayStr;

  const rangeStartInput = document.getElementById("ccpRangeStartInput");
  const rangeEndInput = document.getElementById("ccpRangeEndInput");
  if (rangeStartInput) rangeStartInput.value = todayStr;
  if (rangeEndInput) rangeEndInput.value = todayStr;

  const monthInput = document.getElementById("ccpMonthInput");
  if (monthInput) monthInput.value = todayStr.slice(0, 7);

  const select = document.getElementById("ccPulseAgentSelect");
  if (select) select.dataset.populated = "false";

  setCcPulseMode("day");
  fetchCcPulseLiveStatus();
  startCcPulsePolling();
}

function startCcPulsePolling() {
  stopCcPulsePolling();
  ccPulsePollTimer = setInterval(fetchCcPulseLiveStatus, 10000);
  ccPulseTickTimer = setInterval(tickCcPulseCounters, 1000);
}

function stopCcPulsePolling() {
  if (ccPulsePollTimer) clearInterval(ccPulsePollTimer);
  if (ccPulseTickTimer) clearInterval(ccPulseTickTimer);
  ccPulsePollTimer = null;
  ccPulseTickTimer = null;
}

async function fetchCcPulseLiveStatus() {
  const grid = document.getElementById("ccPulseLiveGrid");
  if (!grid) return;
  try {
    const res = await fetch(PYTHON_BACKEND_AGENT_STATUS_URL);
    const agents = await res.json();
    ccPulseAgentsCache = Array.isArray(agents) ? agents : [];
    renderCcPulseLiveGrid();
    populateCcPulseAgentSelect();
  } catch (e) {
    grid.innerHTML = `<div class="ccp-error">⚠️ Could not load live status</div>`;
  }
}

function formatCcPulseElapsed(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function renderCcPulseLiveGrid() {
  const grid = document.getElementById("ccPulseLiveGrid");
  if (!grid) return;

  const nowSec = Date.now() / 1000;

  grid.innerHTML = ccPulseAgentsCache.map(a => {
    const isAway = a.status === "Away";
    const statusClass = isAway ? "ccp-status-away" : "ccp-status-active";
    let counterHtml = "";
    if (!isAway && a.sessionStartedAt) {
      const elapsed = nowSec - a.sessionStartedAt;
      counterHtml = `<div class="ccp-counter" data-session-start="${a.sessionStartedAt}">${formatCcPulseElapsed(elapsed)}</div>`;
    }
    return `
      <div class="ccp-agent-card">
        <div class="ccp-agent-name">${a.name}</div>
        <div class="ccp-status-badge ${statusClass}">${a.status}</div>
        ${counterHtml}
      </div>`;
  }).join("");
}

function tickCcPulseCounters() {
  const nowSec = Date.now() / 1000;
  document.querySelectorAll("#ccPulseLiveGrid .ccp-counter").forEach(el => {
    const start = parseFloat(el.getAttribute("data-session-start"));
    if (!isNaN(start)) el.textContent = formatCcPulseElapsed(nowSec - start);
  });
}

function populateCcPulseAgentSelect() {
  const select = document.getElementById("ccPulseAgentSelect");
  if (!select || select.dataset.populated === "true") return;
  const names = ccPulseAgentsCache.map(a => a.name).sort();
  select.innerHTML = `<option value="__all__">All agents</option>` +
    names.map(n => `<option value="${n}">${n}</option>`).join("");
  select.dataset.populated = "true";
}

function setCcPulseMode(mode) {
  ccPulseMode = mode;
  ["day", "range", "month"].forEach(m => {
    const btn = document.getElementById("ccpMode_" + m);
    const box = document.getElementById("ccpModeBox_" + m);
    if (btn) btn.classList.toggle("active", m === mode);
    if (box) box.style.display = (m === mode) ? "flex" : "none";
  });
}

async function loadCcPulseReport() {
  const resultBox = document.getElementById("ccPulseReportResult");
  const select = document.getElementById("ccPulseAgentSelect");
  if (!resultBox || !select) return;

  const agentName = select.value;
  const params = new URLSearchParams();
  params.set("mode", ccPulseMode);

  if (ccPulseMode === "day") {
    params.set("date", document.getElementById("ccpDayInput").value);
  } else if (ccPulseMode === "range") {
    params.set("start", document.getElementById("ccpRangeStartInput").value);
    params.set("end", document.getElementById("ccpRangeEndInput").value);
  } else if (ccPulseMode === "month") {
    params.set("month", document.getElementById("ccpMonthInput").value);
  }

  resultBox.innerHTML = `<div class="ccp-loading">Loading report...</div>`;

  try {
    if (agentName === "__all__") {
      params.set("action", "allAgentsLoginTotals");
      const res = await fetch(`${GOOGLE_SHEET_API_URL}?${params.toString()}`);
      const data = await res.json();
      renderCcPulseAllAgentsReport(data);
    } else {
      params.set("action", "agentStatusReport");
      params.set("name", agentName);
      const res = await fetch(`${GOOGLE_SHEET_API_URL}?${params.toString()}`);
      const data = await res.json();
      renderCcPulseSingleAgentReport(data);
    }
  } catch (e) {
    console.error("CC Pulse report error:", e);
    resultBox.innerHTML = `<div class="ccp-error">⚠️ Could not load report</div>`;
  }
}

function formatCcPulseDuration(totalSeconds) {
  totalSeconds = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return s > 0 ? `${h}h ${m}m ${s}s` : (m > 0 ? `${h}h ${m}m` : `${h}h`);
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

function ccPulseTimeOnly(ts) {
  if (!ts) return "--";
  const parts = ts.split(" ");
  return parts[1] ? parts[1].slice(0, 5) : ts;
}

function renderCcPulseAllAgentsReport(data) {
  const resultBox = document.getElementById("ccPulseReportResult");
  if (!data || data.status !== "success") {
    resultBox.innerHTML = `<div class="ccp-error">⚠️ ${data && data.message ? data.message : "No data"}</div>`;
    return;
  }
  const rows = data.agents.map(a => `
    <div class="ccp-total-row">
      <span class="ccp-total-name">${a.name}</span>
      <span class="ccp-total-ext">Ext ${a.number}</span>
      <span class="ccp-total-value">${formatCcPulseDuration(a.totalLoginSeconds)}</span>
    </div>`).join("");
  resultBox.innerHTML = `<div class="ccp-total-list">${rows || '<div class="ccp-empty">No data for this period</div>'}</div>`;
}

function ccPulseTimeToMinutes(ts) {
  const timePart = ts.split(" ")[1] || "00:00:00";
  const p = timePart.split(":").map(Number);
  return p[0] * 60 + p[1] + (p[2] || 0) / 60;
}

function renderCcPulseTimelineHtml(sessions, statusColors) {
  if (!sessions.length) return "";

  let dayStart = 9 * 60;
  let dayEnd = 21 * 60;
  sessions.forEach(s => {
    dayStart = Math.min(dayStart, ccPulseTimeToMinutes(s.start));
    dayEnd = Math.max(dayEnd, ccPulseTimeToMinutes(s.end));
  });
  const span = dayEnd - dayStart || 1;

  const segmentsHtml = sessions.map(s => {
    const startMin = ccPulseTimeToMinutes(s.start);
    const endMin = ccPulseTimeToMinutes(s.end);
    const left = ((startMin - dayStart) / span) * 100;
    const width = Math.max(((endMin - startMin) / span) * 100, 0.3);
    const color = statusColors[s.status] || "#888787";
    const tooltipText = `${s.status}: ${ccPulseTimeOnly(s.start)} \u2192 ${ccPulseTimeOnly(s.end)} (${formatCcPulseDuration(s.durationSeconds)})`;
    return `<div class="ccp-tl-segment" style="left:${left}%;width:${width}%;background:${color};" data-tooltip="${tooltipText}"></div>`;
  }).join("");

  const hourCount = 6;
  let axisHtml = "";
  for (let i = 0; i <= hourCount; i++) {
    const minuteMark = dayStart + (span * i / hourCount);
    const hour24 = Math.floor(minuteMark / 60) % 24;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const pos = (i / hourCount) * 100;
    const translate = i === 0 ? "0" : (i === hourCount ? "-100%" : "-50%");
    axisHtml += `<span class="ccp-tl-mark" style="left:${pos}%;transform:translateX(${translate});">${hour12} ${suffix}</span>`;
  }

  return `
    <div class="ccp-timeline-wrap">
      <div class="ccp-timeline-bar">${segmentsHtml}</div>
      <div class="ccp-timeline-axis">${axisHtml}</div>
      <div class="ccp-tl-tooltip" id="ccpTlTooltip"></div>
    </div>`;
}

function attachCcPulseTimelineHover() {
  document.querySelectorAll(".ccp-timeline-bar").forEach(bar => {
    const tooltip = bar.parentElement.querySelector(".ccp-tl-tooltip");
    if (!tooltip || bar.dataset.hoverBound === "true") return;
    bar.dataset.hoverBound = "true";

    bar.addEventListener("mouseover", (e) => {
      const seg = e.target.closest(".ccp-tl-segment");
      if (!seg) return;
      tooltip.textContent = seg.getAttribute("data-tooltip");
      tooltip.style.display = "block";
      const barRect = bar.getBoundingClientRect();
      const segRect = seg.getBoundingClientRect();
      let left = segRect.left - barRect.left + (segRect.width / 2);
      tooltip.style.left = left + "px";
    });

    bar.addEventListener("mouseout", (e) => {
      if (!e.target.closest(".ccp-tl-segment")) return;
      tooltip.style.display = "none";
    });
  });
}

function renderCcPulseSingleAgentReport(data) {
  const resultBox = document.getElementById("ccPulseReportResult");
  if (!data || data.status !== "success") {
    resultBox.innerHTML = `<div class="ccp-error">⚠️ ${data && data.message ? data.message : "No data"}</div>`;
    return;
  }

  const statusColors = { "Available": "#107c41", "Break": "#d97706", "Emails": "#1a252f", "Custom 1": "#6d28d9", "Custom 2": "#0369a1" };

  const totalsHtml = Object.keys(data.totals || {}).map(st => `
    <div class="ccp-metric-card">
      <div class="ccp-metric-label">${st}</div>
      <div class="ccp-metric-value">${formatCcPulseDuration(data.totals[st])}</div>
    </div>`).join("");

  let daysHtml = "";
  if (data.mode === "day" && data.days.length === 1) {
    const day = data.days[0];
    daysHtml = `
      <div class="ccp-day-highlight">
        <div class="ccp-metric-card ccp-accent">
          <div class="ccp-metric-label">First login</div>
          <div class="ccp-metric-value">${ccPulseTimeOnly(day.firstLogin)}</div>
        </div>
        <div class="ccp-metric-card">
          <div class="ccp-metric-label">End shift</div>
          <div class="ccp-metric-value">${ccPulseTimeOnly(day.endShift)}</div>
        </div>
      </div>
      ${renderCcPulseTimelineHtml(day.sessions, statusColors)}
      <div class="ccp-session-list">
        ${day.sessions.map(s => `
          <div class="ccp-session-row">
            <span class="ccp-dot" style="background:${statusColors[s.status] || '#888'}"></span>
            <span class="ccp-session-status">${s.status}</span>
            <span class="ccp-session-time">${ccPulseTimeOnly(s.start)} → ${ccPulseTimeOnly(s.end)}</span>
            <span class="ccp-session-dur">${formatCcPulseDuration(s.durationSeconds)}</span>
          </div>`).join("") || '<div class="ccp-empty">No sessions this day</div>'}
      </div>`;
  } else {
    daysHtml = `
      <div class="ccp-days-table">
        ${data.days.map(day => `
          <div class="ccp-day-row">
            <span class="ccp-day-date">${day.date}</span>
            <span>${ccPulseTimeOnly(day.firstLogin)} → ${ccPulseTimeOnly(day.endShift)}</span>
            <span class="ccp-day-total">${formatCcPulseDuration(day.totalLoginSeconds)}</span>
          </div>`).join("")}
      </div>`;
  }

  resultBox.innerHTML = `
    <div class="ccp-metric-card ccp-total-highlight">
      <div class="ccp-metric-label">Total login time</div>
      <div class="ccp-metric-value">${formatCcPulseDuration(data.totalLoginSeconds)}</div>
    </div>
    <div class="ccp-metrics-grid">${totalsHtml}</div>
    ${daysHtml}
  `;

  attachCcPulseTimelineHover();
}
