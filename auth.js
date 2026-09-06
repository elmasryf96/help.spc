// ============================================================
// AUTH: profile dropdown, password visibility, login, change password, logout, roles
// Split from the original script.js on 2026-09-06
// ============================================================

// ============================================================
// 🔽 PROFILE DROPDOWN CONTROLS
// ============================================================
function toggleProfileDropdown(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  // كل صفحة (home + sub-pages) بقى ليها هيدر مستقل، فبندور على الـ dropdown
  // اللي جوه نفس الكارت اللي ضغط عليه اليوزر، مش أول واحد في الصفحة كلها
  const wrapper = e && e.currentTarget ? e.currentTarget.closest(".user-menu-wrapper") : document.querySelector(".user-menu-wrapper:not(.hidden-page-wrapper)");
  const dropdown = wrapper ? wrapper.querySelector(".profile-dropdown-menu") : null;
  if (dropdown) {
    dropdown.classList.toggle("show-menu");
  }
}

function hideProfileDropdown() {
  // بنقفل كل الـ dropdowns الموجودة (فيه واحد في كل هيدر دلوقتي)
  document.querySelectorAll(".profile-dropdown-menu").forEach(dropdown => {
    dropdown.classList.remove("show-menu");
  });
}

document.addEventListener("click", (e) => {
  const clickedInsideAnyMenu = Array.from(document.querySelectorAll(".user-menu-wrapper")).some(w => w.contains(e.target));
  if (!clickedInsideAnyMenu) {
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
  const parts = fullName.trim().split(" ");
  let initials = parts[0] ? parts[0][0] : "U";
  if (parts.length > 1) initials += parts[parts.length - 1][0];
  initials = initials.toUpperCase();

  // بنحدّث كل نسخ الهيدر الموجودة في الصفحات كلها (مش بس اللي في الداشبورد)
  document.querySelectorAll(".display-user-fullname").forEach(el => el.innerText = fullName);
  document.querySelectorAll(".dropdown-user-fullname").forEach(el => el.innerText = fullName);
  document.querySelectorAll(".dropdown-user-email").forEach(el => el.innerText = email);
  document.querySelectorAll(".user-avatar-text").forEach(el => el.innerText = initials);
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
  if (ccPulseMenuCard) ccPulseMenuCard.style.display = isAdmin() ? "flex" : "none";
  updateUserProfileUI();
}

