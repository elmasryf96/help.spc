import os
import re
import asyncio
import subprocess
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from docxtpl import DocxTemplate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {"status": "Backend is online and running!"}

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

        context = {
            "DATE": formatted_date,
            "TOWER": data.tower_name,
            "UNIT": data.unit_no,
            "TENANT_NAME": (data.tenant_name or "").upper(),
            "TENANT_CONTRACT": data.tenant_contract,
            "OWNER_NAME": owner_name_clean.upper() if owner_name_clean != "N/A" else "N/A",
            "OWNER_CONTRACT": owner_contract_clean if owner_contract_clean != "N/A" else "N/A"
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
            "DATE": formatted_date,
            "TOWER": data.tower_name,
            "UNIT": data.unit_no,
            "OWNER_NAME": (data.owner_name or "").upper(),
            "OWNER_CONTRACT": data.owner_contract,
            "NEW_OWNER_NAME": (data.new_owner_name or "").upper(),
            "NEW_OWNER_CONTRACT": data.new_owner_contract
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
            "DATE": formatted_date,
            "TOWER": data.tower_name,
            "UNIT": data.unit_no,
            "OWNER_NAME": (data.owner_name or "").upper(),
            "OWNER_CONTRACT": data.owner_contract
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
            "account_holder_name": (data.account_holder_name or "").upper(),
            "account_type": (data.account_type or "").upper(),
            "tower_name": data.tower_name,
            "unit_no": data.unit_no,
            "spc_account_no": data.spc_account_no
        }
        return convert_and_return_pdf("Move_In_Clearance_Template.docx", context, data.unit_no, "Move_In_Clearance")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 📞 3CX LIVE AGENT STATUS
# محتاج تضيف الـ Environment Variables دي في Render:
#   THREECX_FQDN      -> smartcollection.3cx.ae:5001
#   THREECX_USERNAME  -> رقم الإيجستنشن المستخدم للمراقبة (حالياً 106)
#   THREECX_PASSWORD  -> باسورد نفس الإيجستنشن
# (فيه قيمة افتراضية في الكود لو نسيت تضيفهم، بس الأفضل تضيفهم على Render)
# ============================================================

THREECX_FQDN = os.environ.get("THREECX_FQDN", "smartcollection.3cx.ae:5001")
THREECX_USERNAME = os.environ.get("THREECX_USERNAME", "106")
THREECX_PASSWORD = os.environ.get("THREECX_PASSWORD", "Lara@@2110")

# رقم الإيجستنشن في 3CX -> الاسم زي ما هو في الروستر
# (أي حد في 3CX مش موجود هنا بيتجاهل تلقائياً)
AGENT_MAP = {
    "100": "Charles",
    "101": "Shadi",
    "102": "Mirna",
    "104": "Janani",
    "110": "Waqas",
    "112": "Hanya",
    "114": "Faris",
    "115": "Ahmed",
    "116": "Zunair",
    "117": "Priya",
    "118": "Omar",
    "119": "Salma",
    "125": "Mostafa",
    "126": "Saim",
    "127": "Zain",
    "128": "Fatemeh",
    "129": "Hajra",
    "123": "Gulsher",
    "122": "Sana",
    "121": "Minhaj",
}


import time

_token_cache = {"token": None, "expires_at": 0}


async def get_3cx_token(client: httpx.AsyncClient) -> str:
    # لو عندنا توكن لسه صالح لأكتر من 5 دقايق، نستخدمه زي ما هو
    if _token_cache["token"] and time.time() < _token_cache["expires_at"] - 300:
        return _token_cache["token"]

    login_resp = await client.post(
        f"https://{THREECX_FQDN}/webclient/api/Login/GetAccessToken",
        json={"Username": THREECX_USERNAME, "Password": THREECX_PASSWORD, "SecurityCode": ""},
        headers={"Content-Type": "application/json", "Ngsw-Bypass": "bypass"},
    )
    login_resp.raise_for_status()
    token_data = login_resp.json()["Token"]
    _token_cache["token"] = token_data["access_token"]
    _token_cache["expires_at"] = time.time() + token_data.get("expires_in", 3600)
    return _token_cache["token"]


