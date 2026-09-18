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
    populateNocTowersDropdown();
}

// ============================================================
// 🔴 LIVE CONTRACT SEARCH - بيستخدم نفس آلية البحث اللي البورتال نفسه بيستخدمها
// (راجع /api/towers ، /api/contract-numbers ، /api/contract-detail في server.py)
// Select2 بيدي تجربة "اكتب تلاقي" زي البورتال بالظبط، مش dropdown عادي
// ============================================================
let nocTowersById = {};          // { "83": "Corniche Tower", ... }
let nocContractDetailCache = {}; // عشان مانطلبش نفس تفاصيل العقد مرتين

function nocSelect2Refresh($el, options) {
    // بندمر أي select2 قديم قبل ما نغير الـ options ونعمله من جديد - أأمن طريقة
    if ($el.data("select2")) $el.select2("destroy");
    $el.html("");
    options.forEach(o => $el.append(new Option(o.text, o.value, false, false)));
    $el.select2({ width: "100%" });
}

function populateNocTowersDropdown() {
    const $sel = $("#nocTowerName");
    if (!$sel.length) return;

    nocSelect2Refresh($sel, [{ value: "", text: "-- Loading towers... --" }]);

    fetch(PYTHON_BACKEND_TOWERS_URL)
        .then(r => r.json())
        .then(data => {
            const towers = data.towers || [];
            nocTowersById = {};
            towers.forEach(t => { nocTowersById[t.id] = t.name; });

            const options = [{ value: "", text: "-- Select Tower --" }]
                .concat(towers.map(t => ({ value: t.id, text: t.name })));
            nocSelect2Refresh($sel, options);
        })
        .catch(() => {
            nocSelect2Refresh($sel, [{ value: "", text: "-- Failed to load towers, refresh the page --" }]);
        });
}

function loadContractsForTower() {
    const propertyId = $("#nocTowerName").val();
    const $picker = $("#nocContractPicker");
    const $ownerPicker = $("#nocOwnerContractPicker"); // نفس ليستة عقود التاور - بس الديفولت بتاعها N/A مش فاضي
    if (!$picker.length) return;

    nocContractDetailCache = {};

    if (!propertyId) {
        nocSelect2Refresh($picker, [{ value: "", text: "-- Select tower first --" }]);
        if ($ownerPicker.length) nocSelect2Refresh($ownerPicker, [{ value: "", text: "-- Select tower first --" }]);
        return;
    }

    nocSelect2Refresh($picker, [{ value: "", text: "-- Loading contracts... --" }]);
    if ($ownerPicker.length) nocSelect2Refresh($ownerPicker, [{ value: "", text: "-- Loading contracts... --" }]);

    fetch(`${PYTHON_BACKEND_CONTRACT_NUMBERS_URL}?property_id=${encodeURIComponent(propertyId)}`)
        .then(r => r.json())
        .then(data => {
            const contracts = data.contracts || [];

            const tenantOptions = [{
                value: "",
                text: contracts.length ? "-- Select contract (optional) --" : "-- No contracts found for this tower --"
            }].concat(contracts.map(c => ({ value: c.contract_no, text: c.contract_no })));
            nocSelect2Refresh($picker, tenantOptions);

            if ($ownerPicker.length) {
                // نفس ليستة العقود، بس أول اختيار هنا "N/A" - ده هو الديفولت لطالما المالك مش محدد عقد
                const ownerOptions = [{ value: "", text: "N/A" }]
                    .concat(contracts.map(c => ({ value: c.contract_no, text: c.contract_no })));
                nocSelect2Refresh($ownerPicker, ownerOptions);
            }
        })
        .catch(() => {
            nocSelect2Refresh($picker, [{ value: "", text: "-- Failed to load contracts --" }]);
            if ($ownerPicker.length) nocSelect2Refresh($ownerPicker, [{ value: "", text: "-- Failed to load contracts --" }]);
        });
}

function applyContractSelection() {
    const contractNo = $("#nocContractPicker").val();
    const propertyId = $("#nocTowerName").val();
    if (!contractNo || !propertyId) return;

    const towerName = nocTowersById[propertyId];
    if (!towerName) return;

    const contractField = document.getElementById("nocTenantContract");
    if (contractField) contractField.value = contractNo; // نملاها فورًا، مش لازم نستنى الباقي

    const cacheKey = `${propertyId}::${contractNo}`;
    if (nocContractDetailCache[cacheKey]) {
        applyContractDetail(nocContractDetailCache[cacheKey]);
        return;
    }

    fetch(`${PYTHON_BACKEND_CONTRACT_DETAIL_URL}?tower=${encodeURIComponent(towerName)}&contract=${encodeURIComponent(contractNo)}`)
        .then(r => {
            if (!r.ok) throw new Error("contract detail not found");
            return r.json();
        })
        .then(detail => {
            nocContractDetailCache[cacheKey] = detail;
            applyContractDetail(detail);
        })
        .catch(() => {
            // العقد اتملى برقمه بس على الأقل - باقي البيانات (الاسم/الوحدة) هتتكتب يدوي
        });
}

