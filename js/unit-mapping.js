// ============================================================
// UNIT MAPPING PAGE
// Split from the original script.js on 2026-09-06
// ============================================================

// ============================================================
// 🔗 DYNAMIC UNIT MAPPING SEARCH & RENDER LOGIC
// ============================================================
function onTowerMappingChange() {
  const select = document.getElementById("mappingTowerSelect");
  const bannerText = document.getElementById("selectedMappingTowerName");
  if (select && bannerText) {
    bannerText.innerText = select.value ? select.options[select.selectedIndex].text : "-- None selected --";
  }
  clearMappingSearch();
}

// بتترجع الصفحة لحالتها الفاضية (مفيش برج مختار) كل ما اليوزر يدخلها من تاني
function resetUnitMappingPage() {
  const select = document.getElementById("mappingTowerSelect");
  if (select) select.value = "";
  const bannerText = document.getElementById("selectedMappingTowerName");
  if (bannerText) bannerText.innerText = "-- None selected --";
  const input = document.getElementById("mappingSearchInput");
  if (input) input.value = "";
  const clearBtn = document.getElementById("clearMappingBtn");
  if (clearBtn) clearBtn.style.display = "none";
  renderUnitMappingTable();
}

function renderUnitMappingTable(filterText = "") {
  const table = document.getElementById("unitMappingTable");
  const towerSelect = document.getElementById("mappingTowerSelect");
  if (!table) return;

  // لو لسه محتارش برج، منعرضش أي جدول
  if (!towerSelect || !towerSelect.value) {
    table.innerHTML = `<div class="admin-empty" style="padding: 20px; text-align: center;"><i class="fa-solid fa-building"></i> Please select a tower to view its units</div>`;
    return;
  }

  const currentTower = towerSelect.value.toLowerCase();
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

