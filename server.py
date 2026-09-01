from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from docxtpl import DocxTemplate
from datetime import datetime
import os
import tempfile

app = FastAPI()

# تفعيل CORS للتواصل مع Frontend
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

@app.post("/generate-noc")
def generate_noc(data: NOCData):
    try:
        # تنسيق التاريخ DD/MM/YYYY
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

            # تعبئة القالب
            doc = DocxTemplate("NOC_Template.docx")
            doc.render(context)
            doc.save(docx_path)

            # محاولة التحويل عبر LibreOffice إذا كان متاحاً على السيرفر
            conversion_success = False
            try:
                import subprocess
                subprocess.run(
                    ["libreoffice", "--headless", "--convert-to", "pdf", docx_path, "--outdir", temp_dir],
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=30
                )
                if os.path.exists(pdf_path):
                    conversion_success = True
            except Exception:
                pass

            # لو بيئة ويندوز محلياً (Fallback)
            if not conversion_success:
                try:
                    import pythoncom
                    from docx2pdf import convert
                    pythoncom.CoInitialize()
                    convert(docx_path, pdf_path)
                    if os.path.exists(pdf_path):
                        conversion_success = True
                except Exception:
                    pass

            # إذا نجح التحويل إلى PDF نرسله، وإلا نرسل ملف Word جاهز ومُعبأ
            if conversion_success and os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    file_bytes = f.read()
                return Response(content=file_bytes, media_type="application/pdf")
            else:
                with open(docx_path, "rb") as f:
                    file_bytes = f.read()
                return Response(
                    content=file_bytes, 
                    media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
