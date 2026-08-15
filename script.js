const towersData = {
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

// 📋 Inspection Schedule Data
const scheduleData = [
  { day: "Monday", buildings: ["Bali Residence", "Clover Bay", "Glamz By Danube", "H3 By Aurora", "Jewel Of Creek", "Lawnz By Danube", "Maison Vi Residence", "Makeen Residence", "Starz By Danube"] },
  { day: "Tuesday", buildings: ["Condor Marina Star", "Damac Waves Tower", "Discovery Garden 110", "Discovery Garden 111", "Discovery Garden 112", "Discovery Garden 132", "Silverene Tower", "Skyview", "Waterfront", "Westwood"] },
  { day: "Wednesday", buildings: ["Ayedh Tower", "Creek Vistas Grande", "Eastern Star", "Gemini Splendor", "Sobha Waves Tower", "Waves Grande", "Riah Tower", "Olivo Park", "Sway Residence"] },
  { day: "Thursday", buildings: ["Aria Residence", "Elz By Danube", "Miraclz By Danube", "Resortz By Danube", "Torino By Oro24"] },
  { day: "Friday", buildings: ["Binghatti East", "Binghatti West", "Centurion", "Dunes Tower", "Palace Tower", "Pearl Coast", "The 7 By Aurora", "East Coast", "Grosvenor", "Mamzar Gate"] },
  { day: "Saturday", buildings: ["Corniche", "Nuaimiya", "Horizon"] }
];

// 📅 AUGUST 2026 Monthly Duty Roster Data (Accurately Corrected Days Off)
// SATURDAYS (السبت): 1, 8, 15, 22, 29
// SUNDAYS (الأحد): 2, 9, 16, 23, 30
// FRIDAYS (الجمعة): 7, 14, 21, 28
const rosterData = [
  // CALLS TEAM
  { dept: "Calls", lang: "Ara", name: "Shadi", schedule: {
    1:"Shift 3", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"OFF+", 8:"Shift 3", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"OFF+", 15:"Shift 3",
    16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"OFF+", 22:"Shift 3", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"OFF+", 29:"Shift 3", 30:"Shift 3", 31:"Shift 3"
  }},
  { dept: "Calls", lang: "Ara", name: "Mirna", schedule: {
    1:"OFF+", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"OFF+", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"OFF+",
    16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"OFF+", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"OFF+", 30:"Shift 1", 31:"Shift 1"
  }},
  { dept: "Calls", lang: "Ara", name: "Hanya", schedule: {
    1:"Shift 1", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"OFF+", 8:"Shift 1", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"OFF+", 15:"Shift 1",
    16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"OFF+", 22:"Shift 1", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"OFF+", 29:"Shift 1", 30:"Shift 1", 31:"Shift 1"
  }},
  { dept: "Calls", lang: "Ara", name: "Mostafa", schedule: {
    1:"OFF+", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"Shift 3", 8:"OFF+", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"Shift 3", 15:"OFF+",
    16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"Shift 3", 22:"OFF+", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"Shift 3", 29:"OFF+", 30:"Shift 3", 31:"Shift 3"
  }},
  { dept: "Calls", lang: "Ara", name: "Salma", schedule: {
    1:"Shift 1", 2:"OFF+", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"Shift 1", 9:"OFF+", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"Shift 1",
    16:"OFF+", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"Shift 1", 23:"OFF+", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"Shift 1", 30:"OFF+", 31:"Shift 1"
  }},
  // Priya: Off Every Sunday (2, 9, 16, 23, 30)
  { dept: "Calls", lang: "Eng", name: "Priya", schedule: {
    1:"Shift 3", 2:"OFF+", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"Shift 3", 8:"Shift 3", 9:"OFF+", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"Shift 3", 15:"Shift 3",
    16:"OFF+", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"Shift 3", 22:"Shift 3", 23:"OFF+", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"Shift 3", 29:"Shift 3", 30:"OFF+", 31:"Shift 3"
  }},
  { dept: "Calls", lang: "Eng", name: "Saim", schedule: {
    1:"Shift 1", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"OFF+", 8:"Shift 1", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"OFF+", 15:"Shift 1",
    16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"OFF+", 22:"Shift 1", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"OFF+", 29:"Shift 1", 30:"Shift 1", 31:"Shift 1"
  }},

  // CALL OUTS TEAM
  // Janani: Off Every Sunday (2, 9, 16, 23, 30)
  { dept: "Call Outs", lang: "Eng", name: "Janani", schedule: {
    1:"Shift 2", 2:"OFF+", 3:"Shift 2", 4:"Shift 2", 5:"Shift 2", 6:"Shift 2", 7:"Shift 2", 8:"Shift 2", 9:"OFF+", 10:"Shift 2", 11:"Shift 2", 12:"Shift 2", 13:"Shift 2", 14:"Shift 2", 15:"Shift 2",
    16:"OFF+", 17:"Shift 2", 18:"Shift 2", 19:"Shift 2", 20:"Shift 2", 21:"Shift 2", 22:"Shift 2", 23:"OFF+", 24:"Shift 2", 25:"Shift 2", 26:"Shift 2", 27:"Shift 2", 28:"Shift 2", 29:"Shift 2", 30:"OFF+", 31:"Shift 2"
  }},
  // Omar: Off Every Saturday (1, 8, 15, 22, 29)
  { dept: "Call Outs", lang: "Ara", name: "Omar", schedule: {
    1:"OFF+", 2:"Shift 2", 3:"Shift 2", 4:"Shift 2", 5:"Shift 2", 6:"Shift 2", 7:"Shift 2", 8:"OFF+", 9:"Shift 2", 10:"Shift 2", 11:"Shift 2", 12:"Shift 2", 13:"Shift 2", 14:"Shift 2", 15:"OFF+",
    16:"Shift 2", 17:"Shift 2", 18:"Shift 2", 19:"Shift 2", 20:"Shift 2", 21:"Shift 2", 22:"OFF+", 23:"Shift 2", 24:"Shift 2", 25:"Shift 2", 26:"Shift 2", 27:"Shift 2", 28:"Shift 2", 29:"OFF+", 30:"Shift 2", 31:"Shift 2"
  }},

  // EMAILS TEAM
  // Faris: Off Every Saturday (1, 8, 15, 22, 29)
  { dept: "Emails", lang: "Ara", name: "Faris", schedule: {
    1:"OFF+", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"Shift 3", 8:"OFF+", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"Shift 3", 15:"OFF+",
    16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"Shift 3", 22:"OFF+", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"Shift 3", 29:"OFF+", 30:"Shift 3", 31:"Shift 3"
  }},
  // Ahmed: Off Every Friday (7, 14, 21, 28)
  { dept: "Emails", lang: "Ara", name: "Ahmed", schedule: {
    1:"Shift 3", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"OFF+", 8:"Shift 3", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"OFF+", 15:"Shift 3",
    16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"OFF+", 22:"Shift 3", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"OFF+", 29:"Shift 3", 30:"Shift 3", 31:"Shift 3"
  }},
  // Waqas: Off Every Saturday (1, 8, 15, 22, 29)
  { dept: "Emails", lang: "Eng", name: "Waqas", schedule: {
    1:"OFF+", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"OFF+", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"OFF+",
    16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"OFF+", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"OFF+", 30:"Shift 1", 31:"Shift 1"
  }},
  // Zunair: Off Every Friday (7, 14, 21, 28)
  { dept: "Emails", lang: "Eng", name: "Zunair", schedule: {
    1:"Shift 1", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"OFF+", 8:"Shift 1", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"OFF+", 15:"Shift 2",
    16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"OFF+", 22:"Shift 1", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"OFF+", 29:"Shift 1", 30:"Shift 2", 31:"Shift 1"
  }},
  // Charles: Off Every Sunday (2, 9, 16, 23, 30)
  { dept: "Emails", lang: "Eng", name: "Charles", schedule: {
    1:"Shift 1", 2:"OFF+", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"Shift 1", 9:"OFF+", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"Shift 1",
    16:"OFF+", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"Shift 1", 23:"OFF+", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"Shift 1", 30:"OFF+", 31:"Shift 1"
  }}
];

let liveClockInterval = null;

function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("login-error");

    if (user === "SPC" && pass === "SPC@2026") {
        errorMsg.style.display = "none";
        navigateTo('home-page');
    } else {
        errorMsg.style.display = "block";
    }
}

