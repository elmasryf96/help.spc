// ============================================================
// 🔄 AUTOMATIC CACHE SYNC MECHANISM & FORCE REFRESH
// ============================================================
const APP_VERSION = "2026.115";
(function checkAppVersion() {
  const savedVersion = localStorage.getItem("spc_app_version");
  if (savedVersion !== APP_VERSION) {
    localStorage.removeItem("spc_towers_data");
    localStorage.removeItem("spc_schedule_data");
    localStorage.removeItem("spc_roster_data");
    localStorage.setItem("spc_app_version", APP_VERSION);
  }
})();

// ============================================================
// 🏢 TOWERS DATA
// ============================================================

const defaultTowersData = {
  "Al Dana Towers": { "client": "ADCP/Nine Yard", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "40.00 AED", "activation": "200.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Al Mamzar Gate": { "client": "H S H Real Estate", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "40.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Al Nuaimiya Tower C": { "client": "Aqaar Community Management", "location": "Ajman", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "150.00 AED" },
  "Al Raha Beach Towers": { "client": "Emirates Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "500.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Al Reem Bay Tower 1": { "client": "FAB Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "28.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "250.00 AED", "noc": "50.00 AED", "final": "25.00 AED" },
  "Al Reem Bay Tower 2": { "client": "FAB Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "28.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "250.00 AED", "noc": "50.00 AED", "final": "25.00 AED" },
  "Al Wifaq Tower": { "client": "ADCP/Nine Yard", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC for new customer", "online": "Yes", "billing": "25.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
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
  "Fairmont Marina Residences": { "client": "National Investment Cooperation", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "maintenance": "7.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "200.00 AED", "noc": "50.00 AED", "final": "30.00 AED" },
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
  "Waves Tower-Damac": { "client": "Damac", "location": "Dubai", "bank": "Client", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "maintenance": "20.00 AED", "late": "0.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Westwood By Imtiaz": { "client": "Better Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Yasmina Towers 1": { "client": "Dhafir development", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Yasmina Towers 2": { "client": "Dhafir development", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" }
};

function loadTowersData() {
  const saved = localStorage.getItem("spc_towers_data");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { console.error("Error loading towersData", e); }
  }
  return JSON.parse(JSON.stringify(defaultTowersData));
}

function saveTowersToStorage() {
  localStorage.setItem("spc_towers_data", JSON.stringify(towersData));
}

let towersData = loadTowersData();

// ============================================================
// 📋 INSPECTION SCHEDULE DATA
// ============================================================

const defaultScheduleData = [
  { day: "Monday", buildings: ["Bali Residence", "Clover Bay", "Glamz By Danube", "H3 By Aurora", "Jewel Of Creek", "Lawnz By Danube", "Maison Vi Residence", "Makeen Residence", "Starz By Danube"] },
  { day: "Tuesday", buildings: ["Condor Marina Star", "Damac Waves Tower", "Discovery Garden 110", "Discovery Garden 111", "Discovery Garden 112", "Discovery Garden 132", "Silverene Tower", "Skyview", "Waterfront", "Westwood"] },
  { day: "Wednesday", buildings: ["Ayedh Tower", "Creek Vistas Grande", "Eastern Star", "Gemini Splendor", "Sobha Waves Tower", "Waves Grande", "Riah Tower", "Olivo Park", "Sway Residence"] },
  { day: "Thursday", buildings: ["Aria Residence", "Elz By Danube", "Miraclz By Danube", "Resortz By Danube", "Torino By Oro24"] },
  { day: "Friday", buildings: ["Binghatti East", "Binghatti West", "Centurion", "Dunes Tower", "Palace Tower", "Pearl Coast", "The 7 By Aurora", "East Coast", "Grosvenor", "Mamzar Gate"] },
  { day: "Saturday", buildings: ["Corniche", "Nuaimiya", "Horizon"] }
];

function loadScheduleData() {
  const saved = localStorage.getItem("spc_schedule_data");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { console.error("Error loading scheduleData", e); }
  }
  return JSON.parse(JSON.stringify(defaultScheduleData));
}

function saveScheduleToStorage() {
  localStorage.setItem("spc_schedule_data", JSON.stringify(scheduleData));
}

let scheduleData = loadScheduleData();

// ============================================================
// 📅 AUGUST 2026 MONTHLY DUTY ROSTER DATA
// ============================================================

const defaultRosterData = [
  { dept: "Calls", lang: "Ara", name: "Shadi", schedule: { 1:"Shift 3", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"OFF+", 8:"Shift 3", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"OFF+", 15:"Shift 3", 16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"OFF+", 22:"Shift 3", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"OFF+", 29:"Shift 3", 30:"Shift 3", 31:"Shift 3" }},
  { dept: "Calls", lang: "Ara", name: "Mirna", schedule: { 1:"OFF+", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"OFF+", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"OFF+", 16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"OFF+", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"OFF+", 30:"Shift 1", 31:"Shift 1" }},
  { dept: "Calls", lang: "Ara", name: "Hanya", schedule: { 1:"Shift 1", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"OFF+", 8:"Shift 1", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"OFF+", 15:"Shift 1", 16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"OFF+", 22:"Shift 1", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"OFF+", 29:"Shift 1", 30:"Shift 1", 31:"Shift 1" }},
  { dept: "Calls", lang: "Ara", name: "Mostafa", schedule: { 1:"OFF+", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"Shift 3", 8:"OFF+", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"Shift 3", 15:"OFF+", 16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"Shift 3", 22:"OFF+", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"Shift 3", 29:"OFF+", 30:"Shift 3", 31:"Shift 3" }},
  { dept: "Calls", lang: "Ara", name: "Salma", schedule: { 1:"Shift 1", 2:"OFF+", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"Shift 1", 9:"OFF+", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"Shift 1", 16:"OFF+", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"Shift 1", 23:"OFF+", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"Shift 1", 30:"OFF+", 31:"Shift 1" }},
  { dept: "Calls", lang: "Eng", name: "Priya", schedule: { 1:"Shift 3", 2:"OFF+", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"Shift 3", 8:"Shift 3", 9:"OFF+", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"Shift 3", 15:"Shift 3", 16:"OFF+", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"Shift 3", 22:"Shift 3", 23:"OFF+", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"Shift 3", 29:"Shift 3", 30:"OFF+", 31:"Shift 3" }},
  { dept: "Calls", lang: "Eng", name: "Saim", schedule: { 1:"Shift 1", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"OFF+", 8:"Shift 1", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"OFF+", 15:"Shift 1", 16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"OFF+", 22:"Shift 1", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"OFF+", 29:"Shift 1", 30:"Shift 1", 31:"Shift 1" }},
  { dept: "Call Outs", lang: "Eng", name: "Janani", schedule: { 1:"Shift 2", 2:"OFF+", 3:"Shift 2", 4:"Shift 2", 5:"Shift 2", 6:"Shift 2", 7:"Shift 2", 8:"Shift 2", 9:"OFF+", 10:"Shift 2", 11:"Shift 2", 12:"Shift 2", 13:"Shift 2", 14:"Shift 2", 15:"Shift 2", 16:"OFF+", 17:"Shift 2", 18:"Shift 2", 19:"Shift 2", 20:"Shift 2", 21:"Shift 2", 22:"Shift 2", 23:"OFF+", 24:"Shift 2", 25:"Shift 2", 26:"Shift 2", 27:"Shift 2", 28:"Shift 2", 29:"Shift 2", 30:"OFF+", 31:"Shift 2" }},
  { dept: "Call Outs", lang: "Ara", name: "Omar", schedule: { 1:"OFF+", 2:"Shift 2", 3:"Shift 2", 4:"Shift 2", 5:"Shift 2", 6:"Shift 2", 7:"Shift 2", 8:"OFF+", 9:"Shift 2", 10:"Shift 2", 11:"Shift 2", 12:"Shift 2", 13:"Shift 2", 14:"Shift 2", 15:"OFF+", 16:"Shift 2", 17:"Shift 2", 18:"Shift 1", 19:"Shift 2", 20:"Shift 2", 21:"Shift 2", 22:"OFF+", 23:"Shift 2", 24:"Shift 2", 25:"Shift 2", 26:"Shift 2", 27:"Shift 2", 28:"Shift 2", 29:"OFF+", 30:"Shift 2", 31:"Shift 2" }},
  { dept: "Emails", lang: "Ara", name: "Faris", schedule: { 1:"OFF+", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"Shift 3", 8:"OFF+", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"Shift 3", 15:"OFF+", 16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"Shift 3", 22:"OFF+", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"Shift 3", 29:"OFF+", 30:"Shift 3", 31:"Shift 3" }},
  { dept: "Emails", lang: "Ara", name: "Ahmed", schedule: { 1:"Shift 3", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"OFF+", 8:"Shift 3", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"OFF+", 15:"Shift 3", 16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"OFF+", 22:"Shift 3", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"OFF+", 29:"Shift 3", 30:"Shift 3", 31:"Shift 3" }},
  { dept: "Emails", lang: "Eng", name: "Waqas", schedule: { 1:"OFF+", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"OFF+", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"OFF+", 16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"OFF+", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"OFF+", 30:"Shift 1", 31:"Shift 1" }},
  { dept: "Emails", lang: "Eng", name: "Zunair", schedule: { 1:"Shift 1", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"OFF+", 8:"Shift 1", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"OFF+", 15:"Shift 2", 16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"OFF+", 22:"Shift 1", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"OFF+", 29:"Shift 1", 30:"Shift 2", 31:"Shift 1" }},
  { dept: "Emails", lang: "Eng", name: "Charles", schedule: { 1:"Shift 1", 2:"OFF+", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"Shift 1", 9:"OFF+", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"Shift 1", 16:"OFF+", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"Shift 1", 23:"OFF+", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"Shift 1", 30:"OFF+", 31:"Shift 1" }}
];

function loadRosterData() {
  const saved = localStorage.getItem("spc_roster_data");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { console.error("Error loading rosterData", e); }
  }
  return JSON.parse(JSON.stringify(defaultRosterData));
}

function saveRosterToStorage() {
  localStorage.setItem("spc_roster_data", JSON.stringify(rosterData));
}

let rosterData = loadRosterData();

// ============================================================
// 🗓 HELPER FUNCTIONS
// ============================================================

function getDayNameShort(dayNumber) {
  const date = new Date(2026, 7, dayNumber);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getDefaultDepositAmountText(towerName) {
  const lowerName = towerName.toLowerCase();
  if (lowerName.includes("centurion")) {
    return "4,000 AED (For Offices)";
  } else if (lowerName.includes("reem bay") || lowerName.includes("torino")) {
    return "No Security Deposit Required by SPC";
  } else if (
    lowerName.includes("gemini") || lowerName.includes("elz") || 
    lowerName.includes("glamz") || lowerName.includes("lawnz") || 
    lowerName.includes("miraclz") || lowerName.includes("resortz") || 
    lowerName.includes("starz")
  ) {
    return "Studio & 1BHK: 1,000 AED\n2BHK: 2,000 AED\n3BHK+: 3,000 AED";
  } else if (lowerName.includes("bali")) {
    return "Capacity charges * 8";
  } else if (lowerName.includes("maison")) {
    return "Unit Capacity * 62.5 * 8";
  } else {
    return "Check prior owner or tenant account";
  }
}

let liveClockInterval = null;
let editingTower = null;
let editingAgent = null;

// ============================================================
// 🔐 LOGIN & AUTHENTICATION (SUPPORT ENTER KEY & PREVENT REFRESH)
// ============================================================

function handleLogin(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("login-error");

  const users = {
    "0": { password: "0", role: "admin" },
    "SPC": { password: "SPC@2026", role: "user" }
  };

  if (Object.prototype.hasOwnProperty.call(users, user) && users[user].password === pass) {
    if (errorMsg) errorMsg.style.display = "none";
    localStorage.setItem("loggedInUser", user);
    localStorage.setItem("userRole", users[user].role);
    navigateTo('home-page');
  } else {
    if (errorMsg) errorMsg.style.display = "block";
  }
}

function handleLogout() {
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  const errorMsg = document.getElementById("login-error");
  if (errorMsg) errorMsg.style.display = "none";
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("userRole");
  clearSearch();
  clearSchedSearch();
  navigateTo('login-page');
}

function isAdmin() {
  return localStorage.getItem("userRole") === "admin";
}

function updateUIForRole() {
  const adminMiniBtn = document.getElementById("adminMiniBtn");
  if (adminMiniBtn) {
    adminMiniBtn.style.display = isAdmin() ? "inline-flex" : "none";
  }
  const addTowerBtn = document.getElementById("directAddTowerBtn");
  if (addTowerBtn) {
    addTowerBtn.style.display = isAdmin() ? "inline-flex" : "none";
  }
}

// ============================================================
// 🧭 NAVIGATION
// ============================================================

function navigateTo(pageId) {
  if (pageId === 'admin-page' && !isAdmin()) {
    alert("⛔ Access Denied! Admin privileges required.");
    return;
  }

  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active-page');
    page.classList.add('hidden-page');
  });

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.remove('hidden-page');
    targetPage.classList.add('active-page');
    
    if (pageId === 'home-page') {
      updateDashboardLiveWidget();
      updateUIForRole();
    } else if (pageId === 'towers-page') {
      updateUIForRole();
      handleSelection();
    } else if (pageId === 'tech-page') {
      renderScheduleCards();
    } else if (pageId === 'roster-page') {
      initRosterPage();
    } else if (pageId === 'admin-page') {
      renderAdminTable();
      renderAdminAgentsTable();
      switchAdminTab('towers');
    }
  }
}

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

document.addEventListener("DOMContentLoaded", () => {
  populateDatalist();
  renderScheduleCards();
  startGlobalLiveClock();
  updateDashboardLiveWidget();
  
  const loggedUser = localStorage.getItem("loggedInUser");
  if (loggedUser) {
    navigateTo('home-page');
  }
});

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
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (!el) return;

      if (userIsAdmin) {
        let val = data[f] !== undefined ? data[f] : "";
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
        el.innerText = data[f] !== undefined ? data[f] : "-";
      }
    });

    const mainRow = document.getElementById("maintenance_row");
    const mainEl = document.getElementById("maintenance");
    if (data.maintenance) {
      if (mainEl) mainEl.innerText = data.maintenance;
      if (mainRow) mainRow.classList.remove("hidden-page");
    } else {
      if (mainRow) mainRow.classList.add("hidden-page");
    }

    const onlineEl = document.getElementById("online");
    if (onlineEl) {
      if (userIsAdmin) {
        onlineEl.innerHTML = `
          <select id="direct_input_online" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold;">
            <option value="Yes" ${data.online === 'Yes' ? 'selected' : ''}>Yes</option>
            <option value="No" ${data.online === 'No' ? 'selected' : ''}>No</option>
          </select>`;
      } else {
        onlineEl.innerText = data.online === "Yes" ? "Yes" : "Bank Transfer or ATM Cash Deposit Only";
      }
    }

    const lowerName = towerName.toLowerCase();
    const depositAmt = document.getElementById("deposit_amount");
    
    if (depositAmt) {
      if (userIsAdmin) {
        let currentVal = (data.deposit_amount !== undefined && data.deposit_amount.trim() !== "") 
          ? data.deposit_amount 
          : getDefaultDepositAmountText(towerName);

        depositAmt.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end; width: 100%;">
            <textarea id="direct_input_deposit_amount" rows="3" placeholder="Enter details line by line..." style="padding: 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold; width: 220px; font-size: 12px; font-family: inherit; resize: vertical;">${currentVal}</textarea>
          </div>
        `;
      } else {
        if (data.deposit_amount && data.deposit_amount.trim() !== "") {
          const lines = data.deposit_amount.split('\n').filter(l => l.trim() !== '');
          if (lines.length > 1) {
            let badgesHTML = lines.map(line => `<div class="val badge-clean" style="margin-bottom: 4px; display: block; text-align: center;">${line.trim()}</div>`).join('');
            depositAmt.innerHTML = `<div class="badge-list">${badgesHTML}</div>`;
          } else {
            depositAmt.innerHTML = `<div class="val badge-clean">${data.deposit_amount}</div>`;
          }
        } else if (lowerName.includes("centurion")) {
          depositAmt.innerHTML = `<div class="val badge-clean">4,000 AED (For Offices)</div>`;
        } else if (lowerName.includes("reem bay") || lowerName.includes("torino")) {
          depositAmt.innerHTML = `<div class="val badge-clean">No Security Deposit Required by SPC</div>`;
        } else if (
          lowerName.includes("gemini") || lowerName.includes("elz") || 
          lowerName.includes("glamz") || lowerName.includes("lawnz") || 
          lowerName.includes("miraclz") || lowerName.includes("resortz") || 
          lowerName.includes("starz")
        ) {
          depositAmt.innerHTML = `
            <div class="badge-list">
              <div class="val badge-row"><span>Studio & 1BHK:</span> <strong>1,000 AED</strong></div>
              <div class="val badge-row"><span>2BHK:</span> <strong>2,000 AED</strong></div>
              <div class="val badge-row"><span>3BHK+:</span> <strong>3,000 AED</strong></div>
            </div>
          `;
        } else if (lowerName.includes("bali")) {
          depositAmt.innerHTML = `<div class="val badge-clean">Capacity charges * 8</div>`;
        } else if (lowerName.includes("maison")) {
          depositAmt.innerHTML = `<div class="val badge-clean">Unit Capacity * 62.5 * 8</div>`;
        } else {
          depositAmt.innerHTML = `<div class="val badge-clean">Check prior owner or tenant account</div>`;
        }
      }
    }
  } else {
    fields.forEach(f => {
      const el = document.getElementById(f);
      if(el) el.innerText = "-";
    });
    const mainRow = document.getElementById("maintenance_row");
    if (mainRow) mainRow.classList.add("hidden-page");
    const onlineEl = document.getElementById("online");
    if (onlineEl) onlineEl.innerText = "-";
    const depositAmt = document.getElementById("deposit_amount");
    if (depositAmt) depositAmt.innerHTML = `<div class="val">-</div>`;
  }
}

function saveDirectTowerChanges() {
  const input = document.getElementById("towerInput");
  if (!input) return;
  const towerName = input.value.trim();
  if (!towerName || !towersData[towerName]) return;

  const data = towersData[towerName];
  const fields = ["client", "location", "bank", "billing", "late", "activation", "disconnection", "noc", "final", "online", "deposit_amount"];

  fields.forEach(f => {
    const el = document.getElementById(`direct_input_${f}`);
    if (el) {
      data[f] = el.value.trim();
    }
  });

  const depositSelect = document.getElementById("direct_input_deposit");
  const customDepositInput = document.getElementById("direct_custom_deposit");
  if (depositSelect) {
    if (depositSelect.value === "CUSTOM" && customDepositInput) {
      data.deposit = customDepositInput.value.trim() || "SPC";
    } else {
      data.deposit = depositSelect.value;
    }
  }

  saveTowersToStorage();
  alert(`✅ All changes for "${towerName}" saved successfully!`);
  handleSelection();
}

function deleteDirectTower() {
  const input = document.getElementById("towerInput");
  if (!input) return;
  const towerName = input.value.trim();
  if (!towerName || !towersData[towerName]) return;

  if (confirm(`⚠️ Are you sure you want to delete "${towerName}" completely?`)) {
    delete towersData[towerName];
    saveTowersToStorage();
    populateDatalist();
    clearSearch();
    alert(`🗑️ Tower "${towerName}" deleted successfully!`);
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
  const userIsAdmin = isAdmin();

  scheduleData.forEach((group) => {
    const dayMatch = group.day.toLowerCase().includes(searchVal);
    const matchedBuildings = group.buildings.filter(b => dayMatch || b.toLowerCase().includes(searchVal));
    
    if (matchedBuildings.length > 0) {
      hasMatches = true;
      const card = document.createElement("div");
      card.className = "day-card";
      let listItemsHTML = "";
      
      matchedBuildings.forEach((b) => {
        const deleteBtnHTML = userIsAdmin 
          ? `<button onclick="deleteBuildingFromSchedule('${group.day}', '${b}')" title="Delete Building" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:12px; margin-left:auto; padding:2px 5px;"><i class="fa-solid fa-trash-can"></i></button>`
          : ``;

        listItemsHTML += `
          <li class="b-item" style="display:flex; align-items:center;">
            <span class="b-no">${globalIndex++}</span>
            <span class="b-name">${b}</span>
            ${deleteBtnHTML}
          </li>`;
      });

      const addBtnHTML = userIsAdmin 
        ? `<button onclick="addBuildingToSchedule('${group.day}')" title="Add Building" style="background:var(--primary-yellow); border:1px solid var(--dark-navy); border-radius:4px; cursor:pointer; font-size:11px; font-weight:800; padding:2px 6px; margin-left:6px;"><i class="fa-solid fa-plus"></i> Add</button>`
        : ``;

      card.innerHTML = `
        <div class="day-card-header">
          <i class="fa-solid fa-calendar-check"></i>
          <h3>${group.day}</h3>
          <span class="count-badge">${matchedBuildings.length} Buildings</span>
          ${addBtnHTML}
        </div>
        <ul class="b-list">${listItemsHTML}</ul>
      `;
      container.appendChild(card);
    } else {
      globalIndex += group.buildings.length;
    }
  });

  if (!hasMatches) {
    container.innerHTML = `<div class="no-sched-results"><i class="fa-solid fa-circle-exclamation"></i><p>No buildings or schedule found matching "${filterText}"</p></div>`;
  }
}

