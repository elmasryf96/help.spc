from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from docxtpl import DocxTemplate
from datetime import datetime
import os
import tempfile
import urllib.request
import json

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
    return {"status": "SPC NOC API is live and running!"}

@app.head("/")
def read_root_head():
    return Response(status_code=200)

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

            # 2. التحويل لـ PDF حقيقي عبر API مجاني وسريع جداً (Gotenberg/ConvertAPI/LibreOffice API)
            try:
                # تحويل عبر Gotenberg API أونلاين
                with open(docx_path, 'rb') as f:
                    files = {'files': ('document.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
                    import requests
                    res = requests.post('https://demo.gotenberg.dev/forms/libreoffice/convert', files=files, timeout=30)
                    if res.status_code == 200:
                        with open(pdf_path, 'wb') as pdf_out:
                            pdf_out.write(res.content)
            except Exception as conv_err:
                print("Conversion error:", conv_err)

            # إذا نجح التحويل نرسل الـ PDF
            if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
                with open(pdf_path, "rb") as f:
                    pdf_bytes = f.read()
                return Response(content=pdf_bytes, media_type="application/pdf")
            else:
                raise HTTPException(status_code=500, detail="Could not convert document to PDF")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
