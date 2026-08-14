function updateFields(data, towerName = "") {
    const fields = ["client", "location", "bank", "deposit", "online", "billing", "late", "activation", "disconnection", "noc", "final"];
    const depositRow = document.getElementById("deposit_amount").closest('.row');
    const depositVal = document.getElementById("deposit_amount");

    if (data) {
        fields.forEach(f => {
            document.getElementById(f).innerText = data[f] !== undefined ? data[f] : "-";
        });
        
        const lowerName = towerName.toLowerCase();
        
        // 🏰 Danube Towers Check
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
            depositRow.style.alignItems = "baseline";
            if (lowerName.includes("lamar")) {
                depositVal.innerText = "1,000 AED (Fixed for all units)";
            } else if (lowerName.includes("maison")) {
                depositVal.innerHTML = `<span style="background: #e8f4fd; color: #1e88e5; border: 1px solid #90caf9; padding: 4px 12px; border-radius: 6px; font-weight: 800; font-size: 13px;">Unit Capacity × 62.5 × 8</span>`;
            } else if (data.deposit === "SPC for new customer") {
                depositVal.innerText = "Collect deposit (New Customers Only)";
            } else if (data.deposit === "Client") {
                depositVal.innerText = "Handled Directly by Client / Owner";
            } else {
                depositVal.innerText = "Check the prior owner or tenant account";
            }
        }
    } else {
        fields.forEach(f => document.getElementById(f).innerText = "-");
        depositRow.style.alignItems = "baseline";
        depositVal.innerText = "-";
    }
}
