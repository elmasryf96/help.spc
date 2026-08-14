// 🏢 Master Data for Towers Database
// ⚠️ يمكنك إضافة بقية الأبراج هنا بنفس الطريقة داخل هذا الكائن
const towersData = {
    "Bali Residence": {
        billing: "25 AED",
        late: "50 AED",
        activation: "100 AED",
        disconnection: "100 AED",
        noc: "150 AED",
        final: "50 AED",
        client: "<span class='client-badge'>Smart Collection</span>",
        location: "Abu Dhabi",
        bank: "ADCB - 123456789",
        online: "Available",
        deposit: "Refundable",
        deposit_amount: "<div class='deposit-badge-container'><div class='deposit-badge-row'><span class='badge-label'>Amount:</span><span class='badge-val'>Capacity charges*8</span></div></div>"
    },
    "Al Reem Bay Tower 1": {
        billing: "25 AED",
        late: "50 AED",
        activation: "100 AED",
        disconnection: "100 AED",
        noc: "150 AED",
        final: "50 AED",
        client: "<span class='client-badge'>Smart Collection</span>",
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
        client: "<span class='client-badge'>Smart Collection</span>",
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
        client: "<span class='client-badge'>ORO24</span>",
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
        client: "<span class='client-badge'>Smart Collection Corp</span>",
        location: "Abu Dhabi",
        bank: "ADCB - 123456789",
        online: "Available",
        deposit: "Refundable",
        deposit_amount: "<div class='deposit-badge-container'><div class='deposit-badge-row'><span class='badge-label'>Amount:</span><span class='badge-val'>Check Prior Account</span></div></div>"
    },
    "Danube Tower": {
        billing: "20 AED",
        late: "40 AED",
        activation: "80 AED",
        disconnection: "80 AED",
        noc: "100 AED",
        final: "40 AED",
        client: "<span class='client-badge'>Danube Properties</span>",
        location: "Dubai",
        bank: "ENBD - 987654321",
        online: "Available",
        deposit: "Refundable",
        deposit_amount: "<div class='deposit-badge-container'><div class='deposit-badge-row'><span class='badge-label'>Amount:</span><span class='badge-val'>Check Prior Account</span></div></div>"
    }
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    populateTowerLists();
});

// Populate DataLists and Select dropdowns
function populateTowerLists() {
    const towersList = document.getElementById("towersList");
    const nocTowerSelect = document.getElementById("nocTowerSelect");

    if (!towersList || !nocTowerSelect) return;

    towersList.innerHTML = "";
    nocTowerSelect.innerHTML = '<option value="">-- Choose Tower --</option>';

    Object.keys(towersData).forEach((towerName) => {
        // Populate Datalist for Search
        const option = document.createElement("option");
        option.value = towerName;
        towersList.appendChild(option);

        // Populate NOC Select Dropdown
        const selectOption = document.createElement("option");
        selectOption.value = towerName;
        selectOption.textContent = towerName;
        nocTowerSelect.appendChild(selectOption);
    });
}

// Navigation Handler
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

// 🔓 Direct Login (No credentials required)
function handleLogin(event) {
    event.preventDefault();
    const errorMsg = document.getElementById("login-error");
    if (errorMsg) errorMsg.style.display = "none";
    
    // Direct Access to Dashboard
    navigateTo("home-page");
}

function handleLogout() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    if (username) username.value = "";
    if (password) password.value = "";
    navigateTo("login-page");
}

// Tower Master Data Search & Render
function handleSelection() {
    const input = document.getElementById("towerInput");
    const clearBtn = document.getElementById("clearBtn");
    const selectedValue = input.value.trim();

    if (selectedValue.length > 0) {
        clearBtn.style.display = "block";
    } else {
        clearBtn.style.display = "none";
        clearTowerDetails();
        return;
    }

    if (towersData[selectedValue]) {
        const data = towersData[selectedValue];
        document.getElementById("billing").innerText = data.billing;
        document.getElementById("late").innerText = data.late;
        document.getElementById("activation").innerText = data.activation;
        document.getElementById("disconnection").innerText = data.disconnection;
        document.getElementById("noc").innerText = data.noc;
        document.getElementById("final").innerText = data.final;

        document.getElementById("client").innerHTML = data.client;
        document.getElementById("location").innerText = data.location;
        document.getElementById("bank").innerText = data.bank;
        document.getElementById("online").innerText = data.online;

        document.getElementById("deposit").innerText = data.deposit;
        document.getElementById("deposit_amount").innerHTML = data.deposit_amount;
    }
}

function clearSearch() {
    const input = document.getElementById("towerInput");
    input.value = "";
    document.getElementById("clearBtn").style.display = "none";
    clearTowerDetails();
}

function clearTowerDetails() {
    const fields = ["billing", "late", "activation", "disconnection", "noc", "final", "client", "location", "bank", "online", "deposit", "deposit_amount"];
    fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.innerText = "-";
    });
}

// NOC Rules Dynamic Viewer
function handleNocChange() {
    const towerSelect = document.getElementById("nocTowerSelect").value;
    const userType = document.getElementById("nocUserType").value;
    const resultArea = document.getElementById("noc-result-area");
    const ownerCard = document.getElementById("owner-checklist-card");
    const tenantCard = document.getElementById("tenant-checklist-card");

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
