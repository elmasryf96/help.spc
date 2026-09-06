// ============================================================
// APP BOOTSTRAP: runs once on page load (must load LAST, after all other js files)
// Split from the original script.js on 2026-09-06
// ============================================================

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