async def get_3cx_agent_status():
    async with httpx.AsyncClient(timeout=15) as client:
        token = await get_3cx_token(client)

        query_url = (
            f"https://{THREECX_FQDN}/xapi/v1/Users"
            "?$select=Number,DisplayName,CurrentProfileName,QueueStatus"
            "&$expand=ForwardingProfiles($select=Name,CustomName)"
        )

        users_resp = await client.get(query_url, headers={"Authorization": f"Bearer {token}"})

        # لو التوكن رفضه بشكل غير متوقع (Expired/Revoked)، نجدده مرة واحدة ونعيد المحاولة
        if users_resp.status_code == 401:
            _token_cache["token"] = None
            token = await get_3cx_token(client)
            users_resp = await client.get(query_url, headers={"Authorization": f"Bearer {token}"})

        users_resp.raise_for_status()
        users = users_resp.json()["value"]

    result = []
    for u in users:
        number = u.get("Number")
        if number not in AGENT_MAP:
            continue

        current_profile = u.get("CurrentProfileName")
        display_status = current_profile

        # نبحث في ملفات التوجيه بتاعة نفس الإيجنت عن الاسم المخصص اللي حطه هو بنفسه
        for profile in (u.get("ForwardingProfiles") or []):
            if profile.get("Name") == current_profile:
                custom_name = (profile.get("CustomName") or "").strip()
                if custom_name:
                    display_status = custom_name
                break

        result.append({
            "name": AGENT_MAP[number],
            "number": number,
            "status": display_status,
            "rawStatus": current_profile,
            "queueStatus": u.get("QueueStatus"),
        })
    return result


@app.get("/api/agent-status")
async def agent_status():
    try:
        return await get_3cx_agent_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"3CX fetch failed: {e}")


# ------------------------------------------------------------
# 🔴 مراقبة لحظية للتغييرات + تسجيلها فوراً في الشيت
# ------------------------------------------------------------

# آخر حالة معروفة لكل إيجنت (في الذاكرة، بتتصفر لو السيرفر عمل Restart)
_last_known_status = {}

AGENT_STATUS_POLL_SECONDS = 10


async def log_status_change_to_sheet(client: httpx.AsyncClient, name, number, old_status, new_status):
    try:
        sheet_url = os.environ["GOOGLE_SHEET_API_URL"]
        payload = {
            "action": "logAgentStatusChange",
            "name": name,
            "number": number,
            "oldStatus": old_status or "-",
            "newStatus": new_status,
        }
        await client.post(sheet_url, json=payload, timeout=30)
    except Exception as e:
        print(f"❌ فشل تسجيل تغيير حالة {name}: {e}")


async def agent_status_watcher():
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            try:
                agents = await get_3cx_agent_status()
                for agent in agents:
                    key = agent["number"]
                    new_status = agent["status"]
                    old_status = _last_known_status.get(key)

                    if old_status is not None and old_status != new_status:
                        await log_status_change_to_sheet(
                            client, agent["name"], key, old_status, new_status
                        )

                    _last_known_status[key] = new_status
            except Exception as e:
                print(f"❌ خطأ في مراقبة حالة 3CX: {e}")

            await asyncio.sleep(AGENT_STATUS_POLL_SECONDS)


@app.on_event("startup")
async def start_agent_status_watcher():
    asyncio.create_task(agent_status_watcher())


# ============================================================
# 🔄 CONTRACT SYNC — نسخة سريعة بطلبات متوازية (Concurrent)
# محتاج تضيف الـ Environment Variables دي في Render:
#   SC_USERNAME          -> يوزرنيم بورتال الفوترة
#   SC_PASSWORD          -> باسورد بورتال الفوترة
#   GOOGLE_SHEET_API_URL  -> نفس رابط الـ Apps Script Web App اللي في script.js
#   SYNC_SECRET          -> أي كلمة سر تختارها إنت، لحماية الرابط من أي حد يشغله غيرك
# ============================================================

BILLING_BASE_URL = "https://billing.smartcollection.co"
SYNC_PAGE_SIZE = 200
SYNC_CONCURRENCY = 8  # وسط بين السرعة واستهلاك الذاكرة (الرام لسه 512MB حتى بعد الترقية)


async def sync_login(client: httpx.AsyncClient):
    payload = {
        "ReturnUrl": "",
        "ClientTimeDiff": "4",
        "Username": os.environ["SC_USERNAME"],
        "Password": os.environ["SC_PASSWORD"],
        "RememberMe": "false"
    }
    resp = await client.post(f"{BILLING_BASE_URL}/Account/Login/Login", data=payload)
    if resp.status_code >= 400 and not resp.cookies:
        raise Exception(f"فشل تسجيل الدخول: {resp.status_code}")


