import os
import re
import uuid
import asyncio
import calendar
import subprocess
import shutil
import httpx
from typing import Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
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

_pdf_lock = asyncio.Lock()  # تحويل واحد بس في نفس الوقت - LibreOffice تقيل جدًا على 512MB


async def _release_shared_browser():
    """بيقفل Chromium المشترك قبل تحويل الـ PDF عشان يفضّي رامات (بيتفتح تاني لوحده لما يتطلب)."""
    async with _shared_browser_lock:
        browser = _shared_browser_state["browser"]
        if browser is not None:
            try:
                await browser.close()
            except Exception:
                pass
            _shared_browser_state["browser"] = None


async def convert_and_return_pdf(doc_template: str, context: dict, unit_no: str, prefix: str):
    if not os.path.exists(doc_template):
        print(f"❌ Template file '{doc_template}' not found!")
        raise HTTPException(status_code=500, detail=f"Template file '{doc_template}' not found on server!")

    clean_unit = "".join(c for c in unit_no if c.isalnum() or c in ('-', '_'))

    async with _pdf_lock:
        # كان الكراش (Out of memory) بيحصل هنا: LibreOffice + Chromium مع بعض فوق 512MB،
        # وكمان subprocess.run القديم كان بيوقف السيرفر كله (كل الطلبات التانية) أثناء التحويل
        await _release_shared_browser()

        job_id = uuid.uuid4().hex[:8]
        temp_docx = f"temp_{prefix}_{clean_unit}_{job_id}.docx"
        temp_pdf = temp_docx[:-5] + ".pdf"
        profile_dir = f"/tmp/lo_profile_{job_id}"

        try:
            doc = DocxTemplate(doc_template)
            doc.render(context)
            doc.save(temp_docx)

            proc = await asyncio.create_subprocess_exec(
                "libreoffice",
                f"-env:UserInstallation=file://{profile_dir}",
                "--headless",
                "--convert-to", "pdf",
                temp_docx,
                "--outdir", ".",
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            try:
                await asyncio.wait_for(proc.wait(), timeout=90)
            except asyncio.TimeoutError:
                proc.kill()
                raise HTTPException(status_code=504, detail="تحويل الـ PDF أخد وقت أكتر من اللازم")

            if proc.returncode != 0 or not os.path.exists(temp_pdf):
                raise HTTPException(status_code=500, detail="فشل تحويل الملف إلى PDF")

            with open(temp_pdf, "rb") as f:
                pdf_bytes = f.read()
        finally:
            for path in (temp_docx, temp_pdf):
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception:
                    pass
            shutil.rmtree(profile_dir, ignore_errors=True)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{prefix}_{clean_unit}.pdf"'},
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
        return await convert_and_return_pdf("NOC_Template.docx", context, data.unit_no, "Tenant_NOC")
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
        return await convert_and_return_pdf("NOC_Owner_Template.docx", context, data.unit_no, "Owner_NOC")
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
        return await convert_and_return_pdf("NOC_Rent_Template.docx", context, data.unit_no, "Rent_NOC")
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
        return await convert_and_return_pdf("Move_In_Clearance_Template.docx", context, data.unit_no, "Move_In_Clearance")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 🌐 بورتال الفوترة (billing.smartcollection.co) - تسجيل دخول بمتصفح حقيقي (Playwright)
# محتاج تضيف الـ Environment Variables دي في Render:
#   SC_USERNAME  -> يوزر بورتال الفوترة (زي faris.e@smartcollection.co)
#   SC_PASSWORD  -> باسورد نفس الحساب
# ============================================================

SC_USERNAME = os.environ.get("SC_USERNAME", "")
SC_PASSWORD = os.environ.get("SC_PASSWORD", "")
PORTAL_BASE_URL = "https://billing.smartcollection.co"

# فلاجز تشغيل كروميوم بأقل استهلاك ممكن للرامات - مهمة جدًا لأن السيرفر شغال على
# خطة Render بحد أقصى 512MB. من غيرها + من غير المتصفح المشترك تحت، كان السيرفر
# بيطلع بره حد الذاكرة ويعمل Crash Loop (Render Event: "Ran out of memory")
LOW_MEMORY_CHROMIUM_ARGS = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-sync",
    "--disable-translate",
    "--metrics-recording-only",
    "--mute-audio",
    "--no-first-run",
    "--safebrowsing-disable-auto-update",
    "--js-flags=--max-old-space-size=128",
]

# نسخة واحدة مشتركة (بروسيس Chromium واحد بس) يستخدمها كل من Panel Scraper (3CX)
# وتسجيل دخول بورتال الفوترة، كل واحد فاتح Context/Page منفصلة جواه بدل ما كل
# واحد منهم يفتح بروسيس Chromium كامل لوحده - ده أكبر توفير ممكن للرامات، لأن
# معظم استهلاك المتصفح بيكون في البروسيس الرئيسي (Browser + GPU process) نفسه
# مش في كل Context لوحدها. ده اللي كان بيخلينا نوصل لحد الـ 512MB لما الاتنين
# كانوا بيفتحوا بروسيس منفصل في نفس اللحظة.
_shared_browser_state = {"playwright": None, "browser": None, "browser_started_at": 0}
_shared_browser_lock = asyncio.Lock()

# نعيد فتح المتصفح المشترك من الصفر كل ساعة حتى لو مفيش أي خطأ - أي متصفح شغال
# لفترة طويلة جدًا ممكن استهلاكه للرامات "يزحف" لوحده مع الوقت
SHARED_BROWSER_MAX_AGE_SECONDS = 60 * 60


async def _get_shared_browser():
    """بيرجع نسخة المتصفح المشتركة، وبيفتح واحدة جديدة لو مفيش، أو لو قديمة، أو لو اتقفلت/كراشت."""
    from playwright.async_api import async_playwright

    async with _shared_browser_lock:
        if _shared_browser_state["playwright"] is None:
            _shared_browser_state["playwright"] = await async_playwright().start()

        browser = _shared_browser_state["browser"]
        browser_too_old = (
            browser is not None
            and time.time() - _shared_browser_state["browser_started_at"] > SHARED_BROWSER_MAX_AGE_SECONDS
        )
        browser_dead = browser is not None and not browser.is_connected()

        if browser is None or browser_too_old or browser_dead:
            if browser is not None:
                try:
                    await browser.close()
                except Exception:
                    pass
            _shared_browser_state["browser"] = await _shared_browser_state["playwright"].chromium.launch(
                headless=True,
                args=LOW_MEMORY_CHROMIUM_ARGS,
            )
            _shared_browser_state["browser_started_at"] = time.time()

        return _shared_browser_state["browser"]


# ============================================================
# 📋 عقود البورتال (Live Contract Dropdown للـ NOC Generator)
# بيستخدم نفس تسجيل الدخول بتاع Playwright، بس مرة واحدة بس ويحتفظ بالجلسة
# (كوكي) في الذاكرة - أي استعلام بعد كده بيبقى طلب HTTP عادي وسريع، من غير
# ما نفتح متصفح تاني إلا لما الجلسة تنتهي.
# ============================================================

_portal_session_cache = {"cookie": None, "obtained_at": 0}
PORTAL_SESSION_MAX_AGE_SECONDS = 15 * 60  # نجدد الجلسة تلقائي كل 15 دقيقة كحد أقصى


async def get_portal_session_cookie(force_refresh: bool = False) -> str:
    now = time.time()
    if (
        not force_refresh
        and _portal_session_cache["cookie"]
        and now - _portal_session_cache["obtained_at"] < PORTAL_SESSION_MAX_AGE_SECONDS
    ):
        return _portal_session_cache["cookie"]

    if not SC_USERNAME or not SC_PASSWORD:
        raise HTTPException(
            status_code=500,
            detail="لازم تضيف SC_USERNAME و SC_PASSWORD في Environment Variables على Render",
        )

    # بنستخدم المتصفح المشترك (نفس بروسيس Panel Scraper) بدل ما نفتح بروسيس Chromium
    # كامل لوحدنا - وبنفتح Page (ومعاها Context ضمنية) بس، وبنقفلها هي لوحدها في الآخر
    # (مش المتصفح كله) عشان الـ Panel Scraper يفضل شغال من غير ما يتأثر
    browser = await _get_shared_browser()
    page = await browser.new_page()
    try:
        # مانحتاجش صور/خطوط/ميديا للوجن - بنمنعها عشان نقلل استهلاك الرامات
        await page.route(
            "**/*",
            lambda route: route.abort()
            if route.request.resource_type in ("image", "media", "font")
            else route.continue_(),
        )
        await page.goto(f"{PORTAL_BASE_URL}/Account/Login", wait_until="load", timeout=30000)
        await page.wait_for_selector('input[name="Username"]', timeout=15000)
        await page.fill('input[name="Username"]', SC_USERNAME)
        await page.fill('input[name="Password"]', SC_PASSWORD)
        submit_btn = page.locator(
            '#form-login button[type="submit"], #form-login input[type="submit"]'
        )
        if await submit_btn.count() > 0:
            await submit_btn.first.click()
        else:
            await page.locator('input[name="Password"]').press("Enter")
        await page.wait_for_timeout(3000)

        if "Account/Login" in page.url:
            raise HTTPException(
                status_code=502,
                detail="فشل تسجيل الدخول على بورتال الفوترة (تأكد من SC_USERNAME/SC_PASSWORD في Render)",
            )

        cookies = await page.context.cookies()
        session_cookie = next(
            (c for c in cookies if c["name"] == ".AspNetCore.Session"), None
        )
        if not session_cookie:
            raise HTTPException(
                status_code=502,
                detail="سجل دخول بس مفيش كوكي جلسة (.AspNetCore.Session) راجع من البورتال",
            )

        cookie_value = f'.AspNetCore.Session={session_cookie["value"]}'
        _portal_session_cache["cookie"] = cookie_value
        _portal_session_cache["obtained_at"] = time.time()
        return cookie_value
    finally:
        await page.context.close()


