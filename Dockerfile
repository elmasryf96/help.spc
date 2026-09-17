FROM python:3.11-slim

# تثبيت LibreOffice والاعتمادية
RUN apt-get update && apt-get install -y \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# تثبيت متصفح Chromium اللي هيستخدمه Playwright + كل الاعتماديات بتاعته
RUN playwright install --with-deps chromium

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "10000"]
