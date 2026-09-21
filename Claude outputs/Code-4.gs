function doGet(e) {
  // ✅ الاتنين دول بيفضلوا من غير أي تسجيل دخول عمدًا - مفيش فيهم أي داتا حساسة:
  //   - checkForceLogout: بيرجع بس timestamp، بيتستخدم عشان أي تاب مفتوح
  //     (حتى لو جلسته خلصت) يعرف إنه لازم يعمل Force Logout
  //   - todayStatusLog: بينادى بس من السيرفر (server.py على Render) عشان
  //     يفتكر آخر حالة لكل إيجنت بعد أي Restart - مفيش Session token عنده
  //     أصلاً لأنه مش متصفح مسجل دخول (نفس مبدأ logAgentStatusChange/
  //     logQueueCalls تحت في doPost)
  if (e.parameter && e.parameter.action === "todayStatusLog") {
    var log = getTodayStatusLog_();
    return ContentService.createTextOutput(JSON.stringify(log))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e.parameter && e.parameter.action === "checkForceLogout") {
    var signalProps = PropertiesService.getScriptProperties().getProperties();
    var forceLogoutAt = signalProps["forceLogoutAt"] || "0";
    // 🔄 swapChangedAt: بيتغير كل ما طلب سواب يتبعت أو يتردّ عليه (Swap.gs) - الفرونت إند بيقارنه
    // بآخر قيمة شافها ويسحب قايمة الطلبات بس لو اتغيرت، عشان مفيش Polling إضافي على الـ Apps Script
    var swapChangedAt = signalProps["swapChangedAt"] || "0";
    return ContentService.createTextOutput(JSON.stringify({ status: "success", forceLogoutAt: forceLogoutAt, swapChangedAt: swapChangedAt }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 🔐 من هنا لتحت: أي طلب لازم يكون معاه session token صحيح (نفس التوكن اللي
  // بيرجع من اللوجن) - من غيره بيرجع "Unauthorized" فورًا من غير أي داتا حقيقية.
  // قبل الإصلاح ده كان أي حد يعرف رابط الـ Web App (وهو ظاهر أصلاً في الريبو
  // العام على GitHub، في js/core.js) يقدر ياخد كل بيانات الأبراج/الموظفين/
  // العملاء/تقارير الحالة وسجل المكالمات من غير ما يسجل دخول خالص - كان بس
  // الباسورد اللي اتشال من الرد، مش الداتا كلها.
  //
  // ✅ استثناء إضافي (17 Sept): نداءات السيرفر نفسه (server.py على Render، مش
  // متصفح مسجل دخول) بتبعت "syncSecret" بدل "token" لأكشنز allAgentsLoginTotals
  // و callLogReport (دول اللي بيحتاجهم refresh_daily_totals_cache في server.py
  // عشان يحدّث كاش "إجمالي شغل النهاردة" - كانوا بيفشلوا بصمت من غير التوكن ده،
  // وده كان السبب الحقيقي في إن الكاونتر والكروت كانوا بيفضلوا فاضيين/بيعملوا
  // ريست). لو الـ syncSecret مطابق لـ SYNC_SECRET المتخزن في Script Properties،
  // بنعتبره Authorized برضو من غير ما نطلب Session Token حقيقي.
  var isServerSyncCall = isValidSyncSecret_(e.parameter && e.parameter.syncSecret);

  if (!isServerSyncCall) {
    var authCheck = verifySessionToken_(e.parameter && e.parameter.token);
    if (!authCheck.valid) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: authCheck.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (e.parameter && e.parameter.action === "agentStatusReport") {
    var report = getAgentStatusReport_(e.parameter);
    return ContentService.createTextOutput(JSON.stringify(report))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e.parameter && e.parameter.action === "allAgentsLoginTotals") {
    var totalsReport = getAllAgentsLoginTotals_(e.parameter);
    return ContentService.createTextOutput(JSON.stringify(totalsReport))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e.parameter && e.parameter.action === "callLogReport") {
    var callLogReport = getCallLogReport_(e.parameter);
    return ContentService.createTextOutput(JSON.stringify(callLogReport))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e.parameter && e.parameter.action === "callLogDetail") {
    var callLogDetail = getCallLogDetail_(e.parameter);
    return ContentService.createTextOutput(JSON.stringify(callLogDetail))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 🔄 طلبات تبديل الشيفتات (Swap.gs) - لازم توكن يوزر حقيقي (مش syncSecret بتاع السيرفر)
  // عشان نعرف مين اليوزر ونرجعله بس الطلبات اللي تخصه (أو كلها لو أدمن)
  if (e.parameter && e.parameter.action === "swapRequests") {
    if (isServerSyncCall) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "User session required" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var swapAuth = verifySessionToken_(e.parameter.token);
    var swapList = listSwapRequests_(SpreadsheetApp.getActiveSpreadsheet(), swapAuth.username, swapAuth.role);
    return ContentService.createTextOutput(JSON.stringify(swapList))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ⚡ الحمولة الكاملة (users+towers+roster+schedule+unitMapping) بتتكاش لمدة
  // قصيرة عشان أي فتح صفحة/تنقل ما يعملش قراءة كاملة لكل الشيتات من الصفر في
  // كل مرة - أي تعديل حقيقي (updateTower/changePassword/إلخ) بيمسح الكاش فورًا
  // (invalidateFullDataCache_) فمفيش خطر إن حد ياخد بيانات قديمة بعد تعديل
  var fullDataCache = CacheService.getScriptCache();
  var cachedPayload = fullDataCache.get(FULL_DATA_CACHE_KEY);
  if (cachedPayload) {
    return ContentService.createTextOutput(cachedPayload)
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 0. جلب بيانات اليوزرات من شيت "Users"
  var usersSheet = ss.getSheetByName("Users") || ss.getSheetByName("users");
  var usersData = {};
  if (usersSheet) {
    var uData = usersSheet.getDataRange().getValues();
    for (var u = 1; u < uData.length; u++) {
      var uRow = uData[u];
      var uName = String(uRow[0]).trim();
      if (uName !== "") {
        // ⚠️ الباسورد اتشال من هنا عمداً - الرد ده كان قبل كده بيرجع باسورد كل
        // اليوزرز بالنص الصريح لأي حد يعمل GET عادي للرابط من غير أي تسجيل
        // دخول. الباسورد بقى بيتفحص على السيرفر نفسه بس (handleLightLogin_
        // و doPost's changePassword) ومش بيتبعت للفرونت إند خالص تاني.
        usersData[uName] = {
          role: String(uRow[2] || "user").trim().toLowerCase(),
          fullName: uRow[3] ? String(uRow[3]).trim() : uName,
          email: uRow[4] ? String(uRow[4]).trim() : ""
        };
      }
    }
  }

  // 1. الأبراج
  var towersSheet = ss.getSheetByName("Towers") || ss.getSheets()[0];
  var towersData = {};
  if (towersSheet) {
    var data = towersSheet.getDataRange().getDisplayValues();
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var towerKey = String(row[0]).trim();
      if (towerKey !== "") {
        towersData[towerKey] = {
          client: row[1] ? String(row[1]).trim() : "",
          location: row[2] ? String(row[2]).trim() : "",
          bank: row[3] ? String(row[3]).trim() : "",
          deposit: row[4] ? String(row[4]).trim() : "",
          deposit_amount: row[5] ? String(row[5]).trim() : "",
          online: row[6] ? String(row[6]).trim() : "",
          billing: row[7] ? String(row[7]).trim() : "",
          late: row[8] ? String(row[8]).trim() : "",
          activation: row[9] ? String(row[9]).trim() : "",
          disconnection: row[10] ? String(row[10]).trim() : "",
          noc: row[11] ? String(row[11]).trim() : "",
          final: row[12] ? String(row[12]).trim() : "",
          maintenance: row[13] ? String(row[13]).trim() : ""
        };
      }
    }
  }

  // 2. الروستر
  var rosterSheet = ss.getSheetByName("Roster") || ss.getSheetByName("roster") || ss.getSheetByName("ROSTER");
  var rosterData = [];
  if (rosterSheet) {
    var rData = rosterSheet.getDataRange().getDisplayValues();
    if (rData.length > 1) {
      var nameColIdx = 3;
      var deptColIdx = 1;
      var langColIdx = 2;
      var monthColIdx = 0;
      var dayStartIdx = 4;

      for (var j = 1; j < rData.length; j++) {
        var rRow = rData[j];
        var agentName = String(rRow[nameColIdx]).trim();

        if (agentName !== "" && agentName.toLowerCase() !== "agent name") {
          var scheduleObj = {};
          for (var day = 1; day <= 31; day++) {
            var cellVal = rRow[dayStartIdx + day - 1];
            scheduleObj[day] = (cellVal !== undefined && cellVal !== null) ? String(cellVal).trim() : "";
          }

          rosterData.push({
            dept: String(rRow[deptColIdx] || "Calls").trim(),
            name: agentName,
            lang: String(rRow[langColIdx] || "Ara").trim(),
            month: String(rRow[monthColIdx] || "8").trim(),
            schedule: scheduleObj
          });
        }
      }
    }
  }

  // 3. المعاينات
  var schedSheet = ss.getSheetByName("Inspection Schedule") || ss.getSheetByName("Schedule") || ss.getSheetByName("Inspection");
  var scheduleData = [];
  if (schedSheet) {
    var sData = schedSheet.getDataRange().getDisplayValues();
    if (sData.length > 0) {
      var headersSched = sData[0];
      for (var col = 0; col < headersSched.length; col++) {
        var dayName = String(headersSched[col]).trim();
        if (dayName === "") continue;
        var buildings = [];
        for (var row = 1; row < sData.length; row++) {
          var bName = String(sData[row][col]).trim();
          if (bName !== "") buildings.push(bName);
        }
        if (buildings.length > 0) scheduleData.push({ day: dayName, buildings: buildings });
      }
    }
  }

  // 4. Mapping
  var mappingSheet = ss.getSheetByName("UnitMapping") || ss.getSheetByName("unitmapping");
  var unitMappingData = [];
  if (mappingSheet) {
    var mData = mappingSheet.getDataRange().getDisplayValues();
    if (mData.length > 1) {
      var mHeaders = mData[0];
      for (var k = 1; k < mData.length; k++) {
        var mRow = mData[k];
        if (!mRow[0] || String(mRow[0]).trim() === "") continue;
        var unitObj = {};
        for (var colIdx = 0; colIdx < mHeaders.length; colIdx++) {
          var headerKey = String(mHeaders[colIdx]).trim().toLowerCase();
          unitObj[headerKey] = String(mRow[colIdx] || "").trim();
        }
        unitMappingData.push(unitObj);
      }
    }
  }

  var responseData = {
    users: usersData,
    towers: towersData,
    roster: rosterData,
    schedule: scheduleData,
    unitMapping: unitMappingData
  };

  var responseJson = JSON.stringify(responseData);

  // نحاول نكاش الناتج عشان الطلبات الجايه بعد كده تبقى فورية - لو الحجم أكبر
  // من حد الـ Cache (100KB) هيفشل بهدوء من غير ما يوقف الطلب الحالي
  try {
    fullDataCache.put(FULL_DATA_CACHE_KEY, responseJson, FULL_DATA_CACHE_TTL_SECONDS);
  } catch (cacheErr) {
    // تجاهل - الحجم أكبر من حد الكاش، هيفضل يشتغل عادي بس من غير كاش
  }

  return ContentService.createTextOutput(responseJson)
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------
// ⚡ كاش الحمولة الكاملة لـ doGet (شوف الشرح جوه doGet نفسها)
// ------------------------------------------------------------
var FULL_DATA_CACHE_KEY = "FULL_DATA_PAYLOAD_V1";
var FULL_DATA_CACHE_TTL_SECONDS = 60;

function invalidateFullDataCache_() {
  try {
    CacheService.getScriptCache().remove(FULL_DATA_CACHE_KEY);
  } catch (e) {
    // مفيش حاجة نعملها لو فشل المسح - الكاش هينتهي لوحده خلال دقيقة بره كده
  }
}

// ------------------------------------------------------------
// 🔔 Force Logout تلقائي عند أي تعديل مباشر (يدوي) في شيتات البيانات
// الأساسية (Towers, Roster, Users, UnitMapping, Inspection Schedule) -
// بيبعت نفس إشارة زرار "Force Logout All Users" اليدوي، فأي تاب مفتوح
// هيعمل Logout + Reload تلقائي خلال ثواني ويشوف آخر نسخة من البيانات.
//
// ⚠️ مُستثنى عمدًا: AgentStatusLog, Call Log, NOC_Logs - دول بيتكتب فيهم
// صفوف جديدة كل شوية ثواني تلقائيًا من الموقع نفسه، فلو دخلوا هنا هيعمل
// Force Logout لكل الناس بشكل مستمر ويكسر الموقع تمامًا.
//
// ⚙️ التركيب (مرة واحدة بس، لازم إنسان يعملها يدوي من واجهة Apps Script -
// مفيش طريقة تتعمل بالكود نفسه): من محرر Apps Script > أيقونة الساعة ⏰
// (Triggers) من الشريط الجانبي الشمال > + Add Trigger (تحت يمين) > اختار:
//   Choose which function to run: onEditMasterSheets
//   Select event source: From spreadsheet
//   Select event type: On edit
// واحفظ (ممكن يطلب صلاحية إضافية أول مرة - وافق عليها). من ساعتها أي
// تعديل يدوي في الشيتات دي هيعمل Force Logout تلقائي لكل اليوزرز.
// ------------------------------------------------------------
// ------------------------------------------------------------
// 🔐 SESSION TOKENS - توكن موقّع (HMAC-SHA256) بيتولد وقت اللوجن بس، وبيتبعت
// بعد كده مع أي عملية "حساسة" (تغيير باسورد / تعديل بيانات برج / فورس لوجاوت
// للكل) عشان السيرفر يتأكد إن الطلب فعلاً جاي من يوزر سجل دخول ببيانات صح -
// مش من أي حد عرف رابط الـ Web App بس (اللي هو أصلاً ظاهر لأي حد يفتح الريبو
// على GitHub أو يفتح Network tab في المتصفح). التوقيع بيتعمل بمفتاح سري
// (APP_SECRET) متخزن في Script Properties بس - مش موجود في أي كود بيتنشر،
// فمفيش حد برا يقدر يزوّر توكن حتى لو شاف كل كود الموقع.
//
// ⚙️ التركيب (مرة واحدة بس، لازم إنسان يعملها يدوي): من محرر Apps Script >
// أيقونة الترس ⚙️ (Project Settings) من الشريط الجانبي الشمال > انزل لـ
// "Script Properties" > Add script property:
//   Property: APP_SECRET
//   Value: أي نص عشوائي طويل (32 حرف فأكتر) - أي password generator يكفي
// واحفظ. من غيرها أي عملية حساسة هترجع "Unauthorized" لحد ما تتظبط.
// ------------------------------------------------------------
var SESSION_TOKEN_TTL_MS_ = 24 * 60 * 60 * 1000; // صلاحية التوكن: 24 ساعة

function getAppSecret_() {
  var secret = PropertiesService.getScriptProperties().getProperty("APP_SECRET");
  if (!secret) throw new Error("APP_SECRET is not configured in Script Properties - see setup comment above generateSessionToken_");
  return secret;
}

function generateSessionToken_(username, role) {
  var payload = JSON.stringify({ u: username, r: role, exp: Date.now() + SESSION_TOKEN_TTL_MS_ });
  var payloadB64 = Utilities.base64EncodeWebSafe(payload);
  var sigBytes = Utilities.computeHmacSha256Signature(payloadB64, getAppSecret_());
  var sigB64 = Utilities.base64EncodeWebSafe(sigBytes);
  return payloadB64 + "." + sigB64;
}

// بيرجع {valid:true, username, role} لو التوكن صح ولسه ساري، أو {valid:false, message}
function verifySessionToken_(token) {
  try {
    if (!token || typeof token !== "string" || token.indexOf(".") === -1) {
      return { valid: false, message: "Missing or invalid session - please log in again" };
    }
    var dotIdx = token.indexOf(".");
    var payloadB64 = token.substring(0, dotIdx);
    var sigB64 = token.substring(dotIdx + 1);

    var expectedSigBytes = Utilities.computeHmacSha256Signature(payloadB64, getAppSecret_());
    var expectedSigB64 = Utilities.base64EncodeWebSafe(expectedSigBytes);

    if (sigB64 !== expectedSigB64) {
      return { valid: false, message: "Invalid session - please log in again" };
    }

    var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadB64)).getDataAsString());
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false, message: "Session expired - please log in again" };
    }

    return { valid: true, username: payload.u, role: payload.r };
  } catch (err) {
    return { valid: false, message: "Invalid session - please log in again" };
  }
}

// بيتأكد إن الطلب معاه توكن صحيح (ولو requireAdmin=true، إن الرول admin) -
// بيرجع {ok:true, username, role} أو {ok:false, response: جاهز للـ return مباشرة}
function requireSession_(data, requireAdmin) {
  var check = verifySessionToken_(data && data.token);
  if (!check.valid) {
    return {
      ok: false,
      response: ContentService.createTextOutput(JSON.stringify({ status: "error", message: check.message }))
        .setMimeType(ContentService.MimeType.JSON)
    };
  }
  if (requireAdmin && check.role !== "admin") {
    return {
      ok: false,
      response: ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Admin access required" }))
        .setMimeType(ContentService.MimeType.JSON)
    };
  }
  return { ok: true, username: check.username, role: check.role };
}

// ------------------------------------------------------------
// 🔑 SYNC SECRET - سيكريت ثابت (مش موقّع/مش له صلاحية زمنية زي التوكن) خاص
// بنداءات السيرفر نفسه بس (server.py على Render) لأكشنز القراءة الثقيلة
// (allAgentsLoginTotals, callLogReport) اللي محتاجها refresh_daily_totals_cache
// في الـ background - دي نداءات مش جاية من متصفح يوزر مسجل دخول، فمفيش
// عندها Session Token حقيقي، فبنستخدم سيكريت مشترك بدل منه.
//
// ⚙️ التركيب (مرة واحدة بس، لازم إنسان يعملها يدوي): من محرر Apps Script >
// أيقونة الترس ⚙️ (Project Settings) > Script Properties > Add script property:
//   Property: SYNC_SECRET
//   Value: نفس القيمة المتخزنة في Render Environment Variables تحت اسم
//          SYNC_SECRET بالظبط (لازم تكون متطابقة 100% في المكانين)
// واحفظ.
// ------------------------------------------------------------
function isValidSyncSecret_(secret) {
  var stored = PropertiesService.getScriptProperties().getProperty("SYNC_SECRET");
  return !!stored && !!secret && secret === stored;
}

var MASTER_DATA_SHEET_NAMES_ = ["towers", "roster", "users", "unitmapping", "inspection schedule", "schedule", "inspection"];

function onEditMasterSheets(e) {
  try {
    if (!e || !e.range) return;
    var sheetName = e.range.getSheet().getName();
    if (MASTER_DATA_SHEET_NAMES_.indexOf(String(sheetName).trim().toLowerCase()) === -1) return;

    PropertiesService.getScriptProperties().setProperty("forceLogoutAt", String(Date.now()));
    invalidateFullDataCache_();
  } catch (err) {
    // متعملش حاجة - أي خطأ هنا ميوقفش التعديل نفسه في الشيت
  }
}

// ------------------------------------------------------------
// 🔐 تسجيل الدخول - فحص خفيف بيقرا بس شيت "Users" (مش كل بيانات الموقع
// زي towers/roster/schedule/unitMapping) عشان اللوجن يبقى سريع
// ------------------------------------------------------------
function handleLightLogin_(params) {
  var username = String((params && params.username) || "").trim();
  var password = String((params && params.password) || "").trim();

  if (!username) {
    return { status: "error", message: "Missing username" };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usersSheet = ss.getSheetByName("Users") || ss.getSheetByName("users");
  if (!usersSheet) {
    return { status: "error", message: "Sheet Users not found" };
  }

  var uData = usersSheet.getDataRange().getValues();
  for (var u = 1; u < uData.length; u++) {
    var uRow = uData[u];
    var uName = String(uRow[0]).trim();
    if (uName === username) {
      var storedPass = String(uRow[1] !== undefined ? uRow[1] : "").trim();
      if (storedPass === password) {
        var loginRole = String(uRow[2] || "user").trim().toLowerCase();
        return {
          status: "success",
          user: {
            role: loginRole,
            fullName: uRow[3] ? String(uRow[3]).trim() : uName,
            email: uRow[4] ? String(uRow[4]).trim() : ""
          },
          // توكن جلسة موقّع - الفرونت إند بيخزنه وبيبعته مع أي عملية حساسة بعد كده
          token: generateSessionToken_(uName, loginRole)
        };
      }
      return { status: "error", message: "Invalid credentials" };
    }
  }

  return { status: "error", message: "Invalid credentials" };
}

// ==============================================================
// ⚡ قراءة سريعة لشيت AgentStatusLog حسب التاريخ فقط (بحث ثنائي)
// ==============================================================
// الشيت ده بيتسجل فيه كل تغيير حالة لكل الإيجنتس، وبيكبر باستمرار كل شوية
// ثواني طول اليوم - قراءته بالكامل (getDataRange) في كل تقرير كان بيبقى أبطأ
// وأبطأ كل ما الوقت بيعدي. الصفوف بتتضاف بالترتيب الزمني الحقيقي بس
// (appendRow من logAgentStatusChange تحت Lock - مفيش Backfill بيضيف بيانات
// قديمة في الآخر زي Call Log) فالعمود E (Timestamp) مضمون يكون مرتب تصاعديًا
// من أول الشيت لآخره. ده بيخلينا نستخدم بحث ثنائي (Binary Search) نلاقي بيه
// بالظبط أول وآخر صف يخصوا الفترة المطلوبة من غير ما نمر على أي صف قبلهم أو
// بعدهم - فبدل ما نقرا الشيت كله (آلاف/عشرات آلاف الصفوف)، بنقرا بس صفوف
// الفترة المطلوبة (يوم واحد مثلاً = عشرات الصفوف بس، مهما كبر تاريخ الشيت).
// ------------------------------------------------------------

// ⚠️ تصحيح مهم: النسخة الأولى من الدالتين دول كانت بتعمل getRange(...).getValue()
// جوه اللوب (نداء منفصل لـ Apps Script لكل خطوة بحث - حوالي 17 نداء×2) - وده
// أبطأ بكتير في الواقع من قراءة الشيت كله بنداء واحد! كل نداء لـ Apps Script
// بيكلف زمن ثابت (RPC) بغض النظر عن حجم البيانات، فـ30+ نداء صغير متتالي بيبقوا
// أبطأ من نداء واحد كبير - وده اللي سبب تهنيج الموقع كله (حتى اللوجن) بعد أول
// نسخة من الإصلاح. الحل الصح: نقرا عمود التاريخ/الوقت كله بنداء واحد بس (bulk)،
// ونعمل البحث الثنائي في الميموري (على مصفوفة JS عادية - سريع جداً ومفيش أي
// نداء لـ Apps Script فيه خالص)، وبعدين نقرا الصفوف المطلوبة بنداء واحد تاني.
// النتيجة: نداءين بس لـ Apps Script لكل طلب تقرير، بدل نداء واحد ضخم (الأصلي
// البطيء) أو 30+ نداء صغير (النسخة الأولى الغلط) - وده أسرع من الاتنين.
function findFirstIndexAtOrAfter_(sortedArr, targetValue) {
  var lo = 0, hi = sortedArr.length;
  while (lo < hi) {
    var mid = Math.floor((lo + hi) / 2);
    if (sortedArr[mid] >= targetValue) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo; // لو مفيش، بيرجع sortedArr.length (برة النطاق من فوق)
}

function findLastIndexAtOrBefore_(sortedArr, targetValue) {
  var lo = -1, hi = sortedArr.length - 1;
  while (lo < hi) {
    var mid = Math.ceil((lo + hi + 1) / 2);
    if (sortedArr[mid] <= targetValue) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo; // لو مفيش، بيرجع -1 (برة النطاق من تحت)
}

// بيرجع بس صفوف AgentStatusLog (كل الأعمدة الخمسة) اللي بين startDateStr و
// endDateStr شامل الاتنين - مصفوفة من غير هيدر (كل عنصر = [Name, Number,
// OldStatus, NewStatus, Timestamp]). نداءين بس لـ Apps Script (شوف الشرح فوق)
function readAgentStatusLogRange_(sheet, lastRow, startDateStr, endDateStr) {
  if (lastRow < 2) return [];

  // نداء 1: عمود التاريخ/الوقت (E) لوحده بس، لكل صفوف الشيت - بنداء واحد
  var timestamps = sheet.getRange(2, 5, lastRow - 1, 1).getValues().map(function (r) {
    return String(r[0]).replace(/^'/, "").trim();
  });

  var startTs = startDateStr + " 00:00:00";
  var endTs = endDateStr + " 23:59:59";

  var firstIdx = findFirstIndexAtOrAfter_(timestamps, startTs);
  var lastIdx = findLastIndexAtOrBefore_(timestamps, endTs);

  if (firstIdx > lastIdx) return [];

  // نداء 2: الصفوف المطابقة بس (كل الأعمدة الخمسة)
  var firstRow = firstIdx + 2; // تحويل من فهرس مصفوفة (0-based) لرقم صف حقيقي في الشيت
  var numRows = lastIdx - firstIdx + 1;
  return sheet.getRange(firstRow, 1, numRows, 5).getValues();
}

// أقدم تاريخ فيه بيانات في شيت AgentStatusLog - بما إن الشيت مرتب تصاعديًا،
// أول صف بيانات (رقم 2) هو دايمًا الأقدم، فمفيش داعي نقرا أي حاجة تانية
function getEarliestLogDate_(sheet, lastRow) {
  if (!sheet || lastRow < 2) return null;
  var ts = String(sheet.getRange(2, 5).getValue()).replace(/^'/, "").trim();
  return ts ? ts.substring(0, 10) : null;
}

// ------------------------------------------------------------
// ✏️ تعديل نقطة في سجل حالة إيجنت من التايم لاين في CC Pulse مباشرة (Click-to-edit)
// بدل ما الأدمن يعدل شيت AgentStatusLog بإيده - بيتعامل مع 3 حالات:
//   أ) نفس الوقت بالظبط، الحالة بس اتغيرت -> تعديل الصف الموجود في مكانه
//   ب) الوقت اتغير -> مسح الصف القديم وإضافة صف جديد في مكانه الصحيح كرونولوجيًا
//   ج) مفيش originalTime (تعبئة فجوة Out Of Adherence) -> إضافة صف جديد بس
// الشيت لازم يفضل مرتب تصاعديًا بعمود E (Timestamp) عشان البحث الثنائي في
// التقارير (readAgentStatusLogRange_) يفضل شغال صح - فأي إضافة/نقل بيتحط في
// مكانه الصحيح كرونولوجيًا بالظبط، مش في آخر الشيت
// ------------------------------------------------------------
function editAgentStatusPoint_(ss, data) {
  var sheet = ss.getSheetByName("AgentStatusLog");
  if (!sheet) return { status: "error", message: "Sheet AgentStatusLog not found" };

  var agentName = String(data.agentName || "").trim();
  if (!agentName) return { status: "error", message: "Missing agent name" };

  var newStatus = String(data.newStatus || "").trim();
  if (!newStatus) return { status: "error", message: "Missing new status" };

  var newTimestamp = String(data.newTime || "").trim();
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(newTimestamp)) {
    return { status: "error", message: "Invalid time format" };
  }

  var originalTimestamp = String(data.originalTime || "").trim(); // فاضي = إضافة جديدة (تعبئة فجوة)

  var lastRow = sheet.getLastRow();
  var allValues = (lastRow >= 2) ? sheet.getRange(2, 1, lastRow - 1, 5).getValues() : [];

  var rows = [];
  for (var i = 0; i < allValues.length; i++) {
    rows.push({
      name: String(allValues[i][0]).trim(),
      number: allValues[i][1],
      oldStatus: String(allValues[i][2]).trim(),
      newStatus: String(allValues[i][3]).trim(),
      timestamp: String(allValues[i][4]).replace(/^'/, "").trim(),
      rowNum: i + 2
    });
  }

  // رقم الإكستنشن بتاع الإيجنت - بناخده من أي صف قديم ليه في الشيت
  var agentNumber = "-";
  for (var n = 0; n < rows.length; n++) {
    if (rows[n].name === agentName) { agentNumber = rows[n].number; break; }
  }

  var matchedIdx = -1;
  if (originalTimestamp) {
    for (var m = 0; m < rows.length; m++) {
      if (rows[m].name === agentName && rows[m].timestamp === originalTimestamp) { matchedIdx = m; break; }
    }
    if (matchedIdx === -1) {
      return { status: "error", message: "Could not find the original record - it may have already changed. Please refresh and try again." };
    }
  }

  // حالة أ: نفس الوقت بالظبط، الحالة بس اتغيرت -> تعديل مكانه في الشيت مباشرة
  if (matchedIdx !== -1 && originalTimestamp === newTimestamp) {
    sheet.getRange(rows[matchedIdx].rowNum, 4).setValue(newStatus);
    SpreadsheetApp.flush();
    return { status: "success", message: "Status updated" };
  }

  // من هنا: إما نقل صف (حالة ب) أو إضافة صف جديد (حالة ج) - الاتنين محتاجين
  // نلاقي مكانه الصحيح كرونولوجيًا في مصفوفة "بعد ما نشيل الصف القديم لو موجود"
  var remainingRows = rows.slice();
  if (matchedIdx !== -1) remainingRows.splice(matchedIdx, 1);

  // منع التصادم: صف تاني لنفس الإيجنت بنفس الوقت بالظبط ممكن يبوظ حساب الجلسات
  for (var c = 0; c < remainingRows.length; c++) {
    if (remainingRows[c].name === agentName && remainingRows[c].timestamp === newTimestamp) {
      return { status: "error", message: "There is already a status change for this agent at this exact time" };
    }
  }

  // البحث عن مكانه الصحيح (أول صف وقته بعد الوقت الجديد - الصف الجديد هيتحط قبله)
  var insertAtIndex = remainingRows.length;
  for (var p = 0; p < remainingRows.length; p++) {
    if (remainingRows[p].timestamp > newTimestamp) { insertAtIndex = p; break; }
  }

  // الـ OldStatus بتاع الصف الجديد = آخر حالة كانت شغالة قبله زمنيًا لنفس
  // الإيجنت (أو "Away" لو دي أول حركة ليه في السجل كله) - مستخدمة بس في حساب
  // "أول لوجين"/"آخر شيفت" (buildOneDayReport_)، مش في رسم الجلسات نفسها
  var computedOldStatus = "Away";
  for (var q = insertAtIndex - 1; q >= 0; q--) {
    if (remainingRows[q].name === agentName) { computedOldStatus = remainingRows[q].newStatus; break; }
  }

  // لو فيه صف قديم هيتشال، امسحه الأول (يبسّط حساب رقم الصف بعد كده)
  if (matchedIdx !== -1) {
    sheet.deleteRow(rows[matchedIdx].rowNum);
  }

  var newRowValues = [agentName, agentNumber, computedOldStatus, newStatus, "'" + newTimestamp];

  if (insertAtIndex >= remainingRows.length) {
    sheet.appendRow(newRowValues);
  } else {
    var targetSheetRow = insertAtIndex + 2; // remainingRows[0] -> صف رقم 2 في الشيت
    sheet.insertRowBefore(targetSheetRow);
    sheet.getRange(targetSheetRow, 1, 1, 5).setValues([newRowValues]);
  }

  SpreadsheetApp.flush();
  return { status: "success", message: matchedIdx !== -1 ? "Time & status updated" : "Status added" };
}

// ------------------------------------------------------------
// 🗑️ مسح نقطة من سجل حالة إيجنت (Undo) - بيتنادى من نفس مودال تعديل التايم لاين في CC Pulse
// لما الأدمن يحب يشيل نقطة أضافها غلط (بدل ما يعدل وقتها/حالتها بس) - بيدور عليها بالاسم
// + الوقت بالظبط ويمسحها. مسح صف من نص الشيت مبيبوظش ترتيب باقي الصفوف (لسه متسلسل تصاعديًا)
// ------------------------------------------------------------
function deleteAgentStatusPoint_(ss, data) {
  var sheet = ss.getSheetByName("AgentStatusLog");
  if (!sheet) return { status: "error", message: "Sheet AgentStatusLog not found" };

  var agentName = String(data.agentName || "").trim();
  var originalTimestamp = String(data.originalTime || "").trim();
  if (!agentName || !originalTimestamp) {
    return { status: "error", message: "Missing agent name or time" };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    for (var i = 0; i < values.length; i++) {
      var name = String(values[i][0]).trim();
      var ts = String(values[i][4]).replace(/^'/, "").trim();
      if (name === agentName && ts === originalTimestamp) {
        sheet.deleteRow(i + 2);
        SpreadsheetApp.flush();
        return { status: "success", message: "Deleted" };
      }
    }
  }

  return { status: "error", message: "Could not find the original record - it may have already changed. Please refresh and try again." };
}

// ------------------------------------------------------------
// 🔄 بيرجع كل تغييرات الحالة اللي حصلت النهاردة بس (بتوقيت الإمارات)، مرتبة بالوقت
// مستخدمة عشان السيرفر يقدر "يفتكر" آخر حالة لكل إيجنت فور ما يشتغل بعد أي Restart
// استخدام: ?action=todayStatusLog
// ------------------------------------------------------------
function getTodayStatusLog_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("AgentStatusLog");
  if (!sheet) return { status: "error", message: "Sheet AgentStatusLog not found" };

  var todayStr = Utilities.formatDate(new Date(), "Asia/Dubai", "yyyy-MM-dd");
  var lastRow = sheet.getLastRow();
  var slice = readAgentStatusLogRange_(sheet, lastRow, todayStr, todayStr);

  var rows = [];
  for (var i = 0; i < slice.length; i++) {
    rows.push({
      name: String(slice[i][0]).trim(),
      number: String(slice[i][1]).trim(),
      oldStatus: String(slice[i][2]).trim(),
      newStatus: String(slice[i][3]).trim(),
      timestamp: String(slice[i][4]).replace(/^'/, "").trim()
    });
  }
  rows.sort(function (a, b) { return a.timestamp.localeCompare(b.timestamp); });
  return { status: "success", date: todayStr, rows: rows };
}

// ------------------------------------------------------------
// 📊 تقرير مفصل لمدة قعود إيجنت في كل حالة (Away مستبعدة تماماً)
// استخدام:
//   ?action=agentStatusReport&name=Faris&mode=day&date=2026-09-05
//   ?action=agentStatusReport&name=Faris&mode=range&start=2026-09-01&end=2026-09-05
//   ?action=agentStatusReport&name=Faris&mode=month&month=2026-09
// ------------------------------------------------------------
function getAgentStatusReport_(params) {
  var agentName = params.name;
  var mode = params.mode || "day";

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("AgentStatusLog");
  if (!sheet) return { status: "error", message: "Sheet AgentStatusLog not found" };

  var dateList = buildDateList_(mode, params);
  if (!dateList) return { status: "error", message: "Invalid date parameters" };

  var lastRow = sheet.getLastRow();
  var trackingStartDate = getEarliestLogDate_(sheet, lastRow);

  var slice = readAgentStatusLogRange_(sheet, lastRow, dateList[0], dateList[dateList.length - 1]);

  var allRows = [];
  for (var i = 0; i < slice.length; i++) {
    var name = String(slice[i][0]).trim();
    if (name !== agentName) continue;
    var ts = String(slice[i][4]).replace(/^'/, "").trim(); // "yyyy-MM-dd HH:mm:ss"
    allRows.push({
      oldStatus: String(slice[i][2]).trim(),
      newStatus: String(slice[i][3]).trim(),
      timestamp: ts
    });
  }
  allRows.sort(function (a, b) { return a.timestamp.localeCompare(b.timestamp); });

  var days = [];
  var grandTotals = {};

  for (var d = 0; d < dateList.length; d++) {
    var dateStr = dateList[d];
    var dayReport = buildOneDayReport_(allRows, dateStr);
    days.push(dayReport);

    for (var st in dayReport.totals) {
      grandTotals[st] = (grandTotals[st] || 0) + dayReport.totals[st];
    }
  }

  return {
    status: "success",
    agent: agentName,
    mode: mode,
    days: days,
    totals: grandTotals,
    totalLoginSeconds: sumValues_(grandTotals),
    trackingStartDate: trackingStartDate
  };
}

// بيبني قايمة التواريخ (yyyy-MM-dd) حسب الوضع المطلوب
function buildDateList_(mode, params) {
  var dates = [];

  if (mode === "day") {
    if (!params.date) return null;
    dates.push(params.date);
  } else if (mode === "range") {
    if (!params.start || !params.end) return null;
    var cur = new Date(params.start + "T00:00:00");
    var end = new Date(params.end + "T00:00:00");
    while (cur <= end) {
      dates.push(Utilities.formatDate(cur, "Asia/Dubai", "yyyy-MM-dd"));
      cur.setDate(cur.getDate() + 1);
    }
  } else if (mode === "month") {
    if (!params.month) return null; // متوقع "yyyy-MM"
    var parts = params.month.split("-");
    var year = parseInt(parts[0], 10);
    var monthIdx = parseInt(parts[1], 10) - 1;
    var daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    for (var day = 1; day <= daysInMonth; day++) {
      var mm = String(monthIdx + 1).length === 1 ? "0" + (monthIdx + 1) : String(monthIdx + 1);
      var dd = String(day).length === 1 ? "0" + day : String(day);
      dates.push(year + "-" + mm + "-" + dd);
    }
  } else {
    return null;
  }

  return dates;
}

// بيحسب تقرير يوم واحد: الجلسات (من غير Away)، الإجمالي، أول لوجين، وآخر شيفت
function buildOneDayReport_(allRows, dateStr) {
  var dayRows = allRows.filter(function (r) { return r.timestamp.indexOf(dateStr) === 0; });

  var firstLogin = null;
  var endShift = null;
  for (var i = 0; i < dayRows.length; i++) {
    if (firstLogin === null && dayRows[i].oldStatus === "Away") {
      firstLogin = dayRows[i].timestamp;
    }
    if (dayRows[i].newStatus === "Away") {
      endShift = dayRows[i].timestamp; // بنفضل نحدّثها، فآخر مرة هتفضل هي الصح
    }
  }

  var sessions = [];
  var totals = {};
  var now = Utilities.formatDate(new Date(), "Asia/Dubai", "yyyy-MM-dd HH:mm:ss");
  var endOfDay = dateStr + " 23:59:59";
  var isToday = (dateStr === now.substring(0, 10));

  for (var j = 0; j < dayRows.length; j++) {
    var status = dayRows[j].newStatus;
    if (status === "Away") continue; // مستبعدة تماماً من الجلسات والإجمالي

    var start = dayRows[j].timestamp;
    var end;
    if (j + 1 < dayRows.length) {
      end = dayRows[j + 1].timestamp;
    } else {
      end = isToday ? now : endOfDay;
    }

    var durationSec = Math.round((new Date(end.replace(" ", "T")) - new Date(start.replace(" ", "T"))) / 1000);

    sessions.push({ status: status, start: start, end: end, durationSeconds: durationSec });
    totals[status] = (totals[status] || 0) + durationSec;
  }

  return {
    date: dateStr,
    firstLogin: firstLogin,
    endShift: endShift,
    sessions: sessions,
    totals: totals,
    totalLoginSeconds: sumValues_(totals)
  };
}

function sumValues_(obj) {
  var sum = 0;
  for (var k in obj) sum += obj[k];
  return sum;
}

// ------------------------------------------------------------
// 📊 إجمالي وقت اللوجن (بره Away) لكل الإيجنتس مع بعض
// استخدام:
//   ?action=allAgentsLoginTotals&mode=day&date=2026-09-05
//   ?action=allAgentsLoginTotals&mode=range&start=2026-09-01&end=2026-09-05
//   ?action=allAgentsLoginTotals&mode=month&month=2026-09
// ------------------------------------------------------------
function getAllAgentsLoginTotals_(params) {
  var mode = params.mode || "day";

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("AgentStatusLog");
  if (!sheet) return { status: "error", message: "Sheet AgentStatusLog not found" };

  var dateList = buildDateList_(mode, params);
  if (!dateList) return { status: "error", message: "Invalid date parameters" };

  var lastRow = sheet.getLastRow();
  var trackingStartDate = getEarliestLogDate_(sheet, lastRow);

  var slice = readAgentStatusLogRange_(sheet, lastRow, dateList[0], dateList[dateList.length - 1]);

  var rowsByAgent = {}; // name -> { number: "...", rows: [...] }

  for (var i = 0; i < slice.length; i++) {
    var name = String(slice[i][0]).trim();
    if (name === "") continue;
    var number = String(slice[i][1]).trim();
    var ts = String(slice[i][4]).replace(/^'/, "").trim();

    if (!rowsByAgent[name]) rowsByAgent[name] = { number: number, rows: [] };
    rowsByAgent[name].rows.push({
      oldStatus: String(slice[i][2]).trim(),
      newStatus: String(slice[i][3]).trim(),
      timestamp: ts
    });
  }

  var isSingleDay = (dateList.length === 1);

  var agents = [];
  for (var agentName in rowsByAgent) {
    var agentRows = rowsByAgent[agentName].rows;
    agentRows.sort(function (a, b) { return a.timestamp.localeCompare(b.timestamp); });

    var totalSeconds = 0;
    var statusTotals = {};
    var daysList = [];

    for (var d = 0; d < dateList.length; d++) {
      var dayReport = buildOneDayReport_(agentRows, dateList[d]);
      totalSeconds += dayReport.totalLoginSeconds;

      for (var st in dayReport.totals) {
        statusTotals[st] = (statusTotals[st] || 0) + dayReport.totals[st];
      }

      daysList.push(dayReport);
    }

    var agentObj = {
      name: agentName,
      number: rowsByAgent[agentName].number,
      totalLoginSeconds: totalSeconds,
      totals: statusTotals,
      days: daysList
    };

    if (isSingleDay) {
      agentObj.date = daysList[0].date;
      agentObj.firstLogin = daysList[0].firstLogin;
      agentObj.endShift = daysList[0].endShift;
      agentObj.sessions = daysList[0].sessions;
    }

    agents.push(agentObj);
  }

  agents.sort(function (a, b) { return b.totalLoginSeconds - a.totalLoginSeconds; });

  return { status: "success", mode: mode, agents: agents, trackingStartDate: trackingStartDate };
}
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // منع التعارض أثناء الكتابة

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No post data" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 0. تسجيل الدخول - فحص خفيف بيقرا بس شيت Users (شوف handleLightLogin_)
    if (data.action === "login") {
      var loginResult = handleLightLogin_(data);
      return ContentService.createTextOutput(JSON.stringify(loginResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 1. تغيير كلمة المرور
    if (data.action === "changePassword") {
      // لازم توكن جلسة صحيح - وأي يوزر عادي (مش أدمن) لازم يكون بيغيّر باسورد نفسه بس
      var pwSession = requireSession_(data, false);
      if (!pwSession.ok) return pwSession.response;

      var targetUserRaw = String(data.username || "").trim();
      if (pwSession.role !== "admin" && pwSession.username.toLowerCase() !== targetUserRaw.toLowerCase()) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "You can only change your own password" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var sheet = ss.getSheetByName("Users") || ss.getSheetByName("users");

      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sheet Users not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var targetUser = targetUserRaw.toLowerCase();
      var oldPassSubmitted = String(data.oldPassword || "").trim();
      var newPass = String(data.newPassword).trim();
      var updated = false;

      for (var i = 1; i < values.length; i++) {
        var sheetUser = String(values[i][0]).trim().toLowerCase();
        if (sheetUser === targetUser) {
          // يوزر عادي لازم يثبت الباسورد القديم صح الأول (على السيرفر نفسه،
          // مش بس محلي زي قبل كده) - الأدمن بس اللي يقدر يغيّر باسورد حد تاني
          // من غير ما يعرف الباسورد القديم بتاعه
          if (pwSession.role !== "admin") {
            var currentStoredPass = String(values[i][1] !== undefined ? values[i][1] : "").trim();
            if (currentStoredPass !== oldPassSubmitted) {
              return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Current password is incorrect" }))
                .setMimeType(ContentService.MimeType.JSON);
            }
          }
          sheet.getRange(i + 1, 2).setValue("'" + newPass);
          SpreadsheetApp.flush();
          updated = true;
          break;
        }
      }

      if (updated) {
        invalidateFullDataCache_();
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Password updated in Sheet!" }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Username not found in Sheet" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 2. تسجيل اللوجات للشهادات (NOC & Move-In Clearance Logs)
    else if (data.action === "logNoc") {
      var nocSession = requireSession_(data, false);
      if (!nocSession.ok) return nocSession.response;

      var logSheet = ss.getSheetByName("NOC_Logs");
      if (!logSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sheet NOC_Logs not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // اعتماد التاريخ المرسل من الفرونت إند أو حسابه بتوقيت الإمارات (Asia/Dubai)
      var timestampVal = data.timestamp;
      if (!timestampVal) {
        timestampVal = Utilities.formatDate(new Date(), "Asia/Dubai", "yyyy-MM-dd HH:mm:ss");
      }

      logSheet.appendRow([
        data.user || "-",
        data.noc_type || "-",
        data.tenant_name || "-",
        data.tenant_contract || "-",
        data.owner_name || "-",
        data.owner_contract || "-",
        data.tower_name || "-",
        data.unit_no || "-",
        "'" + timestampVal
      ]);

      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Log added successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. تسجيل تغييرات حالة الإيجنتس (3CX Live Status)
    else if (data.action === "logAgentStatusChange") {
      var statusLogSheet = ss.getSheetByName("AgentStatusLog");
      if (!statusLogSheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sheet AgentStatusLog not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var changeTimestamp = data.timestamp || Utilities.formatDate(new Date(), "Asia/Dubai", "yyyy-MM-dd HH:mm:ss");

      statusLogSheet.appendRow([
        data.name || "-",
        data.number || "-",
        data.oldStatus || "-",
        data.newStatus || "-",
        "'" + changeTimestamp
      ]);

      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Status change logged" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. تسجيل مكالمات الكيو (Call Log) - دفعة مرة واحدة، مع تفادي التكرار
    else if (data.action === "logQueueCalls") {
      var logResult = logQueueCallsBulk_(ss, data.rows || []);
      return ContentService.createTextOutput(JSON.stringify(logResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 5. تسجيل خروج إجباري لكل التابات المفتوحة (زرار الأدمن) - أدمن بس
    else if (data.action === "triggerForceLogout") {
      var logoutSession = requireSession_(data, true);
      if (!logoutSession.ok) return logoutSession.response;

      PropertiesService.getScriptProperties().setProperty("forceLogoutAt", String(Date.now()));
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 6. تعديل بيانات برج من صفحة الأدمن (Save Tower Changes) - بيكتب مباشرة في شيت Towers
    // عشان التعديل يبقى دايم ويظهر لكل اليوزرز اللي بيفتحوا الموقع (مش بس شكل بصري عند الأدمن)
    // أدمن بس يقدر يعمل العملية دي
    else if (data.action === "updateTower") {
      var towerSession = requireSession_(data, true);
      if (!towerSession.ok) return towerSession.response;

      var towersSheetPost = ss.getSheetByName("Towers") || ss.getSheets()[0];
      if (!towersSheetPost) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sheet Towers not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var targetTowerName = String(data.towerName || "").trim();
      if (!targetTowerName) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing tower name" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var td = data.data || {};
      var tValues = towersSheetPost.getDataRange().getValues();
      var foundRow = -1;

      for (var t = 1; t < tValues.length; t++) {
        if (String(tValues[t][0]).trim() === targetTowerName) {
          foundRow = t + 1; // رقم الصف في الشيت (1-based)
          break;
        }
      }

      if (foundRow === -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Tower not found: " + targetTowerName }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // الترتيب لازم يطابق أعمدة شيت Towers بالظبط زي ما موضح في doGet:
      // B=client, C=location, D=bank, E=deposit, F=deposit_amount, G=online,
      // H=billing, I=late, J=activation, K=disconnection, L=noc, M=final, N=maintenance
      towersSheetPost.getRange(foundRow, 2, 1, 13).setValues([[
        td.client || "",
        td.location || "",
        td.bank || "",
        td.deposit || "",
        td.deposit_amount || "",
        td.online || "",
        td.billing || "",
        td.late || "",
        td.activation || "",
        td.disconnection || "",
        td.noc || "",
        td.final || "",
        td.maintenance || ""
      ]]);

      SpreadsheetApp.flush();
      invalidateFullDataCache_();
      // تعديل من صفحة الأدمن نفسها بيتعامل زي أي تعديل مباشر في الشيت -
      // نفس إشارة الـ Force Logout عشان كل التابات المفتوحة تاخد آخر نسخة
      PropertiesService.getScriptProperties().setProperty("forceLogoutAt", String(Date.now()));

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Tower updated successfully in Sheet" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 7. تعديل نقطة في سجل حالة إيجنت من التايم لاين في CC Pulse مباشرة (Click-to-edit) - أدمن بس
    else if (data.action === "editAgentStatusPoint") {
      var editSession = requireSession_(data, true);
      if (!editSession.ok) return editSession.response;

      var editResult = editAgentStatusPoint_(ss, data);
      return ContentService.createTextOutput(JSON.stringify(editResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 8. مسح نقطة من سجل حالة إيجنت (Undo) - نفس مودال تعديل التايم لاين في CC Pulse - أدمن بس
    else if (data.action === "deleteAgentStatusPoint") {
      var deleteSession = requireSession_(data, true);
      if (!deleteSession.ok) return deleteSession.response;

      var deleteResult = deleteAgentStatusPoint_(ss, data);
      return ContentService.createTextOutput(JSON.stringify(deleteResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 9. تبديل الشيفتات (Swap.gs) - أي يوزر مسجل دخول: إرسال طلب سواب / الرد عليه (Approve, Reject, Cancel)
    else if (data.action === "requestSwap" || data.action === "respondSwap") {
      var swapSession = requireSession_(data, false);
      if (!swapSession.ok) return swapSession.response;

      var swapResult = (data.action === "requestSwap")
        ? requestSwap_(ss, data, swapSession)
        : respondSwap_(ss, data, swapSession);
      return ContentService.createTextOutput(JSON.stringify(swapResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------
// 📞 CALL LOG - تسجيل مكالمات الكيو (اترد / اتقفلت / اتحولت) بدون تكرار
// ------------------------------------------------------------

var CALL_LOG_HEADERS = ["Date", "Time", "Customer Number", "Queue", "Result", "Agent", "Wait Seconds", "Talk Seconds", "Reason", "MainCallHistoryId", "Direction", "Ended By", "Ended By Type"];

// Service Level: نسبة % المكالمات اللي اترد عليها خلال الحد ده (بالثانية) - المعيار المعروف 20/80
var SERVICE_LEVEL_THRESHOLD_SECONDS = 20;

// بيشيل "(115)" من آخر اسم الإيجنت عشان يتطابق مع الاسم المجرد المستخدم في باقي تقارير CC Pulse
function stripAgentSuffix_(agentStr) {
  var m = /^(.*?)\s*\(\d+\)\s*$/.exec(String(agentStr || "").trim());
  return m ? m[1].trim() : String(agentStr || "").trim();
}

// ------------------------------------------------------------
// ⚡ قراءة سريعة لشيت "Call Log" حسب التاريخ - بترجع بس الصفوف اللي تاريخها
// (عمود A) داخل dateSet المطلوبة، من غير هيدر.
//
// ⚠️ ملحوظة مهمة: على عكس AgentStatusLog، شيت Call Log اتعمله Backfill قبل
// كده (استيراد مكالمات ناقصة من أول الشهر) اتضافت في آخر الشيت بترتيب مختلف
// عن باقي الصفوف - يعني العمود A (Date) مش مضمون يكون مرتب تصاعديًا 100%
// في كل الشيت. عشان كده هنا مبنستخدمش بحث ثنائي (اللي بيفترض ترتيب كامل)،
// وبدل كده بنقرا عمود التاريخ بس (عمود واحد بدل الـ13 كلهم - أخف بكتير) لكل
// صفوف الشيت، نحدد أرقام الصفوف المطلوبة بالظبط (صح مهما كان الترتيب)،
// ونجمعها في "دفعات" متتالية عشان نقرا كل دفعة بنداء واحد بدل نداء لكل صف.
// ------------------------------------------------------------
function readCallLogRowsForDates_(sheet, dateSet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var dateColValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var matchingRowNumbers = [];

  for (var i = 0; i < dateColValues.length; i++) {
    var rawDate = dateColValues[i][0];
    var dateVal = (Object.prototype.toString.call(rawDate) === "[object Date]")
      ? Utilities.formatDate(rawDate, "Asia/Dubai", "yyyy-MM-dd")
      : String(rawDate).replace(/^'/, "").trim();
    if (dateSet[dateVal]) matchingRowNumbers.push(i + 2); // رقم الصف الحقيقي في الشيت
  }

  if (matchingRowNumbers.length === 0) return [];

  // تجميع الصفوف المتتالية في دفعات - لو الترتيب سليم (الحالة الغالبة) هتبقى
  // غالبًا دفعة واحدة أو قليلة، لو فيه Backfill خلط الترتيب هتبقى كذا دفعة
  var batches = [];
  var batchStart = matchingRowNumbers[0];
  var batchEnd = matchingRowNumbers[0];

  for (var k = 1; k < matchingRowNumbers.length; k++) {
    if (matchingRowNumbers[k] === batchEnd + 1) {
      batchEnd = matchingRowNumbers[k];
    } else {
      batches.push([batchStart, batchEnd]);
      batchStart = matchingRowNumbers[k];
      batchEnd = matchingRowNumbers[k];
    }
  }
  batches.push([batchStart, batchEnd]);

  var totalCols = CALL_LOG_HEADERS.length;
  var result = [];
  for (var b = 0; b < batches.length; b++) {
    var s = batches[b][0], e = batches[b][1];
    var chunk = sheet.getRange(s, 1, e - s + 1, totalCols).getValues();
    result = result.concat(chunk);
  }

  return result;
}

// ------------------------------------------------------------
// 📊 ملخص أداء الكيو ككل (مش لإيجنت بعينه): كام مكالمة دخلت، كام اترد،
// كام اتقفلت من غير رد (Abandoned)، ونسبة الـ Abandonment + متوسط وقت الانتظار (ASA)
// ASA بيتحسب بس على المكالمات اللي اترد عليها فعلاً (Wait Seconds بتاعتها)
// ------------------------------------------------------------
// ⚡ محسّنة: بتاخد data (من غير هيدر، اتفلترت بالفعل بالتاريخ من
// readCallLogRowsForDates_) و directionColIdx جاهزين - عشان getCallLogReport_
// يقرا شيت Call Log مرة واحدة بس (وبس صفوف الفترة المطلوبة) ويشاركها مع
// الدوال دي كلها
function computeQueueSummary_(data, directionColIdx, dateSet) {
  if (!data) {
    return { totalCalls: 0, answered: 0, abandoned: 0, redirected: 0, unknown: 0, abandonmentRatePct: 0, asaSeconds: 0 };
  }

  var totalCalls = 0, answered = 0, abandoned = 0, redirected = 0, unknown = 0;
  var waitSecondsSumForAnswered = 0;
  var withinServiceLevel = 0;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var direction = String(row[directionColIdx] || "Inbound").trim() || "Inbound";
    if (direction === "Outbound") continue; // الملخص ده بس لمكالمات الكيو الداخلة

    totalCalls++;
    var result = String(row[4]).trim();
    var waitSeconds = Number(row[6]) || 0;

    if (result === "Answered") {
      answered++;
      waitSecondsSumForAnswered += waitSeconds;
      if (waitSeconds <= SERVICE_LEVEL_THRESHOLD_SECONDS) withinServiceLevel++;
    } else if (result === "Abandoned") {
      abandoned++;
    } else if (result === "Redirected") {
      redirected++;
    } else {
      unknown++;
    }
  }

  var offered = answered + abandoned; // المكالمات اللي فعلاً استنت رد (بره الـ Redirected والـ Unknown)

  return {
    totalCalls: totalCalls,
    answered: answered,
    abandoned: abandoned,
    redirected: redirected,
    unknown: unknown,
    abandonmentRatePct: totalCalls > 0 ? Math.round((abandoned / totalCalls) * 1000) / 10 : 0,
    asaSeconds: answered > 0 ? Math.round((waitSecondsSumForAnswered / answered) * 10) / 10 : 0,
    serviceLevelPct: offered > 0 ? Math.round((withinServiceLevel / offered) * 1000) / 10 : 0
  };
}

// بيرجع نفس أرقام computeQueueSummary_ بس مقسّمة يوم يوم - عشان نعمل تريند
// (Abandonment Rate و ASA لكل يوم في المدة المطلوبة) بدل رقم إجمالي واحد بس
// ⚡ محسّنة: بتاخد data (من غير هيدر) و directionColIdx جاهزين برضو
function computeQueueSummaryByDay_(data, directionColIdx, dateList) {
  var perDay = {};
  dateList.forEach(function (d) {
    perDay[d] = { date: d, totalCalls: 0, answered: 0, abandoned: 0, redirected: 0, unknown: 0, waitSecondsSumForAnswered: 0, withinServiceLevel: 0 };
  });

  if (!data) {
    return dateList.map(function (d) { return finalizeQueueDaySummary_(perDay[d]); });
  }

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rawDate = row[0];
    var dateVal = (Object.prototype.toString.call(rawDate) === "[object Date]")
      ? Utilities.formatDate(rawDate, "Asia/Dubai", "yyyy-MM-dd")
      : String(rawDate).replace(/^'/, "").trim();
    var bucket = perDay[dateVal];
    if (!bucket) continue;

    var direction = String(row[directionColIdx] || "Inbound").trim() || "Inbound";
    if (direction === "Outbound") continue;

    bucket.totalCalls++;
    var result = String(row[4]).trim();
    var waitSeconds = Number(row[6]) || 0;

    if (result === "Answered") {
      bucket.answered++;
      bucket.waitSecondsSumForAnswered += waitSeconds;
      if (waitSeconds <= SERVICE_LEVEL_THRESHOLD_SECONDS) bucket.withinServiceLevel++;
    } else if (result === "Abandoned") {
      bucket.abandoned++;
    } else if (result === "Redirected") {
      bucket.redirected++;
    } else {
      bucket.unknown++;
    }
  }

  return dateList.map(function (d) { return finalizeQueueDaySummary_(perDay[d]); });
}

function finalizeQueueDaySummary_(b) {
  var offered = b.answered + b.abandoned;
  return {
    date: b.date,
    totalCalls: b.totalCalls,
    answered: b.answered,
    abandoned: b.abandoned,
    redirected: b.redirected,
    unknown: b.unknown,
    abandonmentRatePct: b.totalCalls > 0 ? Math.round((b.abandoned / b.totalCalls) * 1000) / 10 : 0,
    asaSeconds: b.answered > 0 ? Math.round((b.waitSecondsSumForAnswered / b.answered) * 10) / 10 : 0,
    serviceLevelPct: offered > 0 ? Math.round(((b.withinServiceLevel || 0) / offered) * 1000) / 10 : 0
  };
}

// بيحسب نفس أرقام الكيو (Total/Abandonment/ASA) بس مقسّمة على 24 ساعة اليوم
// (بغض النظر عن التاريخ) - عشان نعرف الساعات الأكتر زحمة والأعلى Abandonment
// خلال المدة المختارة كلها (يوم واحد أو مدى أيام)
// ⚡ محسّنة: بتاخد data (من غير هيدر) و directionColIdx جاهزين برضو
function computeQueueSummaryByHour_(data, directionColIdx, dateSet) {
  var buckets = [];
  for (var h = 0; h < 24; h++) {
    buckets.push({ hour: h, totalCalls: 0, answered: 0, abandoned: 0, redirected: 0, unknown: 0, waitSecondsSumForAnswered: 0, withinServiceLevel: 0 });
  }

  if (!data) {
    return buckets.map(finalizeQueueHourSummary_);
  }

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var direction = String(row[directionColIdx] || "Inbound").trim() || "Inbound";
    if (direction === "Outbound") continue;

    var rawTime = row[1];
    var timeStr = (Object.prototype.toString.call(rawTime) === "[object Date]")
      ? Utilities.formatDate(rawTime, "Asia/Dubai", "HH:mm:ss")
      : String(rawTime).trim();
    var hour = parseInt(timeStr.substring(0, 2), 10);
    if (isNaN(hour) || hour < 0 || hour > 23) continue;

    var bucket = buckets[hour];
    bucket.totalCalls++;
    var result = String(row[4]).trim();
    var waitSeconds = Number(row[6]) || 0;

    if (result === "Answered") {
      bucket.answered++;
      bucket.waitSecondsSumForAnswered += waitSeconds;
      if (waitSeconds <= SERVICE_LEVEL_THRESHOLD_SECONDS) bucket.withinServiceLevel++;
    } else if (result === "Abandoned") {
      bucket.abandoned++;
    } else if (result === "Redirected") {
      bucket.redirected++;
    } else {
      bucket.unknown++;
    }
  }

  return buckets.map(finalizeQueueHourSummary_);
}

function finalizeQueueHourSummary_(b) {
  var offered = b.answered + b.abandoned;
  return {
    hour: b.hour,
    totalCalls: b.totalCalls,
    answered: b.answered,
    abandoned: b.abandoned,
    redirected: b.redirected,
    unknown: b.unknown,
    abandonmentRatePct: b.totalCalls > 0 ? Math.round((b.abandoned / b.totalCalls) * 1000) / 10 : 0,
    asaSeconds: b.answered > 0 ? Math.round((b.waitSecondsSumForAnswered / b.answered) * 10) / 10 : 0,
    serviceLevelPct: offered > 0 ? Math.round(((b.withinServiceLevel || 0) / offered) * 1000) / 10 : 0
  };
}

// ------------------------------------------------------------
// 📊 تقرير عدد المكالمات المردود عليها ومتوسط وقت المعالجة (AHT) من شيت Call Log
// + ملخص أداء الكيو ككل (queueSummary): Abandonment Rate و ASA
// + queueSummaryByDay: نفس الأرقام دي بس يوم يوم (تريند) لما المدة أكتر من يوم واحد
// + queueSummaryByHour: نفس الأرقام دي بس مقسّمة على 24 ساعة اليوم (Peak Hours)
// استخدام:
//   ?action=callLogReport&mode=day&date=2026-09-07
//   ?action=callLogReport&mode=day&date=2026-09-07&name=Ahmed
//   ?action=callLogReport&mode=range&start=...&end=...
//   ?action=callLogReport&mode=month&month=2026-09
// ------------------------------------------------------------
function getCallLogReport_(params) {
  var dateList = buildDateList_(params.mode || "day", params);
  if (!dateList) return { status: "error", message: "Invalid date parameters" };

  var dateSet = {};
  dateList.forEach(function (d) { dateSet[d] = true; });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Call Log");
  if (!sheet) {
    return {
      status: "success",
      mode: params.mode || "day",
      agents: [],
      queueSummary: { totalCalls: 0, answered: 0, abandoned: 0, redirected: 0, unknown: 0, abandonmentRatePct: 0, asaSeconds: 0, serviceLevelPct: 0 },
      queueSummaryByDay: dateList.map(function (d) { return finalizeQueueDaySummary_({ date: d, totalCalls: 0, answered: 0, abandoned: 0, redirected: 0, unknown: 0, waitSecondsSumForAnswered: 0 }); }),
      queueSummaryByHour: (function () {
        var empty = [];
        for (var h = 0; h < 24; h++) empty.push(finalizeQueueHourSummary_({ hour: h, totalCalls: 0, answered: 0, abandoned: 0, redirected: 0, unknown: 0, waitSecondsSumForAnswered: 0 }));
        return empty;
      })()
    };
  }

  var directionColIdx = CALL_LOG_HEADERS.indexOf("Direction");
  var data = readCallLogRowsForDates_(sheet, dateSet); // بس صفوف التواريخ المطلوبة، من غير هيدر
  var perAgent = {}; // اسم مجرد -> { calls, talkSeconds, outboundAnsweredCount, outboundUnansweredCount }

  for (var i = 0; i < data.length; i++) {
    var row = data[i];

    var agentPlain = stripAgentSuffix_(row[5]);
    if (!agentPlain || agentPlain === "-") continue;
    if (!perAgent[agentPlain]) perAgent[agentPlain] = { calls: 0, talkSeconds: 0, outboundAnsweredCount: 0, outboundUnansweredCount: 0 };

    // الصفوف اللي مالهاش عمود Direction أصلاً (اتسجلت قبل الميزة دي) بنعتبرها Inbound
    var direction = String(row[directionColIdx] || "Inbound").trim() || "Inbound";

    if (direction === "Outbound") {
      // classify_outbound_row في server.py بيحط "Answered" أو "Unanswered" في عمود Result
      // حسب رد العميل الفعلي على المكالمة الصادرة - هنا بس بنعدّهم مقسّمين
      var outboundResult = String(row[4]).trim();
      if (outboundResult === "Answered") {
        perAgent[agentPlain].outboundAnsweredCount += 1;
      } else {
        perAgent[agentPlain].outboundUnansweredCount += 1;
      }
      continue; // مش بتدخل في حساب Calls Answered / AHT بتاع الكيو
    }

    var result = String(row[4]).trim();
    if (result !== "Answered") continue;

    var talkSeconds = Number(row[7]) || 0;
    perAgent[agentPlain].calls += 1;
    perAgent[agentPlain].talkSeconds += talkSeconds;
  }

  var agents = [];
  for (var agentName in perAgent) {
    var stats = perAgent[agentName];
    agents.push({
      agent: agentName,
      callsAnswered: stats.calls,
      totalTalkSeconds: Math.round(stats.talkSeconds * 10) / 10,
      ahtSeconds: stats.calls > 0 ? Math.round((stats.talkSeconds / stats.calls) * 10) / 10 : 0,
      outboundAnsweredCount: stats.outboundAnsweredCount,
      outboundUnansweredCount: stats.outboundUnansweredCount,
      // فضلنا outboundCallsCount (المجموع) كمان عشان أي كود قديم لسه بيقراها ميتكسرش
      outboundCallsCount: stats.outboundAnsweredCount + stats.outboundUnansweredCount
    });
  }

  var queueSummary = computeQueueSummary_(data, directionColIdx, dateSet);
  var queueSummaryByDay = computeQueueSummaryByDay_(data, directionColIdx, dateList);
  var queueSummaryByHour = computeQueueSummaryByHour_(data, directionColIdx, dateSet);

  if (params.name) {
    var match = agents.filter(function (a) { return a.agent === params.name; })[0];
    return {
      status: "success",
      mode: params.mode || "day",
      agent: params.name,
      data: match || { agent: params.name, callsAnswered: 0, totalTalkSeconds: 0, ahtSeconds: 0, outboundAnsweredCount: 0, outboundUnansweredCount: 0, outboundCallsCount: 0 },
      queueSummary: queueSummary,
      queueSummaryByDay: queueSummaryByDay,
      queueSummaryByHour: queueSummaryByHour
    };
  }

  return { status: "success", mode: params.mode || "day", agents: agents, queueSummary: queueSummary, queueSummaryByDay: queueSummaryByDay, queueSummaryByHour: queueSummaryByHour };
}

// ------------------------------------------------------------
// 📞 تفاصيل مكالمات صادرة معينة لإيجنت واحد (اسم العميل/الوقت/مدة الرنين) -
// للبوب أب اللي بيتفتح لما اليوزر يدوس على رقم "Outbound Unanswered" (أو
// "Outbound Answered" لو حبينا نستخدمها لاحقًا) في أي تقرير CC Pulse
// استخدام:
//   ?action=callLogDetail&name=Ahmed&mode=day&date=2026-09-07&direction=Outbound&result=Unanswered
//   ?action=callLogDetail&name=Ahmed&mode=range&start=...&end=...&direction=Outbound&result=Unanswered
// ------------------------------------------------------------
function getCallLogDetail_(params) {
  var agentName = String(params.name || "").trim();
  if (!agentName) return { status: "error", message: "Missing agent name" };

  var dateList = buildDateList_(params.mode || "day", params);
  if (!dateList) return { status: "error", message: "Invalid date parameters" };

  var dateSet = {};
  dateList.forEach(function (d) { dateSet[d] = true; });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Call Log");
  if (!sheet) return { status: "success", agent: agentName, calls: [] };

  var wantDirection = String(params.direction || "Outbound").trim();
  var wantResult = params.result ? String(params.result).trim() : null; // مفيش result = أي نتيجة

  var directionColIdx = CALL_LOG_HEADERS.indexOf("Direction");
  var data = readCallLogRowsForDates_(sheet, dateSet); // بس صفوف التواريخ المطلوبة، من غير هيدر

  var calls = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];

    var agentPlain = stripAgentSuffix_(row[5]);
    if (agentPlain !== agentName) continue;

    var direction = String(row[directionColIdx] || "Inbound").trim() || "Inbound";
    if (direction !== wantDirection) continue;

    var result = String(row[4]).trim();
    if (wantResult && result !== wantResult) continue;

    var rawDate = row[0];
    var dateVal = (Object.prototype.toString.call(rawDate) === "[object Date]")
      ? Utilities.formatDate(rawDate, "Asia/Dubai", "yyyy-MM-dd")
      : String(rawDate).replace(/^'/, "").trim();

    var rawTime = row[1];
    var timeVal = (Object.prototype.toString.call(rawTime) === "[object Date]")
      ? Utilities.formatDate(rawTime, "Asia/Dubai", "HH:mm:ss")
      : String(rawTime).replace(/^'/, "").trim();

    calls.push({
      date: dateVal,
      time: timeVal,
      customerNumber: String(row[2]).replace(/^'/, "").trim(),
      result: result,
      waitSeconds: Number(row[6]) || 0,
      talkSeconds: Number(row[7]) || 0,
      reason: String(row[8] || "").trim()
    });
  }

  // الأحدث أولاً - أسهل للأدمن/الإيجنت إنه يشوف آخر مكالمة الأول
  calls.sort(function (a, b) {
    var da = a.date + " " + a.time, db = b.date + " " + b.time;
    return da < db ? 1 : (da > db ? -1 : 0);
  });

  return { status: "success", agent: agentName, direction: wantDirection, result: wantResult, calls: calls };
}

// بيرجع شيت "Call Log"، وينشئه بالهيدرز الصح لو لسه مش موجود
function getOrCreateCallLogSheet_(ss) {
  var sheet = ss.getSheetByName("Call Log");
  if (!sheet) {
    sheet = ss.insertSheet("Call Log");
    sheet.appendRow(CALL_LOG_HEADERS);
    return sheet;
  }

  // الشيت موجود بالفعل - نتأكد إن أول صف فيه فعلاً هيدر (ممكن يكون اتعمل يدوي من غيره)
  var firstCell = sheet.getRange(1, 1).getValue();
  if (String(firstCell).trim() !== CALL_LOG_HEADERS[0]) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, CALL_LOG_HEADERS.length).setValues([CALL_LOG_HEADERS]);
  }
  return sheet;
}

// بياخد قايمة صفوف مكالمات، ويضيف بس الجديد منها (بيتفادى أي MainCallHistoryId موجود قبل كده في الشيت)
function logQueueCallsBulk_(ss, rows) {
  if (!rows || rows.length === 0) return { status: "success", added: 0, skipped: 0 };

  var sheet = getOrCreateCallLogSheet_(ss);
  var lastRow = sheet.getLastRow();
  var idColIndex = CALL_LOG_HEADERS.indexOf("MainCallHistoryId") + 1; // مكان عمود MainCallHistoryId (1-based)
  var existingIds = {};

  if (lastRow > 1) {
    var idValues = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
    for (var i = 0; i < idValues.length; i++) {
      var existingId = String(idValues[i][0]).trim();
      if (existingId) existingIds[existingId] = true;
    }
  }

  var toAppend = [];
  var skipped = 0;

  for (var j = 0; j < rows.length; j++) {
    var r = rows[j];
    var mainId = String(r.mainId || "").trim();
    if (!mainId || existingIds[mainId]) {
      skipped++;
      continue;
    }
    existingIds[mainId] = true;

    toAppend.push([
      "'" + (r.date || "-"),
      "'" + (r.time || "-"),
      "'" + (r.customerNumber || "-"),
      r.queue || "-",
      r.result || "-",
      r.agent || "-",
      (r.waitSeconds !== undefined && r.waitSeconds !== null) ? r.waitSeconds : "",
      (r.talkSeconds !== undefined && r.talkSeconds !== null) ? r.talkSeconds : "",
      r.reason || "-",
      mainId,
      r.direction || "Inbound",
      r.endedBy || "-",
      r.endedByType || "-"
    ]);
  }

  if (toAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, CALL_LOG_HEADERS.length).setValues(toAppend);
    SpreadsheetApp.flush();
  }

  return { status: "success", added: toAppend.length, skipped: skipped };
}
