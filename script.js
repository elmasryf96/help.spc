// 🔓 دخول مباشر فور الضغط على Sign In بدون إجبار إدخال بيانات
function handleLogin(event) {
    if (event) event.preventDefault();
    const errorMsg = document.getElementById("login-error");
    if (errorMsg) errorMsg.style.display = "none";

    navigateTo('home-page');
}

function handleLogout() {
    const userInput = document.getElementById("username");
    const passInput = document.getElementById("password");
    if (userInput) userInput.value = "";
    if (passInput) passInput.value = "";
    
    const errorMsg = document.getElementById("login-error");
    if (errorMsg) errorMsg.style.display = "none";
    
    if (document.getElementById("towerInput")) { clearSearch(); }
    navigateTo('login-page');
}

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
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const datalist = document.getElementById("towersList");
    const nocSelect = document.getElementById("nocTowerSelect");

    if (datalist || nocSelect) {
        Object.keys(towersData).sort().forEach(tower => {
            if (datalist) {
                let option = document.createElement("option");
                option.value = tower;
                datalist.appendChild(option);
            }
            if (nocSelect) {
                let opt = document.createElement("option");
                opt.value = tower;
                opt.textContent = tower;
                nocSelect.appendChild(opt);
            }
        });
    }
});

function handleNocChange() {
    const tower = document.getElementById("nocTowerSelect").value;
    const userType = document.getElementById("nocUserType").value;

    const resultArea = document.getElementById("noc-result-area");
    const ownerCard = document.getElementById("owner-checklist-card");
    const tenantCard = document.getElementById("tenant-checklist-card");

    if (tower && userType) {
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

const towersData = {
  "Al Dana Towers": { "client": "ADCP/Nine Yard", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "40.00 AED", "activation": "200.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Al Mamzar Gate": { "client": "H S H Real Estate", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "40.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Al Nuaimiya Tower C": { "client": "Aqaar Community Management", "location": "Ajman", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "150.00 AED" },
  "Al Raha Beach Towers": { "client": "Emirates Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "500.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Al Reem Bay Tower 1": { "client": "FAB Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "28.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "250.00 AED", "noc": "50.00 AED", "final": "25.00 AED" },
  "Al Reem Bay Tower 2": { "client": "FAB Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "28.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "250.00 AED", "noc": "50.00 AED", "final": "25.00 AED" },
  "Al Wifaq Tower": { "client": "ADCP/Nine Yard", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC for new customer", "online": "No", "billing": "25.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Amaya Tower 1": { "client": "Dhafir development", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Amaya Tower 2": { "client": "Dhafir development", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Aria Residence": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "Client", "deposit": "Client", "online": "No", "billing": "20.00 AED", "late": "25.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Ayedh Tower": { "client": "Dajeem Properties", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Bali Residence": { "client": "Stratum Owner Association Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Binghatti East": { "client": "Kaizen Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "20.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Binghatti West": { "client": "Kaizen Owner Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "20.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Building H": { "client": "National Investment Cooperation", "location": "Abudhabi", "bank": "SPC", "deposit": "N/A", "online": "Yes", "billing": "37.00 AED", "late": "n/a", "activation": "100.00 AED", "disconnection": "200.00 AED", "noc": "50.00 AED", "final": "30.00 AED" },
  "Centurion Star Tower A": { "client": "Reliance Owners Association Management", "location": "Dubai", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "40.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Centurion Star Tower B": { "client": "Reliance Owners Association Management", "location": "Dubai", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "40.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Clover Bay": { "client": "Stratum Owner Association Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Condor Marina Star": { "client": "King Royal Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Corniche Tower": { "client": "Aqaar Community Management", "location": "Ajman", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "150.00 AED" },
  "Creek Vistas Grande": { "client": "Sobha Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "DG Building 110": { "client": "Modo Property Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "DG Building 111": { "client": "Modo Property Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "DG Building 112": { "client": "Modo Property Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC for new customer", "online": "Yes", "billing": "35.00 AED", "late": "40.00 AED", "activation": "150.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "DG Building 132": { "client": "Modo Property Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "East Coast": { "client": "Saeed Mohammed Abdulla Alraqbani Hamdan Bin Abdullah", "location": "Dubai", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "30.00 AED", "late": "25.00 AED", "activation": "60.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Eastern Mangrooves": { "client": "Aldar Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "25.00 AED", "activation": "150.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Eastern Star": { "client": "DGM Properties LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "40.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Elz by Danube": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Fairmont Marina Residences": { "client": "National Investment Cooperation", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "37.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "200.00 AED", "noc": "50.00 AED", "final": "30.00 AED" },
  "Gemini Splendor": { "client": "Stratum Owner Association Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Glamz by Danube": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Grosvenor Business Tower": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "35.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Hthree by Aurora": { "client": "Better Communities Owner Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "40.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Hussain Ibrahim Mohamed Ibrahim Alhammadi": { "client": "Curve Real Estate LLC", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "75.00 AED", "activation": "150.00 AED", "disconnection": "250.00 AED", "noc": "50.00 AED", "final": "50.00 AED" },
  "Julphar Residence": { "client": "Stratum Owner Association Management", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "50.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "50.00 AED" },
  "Lawnz by Danube": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Maison VI Residence": { "client": "Khyber Investments Limited", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Makeen Residence": { "client": "Makeen Properties", "location": "Dubai", "bank": "SPC", "deposit": "SPC for new customer", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Marina Sunset": { "client": "National Investment Cooperation", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "28.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "50.00 AED", "final": "30.00 AED" },
  "Miraclz by Danube": { "client": "Stratum Owner Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Muhaimat Tower": { "client": "Arabian Falcon Group", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "0.00 AED" },
  "Nation Tower Commercial": { "client": "ICT", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "No", "billing": "23.00 AED", "late": "0.00 AED", "activation": "50.00 AED", "disconnection": "500.00 AED", "noc": "30.00 AED", "final": "0.00 AED" },
  "Palace Tower": { "client": "Reliance Owners Association Management", "location": "Dubai", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "25.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Pearl Coast": { "client": "Al Khaimah Real Estate", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "40.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Raha C6": { "client": "Saeed Mohammed Abdulla Alraqbani Hamdan Bin Abdullah", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "25.00 AED", "activation": "60.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "25.00 AED" },
  "Raha C7": { "client": "Saeed Mohammed Abdulla Alraqbani Hamdan Bin Abdullah", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "25.00 AED", "activation": "60.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "25.00 AED" },
  "Resortz by Danube": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Shams Meera Tower 1": { "client": "Aldar Properties/Provis OA Management", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Shams Meera Tower 2": { "client": "Aldar Properties/Provis OA Management", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Silverene Tower": { "client": "Palma Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "50.00 AED", "late": "25.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Skyview Tower": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "35.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Sobha Waves": { "client": "Sobha Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Sobha Waves Grande": { "client": "Sobha Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Starz by Danube": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Sway Residence": { "client": "Kaizen Owner Association Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "The 7 By Aurora": { "client": "Aurora Real Estate Development LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "23.00 AED", "late": "40.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "The Bridges 4": { "client": "Aldar Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "The Bridges 5": { "client": "Aldar Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "The Bridges 6": { "client": "Aldar Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "The Dunes Tower": { "client": "Reliance Owners Association Management", "location": "Dubai", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "34.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "The Lamar Residence Tower A": { "client": "Al Saqer Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "500.00 AED", "noc": "150.00 AED", "final": "20.00 AED" },
  "The Lamar Residence Tower B": { "client": "Al Saqer Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "500.00 AED", "noc": "150.00 AED", "final": "20.00 AED" },
  "The Lamar Residence Tower C": { "client": "Al Saqer Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "500.00 AED", "noc": "150.00 AED", "final": "20.00 AED" },
  "The Lamar Residence Tower D": { "client": "Al Saqer Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "500.00 AED", "noc": "150.00 AED", "final": "20.00 AED" },
  "The Lamar Residence Townhouse": { "client": "Al Saqer Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "500.00 AED", "noc": "150.00 AED", "final": "20.00 AED" },
  "Torino by ORO24": { "client": "ORO24 Developments", "location": "Dubai", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Water Front Trident": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "35.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Waves Tower-Damac": { "client": "Damac", "location": "Dubai", "bank": "Client", "deposit": "SPC", "online": "Yes", "billing": "45.00 AED", "late": "0.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Westwood By Imtiaz": { "client": "Better Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Yasmina Towers 1": { "client": "Dhafir development", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Yasmina Towers 2": { "client": "Dhafir development", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" }
};

function renderBadge(val) {
    if (!val || val === "-") return "-";
    return `<span class="spc-badge">${val}</span>`;
}

function updateFields(data, towerName = "") {
    const feeFields = ["billing", "late", "activation", "disconnection", "noc", "final"];
    const detailFields = ["location", "bank", "online", "deposit"];
    const depositRow = document.getElementById("deposit_amount").closest('.row');
    const depositVal = document.getElementById("deposit_amount");

    if (data) {
        const clientElem = document.getElementById("client");
        if (clientElem) {
            const clientVal = data["client"] || "-";
            clientElem.innerHTML = `<span class="client-badge">${clientVal}</span>`;
        }

        feeFields.forEach(f => {
            const el = document.getElementById(f);
            if (el) {
                const val = data[f] !== undefined ? data[f] : "-";
                el.innerHTML = renderBadge(val);
            }
        });

        detailFields.forEach(f => {
            const el = document.getElementById(f);
            if (el) {
                const val = data[f] !== undefined ? data[f] : "-";
                el.innerHTML = renderBadge(val);
            }
        });
        
        const lowerName = towerName.toLowerCase();
        
        const isDanube = lowerName.includes("danube") || 
                         lowerName.includes("gemini") || 
                         lowerName.includes("elz") || 
                         lowerName.includes("glamz") || 
                         lowerName.includes("lawnz") || 
                         lowerName.includes("miraclz") || 
                         lowerName.includes("resortz") || 
                         lowerName.includes("starz");

        if (isDanube) {
            depositRow.style.alignItems = "center";
            depositVal.innerHTML = `
                <div class="deposit-badge-container">
                    <div class="deposit-badge-row">
                        <span class="badge-label">Studio & 1BHK:</span>
                        <span class="badge-val">1,000 AED</span>
                    </div>
                    <div class="deposit-badge-row">
                        <span class="badge-label">2BHK:</span>
                        <span class="badge-val">2,000 AED</span>
                    </div>
                    <div class="deposit-badge-row">
                        <span class="badge-label">3BHK+:</span>
                        <span class="badge-val">3,000 AED</span>
                    </div>
                </div>`;
        } else {
            depositRow.style.alignItems = "center";
            if (lowerName.includes("bali")) {
                depositVal.innerHTML = renderBadge("Unit Capacity × 8");
            } else if (lowerName.includes("lamar")) {
                depositVal.innerHTML = renderBadge("1,000 AED (Fixed)");
            } else if (lowerName.includes("maison")) {
                depositVal.innerHTML = renderBadge("Unit Capacity × 62.5 × 8");
            } else if (data.deposit === "SPC for new customer") {
                depositVal.innerHTML = renderBadge("New Customers Only");
            } else if (data.deposit === "Client") {
                depositVal.innerHTML = renderBadge("Client / Owner");
            } else {
                depositVal.innerHTML = renderBadge("Check Prior Account");
            }
        }
    } else {
        const clientElem = document.getElementById("client");
        if (clientElem) clientElem.innerText = "-";
        
        feeFields.concat(detailFields).forEach(f => {
            const el = document.getElementById(f);
            if (el) el.innerText = "-";
        });
        depositRow.style.alignItems = "baseline";
        depositVal.innerText = "-";
    }
}

function handleSelection() {
    const val = document.getElementById("towerInput").value.trim();
    const clearBtn = document.getElementById("clearBtn");
    if (val.length > 0) { clearBtn.style.display = "block"; } else { clearBtn.style.display = "none"; }
    
    if (towersData[val]) {
        updateFields(towersData[val], val);
    } else {
        const matchedKey = Object.keys(towersData).find(key => key.toLowerCase() === val.toLowerCase());
        if (matchedKey) { updateFields(matchedKey, matchedKey); } else { updateFields(null); }
    }
}

function clearSearch() {
    const input = document.getElementById("towerInput");
    if (input) {
        input.value = ""; 
        document.getElementById("clearBtn").style.display = "none"; 
        updateFields(null); 
        input.focus();
    }
}
