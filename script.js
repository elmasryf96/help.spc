/* ==================================================
   🔐 AUTHENTICATION & LOGIN SYSTEM
================================================== */
function handleLogin(event) {
    // 🛑 منع إعادة تحميل الصفحة (Refresh)
    if (event) event.preventDefault();

    const userInput = document.getElementById('username').value.trim();
    const passInput = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('login-error');

    // البيانات الصحيحة للدخول
    if (userInput.toLowerCase() === 'spc' && passInput === 'spc2026') {
        errorMsg.style.display = 'none';
        
        // حفظ جلسة الدخول
        localStorage.setItem('spc_logged_in', 'true');
        
        // التنقل للداشبورد الرئيسي
        navigateTo('home-page');
    } else {
        errorMsg.style.display = 'block';
    }
}

function handleLogout() {
    localStorage.removeItem('spc_logged_in');
    navigateTo('login-page');
}

// Check Login Status on Page Load
document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('spc_logged_in');
    if (isLoggedIn === 'true') {
        navigateTo('home-page');
    } else {
        navigateTo('login-page');
    }

    // تشغيل الساعة والوظائف عند التحميل
    initLiveClock();
    populateTowersList();
    initScheduleGrid();
});

/* ==================================================
   🚀 NAVIGATION SYSTEM
================================================== */
function navigateTo(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active-page');
        page.classList.add('hidden-page');
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden-page');
        targetPage.classList.add('active-page');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/* ==================================================
   🏢 TOWERS MASTER DATA & SEARCH
================================================== */
const towersData = {
    "Al Dana Tower": { online: "Yes", billing: "25.00 AED", late: "50.00 AED", activation: "150.00 AED", disconnection: "150.00 AED", noc: "100.00 AED", final: "35.00 AED", maintenance: "No", client: "ADCP / Nine Yard", location: "Abu Dhabi", bank: "ADCB", deposit: "SPC for new customer", deposit_amount: "500.00 AED" },
    "Al Wifaq Tower": { online: "Yes", billing: "25.00 AED", late: "50.00 AED", activation: "250.00 AED", disconnection: "250.00 AED", noc: "100.00 AED", final: "35.00 AED", maintenance: "No", client: "ADCP / Nine Yard", location: "Abu Dhabi", bank: "SPC", deposit: "SPC for new customer", deposit_amount: "Check prior owner or tenant account" },
    "Danube Properties": { online: "Yes", billing: "30.00 AED", late: "50.00 AED", activation: "200.00 AED", disconnection: "200.00 AED", noc: "150.00 AED", final: "50.00 AED", maintenance: "Yes (50 AED)", client: "Danube Mgt", location: "Dubai", bank: "FAB", deposit: "Standard Deposit", deposit_amount: "1000.00 AED" }
};

function populateTowersList() {
    const datalist = document.getElementById('towersList');
    if (!datalist) return;
    datalist.innerHTML = '';
    Object.keys(towersData).forEach(towerName => {
        const option = document.createElement('option');
        option.value = towerName;
        datalist.appendChild(option);
    });
}

function handleSelection() {
    const input = document.getElementById('towerInput');
    const clearBtn = document.getElementById('clearBtn');
    const selected = input.value.trim();

    if (selected.length > 0) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
        resetTowerFields();
        return;
    }

    if (towersData[selected]) {
        const data = towersData[selected];
        document.getElementById('online').textContent = data.online;
        document.getElementById('billing').textContent = data.billing;
        document.getElementById('late').textContent = data.late;
        document.getElementById('activation').textContent = data.activation;
        document.getElementById('disconnection').textContent = data.disconnection;
        document.getElementById('noc').textContent = data.noc;
        document.getElementById('final').textContent = data.final;
        document.getElementById('client').textContent = data.client;
        document.getElementById('location').textContent = data.location;
        document.getElementById('bank').textContent = data.bank;
        document.getElementById('deposit').textContent = data.deposit;
        document.getElementById('deposit_amount').innerHTML = `<span class="val">${data.deposit_amount}</span>`;

        const maintRow = document.getElementById('maintenance_row');
        if (data.maintenance !== "No") {
            maintRow.classList.remove('hidden-page');
            document.getElementById('maintenance').textContent = data.maintenance;
        } else {
            maintRow.classList.add('hidden-page');
        }
    }
}

