// 🏢 FULL TOWERS MASTER DATABASE (SPC AGENT HELPER)
const towersData = {
    "Bali Residence": {
        billing: "25 AED",
        late: "50 AED",
        activation: "100 AED",
        disconnection: "100 AED",
        noc: "150 AED",
        final: "50 AED",
        client: "Smart Collection",
        location: "Abu Dhabi",
        bank: "ADCB - 123456789",
        online: "Available",
        deposit: "Refundable",
        deposit_amount: "Capacity charges*8"
    },
    "Al Reem Bay Tower 1": {
        billing: "25 AED",
        late: "50 AED",
        activation: "100 AED",
        disconnection: "100 AED",
        noc: "150 AED",
        final: "50 AED",
        client: "Smart Collection",
        location: "Abu Dhabi",
        bank: "ADCB - 123456789",
        online: "Available",
        deposit: "N/A",
        deposit_amount: "-"
    },
    "Al Reem Bay Tower 2": {
        billing: "25 AED",
        late: "50 AED",
        activation: "100 AED",
        disconnection: "100 AED",
        noc: "150 AED",
        final: "50 AED",
        client: "Smart Collection",
        location: "Abu Dhabi",
        bank: "ADCB - 123456789",
        online: "Available",
        deposit: "N/A",
        deposit_amount: "-"
    },
    "Torino by ORO24": {
        billing: "25 AED",
        late: "50 AED",
        activation: "100 AED",
        disconnection: "100 AED",
        noc: "150 AED",
        final: "50 AED",
        client: "ORO24",
        location: "Dubai",
        bank: "ENBD - 987654321",
        online: "Available",
        deposit: "N/A",
        deposit_amount: "-"
    },
    "Al Dana Tower": {
        billing: "25 AED",
        late: "50 AED",
        activation: "100 AED",
        disconnection: "100 AED",
        noc: "150 AED",
        final: "50 AED",
        client: "Smart Collection Corp",
        location: "Abu Dhabi",
        bank: "ADCB - 123456789",
        online: "Available",
        deposit: "Refundable",
        deposit_amount: "Check Prior Account"
    },
    "Danube Tower": {
        billing: "20 AED",
        late: "40 AED",
        activation: "80 AED",
        disconnection: "80 AED",
        noc: "100 AED",
        final: "40 AED",
        client: "Danube Properties",
        location: "Dubai",
        bank: "ENBD - 987654321",
        online: "Available",
        deposit: "Refundable",
        deposit_amount: "Check Prior Account"
    }
};

// 🚀 Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    populateTowerLists();
});

// 📌 Populate DataLists and Select Dropdowns
function populateTowerLists() {
    const towersList = document.getElementById("towersList");
    const nocTowerSelect = document.getElementById("nocTowerSelect");

    if (!towersList || !nocTowerSelect) return;

    towersList.innerHTML = "";
    nocTowerSelect.innerHTML = '<option value="">-- Choose Tower --</option>';

    Object.keys(towersData).sort().forEach((towerName) => {
        // Search List
        const option = document.createElement("option");
        option.value = towerName;
        towersList.appendChild(option);

        // NOC Dropdown
        const selectOption = document.createElement("option");
        selectOption.value = towerName;
        selectOption.textContent = towerName;
        nocTowerSelect.appendChild(selectOption);
    });
}

// 🔄 Navigation System
function navigateTo(pageId) {
    const pages = document.querySelectorAll(".page");
    pages.forEach((page) => {
        page.classList.remove("active-page");
        page.classList.add("hidden-page");
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove("hidden-page");
        targetPage.classList.add("active-page");
    }
}

// 🔓 Direct Login (Bypass username/password requirement)
function handleLogin(event) {
    if (event) event.preventDefault();
    const errorMsg = document.getElementById("login-error");
    if (errorMsg) errorMsg.style.display = "none";
    
    navigateTo("home-page");
}

function handleLogout() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    if (username) username.value = "";
    if (password) password.value = "";
    navigateTo("login-page");
}

// 🔍 Search & Render Tower Details + Formatting Badges
function handleSelection() {
    const input = document.getElementById("towerInput");
    const clearBtn = document.getElementById("clearBtn");
    const selectedValue = input ? input.value.trim() : "";

    if (selectedValue.length > 0) {
        if (clearBtn) clearBtn.style.display = "block";
    } else {
        if (clearBtn) clearBtn.style.display = "none";
        clearTowerDetails();
        return;
    }

    if (towersData[selectedValue]) {
        const data = towersData[selectedValue];

        // Service Fees
        setFieldValue("billing", data.billing);
        setFieldValue("late", data.late);
        setFieldValue("activation", data.activation);
        setFieldValue("disconnection", data.disconnection);
        setFieldValue("noc", data.noc);
        setFieldValue("final", data.final);

        // Building & Management Details
        const clientEl = document.getElementById("client");
        if (clientEl) {
            clientEl.innerHTML = `<span class="client-badge">${data.client}</span>`;
        }

        setFieldValue("location", data.location);
        setFieldValue("bank", data.bank);
        setFieldValue("online", data.online);

        // Security Deposit & Badges Formatting
        setFieldValue("deposit", data.deposit);

        const depositAmountEl = document.getElementById("deposit_amount");
        if (depositAmountEl) {
            if (data.deposit_amount === "-") {
                depositAmountEl.innerText = "-";
            } else {
                depositAmountEl.innerHTML = `
                    <div class="deposit-badge-container">
                        <div class="deposit-badge-row">
                            <span class="badge-label">Amount:</span>
                            <span class="badge-val">${data.deposit_amount}</span>
                        </div>
                    </div>
                `;
            }
        }
    }
}

function setFieldValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val || "-";
}

function clearSearch() {
    const input = document.getElementById("towerInput");
    if (input) input.value = "";
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) clearBtn.style.display = "none";
    clearTowerDetails();
}

function clearTowerDetails() {
    const fields = ["billing", "late", "activation", "disconnection", "noc", "final", "client", "location", "bank", "online", "deposit", "deposit_amount"];
    fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.innerText = "-";
    });
}

// 📑 NOC Process Rules Handler
function handleNocChange() {
    const towerSelect = document.getElementById("nocTowerSelect") ? document.getElementById("nocTowerSelect").value : "";
    const userType = document.getElementById("nocUserType") ? document.getElementById("nocUserType").value : "";
    const resultArea = document.getElementById("noc-result-area");
    const ownerCard = document.getElementById("owner-checklist-card");
    const tenantCard = document.getElementById("tenant-checklist-card");

    if (!resultArea || !ownerCard || !tenantCard) return;

    if (towerSelect && userType) {
        resultArea.classList.remove("hidden-page");

        if (userType === "owner") {
            ownerCard.classList.remove("hidden-page");
            tenantCard.classList.add("hidden-page");
        } else if (userType === "tenant") {
            tenantCard.classList.remove("hidden-page");
            ownerCard.classList.add("hidden-page");
        }
    } else {
        resultArea.classList.add("hidden-page");
        ownerCard.classList.add("hidden-page");
        tenantCard.classList.add("hidden-page");
    }
}
