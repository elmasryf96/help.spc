from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from docxtpl import DocxTemplate
from datetime import datetime
import os
import tempfile
import subprocess

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NOCData(BaseModel):
    tenant_name: str
    tower_name: str
    unit_no: str
    tenant_contract: str
    noc_date: str
    owner_name: str
    owner_contract: str

@app.get("/")
def read_root():
    return {"status": "SPC NOC API is active"}

@app.post("/generate-noc")
def generate_noc(data: NOCData):
    try:
        try:
            date_obj = datetime.strptime(data.noc_date, "%Y-%m-%d")
            formatted_date = date_obj.strftime("%d/%m/%Y")
        except Exception:
            formatted_date = data.noc_date

        context = {
            'TENANT_NAME': data.tenant_name,
            'TOWER': data.tower_name,
            'UNIT': data.unit_no,
            'TENANT_CONTRACT': data.tenant_contract,
            'DATE': formatted_date,
            'OWNER_NAME': data.owner_name,
            'OWNER_CONTRACT': data.owner_contract
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            docx_path = os.path.join(temp_dir, "temp_noc.docx")
            pdf_path = os.path.join(temp_dir, "temp_noc.pdf")

            # 1. تعبئة القالب
            doc = DocxTemplate("NOC_Template.docx")
            doc.render(context)
            doc.save(docx_path)

            # 2. التحويل لـ PDF باستخدام LibreOffice على سيرفر Linux
            cmd = ["libreoffice", "--headless", "--convert-to", "pdf", docx_path, "--outdir", temp_dir]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            if not os.path.exists(pdf_path):
                raise Exception("PDF conversion failed")

            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()

        return Response(content=pdf_bytes, media_type="application/pdf")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