function handleLogout() {
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("login-error").style.display = "none";
    clearSearch();
    clearSchedSearch();
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
        
        if (pageId === 'home-page') {
            updateDashboardLiveWidget();
        } else if (pageId === 'tech-page') {
            renderScheduleCards();
        } else if (pageId === 'roster-page') {
            initRosterPage();
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const datalist = document.getElementById("towersList");
    if (datalist) {
        Object.keys(towersData).sort().forEach(tower => {
            let option = document.createElement("option");
            option.value = tower;
            datalist.appendChild(option);
        });
    }

    renderScheduleCards();
    startGlobalLiveClock();
    updateDashboardLiveWidget();
});

// --- TECHNICAL DEPARTMENT SCHEDULE FUNCTIONS ---
function renderScheduleCards(filterText = "") {
    const container = document.getElementById("schedGridContainer");
    if (!container) return;

    container.innerHTML = "";
    const searchVal = filterText.toLowerCase().trim();
    let globalIndex = 1;
    let hasMatches = false;

    scheduleData.forEach((group) => {
        const dayMatch = group.day.toLowerCase().includes(searchVal);
        
        const matchedBuildings = group.buildings.filter(b => 
            dayMatch || b.toLowerCase().includes(searchVal)
        );

        if (matchedBuildings.length > 0) {
            hasMatches = true;

            const card = document.createElement("div");
            card.className = "day-card";

            let listItemsHTML = "";
            matchedBuildings.forEach((b) => {
                listItemsHTML += `
                    <li class="b-item">
                        <span class="b-no">${globalIndex++}</span>
                        <span class="b-name">${b}</span>
                    </li>
                `;
            });

            card.innerHTML = `
                <div class="day-card-header">
                    <i class="fa-solid fa-calendar-check"></i>
                    <h3>${group.day}</h3>
                    <span class="count-badge">${matchedBuildings.length} Buildings</span>
                </div>
                <ul class="b-list">
                    ${listItemsHTML}
                </ul>
            `;

            container.appendChild(card);
        } else {
            globalIndex += group.buildings.length;
        }
    });

    if (!hasMatches) {
        container.innerHTML = `
            <div class="no-sched-results">
                <i class="fa-solid fa-circle-exclamation"></i>
                <p>No buildings or schedule found matching "${filterText}"</p>
            </div>
        `;
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

// --- MASTER DATA FUNCTIONS ---
function updateFields(data, towerName = "") {
    const fields = ["client", "location", "bank", "deposit", "billing", "late", "activation", "disconnection", "noc", "final"];
    if (data) {
        fields.forEach(f => {
            const el = document.getElementById(f);
            if(el) el.innerText = data[f] !== undefined ? data[f] : "-";
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
            if (data.online === "Yes") {
                onlineEl.innerText = "Yes";
            } else {
                onlineEl.innerText = "Bank Transfer or ATM Cash Deposit Only";
            }
        }

        const lowerName = towerName.toLowerCase();
        const depositAmt = document.getElementById("deposit_amount");
        
        if (depositAmt) {
            if (lowerName.includes("centurion")) {
                depositAmt.innerHTML = `<div class="val badge-clean">4,000 AED (For Offices)</div>`;
            } else if (
                lowerName.includes("reem bay") || 
                lowerName.includes("torino")
            ) {
                depositAmt.innerHTML = `<div class="val badge-clean">No Security Deposit Required by SPC</div>`;
            } else if (
                lowerName.includes("gemini") || 
                lowerName.includes("elz") || 
                lowerName.includes("glamz") || 
                lowerName.includes("lawnz") || 
                lowerName.includes("miraclz") || 
                lowerName.includes("resortz") || 
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
        if (matchedKey) { 
            updateFields(towersData[matchedKey], matchedKey); 
        } else { 
            updateFields(null); 
        }
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

// --- 📅 TIME & DUTY ROSTER MODULE FUNCTIONS ---

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

    return { 
        year: String(year), 
        month: String(month).padStart(2, '0'), 
        day: String(day).padStart(2, '0'), 
        hour: hour12, 
        hour24: uaeHours,
        minute: minute, 
        second: second,
        period: period 
    };
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

// --- 🏠 DASHBOARD LIVE WIDGET UPDATE ---
function updateDashboardLiveWidget() {
    const container = document.getElementById("homeActiveAgentsGrid");
    if (!container) return;

    const uae = getUAECurrentDate();
    const dayNum = parseInt(uae.day, 10);

    let activeByTeam = { "Calls": [], "Call Outs": [], "Emails": [] };

    rosterData.forEach(agent => {
        const shift = agent.schedule[dayNum];
        if (shift && shift !== "OFF+") {
            if (isShiftActiveNow(shift)) {
                activeByTeam[agent.dept].push({ name: agent.name, shift: shift, lang: agent.lang });
            }
        }
    });

    let html = "";
    const teams = ["Calls", "Call Outs", "Emails"];

    teams.forEach(teamName => {
        const agents = activeByTeam[teamName];
        let agentsPillsHTML = "";

        if (agents.length === 0) {
            agentsPillsHTML = `<span class="hl-none-text"><i class="fa-solid fa-moon"></i> No active agents</span>`;
        } else {
            agents.forEach(a => {
                agentsPillsHTML += `
                    <div class="hl-agent-chip">
                        <span class="hl-chip-name">${a.name}</span>
                        <span class="hl-chip-shift">${a.shift}</span>
                    </div>
                `;
            });
        }

        html += `
            <div class="hl-team-box">
                <div class="hl-team-title">
                    <div class="hl-tt-left">
                        <i class="fa-solid ${teamName === 'Calls' ? 'fa-headset' : teamName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i>
                        <span>${teamName} Team</span>
                    </div>
                    <span class="hl-team-badge">${agents.length} Active</span>
                </div>
                <div class="hl-team-list">
                    ${agentsPillsHTML}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// --- 📅 ROSTER PAGE FUNCTIONS ---

function initRosterPage() {
    const dateInput = document.getElementById("rosterDateInput");
    const uaeNow = getUAECurrentDate();

    if (dateInput) {
        if (!dateInput.value) {
            let defaultDay = uaeNow.month === "08" ? uaeNow.day : "15";
            dateInput.value = `2026-08-${String(defaultDay).padStart(2, '0')}`;
        }
    }

    populateAgentDropdown();
    renderRosterView();
    renderFullMonthlyTable();
}

function switchRosterTab(tabKey) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".roster-tab-content").forEach(c => c.classList.add("hidden-tab"));

    if (tabKey === 'live-view') {
        document.getElementById("tabLiveBtn").classList.add("active");
        document.getElementById("tab-live-view").classList.remove("hidden-tab");
    } else if (tabKey === 'agent-view') {
        document.getElementById("tabAgentBtn").classList.add("active");
        document.getElementById("tab-agent-view").classList.remove("hidden-tab");
    } else if (tabKey === 'full-sheet-view') {
        document.getElementById("tabFullBtn").classList.add("active");
        document.getElementById("tab-full-sheet-view").classList.remove("hidden-tab");
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

            rowsHTML += `
                <div class="roster-agent-row ${isActive ? 'highlight-active-agent' : ''}">
                    <div class="agent-profile">
                        <span class="lang-pill ${agent.lang.toLowerCase()}">${agent.lang}</span>
                        <span class="agent-name">${agent.name}</span>
                    </div>
                    <div class="agent-status-wrapper">
                        ${livePulseHTML}
                        <span class="shift-badge ${shiftBadgeClass}">${shiftIcon} ${shift}</span>
                    </div>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="dept-card-header">
                <i class="fa-solid ${deptName === 'Calls' ? 'fa-headset' : deptName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i>
                <h3>${deptName} Team</h3>
                <span class="dept-count">${deptAgents.length} Agents</span>
            </div>
            <div class="dept-agent-list">
                ${rowsHTML}
            </div>
        `;

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
            const activeNow = isTodaySelected ? isShiftActiveNow(shift) : true;
            if (activeNow) {
                activeAgentsList.push({ name: agent.name, dept: agent.dept, shift: shift, lang: agent.lang });
            }
        }
    });

    summaryContainer.innerHTML = "";

    if (activeAgentsList.length === 0) {
        summaryContainer.innerHTML = `<span class="no-active-msg"><i class="fa-solid fa-bed"></i> No agents active on shift at this time.</span>`;
        return;
    }

    activeAgentsList.forEach(item => {
        const tag = document.createElement("div");
        tag.className = "active-agent-pill";
        tag.innerHTML = `
            <span class="pill-dept">${item.dept} Team</span>
            <span class="pill-name">${item.name}</span>
            <span class="pill-shift">${item.shift}</span>
        `;
        summaryContainer.appendChild(tag);
    });
}

// --- 👤 AGENT INDIVIDUAL LOOKUP MODULE ---

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
        container.innerHTML = `
            <div class="no-sched-results">
                <i class="fa-solid fa-hand-pointer"></i>
                <p>Please select an agent name above to view their schedule.</p>
            </div>
        `;
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
        let cardClass = "shift-off-card";
        let icon = `<i class="fa-solid fa-bed"></i>`;

        if (shift === "Shift 1") { cardClass = "shift1-card"; icon = `<i class="fa-solid fa-sun"></i>`; }
        else if (shift === "Shift 2") { cardClass = "shift2-card"; icon = `<i class="fa-solid fa-cloud-sun"></i>`; }
        else if (shift === "Shift 3") { cardClass = "shift3-card"; icon = `<i class="fa-solid fa-moon"></i>`; }

        cardsHTML += `
            <div class="agent-day-card ${cardClass}">
                <div class="adc-day-number">Aug ${day}</div>
                <div class="adc-shift-type">${icon} ${shift}</div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="agent-info-banner">
            <div class="aip-left">
                <span class="lang-pill ${agent.lang.toLowerCase()}">${agent.lang}</span>
                <h2>${agent.name}</h2>
                <span class="team-tag"><i class="fa-solid fa-users"></i> ${agent.dept} Team</span>
            </div>
            <div class="aip-right">
                <span class="month-label">August 2026 Schedule</span>
            </div>
        </div>
        <div class="agent-days-grid">
            ${cardsHTML}
        </div>
    `;
}

// --- 📊 FULL MONTHLY ROSTER TABLE MODULE ---

function renderFullMonthlyTable() {
    const table = document.getElementById("monthlyRosterTable");
    if (!table) return;

    let headerHTML = `
        <thead>
            <tr>
                <th class="sticky-col first-col">Team</th>
                <th class="sticky-col second-col">Agent Name</th>
    `;
    for (let d = 1; d <= 31; d++) {
        headerHTML += `<th>${d}-Aug</th>`;
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
