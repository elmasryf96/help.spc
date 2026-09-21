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

    // زرار ريفرش الأبراج يظهر للأدمن بس
    const refreshBtn = document.getElementById("refreshNocTowersBtn");
    const refreshNote = document.getElementById("refreshNocTowersNote");
    const showAdminRefresh = (typeof isAdmin === "function" && isAdmin());
    if (refreshBtn) refreshBtn.style.display = showAdminRefresh ? "inline-flex" : "none";
    if (refreshNote) refreshNote.style.display = showAdminRefresh ? "block" : "none";
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

function applyNocTowers(towers, keepValue) {
    const $sel = $("#nocTowerName");
    nocTowersById = {};
    towers.forEach(t => { nocTowersById[t.id] = t.name; });

    const options = [{ value: "", text: "-- Select Tower --" }]
        .concat(towers.map(t => ({ value: t.id, text: t.name })));
    nocSelect2Refresh($sel, options);

    // لو كان فيه برج مختار قبل الريفرش وما زال موجود، نرجّعه من غير ما نمسح العقود
    if (keepValue && nocTowersById[keepValue]) $sel.val(keepValue).trigger("change.select2");
}

function populateNocTowersDropdown() {
    const $sel = $("#nocTowerName");
    if (!$sel.length) return;

    nocSelect2Refresh($sel, [{ value: "", text: "-- Loading towers... --" }]);

    fetch(PYTHON_BACKEND_TOWERS_URL)
        .then(r => r.json())
        .then(data => applyNocTowers(data.towers || [], ""))
        .catch(() => {
            nocSelect2Refresh($sel, [{ value: "", text: "-- Failed to load towers, refresh the page --" }]);
        });
}

// 🔄 زرار الأدمن: بيطلب من السيرفر يجدد قايمة الأبراج من بورتال الفوترة (بيدخل بالكروميوم)
function nocConfirmYesNo(title, text) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;";
        overlay.innerHTML = `
            <div style="background:#fff;border-radius:14px;max-width:380px;width:100%;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.25);text-align:center;">
                <div style="font-size:32px;color:#dc2626;margin-bottom:6px;"><i class="fa-solid fa-building-circle-exclamation"></i></div>
                <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${title}</div>
                <div style="font-size:13px;color:#555;margin-bottom:18px;">${text}</div>
                <div style="display:flex;gap:10px;">
                    <button type="button" data-a="no" style="flex:1;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-weight:600;cursor:pointer;">No</button>
                    <button type="button" data-a="yes" style="flex:1;padding:10px;border:none;border-radius:8px;background:#dc2626;color:#fff;font-weight:600;cursor:pointer;">Yes</button>
                </div>
            </div>`;
        const close = answer => { overlay.remove(); resolve(answer); };
        overlay.addEventListener("click", e => {
            if (e.target === overlay) close(false);
            const a = e.target.closest("button") && e.target.closest("button").getAttribute("data-a");
            if (a) close(a === "yes");
        });
        document.body.appendChild(overlay);
    });
}

function refreshNocTowers() {
    const btn = document.getElementById("refreshNocTowersBtn");
    if (!btn || btn.disabled) return;
    if (typeof isAdmin === "function" && !isAdmin()) return;

    nocConfirmYesNo(
        "Was a new tower added?",
        "Choose <b>Yes</b> to update the towers list from the billing portal, or <b>No</b> to close."
    ).then(yes => { if (yes) doRefreshNocTowers(); });
}

function doRefreshNocTowers() {
    const btn = document.getElementById("refreshNocTowersBtn");
    if (!btn || btn.disabled) return;

    const originalHtml = btn.innerHTML;
    const previousTower = $("#nocTowerName").val();
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

    fetch(`${PYTHON_BACKEND_TOWERS_URL}/refresh`, { method: "POST" })
        .then(r => {
            if (!r.ok) throw new Error("refresh failed " + r.status);
            return r.json();
        })
        .then(data => {
            applyNocTowers(data.towers || [], previousTower);
            btn.innerHTML = `<i class="fa-solid fa-check"></i> Done`;
            setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 1500);
        })
        .catch(() => {
            alert("❌ Failed to refresh towers. Please wait a minute and try again.");
            btn.innerHTML = originalHtml;
            btn.disabled = false;
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

    // بنملا SPC Account Number بنفس رقم العقد كمان فورًا - ده الحقل اللي Move-in
    // Clearance بتستخدمه بدل "Tenant Contract Number" (شوف applyContractDetail برضو)
    const spcAccountFieldImmediate = document.getElementById("moveInSpcAccount");
    if (spcAccountFieldImmediate) spcAccountFieldImmediate.value = contractNo;

    // نمسح الاسم ورقم الوحدة بتوع العقد السابق فورًا - عشان لو تفاصيل العقد الجديد
    // اتأخرت أو فشلت، ماتفضلش بيانات العقد القديم ظاهرة مع رقم العقد الجديد
    const staleName = document.getElementById("nocTenantName");
    const staleUnit = document.getElementById("nocUnitNo");
    if (staleName) staleName.value = "";
    if (staleUnit) staleUnit.value = "";

    // رقم الوحدة بيتشتق من رقم العقد (SBD-T1_705-T1 -> T1_705) فنملاه فورًا
    const cParts = contractNo.split("-");
    if (staleUnit && cParts.length >= 3) staleUnit.value = cParts.slice(1, -1).join("-").trim();
    if (staleName) staleName.placeholder = "Loading name...";

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
            // لو المستخدم اختار عقد تاني وإحنا مستنيين الرد، نتجاهل الرد القديم
            if ($("#nocContractPicker").val() !== contractNo || $("#nocTowerName").val() !== propertyId) return;
            applyContractDetail(detail);
        })
        .catch(() => {
            const nf = document.getElementById("nocTenantName");
            if (nf) nf.placeholder = "";
        });
}

