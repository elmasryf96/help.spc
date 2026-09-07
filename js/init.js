// ============================================================
// APP BOOTSTRAP: runs once on page load (must load LAST, after all other js files)
// Split from the original script.js on 2026-09-06
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  startGlobalLiveClock();
  updateDashboardLiveWidget();

  checkForceLogoutSignal();
  setInterval(checkForceLogoutSignal, FORCE_LOGOUT_CHECK_SECONDS * 1000);

  const loggedUser = localStorage.getItem("loggedInUser");

  // بنستنى بيانات الشيت (الروستر وغيرها) توصل الأول قبل ما نروح للصفحة الرئيسية،
  // عشان كروت زي "My Day" تلاقي البيانات جاهزة من أول مرة، مش تفتح فاضية
  fetchAllDataFromGoogleSheet().finally(() => {
    if (loggedUser) {
      resetInactivityTimer(); // تفعيل المؤقت فور تحميل الصفحة لو كان مسجل دخول
      navigateTo('home-page');
    }
  });
});