function addBuildingToSchedule(dayName) {
  const buildingName = prompt(`🏗️ Enter building name to add to ${dayName}:`);
  if (!buildingName || buildingName.trim() === "") return;
  const trimmed = buildingName.trim();

  const dayGroup = scheduleData.find(d => d.day.toLowerCase() === dayName.toLowerCase());
  if (dayGroup) {
    if (dayGroup.buildings.some(b => b.toLowerCase() === trimmed.toLowerCase())) {
      alert("⚠️ This building already exists in this day's schedule!");
      return;
    }
    dayGroup.buildings.push(trimmed);
    saveScheduleToStorage();
    renderScheduleCards(document.getElementById("schedSearchInput")?.value || "");
    alert(`✅ "${trimmed}" added to ${dayName} schedule successfully!`);
  }
}

function deleteBuildingFromSchedule(dayName, buildingName) {
  if (confirm(`⚠️ Remove "${buildingName}" from ${dayName} schedule?`)) {
    const dayGroup = scheduleData.find(d => d.day.toLowerCase() === dayName.toLowerCase());
    if (dayGroup) {
      dayGroup.buildings = dayGroup.buildings.filter(b => b !== buildingName);
      saveScheduleToStorage();
      renderScheduleCards(document.getElementById("schedSearchInput")?.value || "");
      alert(`🗑️ "${buildingName}" removed from ${dayName}.`);
    }
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

// ============================================================
// 📅 TIME & ROSTER FUNCTIONS
// ============================================================

function getUAECurrentDate() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const uaeHours = (utcHours + 4) % 24;
  let period = uaeHours >= 12 ? "PM" : "AM";
  let hour12 = uaeHours % 12;
  if (hour12 === 0) hour12 = 12;
  const minute = now.getUTCMinutes();
  const second = now.getUTCSeconds();
  const uaeDateObj = new Date(now.getTime() + (4 * 60 * 60 * 1000));
  const day = uaeDateObj.getUTCDate();
  const month = uaeDateObj.getUTCMonth() + 1;
  const year = uaeDateObj.getUTCFullYear();
  return { year: String(year), month: String(month).padStart(2, '0'), day: String(day).padStart(2, '0'), hour: hour12, hour24: uaeHours, minute: minute, second: second, period: period };
}

function startGlobalLiveClock() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  const updateClock = () => {
    const uae = getUAECurrentDate();
    const secStr = String(uae.second).padStart(2, '0');
    const minStr = String(uae.minute).padStart(2, '0');
    const hrStr = String(uae.hour).padStart(2, '0');
    const clockText = `${hrStr}:${minStr}:${secStr} ${uae.period} (GST)`;
    const clockEl = document.getElementById("uaeClockText");
    if (clockEl) clockEl.innerText = clockText;
    const homeClockEl = document.getElementById("homeClockText");
    if (homeClockEl) homeClockEl.innerText = clockText;
    updateActiveSummary();
    updateDashboardLiveWidget();
  };
  updateClock();
  liveClockInterval = setInterval(updateClock, 1000);
}