async def portal_authenticated_request(
    method: str, path: str, params: dict = None, data: dict = None, retry: bool = True
) -> httpx.Response:
    """
    بيبعت طلب HTTP لأي صفحة/endpoint في بورتال الفوترة مستخدم الجلسة المحفوظة -
    ولو لقى الجلسة منتهية بيجدد الكوكي ويجرب تاني مرة واحدة بس.
    """
    cookie = await get_portal_session_cookie()
    url = f"{PORTAL_BASE_URL}{path}"
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        if method == "POST":
            resp = await client.post(url, data=data, headers={"Cookie": cookie})
        else:
            resp = await client.get(url, params=params, headers={"Cookie": cookie})

    session_expired = "Account/Login" in str(resp.url) or 'id="form-login"' in resp.text
    if session_expired:
        if retry:
            await get_portal_session_cookie(force_refresh=True)
            return await portal_authenticated_request(method, path, params=params, data=data, retry=False)
        raise HTTPException(status_code=502, detail="الجلسة مع بورتال الفوترة انتهت ومقدرناش نجددها")

    return resp


async def fetch_customers_html(tower: str, contract: str = "") -> str:
    """بيجيب صفحة الـ Customers مفلترة بتاور (واختياريًا رقم عقد معين كمان)، من غير متصفح."""
    # البورتال بيستخدم اسم التاور بـ underscore بدل المسافات في الفلتر (Property=Starz_By_Danube)،
    # ولو بعتنا المسافات بيتجاهل فلتر العقد وبيرجّع أول صفحة من عملاء التاور كلهم
    params = {"page": "1", "Property": re.sub(r"\s+", "_", (tower or "").strip())}
    if contract:
        params["Contract"] = contract
    resp = await portal_authenticated_request("GET", "/AdminPortal/Customers", params=params)
    return resp.text


async def fetch_contract_numbers(property_id: str) -> list:
    """
    بيرجع كل أرقام العقود لتاور معين (property_id = الرقم الداخلي بتاعه) - بيستخدم
    نفس الـ endpoint اللي البورتال نفسه بيستخدمه لملء قايمة "Contract No" القابلة
    للبحث، فمفيش أي حد أقصى على عدد النتايج (عكس صفحة الـ Customers العادية).
    """
    resp = await portal_authenticated_request(
        "POST", "/AdminPortal/Customers/GetContractsNo", data={"Id": property_id}
    )
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(resp.text, "html.parser")
    contracts = []
    for opt in soup.select("option"):
        value = (opt.get("value") or "").strip()
        text = opt.get_text(strip=True)
        if not value or not text or text == "--- Select ---":
            continue
        contracts.append({"id": value, "contract_no": text})
    return contracts


def parse_contracts_from_html(html: str) -> list:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    contracts = []

    for widget in soup.select(".kt-widget--user-profile-3"):
        name_link = widget.select_one(".kt-widget__username")
        if not name_link:
            continue

        # الاسم والعقد بييجوا مع بعض في نفس اللينك: "الاسم <span> - رقم العقد</span>"
        name_span = name_link.select_one("span")
        contract_no = name_span.get_text(strip=True).lstrip("-").strip() if name_span else ""
        full_text = re.sub(r"\s+", " ", name_link.get_text(" ", strip=True)).strip()
        customer_name = full_text
        if contract_no and customer_name.endswith(contract_no):
            customer_name = customer_name[: -len(contract_no)].strip(" -")

        edit_link = widget.select_one('a[href*="/Customers/Manage/"]')
        customer_id = ""
        if edit_link and edit_link.get("href"):
            customer_id = edit_link["href"].rstrip("/").split("/")[-1]

        labels = [lbl.get_text(strip=True) for lbl in widget.select("label")]

        def value_after(marker):
            for i, text in enumerate(labels):
                if text.strip(":").lower() == marker.lower() and i + 1 < len(labels):
                    return labels[i + 1]
            return ""

        property_name = value_after("Property")
        unit_no = value_after("Property Unit No")

        # في صفحة العميل القيمة بتيجي كنص عادي بعد الـ label (مش label تاني)، فالطريقة
        # اللي فوق كانت بتاخد label غلط (زي "Received Security Deposit"). بنقرأ من نص
        # الـ widget كله: "Property: X Property Unit No: T1_705 Received Security Deposit ..."
        widget_text = re.sub(r"\s+", " ", widget.get_text(" ", strip=True))
        m = re.search(
            r"Property Unit No\s*:?\s*(.+?)\s*(?:Received Security Deposit|Contract Begin|Contract End|Final Bill|Outstanding|$)",
            widget_text,
        )
        if m:
            unit_no = m.group(1).strip()
        # لو القيمة اللي اتقرت شكلها نص حقل تاني (مش رقم وحدة) يبقى قيمة الوحدة الحقيقية مش
        # موجودة في الصفحة اللي السيرفر بيقراها - نسيبها فاضية والاستنتاج من رقم العقد هيكمّل
        if re.search(r"deposit|contract begin|contract end|final bill|outstanding|received|\bAED\b", unit_no, re.I):
            unit_no = ""
        m = re.search(r"Property\s*:\s*(.+?)\s*Property Unit No", widget_text)
        if m:
            property_name = m.group(1).strip()

        email_span = widget.select_one(".SendEmail")
        email = (email_span.get("data-email", "") if email_span else "").strip()
        sms_span = widget.select_one(".SendSMS")
        phone = (sms_span.get("data-phone", "") if sms_span else "").strip()

        outstanding = ""
        for item in widget.select(".kt-widget__item"):
            title_el = item.select_one(".kt-widget__title")
            if title_el and title_el.get_text(strip=True) == "Outstanding":
                value_el = item.select_one(".kt-widget__value")
                outstanding = value_el.get_text(strip=True) if value_el else ""
                break

        contracts.append(
            {
                "customer_id": customer_id,
                "customer_name": customer_name,
                "contract_no": contract_no,
                "property": property_name,
                "unit_no": unit_no,
                "email": email,
                "phone": phone,
                "outstanding": outstanding,
            }
        )

    return contracts


@app.get("/api/contracts")
async def api_contracts(tower: str):
    """
    بيرجع كل عقود التاور المطلوب (مستأجرين وملاك مع بعض في ليستة واحدة) -
    مستخدم لملء Contract Dropdown في صفحة الـ NOC Generator.
    """
    html = await fetch_customers_html(tower)
    contracts = parse_contracts_from_html(html)
    return {"tower": tower, "count": len(contracts), "contracts": contracts}


_towers_cache = {"towers": None, "obtained_at": 0}
TOWERS_CACHE_MAX_AGE_SECONDS = 15 * 60  # قايمة التاورات نادر جداً ما تتغير - 15 دقيقة توازن بين السرعة وسرعة ظهور برج جديد


async def _fetch_towers_from_portal() -> list:
    """المنطق الفعلي لجلب قايمة الأبراج من البورتال - مستخدم من الـ endpoint نفسه
    وكمان من background warm-up loop تحت، عشان منكررش نفس الكود مرتين."""
    from bs4 import BeautifulSoup

    html = await fetch_customers_html("")  # من غير فلتر - برضو بيرجع قايمة التاورات كاملة في الفورم
    soup = BeautifulSoup(html, "html.parser")
    select_el = soup.select_one("#Search_Property")

    towers = []
    if select_el:
        for opt in select_el.select("option"):
            property_id = (opt.get("value") or "").strip()
            name = opt.get_text(strip=True)
            if name and property_id and "select property" not in name.lower():
                towers.append({"id": property_id, "name": name})
    return towers


async def _refresh_towers_cache_if_stale():
    # قايمة الأبراج بتتجاب مرة واحدة بس (أول طلب بعد تشغيل السيرفر) وبعد كده بتفضل ثابتة
    # في الذاكرة. مفيش تحديث تلقائي - الأدمن بس هو اللي بيحدّثها بزرار الريفرش
    if _towers_cache["towers"] is None:
        _towers_cache["towers"] = await _fetch_towers_from_portal()
        _towers_cache["obtained_at"] = time.time()


@app.get("/api/towers")
async def api_towers():
    """
    بيرجع قايمة كل التاورات (Property) زي ما هي في بورتال الفوترة - كل تاور معاه
    الرقم الداخلي بتاعه (id) كمان، لازم عشان نطلب بيه أرقام العقود بعد كده.
    """
    await _refresh_towers_cache_if_stale()
    return {"count": len(_towers_cache["towers"]), "towers": _towers_cache["towers"]}


_towers_refresh_state = {"last": 0}
TOWERS_REFRESH_COOLDOWN_SECONDS = 60  # حماية: مفيش ريفرش أكتر من مرة كل دقيقة


@app.post("/api/towers/refresh")
async def api_towers_refresh():
    """
    بيجدد قايمة الأبراج من البورتال (بيسجل دخول لو لزم) - الفرونت إند بيظهر الزرار
    للأدمن بس. لو التحديث فشل أو رجع قايمة فاضية بنسيب القايمة القديمة زي ما هي.
    """
    now = time.time()
    if now - _towers_refresh_state["last"] < TOWERS_REFRESH_COOLDOWN_SECONDS:
        raise HTTPException(status_code=429, detail="استنى دقيقة قبل ما تحدّث تاني")
    _towers_refresh_state["last"] = now

    towers = await _fetch_towers_from_portal()
    if not towers:
        raise HTTPException(status_code=502, detail="البورتال رجّع قايمة أبراج فاضية - القايمة القديمة لسه موجودة")
    _towers_cache["towers"] = towers
    _towers_cache["obtained_at"] = time.time()
    return {"count": len(towers), "towers": towers}


# ============================================================
# 🔥 Warm-Up مرة واحدة عند تشغيل السيرفر: بيسجل دخول ويجيب قايمة الأبراج مرة واحدة بس.
# اتشال اللوب اللي كان بيفتح Chromium ويسجل دخول كل 5-15 دقيقة طول الوقت (تقيل على
# 512MB) - دلوقتي جلسة البورتال بتتجدد عند الطلب بس، لما تنتهي وحد يحتاجها فعلًا.
# ============================================================


async def _warm_portal_once():
    try:
        await get_portal_session_cookie()
        await _refresh_towers_cache_if_stale()
    except Exception as e:
        print(f"⚠️ Portal warm-up (مرة واحدة) فشل - هيتعمل عند أول طلب: {e}")


@app.on_event("startup")
async def _start_background_tasks():
    if SC_USERNAME and SC_PASSWORD:
        asyncio.create_task(_warm_portal_once())


