// ============================================================
// TECH SCHEDULE PAGE
// Split from the original script.js on 2026-09-06
// ============================================================

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