function isShiftActiveNow(shiftCode) {
  const uae = getUAECurrentDate();
  const current24Hour = uae.hour24;
  if (shiftCode === "Shift 1" && current24Hour >= 9 && current24Hour < 17) return true;
  if (shiftCode === "Shift 2" && current24Hour >= 11 && current24Hour < 19) return true;
  if (shiftCode === "Shift 3" && current24Hour >= 13 && current24Hour < 21) return true;
  return false;
}

function updateDashboardLiveWidget() {
  const container = document.getElementById("homeActiveAgentsGrid");
  if (!container) return;
  const uae = getUAECurrentDate();
  const dayNum = parseInt(uae.day, 10);
  let activeByTeam = { "Calls": [], "Call Outs": [], "Emails": [] };
  rosterData.forEach(agent => {
    const shift = agent.schedule[dayNum];
    if (shift && shift !== "OFF+" && isShiftActiveNow(shift)) {
      activeByTeam[agent.dept].push({ name: agent.name, shift: shift, lang: agent.lang });
    }
  });
  let html = "";
  const teams = ["Calls", "Call Outs", "Emails"];
  teams.forEach(teamName => {
    const agents = activeByTeam[teamName];
    let agentsPillsHTML = agents.length === 0 ? `<span class="hl-none-text"><i class="fa-solid fa-moon"></i> No active agents</span>` : agents.map(a => `<div class="hl-agent-chip"><span class="hl-chip-name">${a.name}</span><span class="hl-chip-shift">${a.shift}</span></div>`).join('');
    html += `<div class="hl-team-box"><div class="hl-team-title"><div class="hl-tt-left"><i class="fa-solid ${teamName === 'Calls' ? 'fa-headset' : teamName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i><span>${teamName} Team</span></div><span class="hl-team-badge">${agents.length} Active</span></div><div class="hl-team-list">${agentsPillsHTML}</div></div>`;
  });
  container.innerHTML = html;
}

