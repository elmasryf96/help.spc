import os
import re
import asyncio
import calendar
import subprocess
import httpx
from datetime import datetime, timedelta
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
    "121": "Minhaj",
    "122": "Sana",
    "123": "Gulsher",
    "125": "Mostafa",
    "126": "Saim",
    "127": "Zain",
    "128": "Fatemeh",
    "129": "Hajra",
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

        active_calls = await get_3cx_active_calls(client, token)

    # بنحول قايمة المكالمات لـ dict على أساس رقم الإيجستنشن، عشان نلاقي مكالمة كل إيجنت بسرعة
    # (بنجرب كذا اسم حقل مختلف لأن 3CX ممكن يرجّع Dn أو DnNumber حسب النسخة)
    calls_by_ext = {}
    seen_call_ids = set()
    for c in active_calls:
        ext = str(c.get("Dn") or c.get("DnNumber") or c.get("Number") or "").strip()
        if not ext:
            continue
        status = str(c.get("Status") or "")
        # بنعرض بس المكالمة اللي فعلاً شغالة (متكلم فيها)، مش الرنة أو وهي بتتعمل
        if status.lower() not in ("connected", "talking"):
            continue

        call_id = str(c.get("Id") or f"{ext}-{c.get('Callee') or c.get('Caller')}")
        seen_call_ids.add(call_id)
        if call_id not in _call_start:
            _call_start[call_id] = time.time()

        other_party_raw = str(c.get("Callee") or c.get("Caller") or c.get("CalleeId") or c.get("CallerId") or "-").strip()
        other_party = AGENT_MAP.get(other_party_raw, other_party_raw)
        calls_by_ext[ext] = {
            "with": str(other_party),
            "startedAt": _call_start[call_id],
        }

    # بننظف أي مكالمة خلصت من الذاكرة عشان الـ dict مايكبرش على طول
    for call_id in list(_call_start.keys()):
        if call_id not in seen_call_ids:
            _call_start.pop(call_id, None)

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
        })
    return result


@app.get("/api/agent-status")
async def agent_status():
    try:
        return await get_3cx_agent_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"3CX fetch failed: {e}")


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
            params={"action": "allAgentsLoginTotals", "mode": "day", "date": today_str},
            timeout=30,
        )
        data = resp.json()
        if data.get("status") != "success":
            return

        per_agent = {}
        for agent in data.get("agents", []):
            totals = agent.get("totals", {}) or {}
            per_agent[agent["name"]] = {
                "totalSeconds": agent.get("totalLoginSeconds", 0),
                "breakSeconds": totals.get("Break", 0),
            }

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
