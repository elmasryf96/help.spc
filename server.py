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

class MoveInClearanceRequest(BaseModel):
    account_holder_name: str
    account_type: str
    tower_name: str
    unit_no: str
    spc_account_no: str
    noc_date: str

@app.post("/generate-move-in-clearance")
async def generate_move_in_clearance(data: MoveInClearanceRequest):
    try:
        template_path = "Move_In_Clearance_Template.docx"
        if not os.path.exists(template_path):
            raise HTTPException(status_code=500, detail="Move-in template file not found on server!")

        doc = DocxTemplate(template_path)
        
        # تنسيق التاريخ ليظهر بالشكل DD-MM-YYYY
        formatted_date = data.noc_date
        if "-" in data.noc_date:
            parts = data.noc_date.split("-")
            if len(parts) == 3 and len(parts[0]) == 4:
                formatted_date = f"{parts[2]}-{parts[1]}-{parts[0]}"

        context = {
            "noc_date": formatted_date,
            "account_holder_name": data.account_holder_name.upper(),
            "account_type": data.account_type.upper(),
            "tower_name": data.tower_name,
            "unit_no": data.unit_no,
            "spc_account_no": data.spc_account_no
        }

        doc.render(context)
        
        temp_docx = f"temp_movein_{data.unit_no}.docx"
        doc.save(temp_docx)

        # تحويل Docx إلى PDF باستخدام LibreOffice على Render
        cmd = f"libreoffice --headless --convert-to pdf {temp_docx} --outdir ."
        subprocess.run(cmd, shell=True, check=True)

        generated_pdf = temp_docx.replace(".docx", ".pdf")

        if os.path.exists(temp_docx):
            os.remove(temp_docx)

        return FileResponse(
            generated_pdf, 
            media_type="application/pdf", 
            filename=f"Move_In_Clearance_{data.unit_no}.pdf"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
