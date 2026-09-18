FROM python:3.11-slim

# تثبيت LibreOffice والاعتمادية
# + خطوط Carlito/Caladea (بديل مطابق تمامًا في المقاسات لخطوط Calibri/Cambria اللي
#   قوالب الـ NOC مبنية عليها) - من غيرهم LibreOffice بيستبدلهم بخط تاني عرضه مختلف
#   شوية، وده كان بيخلي الأسماء الطويلة تاخد سطر زيادة وتدفع صفحة الـ PDF كلها لصفحة تانية
RUN apt-get update && apt-get install -y \
    libreoffice \
    fonts-crosextra-carlito \
    fonts-crosextra-caladea \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# تثبيت متصفح Chromium اللي هيستخدمه Playwright + كل الاعتماديات بتاعته
RUN playwright install --with-deps chromium

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "10000"]