// ============================================================
// 📅 ROSTER PAGE FUNCTIONS
// ============================================================

function initRosterPage() {
  const dateInput = document.getElementById("rosterDateInput");
  const uaeNow = getUAECurrentDate();
  if (dateInput && !dateInput.value) {
    let defaultDay = uaeNow.month === "08" ? uaeNow.day : "15";
    dateInput.value = `2026-08-${String(defaultDay).padStart(2, '0')}`;
  }
  populateAgentDropdown();
  renderRosterView();
  renderFullMonthlyTable();
}

function switchRosterTab(tabKey) {
  document.querySelectorAll(".roster-tab-content").forEach(content => {
    content.classList.add("hidden-tab");
  });
  
  const allTabBtns = document.querySelectorAll(".roster-tabs-bar .tab-btn");
  allTabBtns.forEach(btn => btn.classList.remove("active"));

  if (tabKey === 'live-view') {
    const targetTab = document.getElementById("tab-live-view");
    if (targetTab) targetTab.classList.remove("hidden-tab");
    if (document.getElementById("tabLiveBtn")) document.getElementById("tabLiveBtn").classList.add("active");

  } else if (tabKey === 'agent-view') {
    const targetTab = document.getElementById("tab-agent-view");
    if (targetTab) targetTab.classList.remove("hidden-tab");
    if (document.getElementById("tabAgentBtn")) document.getElementById("tabAgentBtn").classList.add("active");

  } else if (tabKey === 'full-sheet-view') {
    const targetTab = document.getElementById("tab-full-sheet-view");
    if (targetTab) targetTab.classList.remove("hidden-tab");
    if (document.getElementById("tabFullBtn")) document.getElementById("tabFullBtn").classList.add("active");
  }
}