def decode_entities(s: str) -> str:
    return s.replace("&#x2B;", "+").replace("&amp;", "&").strip()


def parse_customer_blocks(html: str):
    blocks = html.split('<div class="kt-portlet">')
    results = []
    for block in blocks[1:]:
        name_match = re.search(r'kt-widget__username">\s*([^<]+?)\s*<span>\s*-\s*([^<]+?)</span>', block)
        if not name_match:
            continue
        id_match = re.search(r'Customers/Manage/(\d+)', block)
        email_match = re.search(r'data-email="([^"]*)"', block)
        phone_match = re.search(r'data-phone="([^"]*)"', block)
        tower_match = re.search(r'<b>Property:</b></label>&nbsp;\s*<label>([^<]*)</label>', block)
        unit_match = re.search(r'<b>Property Unit No:</b></label>&nbsp;\s*<label>([^<]*)</label>', block)
        out_match = re.search(r'kt-widget__title">Outstanding</span>\s*<span class="kt-widget__value">([^<]*)</span>', block)

        results.append({
            "tower": tower_match.group(1).strip() if tower_match else "",
            "contractNo": name_match.group(2).strip(),
            "unitNo": unit_match.group(1).strip() if unit_match else "",
            "name": name_match.group(1).strip(),
            "email": decode_entities(email_match.group(1)) if email_match else "",
            "phone": decode_entities(phone_match.group(1)) if phone_match else "",
            "outstanding": out_match.group(1).strip() if out_match else "",
            "customerId": id_match.group(1) if id_match else ""
        })
    return results


async def fetch_list_page(client: httpx.AsyncClient, page: int) -> str:
    url = f"{BILLING_BASE_URL}/AdminPortal/Customers/GetList"
    params = {
        "pageid": page, "pagesize": SYNC_PAGE_SIZE,
        "PropertyId": "", "ContractID": "", "PropertyUnitId": "",
        "CustomerName": "", "Email": "", "Status": "All", "ShowActive": "true"
    }
    resp = await client.get(url, params=params, headers={"X-Requested-With": "XMLHttpRequest"})
    return resp.text


