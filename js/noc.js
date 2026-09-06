// ============================================================
// NOC GENERATOR PAGE
// Split from the original script.js on 2026-09-06
// ============================================================

// ============================================================
// 📄 NOC GENERATOR LOGIC & AUTOMATIC LOGGING
// ============================================================
function initNocPage() {
    const dateInput = document.getElementById("nocDate");
    if (dateInput && !dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    toggleNocFormType();
}

function toggleNocFormType() {
    const typeSelect = document.getElementById("nocTypeSelect");
    if (!typeSelect) return;

    const nocType = typeSelect.value;

    const labelTenantName = document.getElementById("labelTenantName");
    const labelTenantContract = document.getElementById("labelTenantContract");
    const labelOwnerName = document.getElementById("labelOwnerName");
    const labelOwnerContract = document.getElementById("labelOwnerContract");
    const section1Title = document.getElementById("section1Title");
    const section2Title = document.getElementById("section2Title");

    const groupTenantName = document.getElementById("groupTenantName");
    const groupTenantContract = document.getElementById("groupTenantContract");
    const groupOwnerName = document.getElementById("groupOwnerName");
    const groupOwnerContract = document.getElementById("groupOwnerContract");
    const groupMoveInAccountType = document.getElementById("groupMoveInAccountType");
    const groupMoveInSpcAccount = document.getElementById("groupMoveInSpcAccount");

    if (nocType === "movein") {
        if (section2Title) section2Title.style.display = "none";
        if (groupOwnerName) groupOwnerName.style.display = "none";
        if (groupOwnerContract) groupOwnerContract.style.display = "none";

        if (groupTenantName) groupTenantName.style.display = "block";
        if (groupTenantContract) groupTenantContract.style.display = "none";
        if (groupMoveInAccountType) groupMoveInAccountType.style.display = "block";
        if (groupMoveInSpcAccount) groupMoveInSpcAccount.style.display = "block";

        if (section1Title) section1Title.innerHTML = `<i class="fa-solid fa-file-circle-check" style="color: #d97706;"></i> Move-In Clearance Details`;
        if (labelTenantName) labelTenantName.innerHTML = `<i class="fa-solid fa-user"></i> Account Holder Full Name:`;
    } else if (nocType === "rent") {
        if (section2Title) section2Title.style.display = "none";
        if (groupOwnerName) groupOwnerName.style.display = "none";
        if (groupOwnerContract) groupOwnerContract.style.display = "none";

        if (groupTenantName) groupTenantName.style.display = "block";
        if (groupTenantContract) groupTenantContract.style.display = "block";
        if (groupMoveInAccountType) groupMoveInAccountType.style.display = "none";
        if (groupMoveInSpcAccount) groupMoveInSpcAccount.style.display = "none";

        if (section1Title) section1Title.innerHTML = `<i class="fa-solid fa-user-check" style="color: #d97706;"></i> 1. Owner Information`;
        if (labelTenantName) labelTenantName.innerHTML = `<i class="fa-solid fa-user"></i> Owner Consumer Name:`;
        if (labelTenantContract) labelTenantContract.innerHTML = `<i class="fa-solid fa-file-signature"></i> Contract Number:`;
    } else if (nocType === "owner") {
        if (section2Title) section2Title.style.display = "block";
        if (groupOwnerName) groupOwnerName.style.display = "block";
        if (groupOwnerContract) groupOwnerContract.style.display = "block";

        if (groupTenantName) groupTenantName.style.display = "block";
        if (groupTenantContract) groupTenantContract.style.display = "block";
        if (groupMoveInAccountType) groupMoveInAccountType.style.display = "none";
        if (groupMoveInSpcAccount) groupMoveInSpcAccount.style.display = "none";

        if (section1Title) section1Title.innerHTML = `<i class="fa-solid fa-user-check" style="color: #d97706;"></i> 1. Current Owner Information`;
        if (section2Title) section2Title.innerHTML = `<i class="fa-solid fa-user-tie" style="color: #d97706;"></i> 2. New Owner Information`;

        if (labelTenantName) labelTenantName.innerHTML = `<i class="fa-solid fa-user"></i> Current Owner Consumer Name:`;
        if (labelTenantContract) labelTenantContract.innerHTML = `<i class="fa-solid fa-file-signature"></i> Current Owner Contract Number:`;
        if (labelOwnerName) labelOwnerName.innerHTML = `<i class="fa-solid fa-user"></i> New Owner Consumer Name:`;
        if (labelOwnerContract) labelOwnerContract.innerHTML = `<i class="fa-solid fa-file-invoice"></i> New Owner Contract Number:`;
    } else {
        if (section2Title) section2Title.style.display = "block";
        if (groupOwnerName) groupOwnerName.style.display = "block";
        if (groupOwnerContract) groupOwnerContract.style.display = "block";

        if (groupTenantName) groupTenantName.style.display = "block";
        if (groupTenantContract) groupTenantContract.style.display = "block";
        if (groupMoveInAccountType) groupMoveInAccountType.style.display = "none";
        if (groupMoveInSpcAccount) groupMoveInSpcAccount.style.display = "none";

        if (section1Title) section1Title.innerHTML = `<i class="fa-solid fa-user-check" style="color: #d97706;"></i> 1. Tenant & Property Details`;
        if (section2Title) section2Title.innerHTML = `<i class="fa-solid fa-user-tie" style="color: #d97706;"></i> 2. Owner Details (Optional)`;

        if (labelTenantName) labelTenantName.innerHTML = `<i class="fa-solid fa-user"></i> Tenant Consumer Name:`;
        if (labelTenantContract) labelTenantContract.innerHTML = `<i class="fa-solid fa-file-signature"></i> Tenant Contract Number:`;
        if (labelOwnerName) labelOwnerName.innerHTML = `<i class="fa-solid fa-user"></i> Owner Consumer Name:`;
        if (labelOwnerContract) labelOwnerContract.innerHTML = `<i class="fa-solid fa-file-invoice"></i> Owner Contract Number:`;
    }
}

function handleNocSubmission() {
    const btn = document.getElementById("btnNocSubmit");
    const originalText = btn.innerHTML;
    const nocType = document.getElementById("nocTypeSelect").value;

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF... Please wait.`;

    let targetUrl = PYTHON_BACKEND_NOC_URL;
    let payload = {};
    let logPayload = {};
    let downloadFileName = `NOC_${document.getElementById("nocUnitNo").value.trim() || "Document"}.pdf`;

    if (nocType === "movein") {
        targetUrl = PYTHON_BACKEND_MOVE_IN_URL;
        payload = {
            account_holder_name: document.getElementById("nocTenantName").value.trim() || "N/A",
            account_type: document.getElementById("moveInAccountType").value,
            tower_name: document.getElementById("nocTowerName").value.trim() || "N/A",
            unit_no: document.getElementById("nocUnitNo").value.trim() || "N/A",
            spc_account_no: document.getElementById("moveInSpcAccount").value.trim() || "N/A",
            noc_date: document.getElementById("nocDate").value
        };
        downloadFileName = `Move_In_Clearance_${payload.unit_no}.pdf`;

        logPayload = {
            noc_type: "Move-In Clearance",
            tenant_name: payload.account_holder_name,
            tenant_contract: payload.spc_account_no,
            owner_name: "-",
            owner_contract: "-",
            tower_name: payload.tower_name,
            unit_no: payload.unit_no
        };
    } else if (nocType === "rent") {
        targetUrl = PYTHON_BACKEND_RENT_NOC_URL;
        payload = {
            owner_name: document.getElementById("nocTenantName").value.trim() || "N/A",
            owner_contract: document.getElementById("nocTenantContract").value.trim() || "N/A",
            tower_name: document.getElementById("nocTowerName").value.trim() || "N/A",
            unit_no: document.getElementById("nocUnitNo").value.trim() || "N/A",
            noc_date: document.getElementById("nocDate").value
        };
        downloadFileName = `Owner_Clearance_For_Rent_${payload.unit_no}.pdf`;

        logPayload = {
            noc_type: "Owner Clearance For Rent",
            tenant_name: "-",
            tenant_contract: "-",
            owner_name: payload.owner_name,
            owner_contract: payload.owner_contract,
            tower_name: payload.tower_name,
            unit_no: payload.unit_no
        };
    } else if (nocType === "owner") {
        targetUrl = PYTHON_BACKEND_OWNER_NOC_URL;
        payload = {
            owner_name: document.getElementById("nocTenantName").value.trim() || "N/A",
            owner_contract: document.getElementById("nocTenantContract").value.trim() || "N/A",
            new_owner_name: document.getElementById("nocOwnerName").value.trim() || "N/A",
            new_owner_contract: document.getElementById("nocOwnerContract").value.trim() || "N/A",
            tower_name: document.getElementById("nocTowerName").value.trim() || "N/A",
            unit_no: document.getElementById("nocUnitNo").value.trim() || "N/A",
            noc_date: document.getElementById("nocDate").value
        };
        downloadFileName = `Owner_NOC_${payload.unit_no}.pdf`;

        logPayload = {
            noc_type: "Owner NOC",
            tenant_name: "-",
            tenant_contract: "-",
            owner_name: `${payload.owner_name} ➔ ${payload.new_owner_name}`,
            owner_contract: `${payload.owner_contract} / ${payload.new_owner_contract}`,
            tower_name: payload.tower_name,
            unit_no: payload.unit_no
        };
    } else {
        payload = {
            tenant_name: document.getElementById("nocTenantName").value.trim() || "N/A",
            tower_name: document.getElementById("nocTowerName").value.trim() || "N/A",
            unit_no: document.getElementById("nocUnitNo").value.trim() || "N/A",
            tenant_contract: document.getElementById("nocTenantContract").value.trim() || "N/A",
            noc_date: document.getElementById("nocDate").value,
            owner_name: document.getElementById("nocOwnerName").value.trim() || "N/A",
            owner_contract: document.getElementById("nocOwnerContract").value.trim() || "N/A"
        };
        downloadFileName = `Tenant_NOC_${payload.unit_no}.pdf`;

        logPayload = {
            noc_type: "Tenant NOC",
            tenant_name: payload.tenant_name,
            tenant_contract: payload.tenant_contract,
            owner_name: payload.owner_name,
            owner_contract: payload.owner_contract,
            tower_name: payload.tower_name,
            unit_no: payload.unit_no
        };
    }

    fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) throw new Error("Failed to generate PDF");
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        // 🟢 إرسال اللوج تلقائياً بعد نجاح تنزيل ملف الـ PDF
        sendLogToGoogleSheet(logPayload);

        btn.disabled = false;
        btn.innerHTML = originalText;
    })
    .catch(err => {
        alert("❌ Error generating PDF. Please check backend connection!");
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}