function resetRosterToToday() {
  const dateInput = document.getElementById("rosterDateInput");
  const uae = getUAECurrentDate();
  let dayStr = uae.month === "08" ? uae.day : "15";
  if (dateInput) {
    dateInput.value = `2026-08-${String(dayStr).padStart(2, '0')}`;
    renderRosterView();
  }
}

function renderRosterView() {
  const dateInput = document.getElementById("rosterDateInput");
  if (!dateInput || !dateInput.value) return;
  const dateParts = dateInput.value.split("-");
  const dayNum = parseInt(dateParts[2], 10);
  const container = document.getElementById("rosterDeptContainer");
  if (!container) return;
  container.innerHTML = "";
  const depts = ["Calls", "Call Outs", "Emails"];

  depts.forEach(deptName => {
    const deptAgents = rosterData.filter(a => a.dept === deptName);
    const card = document.createElement("div");
    card.className = "dept-roster-card";
    let rowsHTML = "";
    deptAgents.forEach(agent => {
      const shift = agent.schedule[dayNum] || "OFF+";
      const isActive = isShiftActiveNow(shift);
      let shiftBadgeClass = "shift-off-badge";
      let shiftIcon = `<i class="fa-solid fa-mug-hot"></i>`;
      if (shift === "Shift 1") { shiftBadgeClass = "shift1-badge"; shiftIcon = `<i class="fa-solid fa-sun"></i>`; }
      else if (shift === "Shift 2") { shiftBadgeClass = "shift2-badge"; shiftIcon = `<i class="fa-solid fa-cloud-sun"></i>`; }
      else if (shift === "Shift 3") { shiftBadgeClass = "shift3-badge"; shiftIcon = `<i class="fa-solid fa-moon"></i>`; }
      let livePulseHTML = isActive ? `<span class="live-active-tag"><i class="fa-solid fa-circle"></i> ON DUTY</span>` : ``;
      rowsHTML += `<div class="roster-agent-row ${isActive ? 'highlight-active-agent' : ''}"><div class="agent-profile"><span class="lang-pill ${agent.lang.toLowerCase()}">${agent.lang}</span><span class="agent-name">${agent.name}</span></div><div class="agent-status-wrapper">${livePulseHTML}<span class="shift-badge ${shiftBadgeClass}">${shiftIcon} ${shift}</span></div></div>`;
    });
    card.innerHTML = `<div class="dept-card-header"><i class="fa-solid ${deptName === 'Calls' ? 'fa-headset' : deptName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i><h3>${deptName} Team</h3><span class="dept-count">${deptAgents.length} Agents</span></div><div class="dept-agent-list">${rowsHTML}</div>`;
    container.appendChild(card);
  });
  updateActiveSummary();
}

function updateActiveSummary() {
  const dateInput = document.getElementById("rosterDateInput");
  const summaryContainer = document.getElementById("activeAgentsSummary");
  const summaryTitle = document.getElementById("activeSummaryTitle");
  if (!dateInput || !summaryContainer) return;
  const dateParts = dateInput.value.split("-");
  const dayNum = parseInt(dateParts[2], 10);
  const uae = getUAECurrentDate();
  const isTodaySelected = (dateParts[1] === "08" && dayNum === parseInt(uae.day, 10));
  if (summaryTitle) {
    summaryTitle.innerText = isTodaySelected ? "Active On Shift Right Now (UAE Time)" : `Scheduled Duty Roster for Aug ${dayNum}, 2026`;
  }
  let activeAgentsList = [];
  rosterData.forEach(agent => {
    const shift = agent.schedule[dayNum];
    if (shift && shift !== "OFF+") {
      if (isTodaySelected ? isShiftActiveNow(shift) : true) {
        activeAgentsList.push({ name: agent.name, dept: agent.dept, shift: shift, lang: agent.lang });
      }
    }
  });
  summaryContainer.innerHTML = activeAgentsList.length === 0 ? `<span class="no-active-msg"><i class="fa-solid fa-bed"></i> No agents active on shift at this time.</span>` : activeAgentsList.map(item => `<div class="active-agent-pill"><span class="pill-dept">${item.dept} Team</span><span class="pill-name">${item.name}</span><span class="pill-shift">${item.shift}</span></div>`).join('');
}