@app.get("/api/contract-numbers")
async def api_contract_numbers(property_id: str):
    """بيرجع كل أرقام العقود (من غير حد أقصى) لتاور معين، عشان قايمة البحث القابلة للكتابة فيها."""
    contracts = await fetch_contract_numbers(property_id)
    _prewarm_tower_in_background(property_id)  # نبدأ نجهّز بيانات عملاء البرج في الخلفية
    return {"property_id": property_id, "count": len(contracts), "contracts": contracts}


# كاش لعقود كل برج اتقلّبت صفحاتها - البورتال بيتجاهل فلتر "Contract" في الـ URL وبيرجّع
# أول صفحة (20 عميل) بس، فبنقلّب الصفحات بنفسنا لحد ما نلاقي العقد ونحفظ كل اللي شفناه.
# وأول ما المستخدم يختار برج بنبدأ نقلّب صفحاته في الخلفية (prewarm) عشان لما يختار العقد
# تكون البيانات جاهزة من غير ما يستنى.
_tower_contracts_cache = {}
_tower_scan_locks = {}
_prewarm_semaphore = asyncio.Semaphore(1)  # برج واحد بس بيتقلّب في الخلفية في نفس الوقت (حماية للرامات)
TOWER_CONTRACTS_CACHE_MAX_AGE_SECONDS = 15 * 60
MAX_CUSTOMER_PAGES = 80  # حد أمان (80 صفحة × 20 = 1600 عقد للبرج الواحد)
PAGES_PER_BATCH = 4      # كام صفحة نطلبها مع بعض في نفس الوقت


def _norm_contract_no(s: str) -> str:
    # بيتجاهل الشرطات والـ underscore والمسافات وحالة الحروف
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def _tower_slug(tower: str) -> str:
    return re.sub(r"\s+", "_", (tower or "").strip())


async def _fetch_customers_page(tower_slug: str, page: int) -> list:
    resp = await portal_authenticated_request(
        "GET", "/AdminPortal/Customers", params={"page": str(page), "Property": tower_slug}
    )
    # تحليل الـ HTML (215KB) شغل CPU - بنعمله في thread عشان السيرفر يفضل يرد على باقي الطلبات
    return await asyncio.to_thread(parse_contracts_from_html, resp.text)


def _get_tower_entry(slug: str) -> dict:
    entry = _tower_contracts_cache.get(slug)
    if not entry or time.time() - entry["at"] > TOWER_CONTRACTS_CACHE_MAX_AGE_SECONDS:
        entry = {"at": time.time(), "by_contract": {}, "next_page": 1, "exhausted": False, "scan_seen": set()}
        _tower_contracts_cache[slug] = entry
    return entry


async def _scan_one_batch(slug: str, entry: dict) -> bool:
    """بيقلّب دفعة صفحات واحدة من البرج ويضيف عقودها للكاش. بيرجّع False لما مفيش صفحات تانية."""
    lock = _tower_scan_locks.setdefault(slug, asyncio.Lock())
    async with lock:
        if entry["exhausted"]:
            return False
        if entry["next_page"] > MAX_CUSTOMER_PAGES:
            entry["exhausted"] = True
            entry["exhausted_at"] = time.time()
            return False

        pages = list(range(entry["next_page"], min(entry["next_page"] + PAGES_PER_BATCH, MAX_CUSTOMER_PAGES + 1)))
        results = await asyncio.gather(*[_fetch_customers_page(slug, p) for p in pages])
        entry["next_page"] = pages[-1] + 1
        for items in results:
            page_keys = {_norm_contract_no(c["contract_no"]) for c in items if c["contract_no"]}
            # صفحة فاضية، أو كل عقودها اتشافت قبل كده في نفس المسح (البورتال بيعيد آخر صفحة
            # لو طلبنا صفحة بعد الأخيرة) = خلصنا كل صفحات البرج
            if not page_keys or page_keys <= entry["scan_seen"]:
                entry["exhausted"] = True
                entry["exhausted_at"] = time.time()
                return False
            entry["scan_seen"] |= page_keys
            for c in items:
                k = _norm_contract_no(c["contract_no"])
                if k:
                    entry["by_contract"][k] = c
        return True


async def _prewarm_tower(slug: str):
    try:
        async with _prewarm_semaphore:
            entry = _get_tower_entry(slug)
            while await _scan_one_batch(slug, entry):
                pass
    except Exception as e:
        print(f"⚠️ prewarm للبرج '{slug}' فشل (مش مشكلة - هيتعمل عند الطلب): {e}")


def _prewarm_tower_in_background(property_id: str):
    """بيبدأ تقليب صفحات البرج في الخلفية أول ما المستخدم يختاره (لو مش متقلّب قبل كده)."""
    name = next((t["name"] for t in (_towers_cache["towers"] or []) if t["id"] == property_id), None)
    if not name:
        return
    slug = _tower_slug(name)
    entry = _get_tower_entry(slug)
    if not entry["exhausted"]:
        asyncio.create_task(_prewarm_tower(slug))


@app.get("/api/contract-detail")
async def api_contract_detail(tower: str, contract: str):
    """بيرجع تفاصيل عقد واحد بس (اسم العميل، الوحدة، الإيميل...) - بيتستخدم بعد اختيار العقد من القايمة."""
    slug = _tower_slug(tower)
    key = _norm_contract_no(contract)
    entry = _get_tower_entry(slug)

    # عقد جديد اتضاف بعد ما الكاش اتملى: لو مش لاقيينه وآخر مسح كامل عدّى عليه 30 ثانية،
    # نعيد المسح من الأول عشان العقد الجديد يظهر فورًا (والمسح المتكرر لعقد مش موجود محدود بـ 30 ثانية)
    if (
        key not in entry["by_contract"]
        and entry["exhausted"]
        and time.time() - entry.get("exhausted_at", 0) > 30
    ):
        entry["exhausted"] = False
        entry["next_page"] = 1
        entry["scan_seen"] = set()

    while key not in entry["by_contract"] and await _scan_one_batch(slug, entry):
        pass

    match = entry["by_contract"].get(key)
    if match and not match.get("unit_no"):
        # رقم الوحدة مش بيتقرأ من صفحة العميل - بنستنتجه من رقم العقد:
        # SBD-T1_705-T1 -> T1_705 (نفس شكل Property Unit No في البورتال)
        parts = match.get("contract_no", "").split("-")
        derived = "-".join(parts[1:-1]) if len(parts) >= 3 else ""
        match = dict(match, unit_no=derived.strip(), unit_source="derived-from-contract")
    if not match:
        print(f"⚠️ contract-detail: no match for '{contract}' in '{tower}' after scanning "
              f"{len(entry['by_contract'])} contracts (next_page={entry['next_page']})")
        raise HTTPException(
            status_code=404,
            detail=f"العقد ده مش لاقيينه - جرب تاني [scanned={len(entry['by_contract'])} contracts, pages={entry['next_page'] - 1}]",
        )
    return match


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
    "121": "Minhaj",
    "122": "Sana",
    "123": "Gulsher",
    "125": "Mostafa",
    "126": "Saim",
    "127": "Zain",
    "128": "Fatemeh",
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


