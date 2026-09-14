FROM python:3.11-slim

# تثبيت LibreOffice + unoconv (unoconv بيكلّم نسخة LibreOffice شغالة في
# الخلفية بدل ما يفتح واحدة جديدة من الصفر لكل ملف - شوف server.py)
RUN apt-get update && apt-get install -y \
    libreoffice \
    unoconv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "10000"]