// ============================================================
// 👤 AGENT INDIVIDUAL LOOKUP
// ============================================================

function populateAgentDropdown() {
  const dropdown = document.getElementById("agentDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = `<option value="">-- Select Agent Name --</option>`;
  const sortedAgents = [...rosterData].sort((a,b) => a.name.localeCompare(b.name));
  sortedAgents.forEach(agent => {
    let opt = document.createElement("option");
    opt.value = agent.name;
    opt.textContent = `${agent.name} (${agent.dept} Team)`;
    dropdown.appendChild(opt);
  });
}

function clearAgentDateFilter() {
  const dateInput = document.getElementById("agentDateFilter");
  if (dateInput) {
    dateInput.value = "";
    renderAgentLookup();
  }
}

function renderAgentLookup() {
  const dropdown = document.getElementById("agentDropdown");
  const filterDateInput = document.getElementById("agentDateFilter");
  const container = document.getElementById("agentResultContainer");
  if (!dropdown || !container) return;
  const agentName = dropdown.value;
  if (!agentName) {
    container.innerHTML = `<div class="no-sched-results"><i class="fa-solid fa-hand-pointer"></i><p>Please select an agent name above to view their schedule.</p></div>`;
    return;
  }
  const agent = rosterData.find(a => a.name === agentName);
  if (!agent) return;
  let selectedDay = null;
  if (filterDateInput && filterDateInput.value) {
    const parts = filterDateInput.value.split("-");
    selectedDay = parseInt(parts[2], 10);
  }
  let cardsHTML = "";
  for (let day = 1; day <= 31; day++) {
    if (selectedDay !== null && day !== selectedDay) continue;
    const shift = agent.schedule[day] || "OFF+";
    const dayName = getDayNameShort(day);
    let cardClass = "shift-off-card";
    let icon = `<i class="fa-solid fa-bed"></i>`;
    if (shift === "Shift 1") { cardClass = "shift1-card"; icon = `<i class="fa-solid fa-sun"></i>`; }
    else if (shift === "Shift 2") { cardClass = "shift2-card"; icon = `<i class="fa-solid fa-cloud-sun"></i>`; }
    else if (shift === "Shift 3") { cardClass = "shift3-card"; icon = `<i class="fa-solid fa-moon"></i>`; }
    cardsHTML += `<div class="agent-day-card ${cardClass}"><div class="adc-day-number">${day}-Aug (${dayName})</div><div class="adc-shift-type">${icon} ${shift}</div></div>`;
  }
  container.innerHTML = `<div class="agent-info-banner"><div class="aip-left"><span class="lang-pill ${agent.lang.toLowerCase()}">${agent.lang}</span><h2>${agent.name}</h2><span class="team-tag"><i class="fa-solid fa-users"></i> ${agent.dept} Team</span></div><div class="aip-right"><span class="month-label">August 2026 Schedule</span></div></div><div class="agent-days-grid">${cardsHTML}</div>`;
}

// ============================================================
// 📊 FULL MONTHLY TABLE
// ============================================================

function renderFullMonthlyTable() {
  const table = document.getElementById("monthlyRosterTable");
  if (!table) return;
  let headerHTML = `<thead><tr><th class="sticky-col first-col">Team</th><th class="sticky-col second-col">Agent Name</th>`;
  for (let d = 1; d <= 31; d++) {
    const dayName = getDayNameShort(d);
    headerHTML += `<th>${d}-Aug<br><span style="font-size: 9px; opacity: 0.8;">${dayName}</span></th>`;
  }
  headerHTML += `</tr></thead>`;
  let bodyHTML = `<tbody>`;
  const depts = ["Calls", "Call Outs", "Emails"];
  depts.forEach(deptName => {
    const teamAgents = rosterData.filter(a => a.dept === deptName);
    teamAgents.forEach((agent, idx) => {
      bodyHTML += `<tr>`;
      if (idx === 0) {
        bodyHTML += `<td rowspan="${teamAgents.length}" class="sticky-col first-col dept-cell">${deptName} Team</td>`;
      }
      bodyHTML += `<td class="sticky-col second-col name-cell"><strong>${agent.name}</strong> <span class="lang-mini">${agent.lang}</span></td>`;
      for (let d = 1; d <= 31; d++) {
        const shift = agent.schedule[d] || "OFF+";
        let cellClass = "cell-off";
        if (shift === "Shift 1") cellClass = "cell-shift1";
        if (shift === "Shift 2") cellClass = "cell-shift2";
        if (shift === "Shift 3") cellClass = "cell-shift3";
        bodyHTML += `<td class="${cellClass}">${shift}</td>`;
      }
      bodyHTML += `</tr>`;
    });
  });
  bodyHTML += `</tbody>`;
  table.innerHTML = headerHTML + bodyHTML;
}

// ============================================================
// 👑 ADMIN PANEL - TOWERS & SCHEDULE MANAGEMENT
// ============================================================

function switchAdminTab(tab) {
  document.querySelectorAll(".admin-tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.add("hidden-tab"));
  if (tab === 'towers') {
    document.querySelector(".admin-tab-btn:nth-child(1)")?.classList.add("active");
    document.getElementById("admin-tab-towers")?.classList.remove("hidden-tab");
    renderAdminTable();
  } else if (tab === 'agents') {
    document.querySelector(".admin-tab-btn:nth-child(2)")?.classList.add("active");
    document.getElementById("admin-tab-agents")?.classList.remove("hidden-tab");
    renderAdminAgentsTable();
  }
}

function renderAdminTable(filter = "") {
  const table = document.getElementById("adminTowersTable");
  if (!table) return;
  
  const searchTerm = filter.toLowerCase().trim();
  const keys = Object.keys(towersData).filter(name => name.toLowerCase().includes(searchTerm));
  
  if (keys.length === 0) {
    table.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-building-circle-exclamation"></i>No towers found matching "${filter}"</div>`;
    return;
  }
  
  let html = `<thead><tr>
    <th style="min-width:30px;position:sticky;left:0;background:#fffbe6;z-index:6;">#</th>
    <th style="min-width:140px;position:sticky;left:30px;background:#fffbe6;z-index:6;">Tower Name</th>
    <th style="min-width:100px;">Client</th>
    <th style="min-width:80px;">Location</th>
    <th style="min-width:70px;">Bank</th>
    <th style="min-width:120px;">Deposit Refund</th>
    <th style="min-width:130px;">Deposit Amount</th>
    <th style="min-width:60px;">Online</th>
    <th style="min-width:70px;">Billing</th>
    <th style="min-width:70px;">Late</th>
    <th style="min-width:70px;">Activation</th>
    <th style="min-width:70px;">Disconnection</th>
    <th style="min-width:60px;">NOC</th>
    <th style="min-width:60px;">Final</th>
    <th style="min-width:120px;">Actions</th>
  </tr></thead><tbody>`;
  
  keys.forEach((name, index) => {
    const data = towersData[name];
    const isEditing = (editingTower === name);
    
    if (isEditing) {
      let currentDepositAmt = (data.deposit_amount !== undefined && data.deposit_amount.trim() !== "") 
        ? data.deposit_amount 
        : getDefaultDepositAmountText(name);

      html += `<tr>
        <td style="position:sticky;left:0;background:#ffffff;z-index:3;">${index + 1}</td>
        <td style="position:sticky;left:30px;background:#ffffff;z-index:3;"><strong>${name}</strong></td>
        <td><input type="text" id="edit_client" value="${data.client || ''}" style="min-width:80px;"></td>
        <td><select id="edit_location" style="min-width:70px;">
          <option value="Dubai" ${data.location === 'Dubai' ? 'selected' : ''}>Dubai</option>
          <option value="Abudhabi" ${data.location === 'Abudhabi' ? 'selected' : ''}>Abu Dhabi</option>
          <option value="Ajman" ${data.location === 'Ajman' ? 'selected' : ''}>Ajman</option>
        </select></td>
        <td><select id="edit_bank" style="min-width:60px;">
          <option value="SPC" ${data.bank === 'SPC' ? 'selected' : ''}>SPC</option>
          <option value="Client" ${data.bank === 'Client' ? 'selected' : ''}>Client</option>
        </select></td>
        <td>
          <input type="text" id="edit_deposit" value="${data.deposit || ''}" style="min-width:100px;" placeholder="SPC / Client / Custom">
        </td>
        <td><textarea id="edit_deposit_amount" rows="2" style="min-width:130px; background:#fffbe6; border:2px solid #e8d567; font-size:11px; resize:vertical;">${currentDepositAmt}</textarea></td>
        <td><select id="edit_online" style="min-width:55px;">
          <option value="Yes" ${data.online === 'Yes' ? 'selected' : ''}>Yes</option>
          <option value="No" ${data.online === 'No' ? 'selected' : ''}>No</option>
        </select></td>
        <td><input type="text" id="edit_billing" value="${data.billing || ''}" style="min-width:60px;"></td>
        <td><input type="text" id="edit_late" value="${data.late || ''}" style="min-width:60px;"></td>
        <td><input type="text" id="edit_activation" value="${data.activation || ''}" style="min-width:60px;"></td>
        <td><input type="text" id="edit_disconnection" value="${data.disconnection || ''}" style="min-width:60px;"></td>
        <td><input type="text" id="edit_noc" value="${data.noc || ''}" style="min-width:55px;"></td>
        <td><input type="text" id="edit_final" value="${data.final || ''}" style="min-width:55px;"></td>
        <td style="min-width:120px;">
          <button class="btn-save-row" onclick="saveTower('${name}')">💾 Save</button>
          <button class="btn-delete-row" onclick="cancelEditTower()">✖</button>
        </td>
      </tr>`;
    } else {
      let displayDepositAmt = (data.deposit_amount !== undefined && data.deposit_amount.trim() !== "") 
        ? data.deposit_amount 
        : getDefaultDepositAmountText(name);
      
      let depositAmtFormatted = displayDepositAmt.replace(/\n/g, '<br>');

      html += `<tr>
        <td style="position:sticky;left:0;background:#ffffff;z-index:3;">${index + 1}</td>
        <td style="position:sticky;left:30px;background:#ffffff;z-index:3;"><strong>${name}</strong></td>
        <td>${data.client || '-'}</td>
        <td>${data.location || '-'}</td>
        <td>${data.bank || '-'}</td>
        <td><span class="deposit-badge">${data.deposit || '-'}</span></td>
        <td><span class="deposit-badge">${depositAmtFormatted}</span></td>
        <td>${data.online || '-'}</td>
        <td>${data.billing || '-'}</td>
        <td>${data.late || '-'}</td>
        <td>${data.activation || '-'}</td>
        <td>${data.disconnection || '-'}</td>
        <td>${data.noc || '-'}</td>
        <td>${data.final || '-'}</td>
        <td style="min-width:120px;">
          <button class="btn-save-row" onclick="editTower('${name}')">✏️ Edit</button>
          <button class="btn-delete-row" onclick="deleteTower('${name}')">🗑️</button>
        </td>
      </tr>`;
    }
  });
  
  html += `</tbody>`;
  table.innerHTML = html;
}

function editTower(name) {
  editingTower = name;
  renderAdminTable(document.getElementById("adminSearchInput")?.value || "");
}

function cancelEditTower() {
  editingTower = null;
  renderAdminTable(document.getElementById("adminSearchInput")?.value || "");
}

function saveTower(name) {
  const data = towersData[name];
  if (!data) return;
  data.client = document.getElementById("edit_client").value;
  data.location = document.getElementById("edit_location").value;
  data.bank = document.getElementById("edit_bank").value;
  data.deposit = document.getElementById("edit_deposit").value;
  data.deposit_amount = document.getElementById("edit_deposit_amount").value;
  data.online = document.getElementById("edit_online").value;
  data.billing = document.getElementById("edit_billing").value;
  data.late = document.getElementById("edit_late").value;
  data.activation = document.getElementById("edit_activation").value;
  data.disconnection = document.getElementById("edit_disconnection").value;
  data.noc = document.getElementById("edit_noc").value;
  data.final = document.getElementById("edit_final").value;
  editingTower = null;
  saveTowersToStorage();
  renderAdminTable(document.getElementById("adminSearchInput")?.value || "");
  populateDatalist();
  alert(`✅ Tower "${name}" updated successfully!`);
}

function deleteTower(name) {
  if (confirm(`⚠️ Are you sure you want to delete "${name}"?`)) {
    delete towersData[name];
    saveTowersToStorage();
    renderAdminTable(document.getElementById("adminSearchInput")?.value || "");
    populateDatalist();
    alert(`🗑️ Tower "${name}" deleted.`);
  }
}

function showAddTowerForm() {
  const newName = prompt("🏗️ Enter new tower name:");
  if (!newName || newName.trim() === "") return;
  const trimmed = newName.trim();
  if (towersData[trimmed]) {
    alert("⚠️ This tower already exists!");
    return;
  }
  towersData[trimmed] = { client: "", location: "Dubai", bank: "SPC", deposit: "SPC", deposit_amount: "", online: "Yes", billing: "0.00 AED", late: "0.00 AED", activation: "0.00 AED", disconnection: "0.00 AED", noc: "0.00 AED", final: "0.00 AED" };
  saveTowersToStorage();
  populateDatalist();
  const input = document.getElementById("towerInput");
  if (input) {
    input.value = trimmed;
    handleSelection();
  }
  renderAdminTable(document.getElementById("adminSearchInput")?.value || "");
  alert(`✅ Tower "${trimmed}" added! You can now edit its details.`);
}

// ============================================================
// 👑 ADMIN PANEL - AGENTS MANAGEMENT
// ============================================================

function renderAdminAgentsTable(filter = "") {
  const table = document.getElementById("adminAgentsTable");
  if (!table) return;
  const searchTerm = filter.toLowerCase().trim();
  let filteredAgents = rosterData.filter(a => a.name.toLowerCase().includes(searchTerm) || a.dept.toLowerCase().includes(searchTerm));
  if (filteredAgents.length === 0) {
    table.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-users-slash"></i>No agents found matching "${filter}"</div>`;
    return;
  }
  let html = `<thead><tr><th>#</th><th>Name</th><th>Department</th><th>Language</th><th>Schedule (1-31)</th><th>Actions</th></tr></thead><tbody>`;
  filteredAgents.forEach((agent, index) => {
    const isEditing = (editingAgent === agent.name);
    if (isEditing) {
      let schedInputs = "";
      for (let d = 1; d <= 31; d++) {
        const currentShift = agent.schedule[d] || "OFF+";
        schedInputs += `<select id="edit_sched_${d}" style="width:55px;font-size:9px;padding:1px;"><option value="Shift 1" ${currentShift === 'Shift 1' ? 'selected' : ''}>S1</option><option value="Shift 2" ${currentShift === 'Shift 2' ? 'selected' : ''}>S2</option><option value="Shift 3" ${currentShift === 'Shift 3' ? 'selected' : ''}>S3</option><option value="OFF+" ${currentShift === 'OFF+' ? 'selected' : ''}>OFF</option></select>`;
      }
      html += `<tr><td>${index + 1}</td><td><strong>${agent.name}</strong></td><td><select id="edit_dept"><option value="Calls" ${agent.dept === 'Calls' ? 'selected' : ''}>Calls</option><option value="Call Outs" ${agent.dept === 'Call Outs' ? 'selected' : ''}>Call Outs</option><option value="Emails" ${agent.dept === 'Emails' ? 'selected' : ''}>Emails</option></select></td><td><select id="edit_lang"><option value="Ara" ${agent.lang === 'Ara' ? 'selected' : ''}>Ara</option><option value="Eng" ${agent.lang === 'Eng' ? 'selected' : ''}>Eng</option></select></td><td style="min-width:200px;max-width:300px;overflow-x:auto;"><div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center;">${schedInputs}</div></td><td><button class="btn-save-row" onclick="saveAgent('${agent.name}')">💾 Save</button><button class="btn-delete-row" onclick="cancelEditAgent()">✖</button></td></tr>`;
    } else {
      let schedSummary = "";
      for (let d = 1; d <= 31; d++) {
        const shift = agent.schedule[d] || "OFF+";
        let short = shift === "OFF+" ? "⚪" : shift === "Shift 1" ? "🟦" : shift === "Shift 2" ? "🟧" : "🟪";
        schedSummary += `<span title="${d}-Aug: ${shift}" style="display:inline-block;width:16px;font-size:10px;">${short}</span>`;
      }
      html += `<tr><td>${index + 1}</td><td><strong>${agent.name}</strong></td><td>${agent.dept}</td><td><span class="lang-pill ${agent.lang.toLowerCase()}">${agent.lang}</span></td><td style="min-width:200px;max-width:300px;overflow-x:auto;font-size:10px;white-space:nowrap;">${schedSummary}</td><td><button class="btn-save-row" onclick="editAgent('${agent.name}')">✏️ Edit</button><button class="btn-delete-row" onclick="deleteAgent('${agent.name}')">🗑️</button></td></tr>`;
    }
  });
  html += `</tbody>`;
  table.innerHTML = html;
}

function editAgent(name) {
  editingAgent = name;
  renderAdminAgentsTable(document.getElementById("adminAgentSearchInput")?.value || "");
}

function cancelEditAgent() {
  editingAgent = null;
  renderAdminAgentsTable(document.getElementById("adminAgentSearchInput")?.value || "");
}

function saveAgent(name) {
  const agent = rosterData.find(a => a.name === name);
  if (!agent) return;
  agent.dept = document.getElementById("edit_dept").value;
  agent.lang = document.getElementById("edit_lang").value;
  for (let d = 1; d <= 31; d++) {
    const select = document.getElementById(`edit_sched_${d}`);
    if (select) {
      agent.schedule[d] = select.value;
    }
  }
  editingAgent = null;
  saveRosterToStorage();
  renderAdminAgentsTable(document.getElementById("adminAgentSearchInput")?.value || "");
  renderFullMonthlyTable();
  alert(`✅ Agent "${name}" updated successfully!`);
}

function deleteAgent(name) {
  if (confirm(`⚠️ Are you sure you want to delete agent "${name}"?`)) {
    const index = rosterData.findIndex(a => a.name === name);
    if (index !== -1) {
      rosterData.splice(index, 1);
      saveRosterToStorage();
      renderAdminAgentsTable(document.getElementById("adminAgentSearchInput")?.value || "");
      renderFullMonthlyTable();
      populateAgentDropdown();
      alert(`🗑️ Agent "${name}" deleted.`);
    }
  }
}

function showAddAgentForm() {
  const newName = prompt("👤 Enter new agent name:");
  if (!newName || newName.trim() === "") return;
  const trimmed = newName.trim();
  if (rosterData.find(a => a.name === trimmed)) {
    alert("⚠️ This agent already exists!");
    return;
  }
  let defaultSchedule = {};
  for (let d = 1; d <= 31; d++) {
    defaultSchedule[d] = "OFF+";
  }
  rosterData.push({ dept: "Calls", lang: "Ara", name: trimmed, schedule: defaultSchedule });
  saveRosterToStorage();
  renderAdminAgentsTable(document.getElementById("adminAgentSearchInput")?.value || "");
  renderFullMonthlyTable();
  populateAgentDropdown();
  alert(`✅ Agent "${trimmed}" added! You can now edit their schedule.`);
}