async def get_3cx_active_calls(client: httpx.AsyncClient, token: str):
    """بيجيب المكالمات الشغالة دلوقتي من 3CX (بيرجع [] لو حصل أي مشكلة، عشان ما يوقفش باقي الصفحة)"""
    try:
        resp = await client.get(
            f"https://{THREECX_FQDN}/xapi/v1/ActiveCalls",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json().get("value", [])
    except Exception as e:
        print(f"⚠️ فشل جلب المكالمات الحية (Active Calls): {e}")
        return []


# وقت بداية كل مكالمة شغالة دلوقتي (في الذاكرة) - عشان نعرف قايمة إيه من غير ما نحتاج 3CX يديها لنا
_call_start = {}


async def get_3cx_agent_status():
    async with httpx.AsyncClient(timeout=15) as client:
        token = await get_3cx_token(client)

        query_url = (
            f"https://{THREECX_FQDN}/xapi/v1/Users"
            "?$select=Number,DisplayName,CurrentProfileName,QueueStatus,IsRegistered"
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

    # المكالمات الشغالة دلوقتي - من المتصفح الشبح (Panel Scraper)، لأن الـ API الرسمي
    # (/xapi/v1/ActiveCalls) بيرجع 403 حاليًا (مشكلة صلاحية System Owner). صفحة Panel
    # بتوري مدة كل مكالمة لحظيًا (بتحسبها 3CX نفسها)، فمش محتاجين نتتبع وقت البداية بنفسنا.
    calls_by_ext = {}
    for call in _panel_state.get("active_calls", []):
        ext = call.get("agent_extension")
        if not ext:
            continue
        calls_by_ext[ext] = {
            "with": call.get("other_party") or "-",
            "startedAt": time.time() - call.get("duration_seconds", 0),
        }

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

        # لو مسجلش دخول فعلياً في 3CX (مفيش جهاز/سوفت فون شغال)، نعتبره Away
        # حتى لو البروفايل بتاعه شكله Available/Break/Emails... إلخ
        if not u.get("IsRegistered", False):
            display_status = "Away"

        daily = _daily_totals_cache["perAgent"].get(AGENT_MAP[number], {})

        result.append({
            "name": AGENT_MAP[number],
            "number": number,
            "status": display_status,
            "rawStatus": current_profile,
            "queueStatus": u.get("QueueStatus"),
            "sessionStartedAt": _session_start.get(number),
            "currentCall": calls_by_ext.get(number),
            "todaysTotalSeconds": daily.get("totalSeconds", 0),
            "todaysBreakSeconds": daily.get("breakSeconds", 0),
            "todaysCallsAnswered": daily.get("callsAnswered", 0),
            "todaysOutboundCalls": daily.get("outboundCalls", 0),
            "todaysOutboundAnswered": daily.get("outboundAnsweredCount", 0),
            "todaysOutboundUnanswered": daily.get("outboundUnansweredCount", 0),
        })
    return result


@app.get("/api/agent-status")
async def agent_status():
    try:
        return await get_3cx_agent_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"3CX fetch failed: {e}")


# ============================================================
# 🖥️ Panel Scraper (Playwright) - نسخة أولى تشخيصية فقط
# ============================================================
# السبب: /xapi/v1/ActiveCalls بيرجع 403 (التوكن بتاعنا صلاحيته "Group Owner" مش
# "System Owner")، فمش قادرين نجيب "مين شغال مكالمة دلوقتي ومع مين" من الـ API الرسمي.
# الحل البديل: متصفح Chromium مخفي (headless) شغال في الخلفية طول الوقت، مسجل دخول
# بحساب 106 زي أي مستخدم عادي، فاتح صفحة "Panel" (Switchboard) وبيقرا منها البيانات
# بالظبط زي ما عين المستخدم بتشوفها - مش محتاج الـ API خالص.
#
# النسخة دي (v1) لسه تشخيصية بس: بتسجل دخول، بتفتح صفحة Panel، وبتحفظ *النص الخام*
# اللي ظاهر في الصفحة (من غير أي تحليل/parsing ذكي) - عشان نقدر نشوفه فعليًا (من خلال
# /api/debug/panel-status و /api/debug/panel-screenshot) ونصمم على أساسه طريقة استخراج
# البيانات المنظمة (مين بيكلم مين ومن قد إيه) في الخطوة الجاية.
# ============================================================

PANEL_SCRAPE_INTERVAL_SECONDS = 15
PANEL_BASE_URL = f"https://{THREECX_FQDN}/"
# (إعادة فتح المتصفح الدوري كل ساعة بقت متحكم فيها مركزيًا في _get_shared_browser
# عن طريق SHARED_BROWSER_MAX_AGE_SECONDS، مش هنا)

_panel_state = {
    "context": None,
    "page": None,
    "browser_ref": None,  # مرجع لنفس نسخة المتصفح المشترك اللي الـ Context/Page دول اتفتحوا عليها
    "logged_in": False,
    "last_error": None,
    "last_updated": None,
    "raw_text": "",
    "active_calls": [],
}

_PANEL_TIME_RE = re.compile(r"^\d{1,2}:\d{2}(:\d{2})?$")
_PANEL_AGENT_EXT_RE = re.compile(r"(\d{2,4})\s*$")


def _parse_panel_time_to_seconds(text: str) -> int:
    """بيحول '05:31' أو '00:04:10' لعدد ثواني."""
    parts = text.strip().split(":")
    try:
        parts = [int(p) for p in parts]
    except ValueError:
        return 0
    while len(parts) < 3:
        parts.insert(0, 0)
    h, m, s = parts[-3], parts[-2], parts[-1]
    return h * 3600 + m * 60 + s


def _panel_clean_party_label(text: str) -> str:
    """بيشيل الجزء الزيادة من كولر آي دي شكله '0521010988:Costumer Support Agent 0521010988'
    ويسيب بس الرقم/الاسم الأساسي ('0521010988')."""
    text = (text or "").strip()
    if ":" in text:
        text = text.split(":", 1)[0].strip()
    return text or "-"


def _panel_extract_agent(text: str):
    """لو النص بيمثل واحد من الإيجنتس بتوعنا (زي 'Ahmed 115')، يرجع (اسمه, رقمه).
    لو مش إيجنت (رقم خارجي أو Caller ID عميل)، يرجع (None, None)."""
    text = (text or "").strip()
    match = _PANEL_AGENT_EXT_RE.search(text)
    if match:
        ext = match.group(1)
        if ext in AGENT_MAP:
            return AGENT_MAP[ext], ext
    return None, None


def _parse_panel_all_calls(raw_text: str) -> list:
    """
    بيقرا النص الخام لصفحة Panel ويطلع منه المكالمات الشغالة دلوقتي فعليًا (جدول All Calls).
    كل صف بيكون شكله (Caller, Callee, [Queue - اختياري], Time, Details) على أسطر منفصلة -
    وبما إن عمود Queue مش دايمًا موجود، بنستخدم عمود الـ Time (شكله دايمًا mm:ss) كعلامة
    بنعرف بيها حدود كل صف، وبعدين اللي قبله (سطرين أو تلاتة) هما Caller/Callee/[Queue].
    """
    lines = raw_text.split("\n")
    try:
        start = lines.index("Details") + 1  # أول سطر فعلي بعد هيدرات الأعمدة
    except ValueError:
        return []
    try:
        end = lines.index("Agent Status", start)
    except ValueError:
        end = len(lines)

    section = lines[start:end]
    calls = []
    buffer = []
    i = 0
    while i < len(section):
        line = section[i].strip()
        if _PANEL_TIME_RE.match(line):
            duration_text = line
            details = section[i + 1].strip() if i + 1 < len(section) else ""
            if len(buffer) >= 2:
                caller_text = buffer[0]
                callee_text = buffer[1]
                queue_text = buffer[2] if len(buffer) >= 3 else ""

                agent_name, agent_ext = _panel_extract_agent(caller_text)
                other_party = callee_text
                if not agent_name:
                    agent_name, agent_ext = _panel_extract_agent(callee_text)
                    other_party = caller_text

                calls.append({
                    "caller": caller_text,
                    "callee": callee_text,
                    "queue": queue_text,
                    "duration_text": duration_text,
                    "duration_seconds": _parse_panel_time_to_seconds(duration_text),
                    "details": details,
                    "agent_name": agent_name,
                    "agent_extension": agent_ext,
                    "other_party": _panel_clean_party_label(other_party),
                })
            buffer = []
            i += 2  # نتخطى سطر الـ Details كمان
        else:
            buffer.append(line)
            i += 1
    return calls


async def _panel_login_and_open(page) -> None:
    """بيسجل دخول على 3CX Web Client (زي أي مستخدم عادي) وبيروح صفحة Panel."""
    await page.goto(PANEL_BASE_URL, wait_until="load", timeout=30000)

    # بنجرب أكتر من شكل ممكن تكون بيه خانة رقم الإيجستنشن (بيختلف حسب نسخة الـ Web Client)
    username_selectors = [
        'input[name="Number"]',
        'input[name="Username"]',
        'input[formcontrolname="number"]',
        'input[formcontrolname="username"]',
        'input[placeholder*="Number" i]',
        'input[placeholder*="Extension" i]',
        'input[type="text"]',
    ]
    password_selectors = [
        'input[name="Password"]',
        'input[formcontrolname="password"]',
        'input[type="password"]',
    ]

    async def _find_first_visible(selectors):
        for sel in selectors:
            loc = page.locator(sel).first
            try:
                await loc.wait_for(state="visible", timeout=4000)
                return loc
            except Exception:
                continue
        return None

    username_field = await _find_first_visible(username_selectors)
    if username_field is None:
        raise RuntimeError("مالقيتش خانة رقم الإيجستنشن في صفحة تسجيل الدخول")
    await username_field.fill(THREECX_USERNAME)

    password_field = await _find_first_visible(password_selectors)
    if password_field is None:
        raise RuntimeError("مالقيتش خانة الباسورد في صفحة تسجيل الدخول")
    await password_field.fill(THREECX_PASSWORD)
    await password_field.press("Enter")

    await page.wait_for_timeout(5000)  # نستنى الصفحة الرئيسية تحمل بعد تسجيل الدخول

    # ندوس على "Panel" في القايمة الجانبية
    panel_link = page.get_by_text("Panel", exact=True).first
    try:
        await panel_link.wait_for(state="visible", timeout=10000)
        await panel_link.click()
    except Exception:
        # لو مالقيناهاش بالنص، نجرب رابط مباشر (تخمين للـ SPA route)
        await page.goto(f"{PANEL_BASE_URL}panel", wait_until="load", timeout=20000)

    await page.wait_for_timeout(3000)


async def panel_scraper_watcher():
    """بيفضل شغال طول الوقت: يسجل دخول مرة، يفضل ماسك نفس الصفحة مفتوحة، ويقرا منها كل شوية ثواني.
    بيستخدم نفس بروسيس المتصفح المشترك (_get_shared_browser) اللي بورتال الفوترة بيستخدمه
    برضو - عشان يفضل بروسيس Chromium واحد بس شغال دايمًا، مش اتنين."""
    while True:
        try:
            browser = await _get_shared_browser()

            # لو المتصفح اتغيّر (اتقفل واتفتح من جديد - قديم أو كريش) لازم نعمل Context ولوجين
            # جداد، حتى لو _panel_state["logged_in"] لسه True من الجولة اللي فاتت
            browser_changed = _panel_state.get("browser_ref") is not browser

            if _panel_state["context"] is None or not _panel_state["logged_in"] or browser_changed:
                if _panel_state["context"] is not None:
                    try:
                        await _panel_state["context"].close()
                    except Exception:
                        pass
                # فيوبورت أصغر شوية (كان 1600x1000) - بيقلل استهلاك الرامات من غير ما يأثر
                # على قراءة النص، لأن احنا بنقرا inner_text مش بنعتمد على شكل الصفحة بصريًا
                _panel_state["context"] = await browser.new_context(viewport={"width": 1366, "height": 900})
                # مانحتاجش صور/خطوط/ميديا عشان نقرا نص الصفحة بس - منعها بيوفر رامات كتير
                await _panel_state["context"].route(
                    "**/*",
                    lambda route: route.abort()
                    if route.request.resource_type in ("image", "media", "font")
                    else route.continue_(),
                )
                _panel_state["page"] = await _panel_state["context"].new_page()
                await _panel_login_and_open(_panel_state["page"])
                _panel_state["logged_in"] = True
                _panel_state["browser_ref"] = browser
                _panel_state["last_error"] = None
                print("✅ [Panel Scraper] سجل دخول ووصل لصفحة Panel بنجاح")

            raw_text = await _panel_state["page"].inner_text("body")
            _panel_state["raw_text"] = raw_text
            _panel_state["active_calls"] = _parse_panel_all_calls(raw_text)
            _panel_state["last_updated"] = time.time()
            _panel_state["last_error"] = None

        except Exception as e:
            _panel_state["last_error"] = str(e)
            _panel_state["logged_in"] = False  # هيجرب يسجل دخول تاني في الدورة الجاية
            print(f"⚠️ [Panel Scraper] خطأ: {e}")

        await asyncio.sleep(PANEL_SCRAPE_INTERVAL_SECONDS)


@app.on_event("startup")
async def _start_panel_scraper():
    asyncio.create_task(panel_scraper_watcher())


@app.get("/api/debug/panel-status")
async def api_debug_panel_status():
    """افتحيها في المتصفح عادي عشان تشوفي حالة المتصفح الشبح والنص اللي قراه من صفحة Panel."""
    return {
        "logged_in": _panel_state["logged_in"],
        "last_error": _panel_state["last_error"],
        "last_updated": _panel_state["last_updated"],
        "active_calls": _panel_state["active_calls"],
        "raw_text": _panel_state["raw_text"],
    }


@app.get("/api/debug/panel-screenshot")
async def api_debug_panel_screenshot():
    """افتحيها في المتصفح عادي عشان تشوفي صورة فعلية للي المتصفح الشبح شايفه دلوقتي."""
    if _panel_state["page"] is None:
        raise HTTPException(status_code=503, detail="المتصفح لسه مفتحش")
    screenshot_bytes = await _panel_state["page"].screenshot(full_page=True)
    return Response(content=screenshot_bytes, media_type="image/png")


# ------------------------------------------------------------
# 🔍 تشخيص مؤقت: بنشوف شكل بيانات المكالمات/الكيو الخام اللي 3CX بيرجعها فعليًا
# قبل ما نبني عليها ميزة Call Log - هيتشال بعد ما نخلص التصميم
# استخدام: /debug/3cx-calls?secret=... (نفس SYNC_SECRET)
# ------------------------------------------------------------

DEBUG_3CX_CALL_PATHS = [
    "/xapi/v1/ActiveCalls",
    "/xapi/v1/Queues",
    "/xapi/v1/ReportCallLog",
    "/xapi/v1/CallHistoryView",
]


@app.get("/debug/3cx-calls")
async def debug_3cx_calls(secret: str = ""):
    if secret != os.environ.get("SYNC_SECRET", ""):
        return {"status": "error", "message": "Unauthorized"}

    results = {}
    async with httpx.AsyncClient(timeout=15) as client:
        token = await get_3cx_token(client)
        headers = {"Authorization": f"Bearer {token}"}

        for path in DEBUG_3CX_CALL_PATHS:
            url = f"https://{THREECX_FQDN}{path}"
            try:
                resp = await client.get(url, headers=headers)
                try:
                    body_json = resp.json()
                    entry = {"status_code": resp.status_code, "json": body_json}
                except Exception:
                    entry = {"status_code": resp.status_code, "raw_snippet": resp.text[:500]}
                results[path] = entry
            except Exception as e:
                results[path] = {"error": str(e)}

    return results


# ------------------------------------------------------------
# 🔍 تشخيص مؤقت: نفس تقرير سجل المكالمات اللي شفناه في الـ Network tab بالمتصفح،
# بس بفترة أوسع (آخر N يوم) عشان نتأكد إن التوكن بتاعنا شغال معاه ونشوف شكل سجل حقيقي
# استخدام: /debug/3cx-call-log?secret=...&days=7
# ------------------------------------------------------------

@app.get("/debug/3cx-call-log")
async def debug_3cx_call_log(secret: str = "", days: int = 7, mode: str = "missed"):
    if secret != os.environ.get("SYNC_SECRET", ""):
        return {"status": "error", "message": "Unauthorized"}

    period_to = datetime.utcnow()
    period_from = period_to - timedelta(days=days)

    def fmt(dt):
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z").replace(":", "%3A")

    def build_url(skip: int, top: int = 500):
        path = (
            "/xapi/v1/ReportCallLogData/Pbx.GetCallLogData("
            f"periodFrom={fmt(period_from)},"
            f"periodTo={fmt(period_to)},"
            "sourceType=0,sourceFilter='',"
            "destinationType=0,destinationFilter='',"
            "callsType=0,callTimeFilterType=0,"
            "callTimeFilterFrom='0%3A00%3A0',callTimeFilterTo='0%3A00%3A0',"
            "hidePcalls=true)"
            f"?%24top={top}&%24skip={skip}"
        )
        return f"https://{THREECX_FQDN}{path}"

    async with httpx.AsyncClient(timeout=20) as client:
        token = await get_3cx_token(client)
        headers = {"Authorization": f"Bearer {token}"}

        # mode=raw: نفس السلوك القديم، بيرجع أول صفحة زي ما هي من غير فلترة
        if mode == "raw":
            try:
                resp = await client.get(build_url(0), headers=headers)
                try:
                    body = resp.json()
                except Exception:
                    body = {"raw_snippet": resp.text[:800]}
                return {"status_code": resp.status_code, "body": body}
            except Exception as e:
                return {"error": str(e)}

        # mode=missed (افتراضي): بندور صفحة صفحة على مكالمات كيو ملهاش "was replaced by"
        # في الـ Reason بتاعها (يعني معرفتش توصل لإيجنت) أو Answered=false
        queue_rows_seen = 0
        matches = []
        skip = 0
        page_size = 500
        max_pages = 20  # حد أقصى أماني، يعني لغاية 10,000 صف

        try:
            for _ in range(max_pages):
                resp = await client.get(build_url(skip, page_size), headers=headers)
                data = resp.json()
                rows = data.get("value", [])
                if not rows:
                    break

                for row in rows:
                    if row.get("CallType") != "Queue":
                        continue
                    queue_rows_seen += 1
                    reason = row.get("Reason", "") or ""
                    if not row.get("Answered", False) or "was replaced by" not in reason:
                        matches.append(row)
                        if len(matches) >= 8:
                            break

                if len(matches) >= 8:
                    break
                skip += page_size

            return {
                "queue_rows_scanned": queue_rows_seen,
                "matches_found": len(matches),
                "examples": matches,
            }
        except Exception as e:
            return {"error": str(e), "queue_rows_scanned": queue_rows_seen}


# ------------------------------------------------------------
# 🔍 تشخيص/معاينة: تقرير المكالمات اللي اترد عليها فعلاً - مين الإيجنت اللي رد
# وقعد يتكلم قد ايه، عشان نحسب منها عدد المكالمات و AHT لكل إيجنت يوميًا
# (بيربط صف الكيو "was replaced by X" بصف المكالمة الفعلي مع نفس الإيجنت
# عن طريق نفس الـ MainCallHistoryId) - معاينة بس، لسه مش بيتكتب في أي شيت
# استخدام: /debug/3cx-agent-calls?secret=...&days=1
# ------------------------------------------------------------

_HANDOFF_RE = re.compile(r"was replaced by .*\((\d+)\)")


def parse_iso_duration_seconds(duration: str) -> float:
    """يحول مدة بصيغة ISO 8601 زي 'PT1M59.975875S' لعدد الثواني"""
    if not duration:
        return 0.0
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?", duration)
    if not m:
        return 0.0
    hours = float(m.group(1) or 0)
    minutes = float(m.group(2) or 0)
    seconds = float(m.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


@app.get("/debug/3cx-agent-calls")
async def debug_3cx_agent_calls(secret: str = "", days: int = 1):
    if secret != os.environ.get("SYNC_SECRET", ""):
        return {"status": "error", "message": "Unauthorized"}

    period_to = datetime.utcnow()
    period_from = period_to - timedelta(days=days)

    def fmt(dt):
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z").replace(":", "%3A")

    def build_url(skip: int, top: int = 500):
        path = (
            "/xapi/v1/ReportCallLogData/Pbx.GetCallLogData("
            f"periodFrom={fmt(period_from)},"
            f"periodTo={fmt(period_to)},"
            "sourceType=0,sourceFilter='',"
            "destinationType=0,destinationFilter='',"
            "callsType=0,callTimeFilterType=0,"
            "callTimeFilterFrom='0%3A00%3A0',callTimeFilterTo='0%3A00%3A0',"
            "hidePcalls=true)"
            f"?%24top={top}&%24skip={skip}"
        )
        return f"https://{THREECX_FQDN}{path}"

    all_rows = []
    async with httpx.AsyncClient(timeout=25) as client:
        token = await get_3cx_token(client)
        headers = {"Authorization": f"Bearer {token}"}
        skip = 0
        page_size = 500
        try:
            for _ in range(30):
                resp = await client.get(build_url(skip, page_size), headers=headers)
                data = resp.json()
                rows = data.get("value", [])
                if not rows:
                    break
                all_rows.extend(rows)
                skip += page_size
        except Exception as e:
            return {"error": str(e), "rows_fetched": len(all_rows)}

    groups = {}
    for row in all_rows:
        groups.setdefault(row.get("MainCallHistoryId"), []).append(row)

    per_agent_day = {}  # (day, ext) -> stats

    for rows in groups.values():
        for row in rows:
            if row.get("CallType") != "Queue":
                continue
            reason = row.get("Reason", "") or ""
            m = _HANDOFF_RE.search(reason)
            if not m:
                continue
            agent_ext = m.group(1)
            if agent_ext not in AGENT_MAP:
                continue
            agent_row = next(
                (r for r in rows if r.get("DestinationDn") == agent_ext and r.get("CallType") != "Queue"),
                None
            )
            if not agent_row:
                continue

            talk = parse_iso_duration_seconds(agent_row.get("TalkingDuration", ""))
            start = agent_row.get("StartTime", "")
            day = start[:10] if start else "unknown"
            key = (day, agent_ext)
            if key not in per_agent_day:
                per_agent_day[key] = {
                    "name": agent_row.get("DestinationDisplayName", agent_ext),
                    "calls": 0,
                    "talkSeconds": 0.0,
                }
            per_agent_day[key]["calls"] += 1
            per_agent_day[key]["talkSeconds"] += talk

    report = []
    distinct_days = sorted(set(day for day, _ in per_agent_day.keys()))

    available_totals_by_day = {}
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as sheet_client:
        sheet_url = os.environ["GOOGLE_SHEET_API_URL"]
        for day in distinct_days:
            try:
                resp = await sheet_client.get(
                    sheet_url,
                    params={"action": "allAgentsLoginTotals", "mode": "day", "date": day},
                )
                data = resp.json()
                if data.get("status") == "success":
                    available_totals_by_day[day] = {
                        a["name"]: (a.get("totals", {}) or {}).get("Available", 0)
                        for a in data.get("agents", [])
                    }
                else:
                    available_totals_by_day[day] = {}
            except Exception:
                available_totals_by_day[day] = {}

    for (day, ext), stats in sorted(per_agent_day.items()):
        calls = stats["calls"]
        talk = stats["talkSeconds"]
        plain_name = AGENT_MAP.get(ext, stats["name"])
        available_seconds = available_totals_by_day.get(day, {}).get(plain_name)
        idle_seconds = max(available_seconds - talk, 0) if available_seconds else None
        # Occupancy % = وقت الكلام ÷ (وقت الكلام + وقت الانتظار الفاضي) = وقت الكلام ÷ إجمالي وقت "Available"
        occupancy_pct = round((talk / available_seconds) * 100, 1) if available_seconds else None

        report.append({
            "date": day,
            "agentExt": ext,
            "agentName": stats["name"],
            "callsAnswered": calls,
            "totalTalkSeconds": round(talk, 1),
            "ahtSeconds": round(talk / calls, 1) if calls else 0,
            "availableSeconds": available_seconds,
            "idleSeconds": round(idle_seconds, 1) if idle_seconds is not None else None,
            "occupancyPct": occupancy_pct,
        })

    return {"rows_scanned": len(all_rows), "groups_scanned": len(groups), "report": report}


# ------------------------------------------------------------
# 🔴 مراقبة لحظية للتغييرات + تسجيلها فوراً في الشيت
# ------------------------------------------------------------

# آخر حالة معروفة لكل إيجنت (في الذاكرة، بتتصفر لو السيرفر عمل Restart)
_last_known_status = {}

# وقت بداية الجلسة الحالية لكل إيجنت (آخر مرة اتغيرت فيها الحالة من Away لأي حالة تانية)
# بيتصفر برضو لو السيرفر عمل Restart، وقتها العداد هيبدأ من جديد مع أول تغيير بعد الريستارت
_session_start = {}

AGENT_STATUS_POLL_SECONDS = 1  # نزلناها من 10 لـ1 عشان الـ Break Queue يتابع حالة 3CX الحقيقية شبه لحظي (طلب فارس 2026-09-19) - التوكن متكاش فبيقين مفيش أي أوث إضافي، بس هنراقب لو 3CX بدأ يرفض/يبطئ الطلبات وقتها نرجعها لرقم أعلى


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

                    # تتبع بداية الجلسة الحالية عشان عداد "بدأ الشيفت دلوقتي" في الفرونت إند
                    if new_status == "Away":
                        _session_start.pop(key, None)
                    elif old_status is None or old_status == "Away":
                        _session_start[key] = time.time()

                    _last_known_status[key] = new_status
            except Exception as e:
                print(f"❌ خطأ في مراقبة حالة 3CX: {e}")

            await asyncio.sleep(AGENT_STATUS_POLL_SECONDS)


def uae_timestamp_to_epoch(ts_str: str) -> float:
    """يحول تايم ستامب زي '2026-09-06 14:53:25' (مسجل بتوقيت الإمارات UTC+4)
    لرقم epoch حقيقي (UTC) عشان يتقارن مع time.time()"""
    naive = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
    utc_naive = naive - timedelta(hours=4)
    return calendar.timegm(utc_naive.timetuple())


async def hydrate_status_from_sheet():
    """عند تشغيل السيرفر (أو أي Restart)، بيقرا كل تغييرات الحالة اللي
    حصلت النهاردة من شيت AgentStatusLog ويملي بيها _last_known_status
    و _session_start، عشان تسجيل التغييرات والعدادات يكملوا صح من غير
    ما يرجعوا يبدأوا من الصفر - بدل ما يفضل السيرفر فاضي لغاية أول Poll"""
    try:
        sheet_url = os.environ["GOOGLE_SHEET_API_URL"]
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(sheet_url, params={"action": "todayStatusLog"})
            data = resp.json()

        if data.get("status") != "success":
            print(f"⚠️ فشل تحميل تاريخ الحالات اليومي: {data.get('message')}")
            return

        for row in data.get("rows", []):
            key = row.get("number")
            new_status = row.get("newStatus")
            old_status = row.get("oldStatus")
            if not key or not new_status:
                continue

            if new_status == "Away":
                _session_start.pop(key, None)
            elif old_status == "Away" or key not in _last_known_status:
                _session_start[key] = uae_timestamp_to_epoch(row.get("timestamp"))

            _last_known_status[key] = new_status

        print(f"✅ استكمال حالة {len(_last_known_status)} إيجنت من شيت اليوم بعد التشغيل")
    except Exception as e:
        print(f"❌ فشل استكمال تاريخ الحالات عند التشغيل: {e}")


@app.on_event("startup")
async def start_agent_status_watcher():
    await hydrate_status_from_sheet()
    asyncio.create_task(agent_status_watcher())


# ------------------------------------------------------------
# 📊 كاش "إجمالي شغل النهاردة" لكل إيجنت (Total login + Break)
# مبني على شيت AgentStatusLog نفسه (نفس مصدر التقارير) مش على ذاكرة السيرفر،
# عشان يفضل صحيح حتى بعد أي Deploy أو Restart، وعشان يترست لوحده مع أي يوم جديد
# ------------------------------------------------------------

DAILY_TOTALS_REFRESH_SECONDS = 20

# perAgent: { "اسم الإيجنت": {"totalSeconds": ..., "breakSeconds": ...} }
_daily_totals_cache = {"date": None, "perAgent": {}}


def get_uae_today_str() -> str:
    # الإمارات UTC+4 ثابتة طول السنة (من غير توقيت صيفي)، فمحتاجينش مكتبة تايم زون خارجية
    uae_now = datetime.utcnow() + timedelta(hours=4)
    return uae_now.strftime("%Y-%m-%d")


async def refresh_daily_totals_cache(client: httpx.AsyncClient):
    try:
        sheet_url = os.environ["GOOGLE_SHEET_API_URL"]
        today_str = get_uae_today_str()

        resp = await client.get(
            sheet_url,
            params={
                "action": "allAgentsLoginTotals",
                "mode": "day",
                "date": today_str,
                # سيكريت خاص بالسيرفر بس (server-to-server) - عشان الأكشن ده يعدي
                # من غير ما يحتاج session token حقيقي (السيرفر مش متصفح مسجل
                # دخول). نفس القيمة متخزنة كـ Script Property "SYNC_SECRET" في
                # Code.gs، وكـ Environment Variable SYNC_SECRET هنا في Render.
                "syncSecret": os.environ.get("SYNC_SECRET", ""),
            },
            timeout=45,  # زودنا شوية (كانت 30) - شيت Call Log بقى أكبر بعد الباكفيل
        )
        data = resp.json()
        if data.get("status") != "success":
            print(f"❌ allAgentsLoginTotals مرجعتش success: {data.get('message')}")
            return

        per_agent = {}
        for agent in data.get("agents", []):
            totals = agent.get("totals", {}) or {}
            per_agent[agent["name"]] = {
                "totalSeconds": agent.get("totalLoginSeconds", 0),
                "breakSeconds": totals.get("Break", 0),
                "callsAnswered": 0,
                "outboundCalls": 0,
                "outboundAnsweredCount": 0,
                "outboundUnansweredCount": 0,
            }

        try:
            calls_resp = await client.get(
                sheet_url,
                params={
                    "action": "callLogReport",
                    "mode": "day",
                    "date": today_str,
                    "syncSecret": os.environ.get("SYNC_SECRET", ""),
                },
                timeout=45,  # زودنا شوية (كانت 30) - شيت Call Log بقى أكبر بعد الباكفيل
            )
            calls_data = calls_resp.json()
            if calls_data.get("status") != "success":
                print(f"❌ callLogReport مرجعتش success: {calls_data.get('message')}")
            if calls_data.get("status") == "success":
                for agent in calls_data.get("agents", []):
                    name = agent.get("agent")
                    if name in per_agent:
                        per_agent[name]["callsAnswered"] = agent.get("callsAnswered", 0)
                        per_agent[name]["outboundCalls"] = agent.get("outboundCallsCount", 0)
                        per_agent[name]["outboundAnsweredCount"] = agent.get("outboundAnsweredCount", 0)
                        per_agent[name]["outboundUnansweredCount"] = agent.get("outboundUnansweredCount", 0)
                    else:
                        per_agent[name] = {
                            "totalSeconds": 0,
                            "breakSeconds": 0,
                            "callsAnswered": agent.get("callsAnswered", 0),
                            "outboundCalls": agent.get("outboundCallsCount", 0),
                            "outboundAnsweredCount": agent.get("outboundAnsweredCount", 0),
                            "outboundUnansweredCount": agent.get("outboundUnansweredCount", 0),
                        }
        except Exception as e:
            print(f"❌ فشل تحديث عدد المكالمات في كاش اليوم: {e}")

        _daily_totals_cache["date"] = today_str
        _daily_totals_cache["perAgent"] = per_agent
    except Exception as e:
        print(f"❌ فشل تحديث كاش إجمالي اليوم: {e}")


async def daily_totals_watcher():
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        while True:
            await refresh_daily_totals_cache(client)
            await asyncio.sleep(DAILY_TOTALS_REFRESH_SECONDS)


@app.on_event("startup")
async def start_daily_totals_watcher():
    asyncio.create_task(daily_totals_watcher())


# ------------------------------------------------------------
# 📞 CALL LOG: تصنيف مكالمات الكيو (اترد / اتقفلت / اتحولت) وتسجيلها في شيت "Call Log"
# بيشتغل كل QUEUE_LOG_POLL_SECONDS، وبياخد نافذة زمنية فيها تداخل مع الدورة اللي فاتت
# (QUEUE_LOG_WINDOW_MINUTES) عشان أي تأخير أو تعارض في التوقيت ميخليش مكالمة تفوت التسجيل.
# التكرار متضمون من ناحية الشيت نفسه (بيتفادى MainCallHistoryId المتكرر) - مش من هنا.
# ------------------------------------------------------------

QUEUE_LOG_POLL_SECONDS = 5 * 60
QUEUE_LOG_WINDOW_MINUTES = 20

_HANDOFF_NAME_EXT_RE = re.compile(r"was replaced by (.+?)\s*\((\d+)\)")
_REDIRECT_NAME_EXT_RE = re.compile(r"forwarded to (.+?)\s*\((\d+)\)")
# لما العميل نفسه يقفل السماعة وهو لسه مستني في الكيو، 3CX بيحط في الـ Reason
# حاجة زي "Ended by 0501234567 (0501234567)" - يعني رقم العميل نفسه مش إيجستنشن إيجنت
_ENDED_BY_RE = re.compile(r"[Ee]nded by \S+\s*\((\d+)\)")


def classify_ended_by(ended_by_match):
    """بياخد نتيجة _ENDED_BY_RE.search(reason) ويرجع (endedBy, endedByType):
    لو الرقم اللي بين القوسين إيجستنشن إيجنت معروف -> (اسم الإيجنت, "Agent")
    غير كده (رقم عميل) -> (الرقم نفسه, "Customer")
    ولو الـ Reason مفيهوش "Ended by" أصلاً -> ("-", "-")"""
    if not ended_by_match:
        return "-", "-"
    number = ended_by_match.group(1)
    if number in AGENT_MAP:
        return AGENT_MAP[number], "Agent"
    return number, "Customer"


def build_call_log_url(period_from: datetime, period_to: datetime, skip: int, top: int = 500) -> str:
    def fmt(dt):
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z").replace(":", "%3A")

    path = (
        "/xapi/v1/ReportCallLogData/Pbx.GetCallLogData("
        f"periodFrom={fmt(period_from)},"
        f"periodTo={fmt(period_to)},"
        "sourceType=0,sourceFilter='',"
        "destinationType=0,destinationFilter='',"
        "callsType=0,callTimeFilterType=0,"
        "callTimeFilterFrom='0%3A00%3A0',callTimeFilterTo='0%3A00%3A0',"
        "hidePcalls=true)"
        f"?%24top={top}&%24skip={skip}"
    )
    return f"https://{THREECX_FQDN}{path}"


async def fetch_call_log_rows(client: httpx.AsyncClient, minutes_back: int):
    period_to = datetime.utcnow()
    period_from = period_to - timedelta(minutes=minutes_back)
    token = await get_3cx_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    all_rows = []
    skip = 0
    for _ in range(10):
        resp = await client.get(build_call_log_url(period_from, period_to, skip), headers=headers)
        data = resp.json()
        rows = data.get("value", [])
        if not rows:
            break
        all_rows.extend(rows)
        skip += 500
    return all_rows


def classify_queue_group(rows: list):
    """بياخد كل صفوف نفس المكالمة (MainCallHistoryId واحد) ويرجع تفاصيل مصنّفة
    عن صف الكيو بتاعها، أو None لو المجموعة دي مفيهاش أي صف كيو أصلاً"""
    queue_rows = sorted(
        (r for r in rows if r.get("CallType") == "Queue"),
        key=lambda r: r.get("StartTime") or ""
    )
    if not queue_rows:
        return None
    # لو المكالمة عدّت على أكتر من كيو (Overflow من كيو لكيو تاني لما التيم الأول
    # يكون كله مشغول)، بناخد آخر محطة كيو في السلسلة عشان نحكم بالنتيجة النهائية
    # الحقيقية (اترد من التيم التاني ولا اتقفلت هناك برضو) - مش بس أول كيو دخلت فيها
    queue_row = queue_rows[-1]

    reason = queue_row.get("Reason", "") or ""
    customer_number = queue_row.get("SourceCallerId") or queue_row.get("SourceDn", "")
    queue_name = queue_row.get("DestinationDisplayName") or queue_row.get("DestinationDn", "")
    wait_seconds = round(parse_iso_duration_seconds(queue_row.get("TalkingDuration", "")), 1)
    start = queue_row.get("StartTime", "") or ""
    date_part = start[:10] if start else ""
    time_part = start[11:19] if len(start) >= 19 else ""
    main_id = queue_row.get("MainCallHistoryId")

    ended_by_match = _ENDED_BY_RE.search(reason)
    ended_by, ended_by_type = classify_ended_by(ended_by_match)

    base = {
        "mainId": main_id,
        "date": date_part,
        "time": time_part,
        "customerNumber": customer_number,
        "queue": queue_name,
        "direction": "Inbound",
        "waitSeconds": wait_seconds,
        "reason": reason,
        "endedBy": ended_by,
        "endedByType": ended_by_type,
    }

    handoff = _HANDOFF_NAME_EXT_RE.search(reason)
    if handoff and handoff.group(2) in AGENT_MAP:
        agent_name, agent_ext = handoff.group(1).strip(), handoff.group(2)
        agent_row = next(
            (r for r in rows if r.get("DestinationDn") == agent_ext and r.get("CallType") != "Queue"),
            None
        )
        talk_seconds = round(parse_iso_duration_seconds(agent_row.get("TalkingDuration", "")), 1) if agent_row else wait_seconds
        # مهم: "Ended by" في المكالمات اللي اترد عليها بيكون موجود في الـ Reason
        # بتاع صف الإيجنت نفسه (مش صف الكيو) - عشان كده بنقرا الـ endedBy هنا تاني
        # من reason بتاع agent_row، وبنسيب النسخة اللي في base (من reason الكيو)
        # بس لو مفيش agent_row أصلاً
        if agent_row:
            agent_ended_by_match = _ENDED_BY_RE.search(agent_row.get("Reason", "") or "")
            ended_by, ended_by_type = classify_ended_by(agent_ended_by_match)
        base.update({
            "result": "Answered", "agent": f"{agent_name} ({agent_ext})", "talkSeconds": talk_seconds,
            "endedBy": ended_by, "endedByType": ended_by_type,
        })
        return base

    redirect = _REDIRECT_NAME_EXT_RE.search(reason)
    if redirect and not queue_row.get("Answered", False):
        target_name, target_ext = redirect.group(1).strip(), redirect.group(2)
        base.update({"result": "Redirected", "agent": f"{target_name} ({target_ext})", "talkSeconds": 0})
        return base

    # "was replaced by" لرقم مش إيجنت حقيقي (زي IVR أو Voicemail) - اتحولت، مش رد عليها حد فعليًا
    if handoff:
        target_name, target_ext = handoff.group(1).strip(), handoff.group(2)
        base.update({"result": "Redirected", "agent": f"{target_name} ({target_ext})", "talkSeconds": 0})
        return base

    # العميل نفسه قفل السماعة وهو لسه مستني في الكيو (Reason: "Ended by <رقم العميل>")
    # - ده تقفيل حقيقي من العميل قبل ما حد يرد عليه، بغض النظر عن قيمة "Answered"
    # اللي 3CX أحياناً بترجعها true غلط في الحالة دي
    if ended_by_match and ended_by_match.group(1) not in AGENT_MAP:
        base.update({"result": "Abandoned", "agent": "-", "talkSeconds": 0})
        return base

    if not queue_row.get("Answered", False):
        base.update({"result": "Abandoned", "agent": "-", "talkSeconds": 0})
        return base

    base.update({"result": "Unknown", "agent": "-", "talkSeconds": 0})
    return base


def classify_outbound_row(row: dict):
    """أي صف Direction=Outbound لإيجنت معروف - بنسجله كله حتى لو فشل تقنيًا (رقم غلط، مفيش رد)"""
    ext = row.get("SourceDn")
    agent_name = AGENT_MAP.get(ext)
    if not agent_name:
        return None

    start = row.get("StartTime", "") or ""
    date_part = start[:10] if start else ""
    time_part = start[11:19] if len(start) >= 19 else ""
    talk_seconds = round(parse_iso_duration_seconds(row.get("TalkingDuration", "")), 1)
    ring_seconds = round(parse_iso_duration_seconds(row.get("RingingDuration", "")), 1)
    reason = row.get("Reason", "") or ""
    ended_by, ended_by_type = classify_ended_by(_ENDED_BY_RE.search(reason))

    return {
        "mainId": row.get("MainCallHistoryId"),
        "date": date_part,
        "time": time_part,
        "customerNumber": row.get("DestinationCallerId") or row.get("DestinationDn", ""),
        "queue": "-",
        "direction": "Outbound",
        "result": "Answered" if row.get("Answered", False) else "Unanswered",
        "agent": f"{agent_name} ({ext})",
        "waitSeconds": ring_seconds,
        "talkSeconds": talk_seconds,
        "reason": reason,
        "endedBy": ended_by,
        "endedByType": ended_by_type,
    }


async def queue_call_logger_watcher():
    async with httpx.AsyncClient(timeout=45) as client:
        while True:
            try:
                rows = await fetch_call_log_rows(client, QUEUE_LOG_WINDOW_MINUTES)
                groups = {}
                for row in rows:
                    groups.setdefault(row.get("MainCallHistoryId"), []).append(row)

                payload = [c for c in (classify_queue_group(g) for g in groups.values()) if c]

                for row in rows:
                    if row.get("Direction") == "Outbound":
                        classified = classify_outbound_row(row)
                        if classified:
                            payload.append(classified)

                if payload:
                    sheet_url = os.environ["GOOGLE_SHEET_API_URL"]
                    resp = await client.post(
                        sheet_url,
                        json={"action": "logQueueCalls", "rows": payload},
                        timeout=60,
                    )
                    print(f"📞 Call Log: بعتت {len(payload)} مكالمة (كيو + صادرة) - رد الشيت: {resp.text[:200]}")
            except Exception as e:
                print(f"❌ خطأ في مراقبة Call Log: {e}")

            await asyncio.sleep(QUEUE_LOG_POLL_SECONDS)


@app.on_event("startup")
async def start_queue_call_logger_watcher():
    asyncio.create_task(queue_call_logger_watcher())


# ============================================================
# ☕ Break Queue - دور بريك حقيقي جوه help.spc بدل الكتابة اليدوية في Teams
#
# الطابور نفسه (queued -> ready) بيتسجل في الذاكرة عشان يبقى سريع وفوري،
# لكن بداية/نهاية البريك الفعلية بتتحدد تلقائي من حالة الإيجنت الحقيقية على
# 3CX (نفس المراقبة اللي شغالة بالفعل فوق - agent_status_watcher - وبتسجل
# كل تغيير في شيت AgentStatusLog). يعني:
#
#   queued -> ready (لما مكان يفضى حسب السقف، بيتبعتله تنبيه) -> active
#   (تلقائي أول ما هو فعليًا يغيّر حالته لـ "Break" على 3CX) -> بيتشال من
#   الطابور تلقائي أول ما يرجع لأي حالة تانية غير Break - من غير أي زرار
#   Start/End يدوي خالص.
#
# رصيد الـ30 دقيقة اليومي بردو مش عداد منفصل بنمسكه إحنا - بيتحسب من نفس
# الرقم الحقيقي (todaysBreakSeconds) اللي شيت AgentStatusLog بيحسبه فعليًا
# لكل إيجنت (_daily_totals_cache، بيتحدث كل 20 ثانية من نفس الشيت). فمفيش
# أي احتمال يحصل فرق بين اللي في السيستم واللي حصل فعلاً على 3CX، وبيفضل
# صح حتى بعد أي Deploy/Restart لأنه أصلاً متسجل في الشيت مش في الذاكرة.
#
# لو حصل خطأ في البيانات نفسها (3CX سجل حاجة غلط)، بيتصلح من نفس مكان
# تعديل الـ Timeline الموجود بالفعل في CC Pulse (أدمن) - وهيتصحح تلقائي في
# كل حاجة تانية معاها بما فيها رصيد البريك، من غير أي حاجة تانية نعملها هنا.
#
# لو حد كان "ready" (جاله دوره) وبعدين الأدمن قلل السقف، مبنشيلوش من
# "ready" - هو محتفظ بمكانه المحجوز، بس أي ترقية جديدة من "queued" بتتوقف
# لحد ما العدد الشغال (ready + اللي فعلاً على Break دلوقتي) ينزل تحت السقف
# الجديد تاني.
# ============================================================

BREAK_DAILY_BUDGET_SECONDS = 30 * 60
BREAK_DEFAULT_CAP = 1
BREAK_STATUS_NAME = "Break"  # اسم البروفايل على 3CX اللي بيدل على إن الإيجنت فعليًا واقف بريك

_break_cap_state = {"cap": BREAK_DEFAULT_CAP, "expires_at": None}
_break_records = []  # [{id, agent, requested_seconds, status, queued_at, ready_at, started_at}]


def _uae_today_str() -> str:
    uae_dt = datetime.utcnow() + timedelta(hours=4)
    return uae_dt.strftime("%Y-%m-%d")


def _uae_hhmm_to_epoch(hhmm: str) -> float:
    """بيحول وقت زي '14:30' (بتوقيت الإمارات، 24 ساعة) لأقرب لحظة قادمة بيه -
    لو الوقت ده فات النهاردة، بيحسبها بكرة تلقائي."""
    hh_str, mm_str = hhmm.strip().split(":")
    hh, mm = int(hh_str), int(mm_str)
    if not (0 <= hh <= 23 and 0 <= mm <= 59):
        raise ValueError("invalid time")
    uae_now = datetime.utcnow() + timedelta(hours=4)
    target_uae = uae_now.replace(hour=hh, minute=mm, second=0, microsecond=0)
    if target_uae <= uae_now:
        target_uae += timedelta(days=1)
    target_utc_naive = target_uae - timedelta(hours=4)
    return calendar.timegm(target_utc_naive.timetuple())


def _agents_on_break_now() -> set:
    """مجموعة أسماء الإيجنتس اللي حالتهم الحقيقية على 3CX دلوقتي = Break -
    مصدرها _last_known_status اللي بتتحدث كل 10 ثواني (agent_status_watcher
    فوق) وبترجع صح حتى بعد Restart بفضل hydrate_status_from_sheet()."""
    names = set()
    for number, status in _last_known_status.items():
        if status == BREAK_STATUS_NAME:
            name = AGENT_MAP.get(number)
            if name:
                names.add(name)
    return names


def _get_break_remaining_seconds(agent: str) -> int:
    """رصيد النهاردة المتبقي - من نفس الرقم الحقيقي (todaysBreakSeconds)
    اللي بيتحسب لكل إيجنت من شيت AgentStatusLog (_daily_totals_cache) -
    مش عداد منفصل، فمفيش أي فرق ممكن يحصل مع اللي حصل فعليًا على 3CX."""
    used = (_daily_totals_cache.get("perAgent", {}).get(agent, {}) or {}).get("breakSeconds", 0) or 0
    return max(0, int(BREAK_DAILY_BUDGET_SECONDS - used))


def _effective_break_cap() -> int:
    now = time.time()
    if _break_cap_state["expires_at"] is not None and now >= _break_cap_state["expires_at"]:
        _break_cap_state["cap"] = BREAK_DEFAULT_CAP
        _break_cap_state["expires_at"] = None
    return _break_cap_state["cap"]


def _sync_break_records_with_real_status():
    """بيراجع كل الطلبات 'ready' و'active' على حالة 3CX الحقيقية:
    - 'ready' وحالته الحقيقية بقت Break -> يترقّى تلقائي لـ 'active'
    - 'active' وحالته الحقيقية مبقتش Break -> خلص بريكه فعليًا، بيتشال
      خالص من الطابور (وقته الحقيقي اتسجل خلاص في شيت AgentStatusLog)"""
    real_names = _agents_on_break_now()
    for r in _break_records:
        if r["status"] == "ready" and r["agent"] in real_names:
            r["status"] = "active"
            r["started_at"] = time.time()

    _break_records[:] = [
        r for r in _break_records
        if not (r["status"] == "active" and r["agent"] not in real_names)
    ]


def _break_occupied_count() -> int:
    real_names = _agents_on_break_now()
    ready_names = {r["agent"] for r in _break_records if r["status"] == "ready"}
    return len(real_names | ready_names)


def _promote_break_queue():
    """بيرقّي أقدم الطلبات 'queued' لحالة 'ready' طول ما فيه أماكن فاضية حسب
    السقف الحالي - بيحافظ على ترتيب الأقدمية (FIFO)."""
    _sync_break_records_with_real_status()
    cap = _effective_break_cap()
    queued = sorted(
        (r for r in _break_records if r["status"] == "queued"),
        key=lambda r: r["queued_at"],
    )
    for r in queued:
        if _break_occupied_count() >= cap:
            break
        r["status"] = "ready"
        r["ready_at"] = time.time()


def _serialize_break_record(r: dict) -> dict:
    return {
        "id": r["id"],
        "agent": r["agent"],
        "requested_seconds": r["requested_seconds"],
        "status": r["status"],
        "queued_at": r["queued_at"],
        "ready_at": r.get("ready_at"),
        "started_at": r.get("started_at"),
    }


class BreakRequestModel(BaseModel):
    agent: str
    requested_seconds: int


class BreakActionModel(BaseModel):
    agent: str
    id: str


class BreakSetCapModel(BaseModel):
    cap: int
    revert_at_uae_time: Optional[str] = None  # "HH:MM" 24-hour, UAE local time - None = no auto-revert


@app.get("/api/break/status")
async def api_break_status(agent: str):
    _promote_break_queue()

    my_record = next(
        (r for r in _break_records if r["agent"] == agent and r["status"] in ("queued", "ready", "active")),
        None,
    )
    active = [_serialize_break_record(r) for r in _break_records if r["status"] == "active"]
    ready = [_serialize_break_record(r) for r in _break_records if r["status"] == "ready"]
    queued = sorted(
        (_serialize_break_record(r) for r in _break_records if r["status"] == "queued"),
        key=lambda r: r["queued_at"],
    )

    return {
        "cap": _effective_break_cap(),
        "cap_expires_at": _break_cap_state["expires_at"],
        "active": active,
        "ready": ready,
        "queue": queued,
        "my_record": _serialize_break_record(my_record) if my_record else None,
        "budget_remaining_seconds": _get_break_remaining_seconds(agent),
        "budget_total_seconds": BREAK_DAILY_BUDGET_SECONDS,
        "server_time": time.time(),
    }


@app.post("/api/break/request")
async def api_break_request(data: BreakRequestModel):
    agent = (data.agent or "").strip()
    if not agent:
        raise HTTPException(status_code=400, detail="agent مطلوب")
    if data.requested_seconds <= 0:
        raise HTTPException(status_code=400, detail="لازم تحدد مدة أكبر من صفر")

    _sync_break_records_with_real_status()

    existing = next(
        (r for r in _break_records if r["agent"] == agent and r["status"] in ("queued", "ready", "active")),
        None,
    )
    if existing:
        raise HTTPException(status_code=409, detail="عندك طلب بريك شغال بالفعل")

    if _get_break_remaining_seconds(agent) <= 0:
        raise HTTPException(status_code=409, detail="خلص رصيد البريك بتاعك النهاردة (30 دقيقة)")

    record = {
        "id": str(uuid.uuid4()),
        "agent": agent,
        "requested_seconds": data.requested_seconds,
        "status": "queued",
        "queued_at": time.time(),
        "ready_at": None,
        "started_at": None,
    }
    _break_records.append(record)
    _promote_break_queue()
    return {"ok": True, "record": _serialize_break_record(record)}


@app.post("/api/break/cancel")
async def api_break_cancel(data: BreakActionModel):
    record = next((r for r in _break_records if r["id"] == data.id and r["agent"] == data.agent), None)
    if not record:
        raise HTTPException(status_code=404, detail="مفيش طلب بريك بالمواصفات دي")
    if record["status"] not in ("queued", "ready"):
        raise HTTPException(status_code=409, detail="البريك ده مبقاش ينفع يتلغي - إما شغال فعليًا أو خلص")

    _break_records[:] = [r for r in _break_records if r["id"] != data.id]
    _promote_break_queue()
    return {"ok": True}


@app.post("/api/break/admin/set-cap")
async def api_break_set_cap(data: BreakSetCapModel):
    if data.cap < 1:
        raise HTTPException(status_code=400, detail="السقف لازم يكون 1 على الأقل")

    expires_at = None
    if data.revert_at_uae_time:
        try:
            expires_at = _uae_hhmm_to_epoch(data.revert_at_uae_time)
        except Exception:
            raise HTTPException(status_code=400, detail="صيغة الوقت غلط - لازم HH:MM")

    _break_cap_state["cap"] = data.cap
    _break_cap_state["expires_at"] = expires_at
    _promote_break_queue()
    return {"ok": True, "cap": _break_cap_state["cap"], "cap_expires_at": _break_cap_state["expires_at"]}
