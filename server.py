import os
import subprocess
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from docxtpl import DocxTemplate

app = FastAPI()

# 🌐 إضافة CORS Middleware للسماح للفرونت إند بالاتصال بالباك إند
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models Definition
class TenantNocRequest(BaseModel):
    tenant_name: str
    tower_name: str
    unit_no: str
    tenant_contract: str
    noc_date: str
    owner_name: str = "N/A"
    owner_contract: str = "N/A"

class OwnerNocRequest(BaseModel):
    owner_name: str
    owner_contract: str
    new_owner_name: str
    new_owner_contract: str
    tower_name: str
    unit_no: str
    noc_date: str

class RentNocRequest(BaseModel):
    owner_name: str
    owner_contract: str
    tower_name: str
    unit_no: str
    noc_date: str

class MoveInClearanceRequest(BaseModel):
    account_holder_name: str
    account_type: str
    tower_name: str
    unit_no: str
    spc_account_no: str
    noc_date: str

@app.get("/")
def read_root():
    return {"status": "Backend is online and running!"}

# Helper function to convert Docx to PDF
def convert_and_return_pdf(doc_template: str, context: dict, unit_no: str, prefix: str):
    if not os.path.exists(doc_template):
        print(f"❌ Template file '{doc_template}' not found!")
        raise HTTPException(status_code=500, detail=f"Template file '{doc_template}' not found on server!")

    doc = DocxTemplate(doc_template)
    doc.render(context)

    clean_unit = "".join(c for c in unit_no if c.isalnum() or c in ('-', '_'))
    temp_docx = f"temp_{prefix}_{clean_unit}.docx"
    doc.save(temp_docx)

    cmd = f"libreoffice --headless --convert-to pdf {temp_docx} --outdir ."
    subprocess.run(cmd, shell=True, check=True)

    generated_pdf = temp_docx.replace(".docx", ".pdf")

    if os.path.exists(temp_docx):
        os.remove(temp_docx)

    return FileResponse(
        generated_pdf, 
        media_type="application/pdf", 
        filename=f"{prefix}_{clean_unit}.pdf"
    )

@app.post("/generate-noc")
async def generate_noc(data: TenantNocRequest):
    try:
        formatted_date = data.noc_date
        if "-" in data.noc_date:
            parts = data.noc_date.split("-")
            if len(parts) == 3 and len(parts[0]) == 4:
                formatted_date = f"{parts[2]}-{parts[1]}-{parts[0]}"

        owner_name_clean = (data.owner_name or "N/A").strip()
        owner_contract_clean = (data.owner_contract or "N/A").strip()

        # Context شامل يغطي جميع احتمالات التسمية داخل قالب Word
        context = {
            "noc_date": formatted_date,
            "date": formatted_date,
            "Date": formatted_date,
            "tower_name": data.tower_name,
            "unit_no": data.unit_no,
            "building_name": data.tower_name,
            "unit_number": data.unit_no,
            "tenant_name": (data.tenant_name or "").upper(),
            "customer_name": (data.tenant_name or "").upper(),
            "tenant_contract": data.tenant_contract,
            "contract_no": data.tenant_contract,
            "contract_number": data.tenant_contract,
            "owner_name": owner_name_clean.upper() if owner_name_clean else "N/A",
            "owner_consumer_name": owner_name_clean.upper() if owner_name_clean else "N/A",
            "owner_contract": owner_contract_clean if owner_contract_clean else "N/A",
            "owner_contract_no": owner_contract_clean if owner_contract_clean else "N/A"
        }

        return convert_and_return_pdf("NOC_Template.docx", context, data.unit_no, "Tenant_NOC")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-owner-noc")
async def generate_owner_noc(data: OwnerNocRequest):
    try:
        formatted_date = data.noc_date
        if "-" in data.noc_date:
            parts = data.noc_date.split("-")
            if len(parts) == 3 and len(parts[0]) == 4:
                formatted_date = f"{parts[2]}-{parts[1]}-{parts[0]}"

        context = {
            "noc_date": formatted_date,
            "date": formatted_date,
            "Date": formatted_date,
            "owner_name": (data.owner_name or "").upper(),
            "customer_name": (data.owner_name or "").upper(),
            "owner_contract": data.owner_contract,
            "contract_no": data.owner_contract,
            "new_owner_name": (data.new_owner_name or "").upper(),
            "new_owner_contract": data.new_owner_contract,
            "tower_name": data.tower_name,
            "unit_no": data.unit_no
        }

        return convert_and_return_pdf("NOC_Owner_Template.docx", context, data.unit_no, "Owner_NOC")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-rent-noc")
async def generate_rent_noc(data: RentNocRequest):
    try:
        formatted_date = data.noc_date
        if "-" in data.noc_date:
            parts = data.noc_date.split("-")
            if len(parts) == 3 and len(parts[0]) == 4:
                formatted_date = f"{parts[2]}-{parts[1]}-{parts[0]}"

        context = {
            "noc_date": formatted_date,
            "date": formatted_date,
            "Date": formatted_date,
            "owner_name": (data.owner_name or "").upper(),
            "customer_name": (data.owner_name or "").upper(),
            "owner_contract": data.owner_contract,
            "contract_no": data.owner_contract,
            "tower_name": data.tower_name,
            "unit_no": data.unit_no
        }

        return convert_and_return_pdf("NOC_Rent_Template.docx", context, data.unit_no, "Rent_NOC")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-move-in-clearance")
async def generate_move_in_clearance(data: MoveInClearanceRequest):
    try:
        formatted_date = data.noc_date
        if "-" in data.noc_date:
            parts = data.noc_date.split("-")
            if len(parts) == 3 and len(parts[0]) == 4:
                formatted_date = f"{parts[2]}-{parts[1]}-{parts[0]}"

        context = {
            "noc_date": formatted_date,
            "date": formatted_date,
            "Date": formatted_date,
            "account_holder_name": (data.account_holder_name or "").upper(),
            "customer_name": (data.account_holder_name or "").upper(),
            "account_type": (data.account_type or "").upper(),
            "tower_name": data.tower_name,
            "unit_no": data.unit_no,
            "spc_account_no": data.spc_account_no
        }

        return convert_and_return_pdf("Move_In_Clearance_Template.docx", context, data.unit_no, "Move_In_Clearance")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