function applyContractDetail(contract) {
    const nameField = document.getElementById("nocTenantName");
    const contractField = document.getElementById("nocTenantContract");
    const unitField = document.getElementById("nocUnitNo");

    if (nameField) nameField.value = contract.customer_name;
    if (contractField) contractField.value = contract.contract_no;
    if (unitField) unitField.value = contract.unit_no;
}

// 🧑‍💼 نفس فكرة اختيار عقد المستأجر، بس لخانة "2. Owner Details" - لو اختار N/A
// (القيمة الفاضية) بنمسح اسم ورقم عقد المالك تاني، عشان يفضلوا فاضيين ويتبعتوا N/A
// تلقائي في الـ payload بالظبط زي ما كان بيحصل لما الخانتين كانوا نص يدوي
function applyOwnerContractSelection() {
    const contractNo = $("#nocOwnerContractPicker").val();
    const propertyId = $("#nocTowerName").val();

    const nameField = document.getElementById("nocOwnerName");
    const contractField = document.getElementById("nocOwnerContract");

    if (!contractNo || !propertyId) {
        if (nameField) nameField.value = "";
        if (contractField) contractField.value = "";
        return;
    }

    if (contractField) contractField.value = contractNo; // نملاها فورًا

    const towerName = nocTowersById[propertyId];
    if (!towerName) return;

    const cacheKey = `${propertyId}::${contractNo}`;
    if (nocContractDetailCache[cacheKey]) {
        if (nameField) nameField.value = nocContractDetailCache[cacheKey].customer_name;
        return;
    }

    fetch(`${PYTHON_BACKEND_CONTRACT_DETAIL_URL}?tower=${encodeURIComponent(towerName)}&contract=${encodeURIComponent(contractNo)}`)
        .then(r => {
            if (!r.ok) throw new Error("contract detail not found");
            return r.json();
        })
        .then(detail => {
            nocContractDetailCache[cacheKey] = detail;
            if (nameField) nameField.value = detail.customer_name;
        })
        .catch(() => {
            // العقد اتملى برقمه بس - اسم المالك هيتكتب يدوي
        });
}

// نوكرول: خانة nocTowerName بقت select قيمتها الـ property id مش اسم التاور -
// فلازم نرجع الاسم من نفس الماب اللي بنعمرها في populateNocTowersDropdown
// قبل ما نبعته في الـ payload (وإلا هيتبعت الرقم بدل الاسم في الـ PDF نفسه)
function getSelectedTowerName() {
    const propertyId = document.getElementById("nocTowerName").value;
    return nocTowersById[propertyId] || "";
}

// 🔄 مسح الفورم بالكامل: كل الحقول المكتوبة + رجوع الدروب داون بتاع التاور والعقد
// للوضع الافتراضي (من غير ما نعيد تحميل قائمة الأبراج من السيرفر تاني)
function resetNocForm() {
    const typeSelect = document.getElementById("nocTypeSelect");
    if (typeSelect) typeSelect.value = "tenant";
    toggleNocFormType();

    ["nocTenantName", "nocUnitNo", "nocTenantContract", "nocOwnerName", "nocOwnerContract", "moveInSpcAccount"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const accountType = document.getElementById("moveInAccountType");
    if (accountType) accountType.value = "TENANT";

    const dateInput = document.getElementById("nocDate");
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // بيرجع اختيار البرج لـ "-- Select Tower --" وده بيتريجر loadContractsForTower()
    // اللي بترجع خانة العقد لـ "-- Select tower first --" ومسح الكاش تلقائي
    const $tower = $("#nocTowerName");
    if ($tower.length) $tower.val("").trigger("change");
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
    const groupOwnerContractPicker = document.getElementById("groupOwnerContractPicker");
    const groupMoveInAccountType = document.getElementById("groupMoveInAccountType");
    const groupMoveInSpcAccount = document.getElementById("groupMoveInSpcAccount");

    if (nocType === "movein") {
        if (section2Title) section2Title.style.display = "none";
        if (groupOwnerName) groupOwnerName.style.display = "none";
        if (groupOwnerContract) groupOwnerContract.style.display = "none";
        if (groupOwnerContractPicker) groupOwnerContractPicker.style.display = "none";

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
        if (groupOwnerContractPicker) groupOwnerContractPicker.style.display = "none";

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
        if (groupOwnerContractPicker) groupOwnerContractPicker.style.display = "block";

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
        if (groupOwnerContractPicker) groupOwnerContractPicker.style.display = "block";

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
            tower_name: getSelectedTowerName().trim() || "N/A",
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
            tower_name: getSelectedTowerName().trim() || "N/A",
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
            tower_name: getSelectedTowerName().trim() || "N/A",
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
            tower_name: getSelectedTowerName().trim() || "N/A",
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

