FROM python:3.11-slim-bookworm

# تثبيت LibreOffice + unoconv (unoconv بيكلّم نسخة LibreOffice شغالة في
# الخلفية بدل ما يفتح واحدة جديدة من الصفر لكل ملف - شوف server.py).
# لو unoconv مش متوفرة في نسخة Debian دي لأي سبب، بنكمل من غيرها بدل ما
# نوقف الـ build كله - الكود في server.py أصلاً بيرجع تلقائي للطريقة
# القديمة (فتح LibreOffice من جديد لكل ملف) لو unoconv مش موجودة
RUN apt-get update && apt-get install -y libreoffice \
    && (apt-get install -y unoconv || echo "⚠️ unoconv not available on this base image - will use the slower fallback method instead") \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "10000"]