function applyContractDetail(contract) {
    const nameField = document.getElementById("nocTenantName");
    const contractField = document.getElementById("nocTenantContract");
    const unitField = document.getElementById("nocUnitNo");
    const spcAccountField = document.getElementById("moveInSpcAccount"); // Move-in Clearance بتستخدم رقم العقد كـ SPC Account Number

    if (nameField) { nameField.value = contract.customer_name; nameField.placeholder = ""; }
    if (contractField) contractField.value = contract.contract_no;
    if (unitField && contract.unit_no) unitField.value = contract.unit_no;
    if (spcAccountField) spcAccountField.value = contract.contract_no;
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
    if (nameField) nameField.value = ""; // نمسح اسم المالك القديم لحد ما الجديد يوصل
    if (nameField) nameField.placeholder = "Loading name...";

    const towerName = nocTowersById[propertyId];
    if (!towerName) return;

    const cacheKey = `${propertyId}::${contractNo}`;
    if (nocContractDetailCache[cacheKey]) {
        if (nameField) { nameField.value = nocContractDetailCache[cacheKey].customer_name; nameField.placeholder = "e.g. N/A or Owner Full Name"; }
        return;
    }

    fetch(`${PYTHON_BACKEND_CONTRACT_DETAIL_URL}?tower=${encodeURIComponent(towerName)}&contract=${encodeURIComponent(contractNo)}`)
        .then(r => {
            if (!r.ok) throw new Error("contract detail not found");
            return r.json();
        })
        .then(detail => {
            nocContractDetailCache[cacheKey] = detail;
            if ($("#nocOwnerContractPicker").val() !== contractNo || $("#nocTowerName").val() !== propertyId) return;
            if (nameField) { nameField.value = detail.customer_name; nameField.placeholder = "e.g. N/A or Owner Full Name"; }
        })
        .catch(() => {
            if ($("#nocOwnerContractPicker").val() !== contractNo) return;
            if (nameField) nameField.placeholder = "Not found - type the name manually";
        });
}

// نوكرول: خانة nocTowerName بقت select قيمتها الـ property id مش اسم التاور -
// فلازم نرجع الاسم من نفس الماب اللي بنعمرها في populateNocTowersDropdown
// قبل ما نبعته في الـ payload (وإلا هيتبعت الرقم بدل الاسم في الـ PDF نفسه)
function getSelectedTowerName() {
    const propertyId = document.getElementById("nocTowerName").value;
    return nocTowersById[propertyId] || "";
}

// 🔄 مسح الفورم: كل الحقول المكتوبة + رجوع الدروب داون بتاع التاور والعقد للوضع
// الافتراضي (من غير ما نعيد تحميل قائمة الأبراج من السيرفر تاني) - من غير ما نغير
// نوع الـ NOC نفسه (كان فيه باج إن الـ Reset كان بيرجّع النوع لـ Tenant NOC دايمًا
// حتى لو المستخدم واقف على نوع تاني زي Move-in Clearance)
function resetNocForm() {
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
        // في Owner NOC، "المالك الجديد" لسه معندوش عقد مسجل في النظام - فارس بيكتب
        // الاسم والرقم بإيده يدوي، فمفيش داعي لخانة اختيار عقد هنا (بعكس Tenant NOC
        // اللي فيها "Owner Details" بتاعة مالك موجود بالفعل وليه عقد نقدر نختاره)
        if (groupOwnerContractPicker) groupOwnerContractPicker.style.display = "none";

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

