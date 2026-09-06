// ============================================================
// TOWERS PAGE (tower search/select, field auto-fill)
// Split from the original script.js on 2026-09-06
// ============================================================

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

