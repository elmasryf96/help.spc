// ============================================================
// APP BOOTSTRAP: runs once on page load (must load LAST, after all other js files)
// Split from the original script.js on 2026-09-06
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  fetchAllDataFromGoogleSheet();
  startGlobalLiveClock();
  updateDashboardLiveWidget();

  checkForceLogoutSignal();
  setInterval(checkForceLogoutSignal, FORCE_LOGOUT_CHECK_SECONDS * 1000);

  const loggedUser = localStorage.getItem("loggedInUser");
  if (loggedUser) {
    resetInactivityTimer(); // تفعيل المؤقت فور تحميل الصفحة لو كان مسجل دخول
    navigateTo('home-page');
  }
});
