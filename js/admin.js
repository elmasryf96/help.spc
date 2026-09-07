// ============================================================
// ADMIN PANEL PAGE
// Split from the original script.js on 2026-09-06
// ============================================================

// ============================================================
// 🚨 FORCE LOGOUT ALL USERS (بعد رفع تعديل جديد على الموقع)
// ============================================================
function forceLogoutAllUsersBtn() {
  const confirmed = confirm(
    "هيتم تسجيل خروج فوري لكل المستخدمين (بما فيهم إنت) على كل الأجهزة خلال ثواني، وهيرجعوا لصفحة تسجيل الدخول.\n\nمتأكد إنك عايز تكمل؟"
  );
  if (!confirmed) return;

  triggerForceLogoutForEveryone()
    .then(() => {
      alert("✅ تم إرسال الإشارة. هتتسجل خروج تلقائيًا خلال ثواني زي باقي المستخدمين.");
    })
    .catch(() => {
      alert("❌ حصل خطأ أثناء إرسال الإشارة. حاول تاني.");
    });
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
