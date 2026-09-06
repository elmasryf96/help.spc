// ============================================================
// NAVIGATION between pages
// Split from the original script.js on 2026-09-06
// ============================================================

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
      resetUnitMappingPage();
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