def total_pages_from_html(html: str):
    m = re.search(r'Total\s+(\d+)\s+results', html)
    if not m:
        return None
    return -(-int(m.group(1)) // SYNC_PAGE_SIZE)  # قسمة لأعلى


async def fetch_tower_unit_fallback(client: httpx.AsyncClient, customer_id: str, contract_no: str):
    try:
        manage_url = f"{BILLING_BASE_URL}/AdminPortal/Customers/Manage/{customer_id}"
        manage_html = (await client.get(manage_url)).text

        id_match = re.search(
            r"GetContract\('(\d+)'\)[\s\S]{0,150}?" + re.escape(contract_no),
            manage_html
        )
        if not id_match:
            return None
        internal_id = id_match.group(1)

        resp = await client.post(
            f"{BILLING_BASE_URL}/AdminPortal/Customers/GetContractAsync",
            data={"id": internal_id}
        )
        data = resp.json()
        contract = data.get("contract")
        if not contract:
            return None

        units = contract.get("contractUnits") or []
        if not units:
            return None
        unit = units[0].get("propertyUnit") or {}
        tower = (unit.get("property") or {}).get("name", "")
        unit_no = unit.get("unitNo", "")
        return {"tower": tower, "unitNo": unit_no}
    except Exception:
        return None


async def fetch_payment_link(client: httpx.AsyncClient, contract_no: str) -> str:
    try:
        url = f"{BILLING_BASE_URL}/AdminPortal/Customers/GetInvoiceList"
        params = {
            "pageid": 1, "pagesize": 1, "PropertyId": "", "ContractNo": contract_no,
            "PropertyUnitId": 0, "Status": 0, "InvoiceStatus": 0, "SortedBy": 0
        }
        resp = await client.get(url, params=params, headers={"X-Requested-With": "XMLHttpRequest"})
        html = resp.text

        status_match = re.search(r'text-center">\s*(?:<span[^>]*>)?\s*(Not Paid|Partially Paid|Paid)', html, re.I)
        if status_match and status_match.group(1).strip().lower() == "paid":
            return ""

        link_match = re.search(r'Billing/DirectPayment/Index/([^"\']+)', html)
        if not link_match:
            return ""
        return f"{BILLING_BASE_URL}/Billing/DirectPayment/Index/{link_match.group(1)}"
    except Exception:
        return ""


def is_outstanding_nonzero(text: str) -> bool:
    cleaned = re.sub(r'[^\d.\-]', '', text or "")
    try:
        return float(cleaned) != 0
    except ValueError:
        return False


async def process_contract(client: httpx.AsyncClient, semaphore: asyncio.Semaphore, r: dict):
    async with semaphore:
        if (not r["tower"] or not r["unitNo"]) and r["customerId"]:
            fallback = await fetch_tower_unit_fallback(client, r["customerId"], r["contractNo"])
            if fallback:
                if not r["tower"] and fallback["tower"]:
                    r["tower"] = fallback["tower"]
                if not r["unitNo"] and fallback["unitNo"]:
                    r["unitNo"] = fallback["unitNo"]

        payment_link = ""
        if is_outstanding_nonzero(r["outstanding"]):
            payment_link = await fetch_payment_link(client, r["contractNo"])

        return {
            "tower": r["tower"], "contractNo": r["contractNo"], "unitNo": r["unitNo"],
            "name": r["name"], "email": r["email"], "phone": r["phone"],
            "outstanding": r["outstanding"], "paymentLink": payment_link
        }


async def push_batch_to_sheet(client: httpx.AsyncClient, rows: list):
    sheet_url = os.environ["GOOGLE_SHEET_API_URL"]
    payload = {"action": "bulkUpsertContracts", "rows": rows}
    await client.post(sheet_url, json=payload, timeout=120)


sync_status = {"running": False, "totalPages": 0, "pagesDone": 0, "message": "لسه ما بدأش"}


async def run_sync_job():
    sync_status["running"] = True
    sync_status["message"] = "بدأ تسجيل الدخول..."
    sync_status["pagesDone"] = 0

    try:
        async with httpx.AsyncClient(
        timeout=30,
        follow_redirects=False,
        limits=httpx.Limits(max_connections=15, max_keepalive_connections=5)
    ) as client:
            await sync_login(client)

            first_page_html = await fetch_list_page(client, 1)
            total_pages = total_pages_from_html(first_page_html) or 1
            sync_status["totalPages"] = total_pages
            sync_status["message"] = f"شغال... 0 / {total_pages} صفحة"

            semaphore = asyncio.Semaphore(SYNC_CONCURRENCY)
            page_batch_size = 1  # صفحة واحدة في المرة، عشان نتحكم في الذاكرة (الرام لسه 512MB)
            all_page_numbers = list(range(1, total_pages + 1))

            for batch_start in range(0, len(all_page_numbers), page_batch_size):
                batch_pages = all_page_numbers[batch_start:batch_start + page_batch_size]

                page_htmls = await asyncio.gather(*[
                    fetch_list_page(client, p) if p != 1 else asyncio.sleep(0, result=first_page_html)
                    for p in batch_pages
                ])

                all_rows = []
                for html in page_htmls:
                    parsed = await asyncio.to_thread(parse_customer_blocks, html)
                    all_rows.extend(parsed)
                    del html

                processed = await asyncio.gather(*[
                    process_contract(client, semaphore, r) for r in all_rows
                ])

                await push_batch_to_sheet(client, processed)
                del all_rows, processed, page_htmls  # تنضيف الذاكرة بين كل صفحة والتانية

                sync_status["pagesDone"] = min(batch_start + page_batch_size, total_pages)
                sync_status["message"] = f"شغال... {sync_status['pagesDone']} / {total_pages} صفحة"

                await asyncio.sleep(0)  # نديله فرصة يستجيب لأي طلب تاني جاي (زي فحوصات Render الصحية)

        sync_status["message"] = f"✅ خلص! تمت معالجة {sync_status['totalPages']} صفحة بالكامل."
    except Exception as e:
        import traceback
        traceback.print_exc()
        sync_status["message"] = f"❌ حصل خطأ: {str(e)}"
    finally:
        sync_status["running"] = False


@app.get("/sync-contracts")
async def sync_contracts(secret: str = ""):
    if secret != os.environ.get("SYNC_SECRET", ""):
        return {"status": "error", "message": "Unauthorized"}

    if sync_status["running"]:
        return {"status": "already_running", "detail": sync_status}

    asyncio.create_task(run_sync_job())
    return {"status": "started", "message": "السينك بدأ يشتغل في الخلفية. استخدم /sync-status عشان تتابع."}


@app.get("/sync-status")
async def get_sync_status(secret: str = ""):
    if secret != os.environ.get("SYNC_SECRET", ""):
        return {"status": "error", "message": "Unauthorized"}
    return sync_status