function clearSearch() {
    document.getElementById('towerInput').value = '';
    document.getElementById('clearBtn').style.display = 'none';
    resetTowerFields();
}

function resetTowerFields() {
    ['online', 'billing', 'late', 'activation', 'disconnection', 'noc', 'final', 'client', 'location', 'bank', 'deposit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '-';
    });
    const depAmt = document.getElementById('deposit_amount');
    if (depAmt) depAmt.innerHTML = '<span class="val">-</span>';
    const maintRow = document.getElementById('maintenance_row');
    if (maintRow) maintRow.classList.add('hidden-page');
}

/* ==================================================
   🛠️ TECHNICAL SCHEDULE MODULE
================================================== */
const techSchedule = {
    "Monday": ["Damac Hills 1", "Damac Hills 2", "Skyview Towers", "Town Square"],
    "Tuesday": ["Silicon Oasis", "Sports City", "Motor City", "JVC"],
    "Wednesday": ["Business Bay", "Downtown", "MBL Royal", "Dubai Marina"],
    "Thursday": ["Ajman One Towers", "Corniche Towers", "Pearl Towers"],
    "Friday": ["Emergency Inspections Only"]
};

function initScheduleGrid() {
    const grid = document.getElementById('schedGridContainer');
    if (!grid) return;
    grid.innerHTML = '';

    Object.keys(techSchedule).forEach(day => {
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let listHTML = techSchedule[day].map((item, idx) => `
            <li class="b-item">
                <span class="b-no">${idx + 1}</span>
                <span>${item}</span>
            </li>
        `).join('');

        card.innerHTML = `
            <div class="day-card-header">
                <h3><i class="fa-solid fa-calendar-day"></i> ${day}</h3>
                <span class="count-badge">${techSchedule[day].length} Areas</span>
            </div>
            <ul class="b-list">${listHTML}</ul>
        `;
        grid.appendChild(card);
    });
}

function filterScheduleCards() {
    const query = document.getElementById('schedSearchInput').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSchedBtn');
    clearBtn.style.display = query.length > 0 ? 'block' : 'none';

    const cards = document.querySelectorAll('.day-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? 'block' : 'none';
    });
}

function clearSchedSearch() {
    document.getElementById('schedSearchInput').value = '';
    document.getElementById('clearSchedBtn').style.display = 'none';
    filterScheduleCards();
}

/* ==================================================
   ⏰ LIVE CLOCK & ROSTER UTILS
================================================== */
function initLiveClock() {
    setInterval(() => {
        const now = new Date();
        const options = { timeZone: 'Asia/Dubai', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const timeStr = now.toLocaleTimeString('en-US', options);

        const homeClock = document.getElementById('homeClockText');
        const uaeClock = document.getElementById('uaeClockText');

        if (homeClock) homeClock.textContent = `${timeStr} (GST)`;
        if (uaeClock) uaeClock.textContent = `${timeStr} (GST)`;
    }, 1000);
}

function switchRosterTab(tabName) {
    const tabs = ['live-view', 'agent-view', 'full-sheet-view'];
    tabs.forEach(t => {
        const content = document.getElementById(`tab-${t}`);
        const btn = document.getElementById(`tab${t.split('-')[0].charAt(0).toUpperCase() + t.split('-')[0].slice(1)}Btn`);
        
        if (content) content.classList.add('hidden-tab');
        if (btn) btn.classList.remove('active');
    });

    const activeContent = document.getElementById(`tab-${tabName}`);
    if (activeContent) activeContent.classList.remove('hidden-tab');
}
