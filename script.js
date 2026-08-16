// ============================================================
// 🌐 FIREBASE INITIALIZATION & CLOUD INTEGRATION
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDQe4gUhY4T3lOkNSRU1aTs8WXLnXIOQc0",
  authDomain: "spc-helper.firebaseapp.com",
  projectId: "spc-helper",
  storageBucket: "spc-helper.firebasestorage.app",
  messagingSenderId: "221572052220",
  appId: "1:221572052220:web:a72317e88b3cac59cc5379",
  measurementId: "G-LNRN5XVN0B"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================================
// 🏢 FAIRMONT MARINA RESIDENCES UNIT MAPPING DATA
// ============================================================

const fairmontUnitMapping = [
  { nic: "C-01-01", adm: "105", spc: "131" },
  { nic: "C-01-03", adm: "104", spc: "133" },
  { nic: "C-01-07", adm: "103", spc: "135" },
  { nic: "C-01-09", adm: "102", spc: "137" },
  { nic: "C-02-01", adm: "205", spc: "231" },
  { nic: "C-02-03", adm: "204", spc: "233" },
  { nic: "C-02-06", adm: "210", spc: "236" },
  { nic: "C-02-07", adm: "203", spc: "235" },
  { nic: "C-02-08", adm: "209", spc: "238" },
  { nic: "C-02-09", adm: "202", spc: "237" },
  { nic: "C-02-10", adm: "208", spc: "240" },
  { nic: "C-02-12", adm: "207", spc: "242" },
  { nic: "C-02-14", adm: "206", spc: "244" },
  { nic: "C-03-01", adm: "305", spc: "331" },
  { nic: "C-03-06", adm: "310", spc: "336" },
  { nic: "C-03-08", adm: "309", spc: "338" },
  { nic: "C-03-09", adm: "302", spc: "337" },
  { nic: "C-03-10", adm: "308", spc: "340" },
  { nic: "C-03-13", adm: "301", spc: "339" },
  { nic: "C-04-01", adm: "405", spc: "431" },
  { nic: "C-04-02", adm: "412", spc: "432" },
  { nic: "C-04-03", adm: "404", spc: "433" },
  { nic: "C-04-06", adm: "410", spc: "436" },
  { nic: "C-04-08", adm: "409", spc: "438" },
  { nic: "C-04-12", adm: "407", spc: "442" },
  { nic: "C-04-14", adm: "406", spc: "444" },
  { nic: "C-05-01", adm: "505", spc: "531" },
  { nic: "C-05-02", adm: "512", spc: "532" },
  { nic: "C-05-03", adm: "504", spc: "533" },
  { nic: "C-05-04", adm: "511", spc: "534" },
  { nic: "C-05-06", adm: "510", spc: "536" },
  { nic: "C-05-07", adm: "503", spc: "535" },
  { nic: "C-05-08", adm: "509", spc: "538" },
  { nic: "C-05-09", adm: "502", spc: "537" },
  { nic: "C-05-10", adm: "508", spc: "540" },
  { nic: "C-05-12", adm: "507", spc: "542" },
  { nic: "C-05-13", adm: "501", spc: "539" },
  { nic: "C-05-14", adm: "506", spc: "544" },
  { nic: "C-06-01", adm: "605", spc: "631" },
  { nic: "C-06-02", adm: "612", spc: "632" },
  { nic: "C-06-03", adm: "604", spc: "633" },
  { nic: "C-06-04", adm: "611", spc: "634" },
  { nic: "C-06-06", adm: "610", spc: "636" },
  { nic: "C-06-07", adm: "603", spc: "635" },
  { nic: "C-06-08", adm: "609", spc: "638" },
  { nic: "C-06-10", adm: "608", spc: "640" },
  { nic: "C-06-11", adm: "602", spc: "637" },
  { nic: "C-06-12", adm: "607", spc: "642" },
  { nic: "C-06-13", adm: "601", spc: "639" },
  { nic: "C-06-14", adm: "606", spc: "644" },
  { nic: "C-07-01", adm: "703", spc: "731" },
  { nic: "C-07-02", adm: "708", spc: "732" },
  { nic: "C-07-03", adm: "702", spc: "733" },
  { nic: "C-07-04", adm: "707", spc: "734" },
  { nic: "C-07-06", adm: "706", spc: "736" },
  { nic: "C-07-07", adm: "701", spc: "735" },
  { nic: "C-07-08", adm: "705", spc: "738" },
  { nic: "C-07-09", adm: "704", spc: "740" },
  { nic: "C-08-01", adm: "803", spc: "831" },
  { nic: "C-08-02", adm: "808", spc: "832" },
  { nic: "C-08-03", adm: "802", spc: "833" },
  { nic: "C-08-04", adm: "807", spc: "834" },
  { nic: "C-08-06", adm: "806", spc: "836" },
  { nic: "C-08-08", adm: "805", spc: "838" },
  { nic: "C-08-09", adm: "804", spc: "840" },
  { nic: "C-09-01", adm: "903", spc: "931" },
  { nic: "C-09-02", adm: "908", spc: "932" },
  { nic: "C-09-03", adm: "902", spc: "933" },
  { nic: "C-09-04", adm: "907", spc: "934" },
  { nic: "C-09-06", adm: "906", spc: "936" },
  { nic: "C-09-08", adm: "905", spc: "938" },
  { nic: "C-09-09", adm: "904", spc: "940" },
  { nic: "C-10-01", adm: "1003", spc: "1031" },
  { nic: "C-10-02", adm: "1008", spc: "1032" },
  { nic: "C-10-03", adm: "1002", spc: "1033" },
  { nic: "C-10-08", adm: "1005", spc: "1038" },
  { nic: "C-10-09", adm: "1004", spc: "1040" },
  { nic: "C-11-01", adm: "1103", spc: "1131" },
  { nic: "C-11-02", adm: "1108", spc: "1132" },
  { nic: "C-11-03", adm: "1102", spc: "1133" },
  { nic: "C-11-04", adm: "1107", spc: "1134" },
  { nic: "C-11-06", adm: "1106", spc: "1136" },
  { nic: "C-11-09", adm: "1104", spc: "1140" },
  { nic: "C-12-01", adm: "1203", spc: "1231" },
  { nic: "C-12-02", adm: "1208", spc: "1232" },
  { nic: "C-12-03", adm: "1202", spc: "1233" },
  { nic: "C-12-04", adm: "1207", spc: "1234" },
  { nic: "C-12-06", adm: "1206", spc: "1236" },
  { nic: "C-12-07", adm: "1201", spc: "1235" },
  { nic: "C-12-08", adm: "1205", spc: "1238" },
  { nic: "C-12-09", adm: "1204", spc: "1240" },
  { nic: "C-13-01", adm: "1303", spc: "1331" },
  { nic: "C-13-02", adm: "1308", spc: "1332" },
  { nic: "C-13-03", adm: "1302", spc: "1333" },
  { nic: "C-13-04", adm: "1307", spc: "1334" },
  { nic: "C-13-06", adm: "1306", spc: "1336" },
  { nic: "C-13-08", adm: "1305", spc: "1338" },
  { nic: "C-13-09", adm: "1304", spc: "1340" },
  { nic: "C-14-01", adm: "1403", spc: "1431" },
  { nic: "C-14-02", adm: "1408", spc: "1432" },
  { nic: "C-14-03", adm: "1402", spc: "1433" },
  { nic: "C-14-04", adm: "1407", spc: "1434" },
  { nic: "C-14-06", adm: "1406", spc: "1436" },
  { nic: "C-14-08", adm: "1405", spc: "1438" },
  { nic: "C-14-09", adm: "1404", spc: "1440" },
  { nic: "C-15-01", adm: "1503", spc: "1531" },
  { nic: "C-15-02", adm: "1508", spc: "1532" },
  { nic: "C-15-03", adm: "1502", spc: "1533" },
  { nic: "C-15-04", adm: "1507", spc: "1534" },
  { nic: "C-15-06", adm: "1506", spc: "1536" },
  { nic: "C-15-07", adm: "1501", spc: "1535" },
  { nic: "C-15-08", adm: "1505", spc: "1538" },
  { nic: "C-15-09", adm: "1504", spc: "1540" },
  { nic: "C-17-01", adm: "1702", spc: "1733" },
  { nic: "C-17-06", adm: "1705", spc: "1736" },
  { nic: "C-17-07", adm: "1701", spc: "1735" },
  { nic: "C-17-08", adm: "1704", spc: "1738" },
  { nic: "C-17-10", adm: "1703", spc: "1740" },
  { nic: "C-18-01", adm: "1802", spc: "1833" },
  { nic: "C-18-02", adm: "1806", spc: "1834" },
  { nic: "C-18-06", adm: "1805", spc: "1836" },
  { nic: "C-18-07", adm: "1801", spc: "1835" },
  { nic: "C-18-08", adm: "1804", spc: "1838" },
  { nic: "C-18-10", adm: "1803", spc: "1840" },
  { nic: "C-19-01", adm: "1902", spc: "1933" },
  { nic: "C-19-06", adm: "1905", spc: "1936" },
  { nic: "C-19-07", adm: "1901", spc: "1935" },
  { nic: "C-19-08", adm: "1904", spc: "1938" },
  { nic: "C-19-10", adm: "1903", spc: "1940" },
  { nic: "C-20-01", adm: "2002", spc: "2033" },
  { nic: "C-20-02", adm: "2006", spc: "2034" },
  { nic: "C-20-06", adm: "2005", spc: "2036" },
  { nic: "C-20-07", adm: "2001", spc: "2035" },
  { nic: "C-20-08", adm: "2004", spc: "2038" },
  { nic: "C-20-10", adm: "2003", spc: "2040" },
  { nic: "C-21-01", adm: "2102", spc: "2133" },
  { nic: "C-21-02", adm: "2106", spc: "2134" },
  { nic: "C-21-06", adm: "2105", spc: "2136" },
  { nic: "C-21-07", adm: "2101", spc: "2135" },
  { nic: "C-21-08", adm: "2104", spc: "2138" },
  { nic: "C-21-10", adm: "2103", spc: "2140" },
  { nic: "C-22-01", adm: "2202", spc: "2233" },
  { nic: "C-22-02", adm: "2206", spc: "2234" },
  { nic: "C-22-06", adm: "2205", spc: "2236" },
  { nic: "C-22-07", adm: "2201", spc: "2235" },
  { nic: "C-22-08", adm: "2204", spc: "2238" },
  { nic: "C-22-10", adm: "2203", spc: "2240" },
  { nic: "C-23-01", adm: "2302", spc: "2333" },
  { nic: "C-23-02", adm: "2306", spc: "2334" },
  { nic: "C-23-06", adm: "2305", spc: "2336" },
  { nic: "C-23-07", adm: "2301", spc: "2335" },
  { nic: "C-23-08", adm: "2304", spc: "2338" },
  { nic: "C-23-10", adm: "2303", spc: "2340" },
  { nic: "C-24-01", adm: "2402", spc: "2433" },
  { nic: "C-24-02", adm: "2406", spc: "2434" },
  { nic: "C-24-06", adm: "2405", spc: "2436" },
  { nic: "C-24-07", adm: "2401", spc: "2435" },
  { nic: "C-24-08", adm: "2404", spc: "2438" },
  { nic: "C-24-10", adm: "2403", spc: "2440" },
  { nic: "C-25-01", adm: "2502", spc: "2533" },
  { nic: "C-25-02", adm: "2506", spc: "2534" },
  { nic: "C-25-06", adm: "2505", spc: "2536" },
  { nic: "C-25-07", adm: "2501", spc: "2535" },
  { nic: "C-25-08", adm: "2504", spc: "2538" },
  { nic: "C-25-10", adm: "2503", spc: "2540" },
  { nic: "C-26-01", adm: "2602", spc: "2633" },
  { nic: "C-26-02", adm: "2606", spc: "2634" },
  { nic: "C-26-06", adm: "2605", spc: "2636" },
  { nic: "C-26-07", adm: "2601", spc: "2635" },
  { nic: "C-26-08", adm: "2604", spc: "2638" },
  { nic: "C-26-10", adm: "2603", spc: "2640" },
  { nic: "C-27-01", adm: "2702", spc: "2733" },
  { nic: "C-27-02", adm: "2706", spc: "2734" },
  { nic: "C-27-06", adm: "2705", spc: "2736" },
  { nic: "C-27-08", adm: "2704", spc: "2738" },
  { nic: "C-27-10", adm: "2703", spc: "2740" },
  { nic: "C-28-01", adm: "2802", spc: "2833" },
  { nic: "C-28-02", adm: "2806", spc: "2834" },
  { nic: "C-28-06", adm: "2805", spc: "2836" },
  { nic: "C-28-07", adm: "2801", spc: "2835" },
  { nic: "C-28-08", adm: "2804", spc: "2838" },
  { nic: "C-28-10", adm: "2803", spc: "2840" },
  { nic: "C-29-01", adm: "2902", spc: "2933" },
  { nic: "C-29-02", adm: "2906", spc: "2934" },
  { nic: "C-29-06", adm: "2905", spc: "2936" },
  { nic: "C-29-07", adm: "2901", spc: "2935" },
  { nic: "C-29-08", adm: "2904", spc: "2938" },
  { nic: "C-29-10", adm: "2903", spc: "2940" },
  { nic: "C-30-01", adm: "3001", spc: "3033" },
  { nic: "C-30-02", adm: "3003", spc: "3032" },
  { nic: "C-30-04", adm: "3002", spc: "3034" },
  { nic: "C-31-01", adm: "3101", spc: "3133" },
  { nic: "C-31-02", adm: "3103", spc: "3132" },
  { nic: "C-31-04", adm: "3102", spc: "3134" },
  { nic: "C-32-01", adm: "3201", spc: "3233" },
  { nic: "C-32-02", adm: "3203", spc: "3232" },
  { nic: "C-32-04", adm: "3202", spc: "3234" },
  { nic: "C-33-01", adm: "3301", spc: "3333" },
  { nic: "C-33-02", adm: "3303", spc: "3332" },
  { nic: "C-33-04", adm: "3302", spc: "3334" },
  { nic: "C-34-01", adm: "3401", spc: "3433" },
  { nic: "C-34-02", adm: "3403", spc: "3432" },
  { nic: "C-34-04", adm: "3402", spc: "3434" },
  { nic: "C-35-01", adm: "3501", spc: "3533" },
  { nic: "C-35-02", adm: "3503", spc: "3532" }
];

// ============================================================
// 🏢 CONDOR MARINA STAR UNIT MAPPING DATA
// ============================================================

const condorUnitMapping = [
  { titleDeed: "V103", physical: "G-01", area: "862.42", type: "VILLA", meter1: "82827361", meter2: "72806331" },
  { titleDeed: "V102", physical: "G-02", area: "231.99", type: "VILLA", meter1: "82828261", meter2: "82826985" },
  { titleDeed: "V101", physical: "G-03", area: "265.49", type: "VILLA", meter1: "82828256", meter2: "82826984" },
  { titleDeed: "O105", physical: "102", area: "92.7", type: "1 BHK", meter1: "82828262", meter2: "82828263" },
  { titleDeed: "O101", physical: "103", area: "77.99", type: "1 BHK", meter1: "82826982", meter2: "" },
  { titleDeed: "O102", physical: "104", area: "100.14", type: "1 BHK", meter1: "82826981", meter2: "" },
  { titleDeed: "O103", physical: "105", area: "70.45", type: "1 BHK", meter1: "82828260", meter2: "" },
  { titleDeed: "O104", physical: "106", area: "57.98", type: "1 BHK", meter1: "82826983", meter2: "" },
  { titleDeed: "S203", physical: "201", area: "46.76", type: "STUDIO", meter1: "82828195", meter2: "" },
  { titleDeed: "S202", physical: "202", area: "45.47", type: "STUDIO", meter1: "82828198", meter2: "" },
  { titleDeed: "S201", physical: "203", area: "47.2", type: "STUDIO", meter1: "82828275", meter2: "" },
  { titleDeed: "O201", physical: "204", area: "78.03", type: "1 BHK", meter1: "82828328", meter2: "" },
  { titleDeed: "O202", physical: "205", area: "85.31", type: "1 BHK", meter1: "82828331", meter2: "" },
  { titleDeed: "O203", physical: "206", area: "66.61", type: "1 BHK", meter1: "82828332", meter2: "" },
  { titleDeed: "S205", physical: "207", area: "46.86", type: "STUDIO", meter1: "82828199", meter2: "" },
  { titleDeed: "S204", physical: "208", area: "44.5", type: "STUDIO", meter1: "82828197", meter2: "" },
  { titleDeed: "O204", physical: "209", area: "88.12", type: "1 BHK", meter1: "82828329", meter2: "" },
  { titleDeed: "O205", physical: "210", area: "84.92", type: "1 BHK", meter1: "82828330", meter2: "" },
  { titleDeed: "O306", physical: "302", area: "92.22", type: "1 BHK", meter1: "82828207", meter2: "82828257" },
  { titleDeed: "S301", physical: "303", area: "47.2", type: "STUDIO", meter1: "82828205", meter2: "" },
  { titleDeed: "O301", physical: "304", area: "78.04", type: "1 BHK", meter1: "82827031", meter2: "" },
  { titleDeed: "O302", physical: "305", area: "85.31", type: "1 BHK", meter1: "82827036", meter2: "" },
  { titleDeed: "O303", physical: "306", area: "66.91", type: "1 BHK", meter1: "82827029", meter2: "" },
  { titleDeed: "S305", physical: "307", area: "46.86", type: "STUDIO", meter1: "82828196", meter2: "" },
  { titleDeed: "S304", physical: "308", area: "44.5", type: "STUDIO", meter1: "82828206", meter2: "" },
  { titleDeed: "O304", physical: "309", area: "88.12", type: "1 BHK", meter1: "82827035", meter2: "" },
  { titleDeed: "O305", physical: "310", area: "84.92", type: "1 BHK", meter1: "82827030", meter2: "" },
  { titleDeed: "T405", physical: "401", area: "161.67", type: "2 BHK", meter1: "82827297", meter2: "" },
  { titleDeed: "T401", physical: "402", area: "107.75", type: "2 BHK", meter1: "82827034", meter2: "" },
  { titleDeed: "T402", physical: "403", area: "106.84", type: "2 BHK", meter1: "82827038", meter2: "" },
  { titleDeed: "T403", physical: "404", area: "102.98", type: "2 BHK", meter1: "82827037", meter2: "" },
  { titleDeed: "T404", physical: "405", area: "144.22", type: "2 BHK", meter1: "82827298", meter2: "" },
  { titleDeed: "S503", physical: "501", area: "46.9", type: "STUDIO", meter1: "82828200", meter2: "" },
  { titleDeed: "S502", physical: "502", area: "44.93", type: "STUDIO", meter1: "82828201", meter2: "" },
  { titleDeed: "S501", physical: "503", area: "46.49", type: "STUDIO", meter1: "82828202", meter2: "" },
  { titleDeed: "O501", physical: "504", area: "78.11", type: "1 BHK", meter1: "82828325", meter2: "" },
  { titleDeed: "O502", physical: "505", area: "85.71", type: "1 BHK", meter1: "82827033", meter2: "" },
  { titleDeed: "O503", physical: "506", area: "63.86", type: "1 BHK", meter1: "82828326", meter2: "" },
  { titleDeed: "S504", physical: "507", area: "47.14", type: "STUDIO", meter1: "82828203", meter2: "" },
  { titleDeed: "S505", physical: "508", area: "44.6", type: "STUDIO", meter1: "82828204", meter2: "" },
  { titleDeed: "O504", physical: "509", area: "88.14", type: "1 BHK", meter1: "82828327", meter2: "" },
  { titleDeed: "O505", physical: "510", area: "84.73", type: "1 BHK", meter1: "82827032", meter2: "" },
  { titleDeed: "S603", physical: "601", area: "46.9", type: "STUDIO", meter1: "82828276", meter2: "" },
  { titleDeed: "S602", physical: "602", area: "45.62", type: "STUDIO", meter1: "82828278", meter2: "" },
  { titleDeed: "S601", physical: "603", area: "47.42", type: "STUDIO", meter1: "82828280", meter2: "" },
  { titleDeed: "O601", physical: "604", area: "78.11", type: "1 BHK", meter1: "82827039", meter2: "" },
  { titleDeed: "O602", physical: "605", area: "85.71", type: "1 BHK", meter1: "82828333", meter2: "" },
  { titleDeed: "O603", physical: "606", area: "63.86", type: "1 BHK", meter1: "82827041", meter2: "" },
  { titleDeed: "S604", physical: "607", area: "47.14", type: "STUDIO", meter1: "82828279", meter2: "" },
  { titleDeed: "S605", physical: "608", area: "44.6", type: "STUDIO", meter1: "82828277", meter2: "" },
  { titleDeed: "O604", physical: "609", area: "88.14", type: "1 BHK", meter1: "82828334", meter2: "" },
  { titleDeed: "O605", physical: "610", area: "84.74", type: "1 BHK", meter1: "82827040", meter2: "" },
  { titleDeed: "S703", physical: "701", area: "46.89", type: "STUDIO", meter1: "82828281", meter2: "" },
  { titleDeed: "S702", physical: "702", area: "45.62", type: "STUDIO", meter1: "82828282", meter2: "" },
  { titleDeed: "S701", physical: "703", area: "47.42", type: "STUDIO", meter1: "82828283", meter2: "" },
  { titleDeed: "O701", physical: "704", area: "78.11", type: "1 BHK", meter1: "82827048", meter2: "" },
  { titleDeed: "O702", physical: "705", area: "85.71", type: "1 BHK", meter1: "82826998", meter2: "" },
  { titleDeed: "O703", physical: "706", area: "63.86", type: "1 BHK", meter1: "82827046", meter2: "" },
  { titleDeed: "S704", physical: "707", area: "47.14", type: "STUDIO", meter1: "82828225", meter2: "" },
  { titleDeed: "S705", physical: "708", area: "44.6", type: "STUDIO", meter1: "82828284", meter2: "" },
  { titleDeed: "O704", physical: "709", area: "88.14", type: "1 BHK", meter1: "82827045", meter2: "" },
  { titleDeed: "O705", physical: "710", area: "84.74", type: "1 BHK", meter1: "82827044", meter2: "" },
  { titleDeed: "S803", physical: "801", area: "46.89", type: "STUDIO", meter1: "82828227", meter2: "" },
  { titleDeed: "S802", physical: "802", area: "45.62", type: "STUDIO", meter1: "82828226", meter2: "" },
  { titleDeed: "S801", physical: "803", area: "47.42", type: "STUDIO", meter1: "82828229", meter2: "" },
  { titleDeed: "O801", physical: "804", area: "78.11", type: "1 BHK", meter1: "82828346", meter2: "" },
  { titleDeed: "O802", physical: "805", area: "85.71", type: "1 BHK", meter1: "82828347", meter2: "" },
  { titleDeed: "O803", physical: "806", area: "63.86", type: "1 BHK", meter1: "82827042", meter2: "" },
  { titleDeed: "S804", physical: "807", area: "47.14", type: "STUDIO", meter1: "82828228", meter2: "" },
  { titleDeed: "S805", physical: "808", area: "44.6", type: "STUDIO", meter1: "82828230", meter2: "" },
  { titleDeed: "O804", physical: "809", area: "88.14", type: "1 BHK", meter1: "82827043", meter2: "" },
  { titleDeed: "O805", physical: "810", area: "84.74", type: "1 BHK", meter1: "82828345", meter2: "" },
  { titleDeed: "S903", physical: "901", area: "46.9", type: "STUDIO", meter1: "82828233", meter2: "" },
  { titleDeed: "S902", physical: "902", area: "44.93", type: "STUDIO", meter1: "82828234", meter2: "" },
  { titleDeed: "S901", physical: "903", area: "46.49", type: "STUDIO", meter1: "82828232", meter2: "" },
  { titleDeed: "O901", physical: "904", area: "78.11", type: "1 BHK", meter1: "82828348", meter2: "" },
  { titleDeed: "O902", physical: "905", area: "85.71", type: "1 BHK", meter1: "82828349", meter2: "" },
  { titleDeed: "O903", physical: "906", area: "63.86", type: "1 BHK", meter1: "82828350", meter2: "" },
  { titleDeed: "O906", physical: "907", area: "91.78", type: "1 BHK", meter1: "82828231", meter2: "82828265" },
  { titleDeed: "O904", physical: "909", area: "88.14", type: "1 BHK", meter1: "82828352", meter2: "" },
  { titleDeed: "O905", physical: "910", area: "84.74", type: "1 BHK", meter1: "82828351", meter2: "" },
  { titleDeed: "S1003", physical: "1001", area: "46.9", type: "STUDIO", meter1: "82828267", meter2: "" },
  { titleDeed: "S1002", physical: "1002", area: "44.93", type: "STUDIO", meter1: "82828266", meter2: "" },
  { titleDeed: "S1001", physical: "1003", area: "46.49", type: "STUDIO", meter1: "82828270", meter2: "" },
  { titleDeed: "O1001", physical: "1004", area: "78.11", type: "1 BHK", meter1: "82828383", meter2: "" },
  { titleDeed: "O1002", physical: "1005", area: "85.71", type: "1 BHK", meter1: "82828384", meter2: "" },
  { titleDeed: "O1003", physical: "1006", area: "63.86", type: "1 BHK", meter1: "82828382", meter2: "" },
  { titleDeed: "S1004", physical: "1007", area: "47.14", type: "STUDIO", meter1: "82828269", meter2: "" },
  { titleDeed: "S1005", physical: "1008", area: "44.6", type: "STUDIO", meter1: "82828268", meter2: "" },
  { titleDeed: "O1004", physical: "1009", area: "88.14", type: "1 BHK", meter1: "82828353", meter2: "" },
  { titleDeed: "O1005", physical: "1010", area: "84.73", type: "1 BHK", meter1: "82828354", meter2: "" },
  { titleDeed: "S1103", physical: "1101", area: "46.9", type: "STUDIO", meter1: "82828273", meter2: "" },
  { titleDeed: "S1102", physical: "1102", area: "44.93", type: "STUDIO", meter1: "82828272", meter2: "" },
  { titleDeed: "S1101", physical: "1103", area: "46.49", type: "STUDIO", meter1: "82828271", meter2: "" },
  { titleDeed: "O1101", physical: "1104", area: "78.11", type: "1 BHK", meter1: "82828381", meter2: "" },
  { titleDeed: "O1102", physical: "1105", area: "85.71", type: "1 BHK", meter1: "82828380", meter2: "" },
  { titleDeed: "O1103", physical: "1106", area: "63.86", type: "1 BHK", meter1: "82828378", meter2: "" },
  { titleDeed: "S1104", physical: "1107", area: "47.14", type: "STUDIO", meter1: "82828274", meter2: "" },
  { titleDeed: "S1105", physical: "1108", area: "44.6", type: "STUDIO", meter1: "82828219", meter2: "" },
  { titleDeed: "O1104", physical: "1109", area: "88.14", type: "1 BHK", meter1: "82828379", meter2: "" },
  { titleDeed: "O1105", physical: "1110", area: "84.73", type: "1 BHK", meter1: "82828377", meter2: "" },
  { titleDeed: "S1203", physical: "1201", area: "46.9", type: "STUDIO", meter1: "82828221", meter2: "" },
  { titleDeed: "S1202", physical: "1202", area: "44.93", type: "STUDIO", meter1: "82828220", meter2: "" },
  { titleDeed: "S1201", physical: "1203", area: "46.49", type: "STUDIO", meter1: "82828222", meter2: "" },
  { titleDeed: "O1201", physical: "1204", area: "78.11", type: "1 BHK", meter1: "82828357", meter2: "" },
  { titleDeed: "O1202", physical: "1205", area: "85.71", type: "1 BHK", meter1: "82828356", meter2: "" },
  { titleDeed: "O1203", physical: "1206", area: "63.86", type: "1 BHK", meter1: "82828355", meter2: "" },
  { titleDeed: "S1204", physical: "1207", area: "47.14", type: "STUDIO", meter1: "82828224", meter2: "" },
  { titleDeed: "S1205", physical: "1208", area: "44.6", type: "STUDIO", meter1: "82828223", meter2: "" },
  { titleDeed: "O1204", physical: "1209", area: "88.14", type: "1 BHK", meter1: "82828376", meter2: "" },
  { titleDeed: "O1205", physical: "1210", area: "84.73", type: "1 BHK", meter1: "82828375", meter2: "" },
  { titleDeed: "S1303", physical: "1301", area: "46.9", type: "STUDIO", meter1: "82828218", meter2: "" },
  { titleDeed: "S1302", physical: "1302", area: "44.93", type: "STUDIO", meter1: "82828215", meter2: "" },
  { titleDeed: "S1301", physical: "1303", area: "46.49", type: "STUDIO", meter1: "82828217", meter2: "" },
  { titleDeed: "O1301", physical: "1304", area: "78.11", type: "1 BHK", meter1: "82828362", meter2: "" },
  { titleDeed: "O1302", physical: "1305", area: "85.71", type: "1 BHK", meter1: "82828361", meter2: "" },
  { titleDeed: "O1303", physical: "1306", area: "63.86", type: "1 BHK", meter1: "82828360", meter2: "" },
  { titleDeed: "S1304", physical: "1307", area: "47.14", type: "STUDIO", meter1: "82828236", meter2: "" },
  { titleDeed: "S1305", physical: "1308", area: "44.6", type: "STUDIO", meter1: "82828216", meter2: "" },
  { titleDeed: "O1304", physical: "1309", area: "88.14", type: "1 BHK", meter1: "82828359", meter2: "" },
  { titleDeed: "O1305", physical: "1310", area: "84.73", type: "1 BHK", meter1: "82828358", meter2: "" },
  { titleDeed: "S1403", physical: "1401", area: "46.9", type: "STUDIO", meter1: "82828239", meter2: "" },
  { titleDeed: "S1402", physical: "1402", area: "44.93", type: "STUDIO", meter1: "82828237", meter2: "" },
  { titleDeed: "S1401", physical: "1403", area: "47.42", type: "STUDIO", meter1: "82828242", meter2: "" },
  { titleDeed: "O1401", physical: "1404", area: "78.11", type: "1 BHK", meter1: "82828343", meter2: "" },
  { titleDeed: "O1402", physical: "1405", area: "85.71", type: "1 BHK", meter1: "82828342", meter2: "" },
  { titleDeed: "O1403", physical: "1406", area: "63.86", type: "1 BHK", meter1: "82828344", meter2: "" },
  { titleDeed: "S1404", physical: "1407", area: "47.14", type: "STUDIO", meter1: "82828238", meter2: "" },
  { titleDeed: "S1405", physical: "1408", area: "44.6", type: "STUDIO", meter1: "82828240", meter2: "" },
  { titleDeed: "O1404", physical: "1409", area: "86.54", type: "1 BHK", meter1: "82828363", meter2: "" },
  { titleDeed: "O1405", physical: "1410", area: "84.74", type: "1 BHK", meter1: "82828364", meter2: "" },
  { titleDeed: "O1506", physical: "1502", area: "92.51", type: "1 BHK", meter1: "82828244", meter2: "" },
  { titleDeed: "S1501", physical: "1503", area: "47.42", type: "STUDIO", meter1: "82828241", meter2: "" },
  { titleDeed: "O1501", physical: "1504", area: "78.11", type: "1 BHK", meter1: "82828340", meter2: "" },
  { titleDeed: "O1502", physical: "1505", area: "85.71", type: "1 BHK", meter1: "82828341", meter2: "82828235" },
  { titleDeed: "O1503", physical: "1506", area: "63.85", type: "1 BHK", meter1: "82828339", meter2: "" },
  { titleDeed: "S1504", physical: "1507", area: "47.14", type: "STUDIO", meter1: "82854004", meter2: "" },
  { titleDeed: "S1505", physical: "1508", area: "44.6", type: "STUDIO", meter1: "82828175", meter2: "" },
  { titleDeed: "O1504", physical: "1509", area: "88.14", type: "1 BHK", meter1: "82828337", meter2: "" },
  { titleDeed: "O1505", physical: "1510", area: "84.74", type: "1 BHK", meter1: "82828338", meter2: "" },
  { titleDeed: "S1603", physical: "1601", area: "46.9", type: "STUDIO", meter1: "82828176", meter2: "" },
  { titleDeed: "S1602", physical: "1602", area: "44.93", type: "STUDIO", meter1: "82828178", meter2: "" },
  { titleDeed: "S1601", physical: "1603", area: "46.49", type: "STUDIO", meter1: "82828179", meter2: "" },
  { titleDeed: "O1601", physical: "1604", area: "78.11", type: "1 BHK", meter1: "82828393", meter2: "" },
  { titleDeed: "O1602", physical: "1605", area: "85.71", type: "1 BHK", meter1: "82828392", meter2: "" },
  { titleDeed: "O1603", physical: "1606", area: "63.86", type: "1 BHK", meter1: "82828394", meter2: "" },
  { titleDeed: "S1604", physical: "1607", area: "47.14", type: "STUDIO", meter1: "82828177", meter2: "" },
  { titleDeed: "S1605", physical: "1608", area: "44.6", type: "STUDIO", meter1: "82828180", meter2: "" },
  { titleDeed: "O1604", physical: "1609", area: "88.14", type: "1 BHK", meter1: "82828336", meter2: "" },
  { titleDeed: "O1605", physical: "1610", area: "84.73", type: "1 BHK", meter1: "82828335", meter2: "" },
  { titleDeed: "S1703", physical: "1701", area: "46.89", type: "STUDIO", meter1: "82828183", meter2: "" },
  { titleDeed: "S1702", physical: "1702", area: "45.62", type: "STUDIO", meter1: "82828184", meter2: "" },
  { titleDeed: "S1701", physical: "1703", area: "47.42", type: "STUDIO", meter1: "82828182", meter2: "" },
  { titleDeed: "O1701", physical: "1704", area: "78.11", type: "1 BHK", meter1: "82828391", meter2: "" },
  { titleDeed: "O1702", physical: "1705", area: "85.71", type: "1 BHK", meter1: "82828390", meter2: "" },
  { titleDeed: "O1703", physical: "1706", area: "63.86", type: "1 BHK", meter1: "82828389", meter2: "" },
  { titleDeed: "S1704", physical: "1707", area: "47.14", type: "STUDIO", meter1: "82828181", meter2: "" },
  { titleDeed: "S1705", physical: "1708", area: "44.6", type: "STUDIO", meter1: "82828248", meter2: "" },
  { titleDeed: "O1704", physical: "1709", area: "88.14", type: "1 BHK", meter1: "82828388", meter2: "" },
  { titleDeed: "O1705", physical: "1710", area: "84.74", type: "1 BHK", meter1: "82828387", meter2: "" },
  { titleDeed: "S1803", physical: "1801", area: "46.9", type: "STUDIO", meter1: "82828247", meter2: "" },
  { titleDeed: "O1806", physical: "1803", area: "93.04", type: "1 BHK", meter1: "82828249", meter2: "82828250" },
  { titleDeed: "O1801", physical: "1804", area: "78.11", type: "1 BHK", meter1: "82828367", meter2: "" },
  { titleDeed: "O1802", physical: "1805", area: "85.71", type: "1 BHK", meter1: "82828365", meter2: "" },
  { titleDeed: "O1803", physical: "1806", area: "63.86", type: "1 BHK", meter1: "82828366", meter2: "" },
  { titleDeed: "S1804", physical: "1807", area: "47.14", type: "STUDIO", meter1: "82828245", meter2: "" },
  { titleDeed: "S1805", physical: "1808", area: "44.6", type: "STUDIO", meter1: "82828246", meter2: "" },
  { titleDeed: "O1804", physical: "1809", area: "88.14", type: "1 BHK", meter1: "82828386", meter2: "" },
  { titleDeed: "O1805", physical: "1810", area: "84.74", type: "1 BHK", meter1: "82828385", meter2: "" },
  { titleDeed: "S1903", physical: "1901", area: "46.89", type: "STUDIO", meter1: "82828254", meter2: "" },
  { titleDeed: "S1902", physical: "1902", area: "45.62", type: "STUDIO", meter1: "82828253", meter2: "" },
  { titleDeed: "S1901", physical: "1903", area: "47.42", type: "STUDIO", meter1: "82828252", meter2: "" },
  { titleDeed: "O1901", physical: "1904", area: "78.11", type: "1 BHK", meter1: "82828370", meter2: "" },
  { titleDeed: "O1902", physical: "1905", area: "85.71", type: "1 BHK", meter1: "82828371", meter2: "" },
  { titleDeed: "O1903", physical: "1906", area: "63.86", type: "1 BHK", meter1: "82828372", meter2: "" },
  { titleDeed: "S1904", physical: "1907", area: "47.14", type: "STUDIO", meter1: "82828251", meter2: "" },
  { titleDeed: "S1905", physical: "1908", area: "44.6", type: "STUDIO", meter1: "82828264", meter2: "" },
  { titleDeed: "O1904", physical: "1909", area: "88.14", type: "1 BHK", meter1: "82828374", meter2: "" },
  { titleDeed: "O1905", physical: "1910", area: "84.74", type: "1 BHK", meter1: "82828373", meter2: "" },
  { titleDeed: "T2005", physical: "2001", area: "161.71", type: "2 BHK", meter1: "82827368", meter2: "" },
  { titleDeed: "T2001", physical: "2002", area: "109.63", type: "2 BHK", meter1: "82827127", meter2: "" },
  { titleDeed: "T2002", physical: "2003", area: "107.04", type: "2 BHK", meter1: "82827128", meter2: "" },
  { titleDeed: "T2003", physical: "2004", area: "103.32", type: "2 BHK", meter1: "82827126", meter2: "" },
  { titleDeed: "T2004", physical: "2005", area: "151.38", type: "2 BHK", meter1: "82827379", meter2: "" },
  { titleDeed: "T2105", physical: "2101", area: "161.71", type: "2 BHK", meter1: "82827366", meter2: "" },
  { titleDeed: "T2101", physical: "2102", area: "109.63", type: "2 BHK", meter1: "82827124", meter2: "" },
  { titleDeed: "T2102", physical: "2103", area: "107.04", type: "2 BHK", meter1: "82828368", meter2: "" },
  { titleDeed: "T2103", physical: "2104", area: "103.32", type: "2 BHK", meter1: "82828369", meter2: "" },
  { titleDeed: "T2104", physical: "2105", area: "151.38", type: "2 BHK", meter1: "82827367", meter2: "" },
  { titleDeed: "T2205", physical: "2201", area: "161.71", type: "2 BHK", meter1: "82827364", meter2: "" },
  { titleDeed: "T2201", physical: "2202", area: "109.63", type: "2 BHK", meter1: "82827123", meter2: "" },
  { titleDeed: "T2202", physical: "2203", area: "107.04", type: "2 BHK", meter1: "82827122", meter2: "" },
  { titleDeed: "T2203", physical: "2204", area: "103.32", type: "2 BHK", meter1: "82827125", meter2: "" },
  { titleDeed: "T2204", physical: "2205", area: "151.38", type: "2 BHK", meter1: "82827363", meter2: "" },
  { titleDeed: "T2305", physical: "2301", area: "161.71", type: "2 BHK", meter1: "82827365", meter2: "" },
  { titleDeed: "T2301", physical: "2302", area: "109.63", type: "2 BHK", meter1: "82827121", meter2: "" },
  { titleDeed: "T2302", physical: "2303", area: "107.04", type: "2 BHK", meter1: "82827119", meter2: "" },
  { titleDeed: "T2303", physical: "2304", area: "103.32", type: "2 BHK", meter1: "82827120", meter2: "" },
  { titleDeed: "T2304", physical: "2305", area: "151.38", type: "2 BHK", meter1: "82827362", meter2: "" },
  { titleDeed: "T2405", physical: "2401", area: "161.71", type: "2 BHK", meter1: "82827359", meter2: "" },
  { titleDeed: "T2401", physical: "2402", area: "109.63", type: "2 BHK", meter1: "82826986", meter2: "" },
  { titleDeed: "T2402", physical: "2403", area: "107.04", type: "2 BHK", meter1: "82826980", meter2: "" },
  { titleDeed: "T2403", physical: "2404", area: "103.32", type: "2 BHK", meter1: "82826979", meter2: "" },
  { titleDeed: "T2404", physical: "2405", area: "151.38", type: "2 BHK", meter1: "82827360", meter2: "" },
  { titleDeed: "PH2501", physical: "2501", area: "627.61", type: "PENT HOUSE", meter1: "72799155", meter2: "" },
  { titleDeed: "PH2601", physical: "2601", area: "562.39", type: "PENT HOUSE", meter1: "72799150", meter2: "" },
  { titleDeed: "SHOP-1", physical: "SHOP-1", area: "95.71", type: "SHOP", meter1: "82828255", meter2: "" },
  { titleDeed: "SHOP-2", physical: "SHOP-2", area: "172.6", type: "SHOP", meter1: "82828258", meter2: "" },
  { titleDeed: "SHOP-3", physical: "SHOP-3", area: "200.23", type: "SHOP", meter1: "82828259", meter2: "82626092" },
  { titleDeed: "RETAIL-1", physical: "RETAIL-1", area: "184.12", type: "SHOP", meter1: "72760742", meter2: "" },
  { titleDeed: "RETAIL-2", physical: "RETAIL-2", area: "135.2", type: "SHOP", meter1: "72760736", meter2: "" }
];

// ============================================================
// 🏢 TOWERS DATA & DEFAULTS
// ============================================================

const defaultTowersData = {
  "Al Dana Towers": { "client": "ADCP/Nine Yard", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "40.00 AED", "activation": "200.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Al Mamzar Gate": { "client": "H S H Real Estate", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "40.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Al Nuaimiya Tower C": { "client": "Aqaar Community Management", "location": "Ajman", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "150.00 AED" },
  "Al Raha Beach Towers": { "client": "Emirates Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "500.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Al Reem Bay Tower 1": { "client": "FAB Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "28.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "250.00 AED", "noc": "50.00 AED", "final": "25.00 AED" },
  "Al Reem Bay Tower 2": { "client": "FAB Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "28.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "250.00 AED", "noc": "50.00 AED", "final": "25.00 AED" },
  "Al Wifaq Tower": { "client": "ADCP/Nine Yard", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC for new customer", "online": "Yes", "billing": "25.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Amaya Tower 1": { "client": "Dhafir development", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Amaya Tower 2": { "client": "Dhafir development", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Aria Residence": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "Client", "deposit": "Client", "online": "No", "billing": "20.00 AED", "late": "25.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Ayedh Tower": { "client": "Dajeem Properties", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Bali Residence": { "client": "Stratum Owner Association Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Binghatti East": { "client": "Kaizen Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "20.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Binghatti West": { "client": "Kaizen Owner Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "20.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Building H": { "client": "National Investment Cooperation", "location": "Abudhabi", "bank": "SPC", "deposit": "N/A", "online": "Yes", "billing": "37.00 AED", "late": "n/a", "activation": "100.00 AED", "disconnection": "200.00 AED", "noc": "50.00 AED", "final": "30.00 AED" },
  "Centurion Star Tower A": { "client": "Reliance Owners Association Management", "location": "Dubai", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "40.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Centurion Star Tower B": { "client": "Reliance Owners Association Management", "location": "Dubai", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "40.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Clover Bay": { "client": "Stratum Owner Association Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Condor Marina Star": { "client": "King Royal Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Corniche Tower": { "client": "Aqaar Community Management", "location": "Ajman", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "150.00 AED" },
  "Creek Vistas Grande": { "client": "Sobha Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "DG Building 110": { "client": "Modo Property Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "DG Building 111": { "client": "Modo Property Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "DG Building 112": { "client": "Modo Property Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC for new customer", "online": "Yes", "billing": "35.00 AED", "late": "40.00 AED", "activation": "150.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "DG Building 132": { "client": "Modo Property Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "East Coast": { "client": "Saeed Mohammed Abdulla Alraqbani Hamdan Bin Abdullah", "location": "Dubai", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "30.00 AED", "late": "25.00 AED", "activation": "60.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Eastern Mangrooves": { "client": "Aldar Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "25.00 AED", "activation": "150.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Eastern Star": { "client": "DGM Properties LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "40.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Elz by Danube": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Fairmont Marina Residences": { "client": "National Investment Cooperation", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "maintenance": "7.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "200.00 AED", "noc": "50.00 AED", "final": "30.00 AED" },
  "Gemini Splendor": { "client": "Stratum Owner Association Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Glamz by Danube": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Grosvenor Business Tower": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "35.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Hthree by Aurora": { "client": "Better Communities Owner Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "40.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Hussain Ibrahim Mohamed Ibrahim Alhammadi": { "client": "Curve Real Estate LLC", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "20.00 AED", "late": "75.00 AED", "activation": "150.00 AED", "disconnection": "250.00 AED", "noc": "50.00 AED", "final": "50.00 AED" },
  "Julphar Residence": { "client": "Stratum Owner Association Management", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "50.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "50.00 AED" },
  "Lawnz by Danube": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Maison VI Residence": { "client": "Khyber Investments Limited", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Makeen Residence": { "client": "Makeen Properties", "location": "Dubai", "bank": "SPC", "deposit": "SPC for new customer", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Marina Sunset": { "client": "National Investment Cooperation", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "28.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "50.00 AED", "final": "30.00 AED" },
  "Miraclz by Danube": { "client": "Stratum Owner Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Muhaimat Tower": { "client": "Arabian Falcon Group", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "0.00 AED" },
  "Nation Tower Commercial": { "client": "ICT", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "No", "billing": "23.00 AED", "late": "0.00 AED", "activation": "50.00 AED", "disconnection": "500.00 AED", "noc": "30.00 AED", "final": "0.00 AED" },
  "Palace Tower": { "client": "Reliance Owners Association Management", "location": "Dubai", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "25.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Pearl Coast": { "client": "Al Khaimah Real Estate", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "40.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Raha C6": { "client": "Saeed Mohammed Abdulla Alraqbani Hamdan Bin Abdullah", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "25.00 AED", "activation": "60.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "25.00 AED" },
  "Raha C7": { "client": "Saeed Mohammed Abdulla Alraqbani Hamdan Bin Abdullah", "location": "Abudhabi", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "25.00 AED", "activation": "60.00 AED", "disconnection": "250.00 AED", "noc": "100.00 AED", "final": "25.00 AED" },
  "Resortz by Danube": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Shams Meera Tower 1": { "client": "Aldar Properties/Provis OA Management", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Shams Meera Tower 2": { "client": "Aldar Properties/Provis OA Management", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "Silverene Tower": { "client": "Palma Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "50.00 AED", "late": "25.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Skyview Tower": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "35.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Sobha Waves": { "client": "Sobha Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Sobha Waves Grande": { "client": "Sobha Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Starz by Danube": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "50.00 AED", "activation": "200.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Sway Residence": { "client": "Kaizen Owner Association Management Services LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "The 7 By Aurora": { "client": "Aurora Real Estate Development LLC", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "23.00 AED", "late": "40.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "The Bridges 4": { "client": "Aldar Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "The Bridges 5": { "client": "Aldar Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "The Bridges 6": { "client": "Aldar Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "25.00 AED", "activation": "50.00 AED", "disconnection": "150.00 AED", "noc": "100.00 AED", "final": "35.00 AED" },
  "The Dunes Tower": { "client": "Reliance Owners Association Management", "location": "Dubai", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "34.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "The Lamar Residence Tower A": { "client": "Al Saqer Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "500.00 AED", "noc": "150.00 AED", "final": "20.00 AED" },
  "The Lamar Residence Tower B": { "client": "Al Saqer Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "500.00 AED", "noc": "150.00 AED", "final": "20.00 AED" },
  "The Lamar Residence Tower C": { "client": "Al Saqer Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "500.00 AED", "noc": "150.00 AED", "final": "20.00 AED" },
  "The Lamar Residence Tower D": { "client": "Al Saqer Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "500.00 AED", "noc": "150.00 AED", "final": "20.00 AED" },
  "The Lamar Residence Townhouse": { "client": "Al Saqer Properties", "location": "Abudhabi", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "500.00 AED", "noc": "150.00 AED", "final": "20.00 AED" },
  "Torino by ORO24": { "client": "ORO24 Developments", "location": "Dubai", "bank": "SPC", "deposit": "Client", "online": "Yes", "billing": "30.00 AED", "late": "35.00 AED", "activation": "0.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Water Front Trident": { "client": "Stratum Owners Association Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "35.00 AED", "late": "50.00 AED", "activation": "250.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Waves Tower-Damac": { "client": "Damac", "location": "Dubai", "bank": "Client", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "maintenance": "20.00 AED", "late": "0.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Westwood By Imtiaz": { "client": "Better Community Management", "location": "Dubai", "bank": "SPC", "deposit": "SPC", "online": "Yes", "billing": "25.00 AED", "late": "30.00 AED", "activation": "100.00 AED", "disconnection": "100.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Yasmina Towers 1": { "client": "Dhafir development", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" },
  "Yasmina Towers 2": { "client": "Dhafir development", "location": "Abudhabi", "bank": "Client", "deposit": "Client", "online": "Yes", "billing": "35.00 AED", "late": "35.00 AED", "activation": "100.00 AED", "disconnection": "500.00 AED", "noc": "0.00 AED", "final": "0.00 AED" }
};

let towersData = JSON.parse(JSON.stringify(defaultTowersData));

function saveTowersToStorage() {
  db.collection("settings").doc("towersData").set(towersData)
    .then(() => console.log("✅ Towers saved to Firestore"))
    .catch((err) => console.error("❌ Firestore Save Error (Towers):", err));
}

// ============================================================
// 📋 INSPECTION SCHEDULE DATA & DEFAULTS
// ============================================================

const defaultScheduleData = [
  { day: "Monday", buildings: ["Bali Residence", "Clover Bay", "Glamz By Danube", "H3 By Aurora", "Jewel Of Creek", "Lawnz By Danube", "Maison Vi Residence", "Makeen Residence", "Starz By Danube"] },
  { day: "Tuesday", buildings: ["Condor Marina Star", "Damac Waves Tower", "Discovery Garden 110", "Discovery Garden 111", "Discovery Garden 112", "Discovery Garden 132", "Silverene Tower", "Skyview", "Waterfront", "Westwood"] },
  { day: "Wednesday", buildings: ["Ayedh Tower", "Creek Vistas Grande", "Eastern Star", "Gemini Splendor", "Sobha Waves Tower", "Waves Grande", "Riah Tower", "Olivo Park", "Sway Residence"] },
  { day: "Thursday", buildings: ["Aria Residence", "Elz By Danube", "Miraclz By Danube", "Resortz By Danube", "Torino By Oro24"] },
  { day: "Friday", buildings: ["Binghatti East", "Binghatti West", "Centurion", "Dunes Tower", "Palace Tower", "Pearl Coast", "The 7 By Aurora", "East Coast", "Grosvenor", "Mamzar Gate"] },
  { day: "Saturday", buildings: ["Corniche", "Nuaimiya", "Horizon"] }
];

let scheduleData = JSON.parse(JSON.stringify(defaultScheduleData));

function saveScheduleToStorage() {
  db.collection("settings").doc("scheduleData").set({ data: scheduleData })
    .then(() => console.log("✅ Schedule saved to Firestore"))
    .catch((err) => console.error("❌ Firestore Save Error (Schedule):", err));
}

// ============================================================
// 📅 AUGUST 2026 MONTHLY DUTY ROSTER DATA & DEFAULTS
// ============================================================

const defaultRosterData = [
  { dept: "Calls", lang: "Ara", name: "Shadi", schedule: { 1:"Shift 3", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"OFF+", 8:"Shift 3", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"OFF+", 15:"Shift 3", 16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"OFF+", 22:"Shift 3", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"OFF+", 29:"Shift 3", 30:"Shift 3", 31:"Shift 3" }},
  { dept: "Calls", lang: "Ara", name: "Mirna", schedule: { 1:"OFF+", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"OFF+", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"OFF+", 16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"OFF+", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"OFF+", 30:"Shift 1", 31:"Shift 1" }},
  { dept: "Calls", lang: "Ara", name: "Hanya", schedule: { 1:"Shift 1", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"OFF+", 8:"Shift 1", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"OFF+", 15:"Shift 1", 16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"OFF+", 22:"Shift 1", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"OFF+", 29:"Shift 1", 30:"Shift 1", 31:"Shift 1" }},
  { dept: "Calls", lang: "Ara", name: "Mostafa", schedule: { 1:"OFF+", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"Shift 3", 8:"OFF+", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"Shift 3", 15:"OFF+", 16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"Shift 3", 22:"OFF+", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"Shift 3", 29:"OFF+", 30:"Shift 3", 31:"Shift 3" }},
  { dept: "Calls", lang: "Ara", name: "Salma", schedule: { 1:"Shift 1", 2:"OFF+", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"Shift 1", 9:"OFF+", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"Shift 1", 16:"OFF+", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"Shift 1", 23:"OFF+", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"Shift 1", 30:"OFF+", 31:"Shift 1" }},
  { dept: "Calls", lang: "Eng", name: "Priya", schedule: { 1:"Shift 3", 2:"OFF+", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"Shift 3", 8:"Shift 3", 9:"OFF+", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"Shift 3", 15:"Shift 3", 16:"OFF+", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"Shift 3", 22:"Shift 3", 23:"OFF+", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"Shift 3", 29:"Shift 3", 30:"OFF+", 31:"Shift 3" }},
  { dept: "Calls", lang: "Eng", name: "Saim", schedule: { 1:"Shift 1", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"OFF+", 8:"Shift 1", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"OFF+", 15:"Shift 1", 16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"OFF+", 22:"Shift 1", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"OFF+", 29:"Shift 1", 30:"Shift 1", 31:"Shift 1" }},
  { dept: "Call Outs", lang: "Eng", name: "Janani", schedule: { 1:"Shift 2", 2:"OFF+", 3:"Shift 2", 4:"Shift 2", 5:"Shift 2", 6:"Shift 2", 7:"Shift 2", 8:"Shift 2", 9:"OFF+", 10:"Shift 2", 11:"Shift 2", 12:"Shift 2", 13:"Shift 2", 14:"Shift 2", 15:"Shift 2", 16:"OFF+", 17:"Shift 2", 18:"Shift 2", 19:"Shift 2", 20:"Shift 2", 21:"Shift 2", 22:"Shift 2", 23:"OFF+", 24:"Shift 2", 25:"Shift 2", 26:"Shift 2", 27:"Shift 2", 28:"Shift 2", 29:"Shift 2", 30:"OFF+", 31:"Shift 2" }},
  { dept: "Call Outs", lang: "Ara", name: "Omar", schedule: { 1:"OFF+", 2:"Shift 2", 3:"Shift 2", 4:"Shift 2", 5:"Shift 2", 6:"Shift 2", 7:"Shift 2", 8:"OFF+", 9:"Shift 2", 10:"Shift 2", 11:"Shift 2", 12:"Shift 2", 13:"Shift 2", 14:"Shift 2", 15:"OFF+", 16:"Shift 2", 17:"Shift 2", 18:"Shift 1", 19:"Shift 2", 20:"Shift 2", 21:"Shift 2", 22:"OFF+", 23:"Shift 2", 24:"Shift 2", 25:"Shift 2", 26:"Shift 2", 27:"Shift 2", 28:"Shift 2", 29:"OFF+", 30:"Shift 2", 31:"Shift 2" }},
  { dept: "Emails", lang: "Ara", name: "Faris", schedule: { 1:"OFF+", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"Shift 3", 8:"OFF+", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"Shift 3", 15:"OFF+", 16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"Shift 3", 22:"OFF+", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"Shift 3", 29:"OFF+", 30:"Shift 3", 31:"Shift 3" }},
  { dept: "Emails", lang: "Ara", name: "Ahmed", schedule: { 1:"Shift 3", 2:"Shift 3", 3:"Shift 3", 4:"Shift 3", 5:"Shift 3", 6:"Shift 3", 7:"OFF+", 8:"Shift 3", 9:"Shift 3", 10:"Shift 3", 11:"Shift 3", 12:"Shift 3", 13:"Shift 3", 14:"OFF+", 15:"Shift 3", 16:"Shift 3", 17:"Shift 3", 18:"Shift 3", 19:"Shift 3", 20:"Shift 3", 21:"OFF+", 22:"Shift 3", 23:"Shift 3", 24:"Shift 3", 25:"Shift 3", 26:"Shift 3", 27:"Shift 3", 28:"OFF+", 29:"Shift 3", 30:"Shift 3", 31:"Shift 3" }},
  { dept: "Emails", lang: "Eng", name: "Waqas", schedule: { 1:"OFF+", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"OFF+", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"OFF+", 16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"OFF+", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"OFF+", 30:"Shift 1", 31:"Shift 1" }},
  { dept: "Emails", lang: "Eng", name: "Zunair", schedule: { 1:"Shift 1", 2:"Shift 1", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"OFF+", 8:"Shift 1", 9:"Shift 1", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"OFF+", 15:"Shift 2", 16:"Shift 1", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"OFF+", 22:"Shift 1", 23:"Shift 1", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"OFF+", 29:"Shift 1", 30:"Shift 2", 31:"Shift 1" }},
  { dept: "Emails", lang: "Eng", name: "Charles", schedule: { 1:"Shift 1", 2:"OFF+", 3:"Shift 1", 4:"Shift 1", 5:"Shift 1", 6:"Shift 1", 7:"Shift 1", 8:"Shift 1", 9:"OFF+", 10:"Shift 1", 11:"Shift 1", 12:"Shift 1", 13:"Shift 1", 14:"Shift 1", 15:"Shift 1", 16:"OFF+", 17:"Shift 1", 18:"Shift 1", 19:"Shift 1", 20:"Shift 1", 21:"Shift 1", 22:"Shift 1", 23:"OFF+", 24:"Shift 1", 25:"Shift 1", 26:"Shift 1", 27:"Shift 1", 28:"Shift 1", 29:"Shift 1", 30:"OFF+", 31:"Shift 1" }}
];

let rosterData = JSON.parse(JSON.stringify(defaultRosterData));

function saveRosterToStorage() {
  db.collection("settings").doc("rosterData").set({ data: rosterData })
    .then(() => console.log("✅ Roster saved to Firestore"))
    .catch((err) => console.error("❌ Firestore Save Error (Roster):", err));
}

// ============================================================
// 🔄 REALTIME CLOUD LISTENERS (FIRESTORE)
// ============================================================

function initFirestoreRealtimeListeners() {
  db.collection("settings").doc("towersData").onSnapshot((doc) => {
    if (doc.exists) {
      towersData = doc.data();
    } else {
      saveTowersToStorage();
    }
    populateDatalist();
    handleSelection();
    if (document.getElementById("admin-page") && !document.getElementById("admin-page").classList.contains("hidden-page")) {
      renderAdminTable();
    }
  });

  db.collection("settings").doc("scheduleData").onSnapshot((doc) => {
    if (doc.exists && doc.data().data) {
      scheduleData = doc.data().data;
    } else {
      saveScheduleToStorage();
    }
    renderScheduleCards();
  });

  db.collection("settings").doc("rosterData").onSnapshot((doc) => {
    if (doc.exists && doc.data().data) {
      rosterData = doc.data().data;
    } else {
      saveRosterToStorage();
    }
    populateAgentDropdown();
    renderRosterView();
    renderFullMonthlyTable();
    updateDashboardLiveWidget();
    if (document.getElementById("admin-page") && !document.getElementById("admin-page").classList.contains("hidden-page")) {
      renderAdminAgentsTable();
    }
    if (document.getElementById("agentManagementModal")?.style.display === "flex") {
      renderModalAgentsTable(document.getElementById("modalAgentSearch")?.value || "");
    }
  });
}

// ============================================================
// 🗓 HELPER FUNCTIONS
// ============================================================

function getDayNameShort(dayNumber) {
  const date = new Date(2026, 7, dayNumber);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getDefaultDepositAmountText(towerName) {
  const lowerName = towerName.toLowerCase();
  if (lowerName.includes("centurion")) {
    return "4,000 AED (For Offices)";
  } else if (lowerName.includes("reem bay") || lowerName.includes("torino")) {
    return "No Security Deposit Required by SPC";
  } else if (
    lowerName.includes("gemini") || lowerName.includes("elz") || 
    lowerName.includes("glamz") || lowerName.includes("lawnz") || 
    lowerName.includes("miraclz") || lowerName.includes("resortz") || 
    lowerName.includes("starz")
  ) {
    return "Studio & 1BHK: 1,000 AED\n2BHK: 2,000 AED\n3BHK+: 3,000 AED";
  } else if (lowerName.includes("bali")) {
    return "Capacity charges * 8";
  } else if (lowerName.includes("maison")) {
    return "Unit Capacity * 62.5 * 8";
  } else {
    return "Check prior owner or tenant account";
  }
}

let liveClockInterval = null;
let editingTower = null;
let editingAgent = null;

// ============================================================
// 🔐 LOGIN & AUTHENTICATION
// ============================================================

function handleLogin(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("login-error");

  const users = {
    "0": { password: "0", role: "admin" },
    "SPC": { password: "SPC@2026", role: "user" }
  };

  if (Object.prototype.hasOwnProperty.call(users, user) && users[user].password === pass) {
    if (errorMsg) errorMsg.style.display = "none";
    localStorage.setItem("loggedInUser", user);
    localStorage.setItem("userRole", users[user].role);
    navigateTo('home-page');
  } else {
    if (errorMsg) errorMsg.style.display = "block";
  }

  return false;
}

function handleLogout() {
  const userInp = document.getElementById("username");
  if (userInp) userInp.value = "";
  const passInp = document.getElementById("password");
  if (passInp) passInp.value = "";
  const errorMsg = document.getElementById("login-error");
  if (errorMsg) errorMsg.style.display = "none";
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("userRole");
  clearSearch();
  clearSchedSearch();
  clearMappingSearch();
  navigateTo('login-page');
}

function isAdmin() {
  return localStorage.getItem("userRole") === "admin";
}

function updateUIForRole() {
  const adminMiniBtn = document.getElementById("adminMiniBtn");
  if (adminMiniBtn) {
    adminMiniBtn.style.display = isAdmin() ? "inline-flex" : "none";
  }
  const addTowerBtn = document.getElementById("directAddTowerBtn");
  if (addTowerBtn) {
    addTowerBtn.style.display = isAdmin() ? "inline-flex" : "none";
  }
  const rosterAdminBtn = document.getElementById("adminRosterManageBtn");
  if (rosterAdminBtn) {
    rosterAdminBtn.style.display = isAdmin() ? "inline-flex" : "none";
  }
}

// ============================================================
// 🧭 NAVIGATION
// ============================================================

function navigateTo(pageId) {
  if (pageId === 'admin-page' && !isAdmin()) {
    alert("⛔ Access Denied! Admin privileges required.");
    return;
  }

  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active-page');
    page.classList.add('hidden-page');
  });

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.remove('hidden-page');
    targetPage.classList.add('active-page');
    
    if (pageId === 'home-page') {
      updateDashboardLiveWidget();
      updateUIForRole();
    } else if (pageId === 'towers-page') {
      updateUIForRole();
      handleSelection();
    } else if (pageId === 'unit-mapping-page') {
      renderUnitMappingTable();
    } else if (pageId === 'calculator-page') {
      initCalculatorPage();
    } else if (pageId === 'tech-page') {
      renderScheduleCards();
    } else if (pageId === 'roster-page') {
      initRosterPage();
      updateUIForRole();
    } else if (pageId === 'admin-page') {
      renderAdminTable();
      renderAdminAgentsTable();
      switchAdminTab('towers');
    }
  }
}

// ============================================================
// 🔗 UNIT MAPPING SEARCH & RENDER LOGIC
// ============================================================

function onTowerMappingChange() {
  const select = document.getElementById("mappingTowerSelect");
  const bannerText = document.getElementById("selectedMappingTowerName");
  if (select && bannerText) {
    bannerText.innerText = select.options[select.selectedIndex].text;
  }
  clearMappingSearch();
}

function renderUnitMappingTable(filterText = "") {
  const table = document.getElementById("unitMappingTable");
  const towerSelect = document.getElementById("mappingTowerSelect");
  if (!table) return;

  const currentTower = towerSelect ? towerSelect.value : "fairmont";
  const search = filterText.toLowerCase().trim();

  if (currentTower === "fairmont") {
    let matches = fairmontUnitMapping.filter(item => 
      item.nic.toLowerCase().includes(search) ||
      item.adm.toLowerCase().includes(search) ||
      item.spc.toLowerCase().includes(search)
    );

    if (matches.length === 0) {
      table.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-magnifying-glass-minus"></i>No matching units found for "${filterText}"</div>`;
      return;
    }

    let html = `<thead>
      <tr>
        <th style="text-align: center; width: 60px;">S.No</th>
        <th style="text-align: center;">NIC #</th>
        <th style="text-align: center;">ADM #</th>
        <th style="text-align: center; background: #fef08a; color: #854d0e;">SPC Apt Ref</th>
      </tr>
    </thead>
    <tbody>`;

    matches.forEach((item, index) => {
      html += `<tr>
        <td style="text-align: center; font-weight: bold; color: #64748b;">${index + 1}</td>
        <td style="text-align: center; font-weight: 800; color: var(--dark-navy);">${item.nic}</td>
        <td style="text-align: center; font-weight: 800; color: #2563eb;">${item.adm}</td>
        <td style="text-align: center; font-weight: 800; color: #166534; background: #f0fdf4;">${item.spc}</td>
      </tr>`;
    });

    html += `</tbody>`;
    table.innerHTML = html;

  } else if (currentTower === "condor") {
    let matches = condorUnitMapping.filter(item => 
      item.titleDeed.toLowerCase().includes(search) ||
      item.physical.toLowerCase().includes(search) ||
      item.type.toLowerCase().includes(search) ||
      item.meter1.toLowerCase().includes(search) ||
      item.meter2.toLowerCase().includes(search)
    );

    if (matches.length === 0) {
      table.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-magnifying-glass-minus"></i>No matching units found for "${filterText}"</div>`;
      return;
    }

    let html = `<thead>
      <tr>
        <th style="text-align: center; width: 50px;">#</th>
        <th style="text-align: center;">Title Deed / SPA Apt</th>
        <th style="text-align: center; background: #fef08a; color: #854d0e;">Physical Apt (Register)</th>
        <th style="text-align: center;">Unit Type</th>
        <th style="text-align: center;">Area (SQ.M)</th>
        <th style="text-align: center;">Meter No 1</th>
        <th style="text-align: center;">Meter No 2</th>
      </tr>
    </thead>
    <tbody>`;

    matches.forEach((item, index) => {
      let meter2Display = item.meter2 ? `<span style="font-weight: 800; color: #d97706;">${item.meter2}</span>` : `-`;
      html += `<tr>
        <td style="text-align: center; font-weight: bold; color: #64748b;">${index + 1}</td>
        <td style="text-align: center; font-weight: 800; color: #2563eb;">${item.titleDeed}</td>
        <td style="text-align: center; font-weight: 800; color: #166534; background: #f0fdf4;">${item.physical}</td>
        <td style="text-align: center; font-weight: 700; color: var(--dark-navy);">${item.type}</td>
        <td style="text-align: center; font-weight: 600; color: #64748b;">${item.area}</td>
        <td style="text-align: center; font-weight: 800; color: #0284c7;">${item.meter1}</td>
        <td style="text-align: center;">${meter2Display}</td>
      </tr>`;
    });

    html += `</tbody>`;
    table.innerHTML = html;
  }
}

function filterMappingTable() {
  const input = document.getElementById("mappingSearchInput");
  if (!input) return;
  const val = input.value;
  const clearBtn = document.getElementById("clearMappingBtn");
  if (clearBtn) clearBtn.style.display = val.length > 0 ? "block" : "none";
  renderUnitMappingTable(val);
}

function clearMappingSearch() {
  const input = document.getElementById("mappingSearchInput");
  if (input) {
    input.value = "";
    const clearBtn = document.getElementById("clearMappingBtn");
    if (clearBtn) clearBtn.style.display = "none";
    renderUnitMappingTable("");
    input.focus();
  }
}

// ============================================================
// 🧮 FINAL BILL CALCULATOR FUNCTIONS & READINGS COPY LOGIC
// ============================================================

function initCalculatorPage() {
  const dateInput = document.getElementById("moveOutDate");
  if (dateInput && !dateInput.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    onMoveOutDateChange();
  } else {
    calculateFinalBill();
  }
}

function onMoveOutDateChange() {
  const dateInput = document.getElementById("moveOutDate");
  const exitDaysInput = document.getElementById("exitDays");
  const toggle = document.getElementById("summerToggle");

  if (dateInput && dateInput.value) {
    const parts = dateInput.value.split("-");
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (exitDaysInput) {
      exitDaysInput.value = day;
    }

    if (toggle) {
      if ([7, 8, 9, 10].includes(month)) {
        toggle.checked = true;
      } else {
        toggle.checked = false;
      }
    }
  }
  toggleSummerAdjustment();
  calculateFinalBill();
}

function toggleSummerAdjustment() {
  const toggle = document.getElementById("summerToggle");
  const percWrapper = document.getElementById("customPercWrapper");
  const summerRow = document.getElementById("resSummerRow");

  if (toggle && percWrapper) {
    if (toggle.checked) {
      percWrapper.style.display = "inline-flex";
      if (summerRow) summerRow.style.display = "flex";
    } else {
      percWrapper.style.display = "none";
      if (summerRow) summerRow.style.display = "none";
    }
  }
  calculateFinalBill();
}

function calculateFinalBill() {
  const prevReading = parseFloat(document.getElementById("prevReading")?.value) || 0;
  const currReading = parseFloat(document.getElementById("currReading")?.value) || 0;
  const exitDays = parseFloat(document.getElementById("exitDays")?.value) || 0;
  const isSummer = document.getElementById("summerToggle")?.checked || false;
  const summerPerc = parseFloat(document.getElementById("summerPerc")?.value) || 0;

  // 1. حساب استهلاك الشهر الماضي (بناءً على القراءة الحالية - القراءة السابقة)
  const lastMonthUsage = Math.max(0, currReading - prevReading);
  const dailyAvg = lastMonthUsage / 30;
  
  // 2. حساب الاستهلاك الأساسي للشهر الحالي
  const baseCurrentUsage = dailyAvg * exitDays;

  // 3. حساب زيادة الصيف إن وُجدت
  let summerAddition = 0;
  if (isSummer) {
    summerAddition = baseCurrentUsage * (summerPerc / 100);
  }

  // 4. إجمالي استهلاك الشهر الحالي
  const finalCurrentUsage = baseCurrentUsage + summerAddition;
  
  // 5. التقريب لأقرب عدد صحيح لأعلى (Ceil)
  const roundedFinalUsage = Math.ceil(finalCurrentUsage);

  // 6. القراءة الأخيرة = القراءة الحالية (نهاية الشهر الماضي) + الاستهلاك التقريبي للشهر الحالي
  const roundedFinalReading = currReading + roundedFinalUsage;

  // تحديث الشاشة
  if (document.getElementById("resLastMonthUsage")) document.getElementById("resLastMonthUsage").innerText = `${Math.round(lastMonthUsage)} Units`;
  if (document.getElementById("resDailyAvg")) document.getElementById("resDailyAvg").innerText = `${dailyAvg.toFixed(2)} Units/day`;
  if (document.getElementById("resDaysLabel")) document.getElementById("resDaysLabel").innerText = exitDays;
  if (document.getElementById("resBaseEstimated")) document.getElementById("resBaseEstimated").innerText = `${Math.ceil(baseCurrentUsage)} Units`;
  if (document.getElementById("resPercLabel")) document.getElementById("resPercLabel").innerText = summerPerc;
  if (document.getElementById("resSummerAddition")) document.getElementById("resSummerAddition").innerText = `+${Math.ceil(summerAddition)} Units`;
  if (document.getElementById("resFinalCurrentUsage")) document.getElementById("resFinalCurrentUsage").innerText = `${roundedFinalUsage} Units`;

  // 🔄 تحديث ملخص القراءات للإدخال في النظام (Previous = القراءة الحالية للشهر الماضي، Current = القراءة المتوقعة)
  if (document.getElementById("rsPreviousVal")) {
    document.getElementById("rsPreviousVal").innerText = (currReading || 0).toLocaleString();
  }
  if (document.getElementById("rsCurrentVal")) {
    document.getElementById("rsCurrentVal").innerText = (roundedFinalReading || 0).toLocaleString();
  }
}

// 📋 FUNCTION TO COPY CLEAN READINGS (WITHOUT COMMAS) FOR SYSTEM ENTRY
function copyReading(elementId, btnElement) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const textValue = el.innerText;
  
  // Clean commas for system entry
  const cleanValue = textValue.replace(/,/g, '').trim();

  navigator.clipboard.writeText(cleanValue).then(() => {
    btnElement.classList.add('copied');
    const icon = btnElement.querySelector('i');
    if (icon) {
      icon.className = 'fa-solid fa-check';
    }

    setTimeout(() => {
      btnElement.classList.remove('copied');
      if (icon) {
        icon.className = 'fa-regular fa-copy';
      }
    }, 1200);
  }).catch(err => {
    console.error("Failed to copy:", err);
  });
}

// ============================================================
// 🏢 TOWERS MASTER DATA
// ============================================================

function populateDatalist() {
  const datalist = document.getElementById("towersList");
  if (datalist) {
    datalist.innerHTML = "";
    Object.keys(towersData).sort().forEach(tower => {
      let option = document.createElement("option");
      option.value = tower;
      datalist.appendChild(option);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initFirestoreRealtimeListeners();
  startGlobalLiveClock();
  updateDashboardLiveWidget();
  
  const loggedUser = localStorage.getItem("loggedInUser");
  if (loggedUser) {
    navigateTo('home-page');
  }
});

function toggleCustomDepositInput(selectEl) {
  const customInput = document.getElementById("direct_custom_deposit");
  if (customInput) {
    if (selectEl.value === "CUSTOM") {
      customInput.style.display = "block";
      customInput.focus();
    } else {
      customInput.style.display = "none";
    }
  }
}

function updateFields(data, towerName = "") {
  const userIsAdmin = isAdmin();
  const fields = ["client", "location", "bank", "deposit", "billing", "late", "activation", "disconnection", "noc", "final"];

  const adminControls = document.getElementById("directAdminControls");
  if (adminControls) {
    adminControls.style.display = (userIsAdmin && data && towerName) ? "flex" : "none";
  }

  if (data) {
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (!el) return;

      if (userIsAdmin) {
        let val = data[f] !== undefined ? data[f] : "";
        if (f === "location") {
          el.innerHTML = `
            <select id="direct_input_${f}" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold;">
              <option value="Dubai" ${val === 'Dubai' ? 'selected' : ''}>Dubai</option>
              <option value="Abudhabi" ${val === 'Abudhabi' ? 'selected' : ''}>Abu Dhabi</option>
              <option value="Ajman" ${val === 'Ajman' ? 'selected' : ''}>Ajman</option>
            </select>`;
        } else if (f === "bank") {
          el.innerHTML = `
            <select id="direct_input_${f}" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold;">
              <option value="SPC" ${val === 'SPC' ? 'selected' : ''}>SPC</option>
              <option value="Client" ${val === 'Client' ? 'selected' : ''}>Client</option>
            </select>`;
        } else if (f === "deposit") {
          const isStandard = (val === 'SPC' || val === 'Client');
          const customVal = isStandard ? '' : val;

          el.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
              <select id="direct_input_${f}" onchange="toggleCustomDepositInput(this)" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold;">
                <option value="SPC" ${val === 'SPC' ? 'selected' : ''}>SPC</option>
                <option value="Client" ${val === 'Client' ? 'selected' : ''}>Client</option>
                <option value="CUSTOM" ${!isStandard && val !== '' ? 'selected' : ''}>➕ Custom Value...</option>
              </select>
              <input type="text" id="direct_custom_deposit" value="${customVal}" placeholder="Type custom value..." style="display: ${!isStandard && val !== '' ? 'block' : 'none'}; padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold; width: 130px; font-size: 11px;">
            </div>`;
        } else {
          el.innerHTML = `<input type="text" id="direct_input_${f}" value="${val}" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold; width: 140px; text-align: center;">`;
        }
      } else {
        el.innerText = data[f] !== undefined ? data[f] : "-";
      }
    });

    const mainRow = document.getElementById("maintenance_row");
    const mainEl = document.getElementById("maintenance");
    if (data.maintenance) {
      if (mainEl) mainEl.innerText = data.maintenance;
      if (mainRow) mainRow.classList.remove("hidden-page");
    } else {
      if (mainRow) mainRow.classList.add("hidden-page");
    }

    const onlineEl = document.getElementById("online");
    if (onlineEl) {
      if (userIsAdmin) {
        onlineEl.innerHTML = `
          <select id="direct_input_online" style="padding: 3px 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold;">
            <option value="Yes" ${data.online === 'Yes' ? 'selected' : ''}>Yes</option>
            <option value="No" ${data.online === 'No' ? 'selected' : ''}>No</option>
          </select>`;
      } else {
        onlineEl.innerText = data.online === "Yes" ? "Yes" : "Bank Transfer or ATM Cash Deposit Only";
      }
    }

    const lowerName = towerName.toLowerCase();
    const depositAmt = document.getElementById("deposit_amount");
    
    if (depositAmt) {
      if (userIsAdmin) {
        let currentVal = (data.deposit_amount !== undefined && data.deposit_amount.trim() !== "") 
          ? data.deposit_amount 
          : getDefaultDepositAmountText(towerName);

        depositAmt.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end; width: 100%;">
            <textarea id="direct_input_deposit_amount" rows="3" placeholder="Enter details line by line..." style="padding: 6px; border: 2px solid var(--primary-yellow); border-radius: 6px; font-weight: bold; width: 220px; font-size: 12px; font-family: inherit; resize: vertical;">${currentVal}</textarea>
          </div>
        `;
      } else {
        if (data.deposit_amount && data.deposit_amount.trim() !== "") {
          const lines = data.deposit_amount.split('\n').filter(l => l.trim() !== '');
          if (lines.length > 1) {
            let badgesHTML = lines.map(line => `<div class="val badge-clean" style="margin-bottom: 4px; display: block; text-align: center;">${line.trim()}</div>`).join('');
            depositAmt.innerHTML = `<div class="badge-list">${badgesHTML}</div>`;
          } else {
            depositAmt.innerHTML = `<div class="val badge-clean">${data.deposit_amount}</div>`;
          }
        } else if (lowerName.includes("centurion")) {
          depositAmt.innerHTML = `<div class="val badge-clean">4,000 AED (For Offices)</div>`;
        } else if (lowerName.includes("reem bay") || lowerName.includes("torino")) {
          depositAmt.innerHTML = `<div class="val badge-clean">No Security Deposit Required by SPC</div>`;
        } else if (
          lowerName.includes("gemini") || lowerName.includes("elz") || 
          lowerName.includes("glamz") || lowerName.includes("lawnz") || 
          lowerName.includes("miraclz") || lowerName.includes("resortz") || 
          lowerName.includes("starz")
        ) {
          depositAmt.innerHTML = `
            <div class="badge-list">
              <div class="val badge-row"><span>Studio & 1BHK:</span> <strong>1,000 AED</strong></div>
              <div class="val badge-row"><span>2BHK:</span> <strong>2,000 AED</strong></div>
              <div class="val badge-row"><span>3BHK+:</span> <strong>3,000 AED</strong></div>
            </div>
          `;
        } else if (lowerName.includes("bali")) {
          depositAmt.innerHTML = `<div class="val badge-clean">Capacity charges * 8</div>`;
        } else if (lowerName.includes("maison")) {
          depositAmt.innerHTML = `<div class="val badge-clean">Unit Capacity * 62.5 * 8</div>`;
        } else {
          depositAmt.innerHTML = `<div class="val badge-clean">Check prior owner or tenant account</div>`;
        }
      }
    }
  } else {
    fields.forEach(f => {
      const el = document.getElementById(f);
      if(el) el.innerText = "-";
    });
    const mainRow = document.getElementById("maintenance_row");
    if (mainRow) mainRow.classList.add("hidden-page");
    const onlineEl = document.getElementById("online");
    if (onlineEl) onlineEl.innerText = "-";
    const depositAmt = document.getElementById("deposit_amount");
    if (depositAmt) depositAmt.innerHTML = `<div class="val">-</div>`;
  }
}

function saveDirectTowerChanges() {
  const input = document.getElementById("towerInput");
  if (!input) return;
  const towerName = input.value.trim();
  if (!towerName || !towersData[towerName]) return;

  const data = towersData[towerName];
  const fields = ["client", "location", "bank", "billing", "late", "activation", "disconnection", "noc", "final", "online", "deposit_amount"];

  fields.forEach(f => {
    const el = document.getElementById(`direct_input_${f}`);
    if (el) {
      data[f] = el.value.trim();
    }
  });

  const depositSelect = document.getElementById("direct_input_deposit");
  const customDepositInput = document.getElementById("direct_custom_deposit");
  if (depositSelect) {
    if (depositSelect.value === "CUSTOM" && customDepositInput) {
      data.deposit = customDepositInput.value.trim() || "SPC";
    } else {
      data.deposit = depositSelect.value;
    }
  }

  saveTowersToStorage();
  alert(`✅ All changes for "${towerName}" synced to Cloud successfully!`);
  handleSelection();
}

function deleteDirectTower() {
  const input = document.getElementById("towerInput");
  if (!input) return;
  const towerName = input.value.trim();
  if (!towerName || !towersData[towerName]) return;

  if (confirm(`⚠️ Are you sure you want to delete "${towerName}" completely?`)) {
    delete towersData[towerName];
    saveTowersToStorage();
    populateDatalist();
    clearSearch();
    alert(`🗑️ Tower "${towerName}" deleted successfully!`);
  }
}

function handleSelection() {
  const input = document.getElementById("towerInput");
  if (!input) return;
  const val = input.value.trim();
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) clearBtn.style.display = val.length > 0 ? "block" : "none";
  if (towersData[val]) {
    updateFields(towersData[val], val);
  } else {
    const matchedKey = Object.keys(towersData).find(key => key.toLowerCase() === val.toLowerCase());
    updateFields(matchedKey ? towersData[matchedKey] : null, matchedKey || "");
  }
}

function clearSearch() {
  const input = document.getElementById("towerInput");
  if (input) {
    input.value = ""; 
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) clearBtn.style.display = "none"; 
    updateFields(null); 
    input.focus();
  }
}

// ============================================================
// 📋 TECHNICAL SCHEDULE FUNCTIONS
// ============================================================

function renderScheduleCards(filterText = "") {
  const container = document.getElementById("schedGridContainer");
  if (!container) return;
  container.innerHTML = "";
  const searchVal = filterText.toLowerCase().trim();
  let globalIndex = 1;
  let hasMatches = false;
  const userIsAdmin = isAdmin();

  scheduleData.forEach((group) => {
    const dayMatch = group.day.toLowerCase().includes(searchVal);
    const matchedBuildings = group.buildings.filter(b => dayMatch || b.toLowerCase().includes(searchVal));
    
    if (matchedBuildings.length > 0) {
      hasMatches = true;
      const card = document.createElement("div");
      card.className = "day-card";
      let listItemsHTML = "";
      
      matchedBuildings.forEach((b) => {
        const deleteBtnHTML = userIsAdmin 
          ? `<button onclick="deleteBuildingFromSchedule('${group.day}', '${b}')" title="Delete Building" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:12px; margin-left:auto; padding:2px 5px;"><i class="fa-solid fa-trash-can"></i></button>`
          : ``;

        listItemsHTML += `
          <li class="b-item" style="display:flex; align-items:center;">
            <span class="b-no">${globalIndex++}</span>
            <span class="b-name">${b}</span>
            ${deleteBtnHTML}
          </li>`;
      });

      const addBtnHTML = userIsAdmin 
        ? `<button onclick="addBuildingToSchedule('${group.day}')" title="Add Building" style="background:var(--primary-yellow); border:1px solid var(--dark-navy); border-radius:4px; cursor:pointer; font-size:11px; font-weight:800; padding:2px 6px; margin-left:6px;"><i class="fa-solid fa-plus"></i> Add</button>`
        : ``;

      card.innerHTML = `
        <div class="day-card-header">
          <i class="fa-solid fa-calendar-check"></i>
          <h3>${group.day}</h3>
          <span class="count-badge">${matchedBuildings.length} Buildings</span>
          ${addBtnHTML}
        </div>
        <ul class="b-list">${listItemsHTML}</ul>
      `;
      container.appendChild(card);
    } else {
      globalIndex += group.buildings.length;
    }
  });

  if (!hasMatches) {
    container.innerHTML = `<div class="no-sched-results"><i class="fa-solid fa-circle-exclamation"></i><p>No buildings or schedule found matching "${filterText}"</p></div>`;
  }
}

function addBuildingToSchedule(dayName) {
  const buildingName = prompt(`🏗️ Enter building name to add to ${dayName}:`);
  if (!buildingName || buildingName.trim() === "") return;
  const trimmed = buildingName.trim();

  const dayGroup = scheduleData.find(d => d.day.toLowerCase() === dayName.toLowerCase());
  if (dayGroup) {
    if (dayGroup.buildings.some(b => b.toLowerCase() === trimmed.toLowerCase())) {
      alert("⚠️ This building already exists in this day's schedule!");
      return;
    }
    dayGroup.buildings.push(trimmed);
    saveScheduleToStorage();
    renderScheduleCards(document.getElementById("schedSearchInput")?.value || "");
    alert(`✅ "${trimmed}" added to ${dayName} schedule successfully!`);
  }
}

function deleteBuildingFromSchedule(dayName, buildingName) {
  if (confirm(`⚠️ Remove "${buildingName}" from ${dayName} schedule?`)) {
    const dayGroup = scheduleData.find(d => d.day.toLowerCase() === dayName.toLowerCase());
    if (dayGroup) {
      dayGroup.buildings = dayGroup.buildings.filter(b => b !== buildingName);
      saveScheduleToStorage();
      renderScheduleCards(document.getElementById("schedSearchInput")?.value || "");
      alert(`🗑️ "${buildingName}" removed from ${dayName}.`);
    }
  }
}

function filterScheduleCards() {
  const input = document.getElementById("schedSearchInput");
  if (!input) return;
  const val = input.value;
  const clearBtn = document.getElementById("clearSchedBtn");
  if (clearBtn) clearBtn.style.display = val.length > 0 ? "block" : "none";
  renderScheduleCards(val);
}

function clearSchedSearch() {
  const input = document.getElementById("schedSearchInput");
  if (input) {
    input.value = "";
    const clearBtn = document.getElementById("clearSchedBtn");
    if (clearBtn) clearBtn.style.display = "none";
    renderScheduleCards("");
    input.focus();
  }
}

// ============================================================
// 📅 TIME & ROSTER FUNCTIONS
// ============================================================

function getUAECurrentDate() {
  const now = new Date();
  const uaeTimeMs = now.getTime() + (4 * 60 * 60 * 1000);
  const uaeDate = new Date(uaeTimeMs);

  const uaeHours = uaeDate.getUTCHours();
  const period = uaeHours >= 12 ? "PM" : "AM";
  let hour12 = uaeHours % 12;
  if (hour12 === 0) hour12 = 12;

  return { 
    year: String(uaeDate.getUTCFullYear()), 
    month: String(uaeDate.getUTCMonth() + 1).padStart(2, '0'), 
    day: String(uaeDate.getUTCDate()).padStart(2, '0'), 
    hour: hour12, 
    hour24: uaeHours, 
    minute: uaeDate.getUTCMinutes(), 
    second: uaeDate.getUTCSeconds(), 
    period: period 
  };
}

function startGlobalLiveClock() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  const updateClock = () => {
    const uae = getUAECurrentDate();
    const secStr = String(uae.second).padStart(2, '0');
    const minStr = String(uae.minute).padStart(2, '0');
    const hrStr = String(uae.hour).padStart(2, '0');
    const clockText = `${hrStr}:${minStr}:${secStr} ${uae.period} (GST)`;
    const clockEl = document.getElementById("uaeClockText");
    if (clockEl) clockEl.innerText = clockText;
    const homeClockEl = document.getElementById("homeClockText");
    if (homeClockEl) homeClockEl.innerText = clockText;
    updateActiveSummary();
    updateDashboardLiveWidget();
  };
  updateClock();
  liveClockInterval = setInterval(updateClock, 1000);
}

function isShiftActiveNow(shiftCode) {
  const uae = getUAECurrentDate();
  const current24Hour = uae.hour24;
  if (shiftCode === "Shift 1" && current24Hour >= 9 && current24Hour < 17) return true;
  if (shiftCode === "Shift 2" && current24Hour >= 11 && current24Hour < 19) return true;
  if (shiftCode === "Shift 3" && current24Hour >= 13 && current24Hour < 21) return true;
  return false;
}

function updateDashboardLiveWidget() {
  const container = document.getElementById("homeActiveAgentsGrid");
  if (!container) return;
  const uae = getUAECurrentDate();
  const dayNum = parseInt(uae.day, 10);
  let activeByTeam = { "Calls": [], "Call Outs": [], "Emails": [] };
  rosterData.forEach(agent => {
    const shift = agent.schedule[dayNum];
    if (shift && shift !== "OFF+" && isShiftActiveNow(shift)) {
      activeByTeam[agent.dept].push({ name: agent.name, shift: shift, lang: agent.lang });
    }
  });
  let html = "";
  const teams = ["Calls", "Call Outs", "Emails"];
  teams.forEach(teamName => {
    const agents = activeByTeam[teamName];
    let agentsPillsHTML = agents.length === 0 ? `<span class="hl-none-text"><i class="fa-solid fa-moon"></i> No active agents</span>` : agents.map(a => `<div class="hl-agent-chip"><span class="hl-chip-name">${a.name}</span><span class="hl-chip-shift">${a.shift}</span></div>`).join('');
    html += `<div class="hl-team-box"><div class="hl-team-title"><div class="hl-tt-left"><i class="fa-solid ${teamName === 'Calls' ? 'fa-headset' : teamName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i><span>${teamName} Team</span></div><span class="hl-team-badge">${agents.length} Active</span></div><div class="hl-team-list">${agentsPillsHTML}</div></div>`;
  });
  container.innerHTML = html;
}

// ============================================================
// 📅 ROSTER PAGE FUNCTIONS
// ============================================================

function initRosterPage() {
  const dateInput = document.getElementById("rosterDateInput");
  const uaeNow = getUAECurrentDate();
  if (dateInput && !dateInput.value) {
    let defaultDay = uaeNow.month === "08" ? uaeNow.day : "15";
    dateInput.value = `2026-08-${String(defaultDay).padStart(2, '0')}`;
  }
  populateAgentDropdown();
  renderRosterView();
  renderFullMonthlyTable();
}

function switchRosterTab(tabKey) {
  const allContents = document.querySelectorAll("#tab-live-view, #tab-agent-view, #tab-full-sheet-view");
  allContents.forEach(content => {
    content.classList.add("hidden-tab");
    content.style.display = "none";
  });

  const allTabBtns = document.querySelectorAll(".roster-tabs-bar .tab-btn");
  allTabBtns.forEach(btn => btn.classList.remove("active"));

  if (tabKey === 'live-view') {
    const targetTab = document.getElementById("tab-live-view");
    if (targetTab) {
      targetTab.classList.remove("hidden-tab");
      targetTab.style.display = "block";
    }
    const btn = document.getElementById("tabLiveBtn");
    if (btn) btn.classList.add("active");

  } else if (tabKey === 'agent-view') {
    const targetTab = document.getElementById("tab-agent-view");
    if (targetTab) {
      targetTab.classList.remove("hidden-tab");
      targetTab.style.display = "block";
    }
    const btn = document.getElementById("tabAgentBtn");
    if (btn) btn.classList.add("active");

  } else if (tabKey === 'full-sheet-view') {
    const targetTab = document.getElementById("tab-full-sheet-view");
    if (targetTab) {
      targetTab.classList.remove("hidden-tab");
      targetTab.style.display = "block";
    }
    const btn = document.getElementById("tabFullBtn");
    if (btn) btn.classList.add("active");
  }
}

function resetRosterToToday() {
  const dateInput = document.getElementById("rosterDateInput");
  const uae = getUAECurrentDate();
  let dayStr = uae.month === "08" ? uae.day : "15";
  if (dateInput) {
    dateInput.value = `2026-08-${String(dayStr).padStart(2, '0')}`;
    renderRosterView();
  }
}

function renderRosterView() {
  const dateInput = document.getElementById("rosterDateInput");
  if (!dateInput || !dateInput.value) return;
  const dateParts = dateInput.value.split("-");
  const dayNum = parseInt(dateParts[2], 10);
  const container = document.getElementById("rosterDeptContainer");
  if (!container) return;
  container.innerHTML = "";
  const depts = ["Calls", "Call Outs", "Emails"];

  depts.forEach(deptName => {
    const deptAgents = rosterData.filter(a => a.dept === deptName);
    const card = document.createElement("div");
    card.className = "dept-roster-card";
    let rowsHTML = "";
    deptAgents.forEach(agent => {
      const shift = agent.schedule[dayNum] || "OFF+";
      const isActive = isShiftActiveNow(shift);
      let shiftBadgeClass = "shift-off-badge";
      let shiftIcon = `<i class="fa-solid fa-mug-hot"></i>`;
      if (shift === "Shift 1") { shiftBadgeClass = "shift1-badge"; shiftIcon = `<i class="fa-solid fa-sun"></i>`; }
      else if (shift === "Shift 2") { shiftBadgeClass = "shift2-badge"; shiftIcon = `<i class="fa-solid fa-cloud-sun"></i>`; }
      else if (shift === "Shift 3") { shiftBadgeClass = "shift3-badge"; shiftIcon = `<i class="fa-solid fa-moon"></i>`; }
      let livePulseHTML = isActive ? `<span class="live-active-tag"><i class="fa-solid fa-circle"></i> ON DUTY</span>` : ``;
      rowsHTML += `<div class="roster-agent-row ${isActive ? 'highlight-active-agent' : ''}"><div class="agent-profile"><span class="lang-pill ${agent.lang.toLowerCase()}">${agent.lang}</span><span class="agent-name">${agent.name}</span></div><div class="agent-status-wrapper">${livePulseHTML}<span class="shift-badge ${shiftBadgeClass}">${shiftIcon} ${shift}</span></div></div>`;
    });
    card.innerHTML = `<div class="dept-card-header"><i class="fa-solid ${deptName === 'Calls' ? 'fa-headset' : deptName === 'Call Outs' ? 'fa-phone-volume' : 'fa-envelope-open-text'}"></i><h3>${deptName} Team</h3><span class="dept-count">${deptAgents.length} Agents</span></div><div class="dept-agent-list">${rowsHTML}</div>`;
    container.appendChild(card);
  });
  updateActiveSummary();
}

function updateActiveSummary() {
  const dateInput = document.getElementById("rosterDateInput");
  const summaryContainer = document.getElementById("activeAgentsSummary");
  const summaryTitle = document.getElementById("activeSummaryTitle");
  if (!dateInput || !summaryContainer) return;
  const dateParts = dateInput.value.split("-");
  const dayNum = parseInt(dateParts[2], 10);
  const uae = getUAECurrentDate();
  const isTodaySelected = (dateParts[1] === "08" && dayNum === parseInt(uae.day, 10));
  if (summaryTitle) {
    summaryTitle.innerText = isTodaySelected ? "Active On Shift Right Now (UAE Time)" : `Scheduled Duty Roster for Aug ${dayNum}, 2026`;
  }
  let activeAgentsList = [];
  rosterData.forEach(agent => {
    const shift = agent.schedule[dayNum];
    if (shift && shift !== "OFF+") {
      if (isTodaySelected ? isShiftActiveNow(shift) : true) {
        activeAgentsList.push({ name: agent.name, dept: agent.dept, shift: shift, lang: agent.lang });
      }
    }
  });
  summaryContainer.innerHTML = activeAgentsList.length === 0 ? `<span class="no-active-msg"><i class="fa-solid fa-bed"></i> No agents active on shift at this time.</span>` : activeAgentsList.map(item => `<div class="active-agent-pill"><span class="pill-dept">${item.dept} Team</span><span class="pill-name">${item.name}</span><span class="pill-shift">${item.shift}</span></div>`).join('');
}

// ============================================================
// 👑 MODAL AGENT MANAGEMENT FOR ROSTER PAGE
// ============================================================

function openAgentManagementModal() {
  const modal = document.getElementById("agentManagementModal");
  if (modal) {
    modal.style.display = "flex";
    renderModalAgentsTable();
  }
}

function closeAgentManagementModal() {
  const modal = document.getElementById("agentManagementModal");
  if (modal) {
    modal.style.display = "none";
  }
}

function renderModalAgentsTable(filter = "") {
  const table = document.getElementById("modalAgentsTable");
  if (!table) return;
  const searchTerm = filter.toLowerCase().trim();
  let filteredAgents = rosterData.filter(a => a.name.toLowerCase().includes(searchTerm) || a.dept.toLowerCase().includes(searchTerm));
  
  if (filteredAgents.length === 0) {
    table.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-users-slash"></i>No agents found</div>`;
    return;
  }
  
  let html = `<thead><tr><th>#</th><th>Name</th><th>Department</th><th>Language</th><th>Schedule (1-31)</th><th>Actions</th></tr></thead><tbody>`;
  filteredAgents.forEach((agent, index) => {
    const isEditing = (editingAgent === agent.name);
    if (isEditing) {
      let schedInputs = "";
      for (let d = 1; d <= 31; d++) {
        const currentShift = agent.schedule[d] || "OFF+";
        schedInputs += `<select id="edit_modal_sched_${d}" style="width:55px;font-size:9px;padding:1px;"><option value="Shift 1" ${currentShift === 'Shift 1' ? 'selected' : ''}>S1</option><option value="Shift 2" ${currentShift === 'Shift 2' ? 'selected' : ''}>S2</option><option value="Shift 3" ${currentShift === 'Shift 3' ? 'selected' : ''}>S3</option><option value="OFF+" ${currentShift === 'OFF+' ? 'selected' : ''}>OFF</option></select>`;
      }
      html += `<tr><td>${index + 1}</td><td><strong>${agent.name}</strong></td><td><select id="edit_modal_dept"><option value="Calls" ${agent.dept === 'Calls' ? 'selected' : ''}>Calls</option><option value="Call Outs" ${agent.dept === 'Call Outs' ? 'selected' : ''}>Call Outs</option><option value="Emails" ${agent.dept === 'Emails' ? 'selected' : ''}>Emails</option></select></td><td><select id="edit_modal_lang"><option value="Ara" ${agent.lang === 'Ara' ? 'selected' : ''}>Ara</option><option value="Eng" ${agent.lang === 'Eng' ? 'selected' : ''}>Eng</option></select></td><td style="min-width:200px;max-width:300px;overflow-x:auto;"><div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center;">${schedInputs}</div></td><td><button class="btn-save-row" onclick="saveModalAgent('${agent.name}')">💾 Save</button><button class="btn-delete-row" onclick="cancelEditModalAgent()">✖</button></td></tr>`;
    } else {
      let schedSummary = "";
      for (let d = 1; d <= 31; d++) {
        const shift = agent.schedule[d] || "OFF+";
        let short = shift === "OFF+" ? "⚪" : shift === "Shift 1" ? "🟦" : shift === "Shift 2" ? "🟧" : "🟪";
        schedSummary += `<span title="${d}-Aug: ${shift}" style="display:inline-block;width:16px;font-size:10px;">${short}</span>`;
      }
      html += `<tr><td>${index + 1}</td><td><strong>${agent.name}</strong></td><td>${agent.dept}</td><td><span class="lang-pill ${agent.lang.toLowerCase()}">${agent.lang}</span></td><td style="min-width:200px;max-width:300px;overflow-x:auto;font-size:10px;white-space:nowrap;">${schedSummary}</td><td><button class="btn-save-row" onclick="editModalAgent('${agent.name}')">✏️ Edit</button><button class="btn-delete-row" onclick="deleteAgent('${agent.name}')">🗑️</button></td></tr>`;
    }
  });
  html += `</tbody>`;
  table.innerHTML = html;
}

function editModalAgent(name) {
  editingAgent = name;
  renderModalAgentsTable(document.getElementById("modalAgentSearch")?.value || "");
}

function cancelEditModalAgent() {
  editingAgent = null;
  renderModalAgentsTable(document.getElementById("modalAgentSearch")?.value || "");
}

function saveModalAgent(name) {
  const agent = rosterData.find(a => a.name === name);
  if (!agent) return;
  agent.dept = document.getElementById("edit_modal_dept").value;
  agent.lang = document.getElementById("edit_modal_lang").value;
  for (let d = 1; d <= 31; d++) {
    const select = document.getElementById(`edit_modal_sched_${d}`);
    if (select) {
      agent.schedule[d] = select.value;
    }
  }
  editingAgent = null;
  saveRosterToStorage();
  renderModalAgentsTable(document.getElementById("modalAgentSearch")?.value || "");
  renderRosterView();
  renderFullMonthlyTable();
  updateDashboardLiveWidget();
  alert(`✅ Agent "${name}" updated successfully!`);
}

// ============================================================
// 👤 AGENT INDIVIDUAL LOOKUP
// ============================================================

function populateAgentDropdown() {
  const dropdown = document.getElementById("agentDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = `<option value="">-- Select Agent Name --</option>`;
  const sortedAgents = [...rosterData].sort((a,b) => a.name.localeCompare(b.name));
  sortedAgents.forEach(agent => {
    let opt = document.createElement("option");
    opt.value = agent.name;
    opt.textContent = `${agent.name} (${agent.dept} Team)`;
    dropdown.appendChild(opt);
  });
}

function clearAgentDateFilter() {
  const dateInput = document.getElementById("agentDateFilter");
  if (dateInput) {
    dateInput.value = "";
    renderAgentLookup();
  }
}

function renderAgentLookup() {
  const dropdown = document.getElementById("agentDropdown");
  const filterDateInput = document.getElementById("agentDateFilter");
  const container = document.getElementById("agentResultContainer");
  if (!dropdown || !container) return;
  const agentName = dropdown.value;
  if (!agentName) {
    container.innerHTML = `<div class="no-sched-results"><i class="fa-solid fa-hand-pointer"></i><p>Please select an agent name above to view their schedule.</p></div>`;
    return;
  }
  const agent = rosterData.find(a => a.name === agentName);
  if (!agent) return;
  let selectedDay = null;
  if (filterDateInput && filterDateInput.value) {
    const parts = filterDateInput.value.split("-");
    selectedDay = parseInt(parts[2], 10);
  }
  let cardsHTML = "";
  for (let day = 1; day <= 31; day++) {
    if (selectedDay !== null && day !== selectedDay) continue;
    const shift = agent.schedule[day] || "OFF+";
    const dayName = getDayNameShort(day);
    let cardClass = "shift-off-card";
    let icon = `<i class="fa-solid fa-bed"></i>`;
    if (shift === "Shift 1") { cardClass = "shift1-card"; icon = `<i class="fa-solid fa-sun"></i>`; }
    else if (shift === "Shift 2") { cardClass = "shift2-card"; icon = `<i class="fa-solid fa-cloud-sun"></i>`; }
    else if (shift === "Shift 3") { cardClass = "shift3-card"; icon = `<i class="fa-solid fa-moon"></i>`; }
    cardsHTML += `<div class="agent-day-card ${cardClass}"><div class="adc-day-number">${day}-Aug (${dayName})</div><div class="adc-shift-type">${icon} ${shift}</div></div>`;
  }
  container.innerHTML = `<div class="agent-info-banner"><div class="aip-left"><span class="lang-pill ${agent.lang.toLowerCase()}">${agent.lang}</span><h2>${agent.name}</h2><span class="team-tag"><i class="fa-solid fa-users"></i> ${agent.dept} Team</span></div><div class="aip-right"><span class="month-label">August 2026 Schedule</span></div></div><div class="agent-days-grid">${cardsHTML}</div>`;
}

// ============================================================
// 📊 FULL MONTHLY TABLE
// ============================================================

function renderFullMonthlyTable() {
  const table = document.getElementById("monthlyRosterTable");
  if (!table) return;
  let headerHTML = `<thead><tr><th class="sticky-col first-col">Team</th><th class="sticky-col second-col">Agent Name</th>`;
  for (let d = 1; d <= 31; d++) {
    const dayName = getDayNameShort(d);
    headerHTML += `<th>${d}-Aug<br><span style="font-size: 9px; opacity: 0.8;">${dayName}</span></th>`;
  }
  headerHTML += `</tr></thead>`;
  let bodyHTML = `<tbody>`;
  const depts = ["Calls", "Call Outs", "Emails"];
  depts.forEach(deptName => {
    const teamAgents = rosterData.filter(a => a.dept === deptName);
    teamAgents.forEach((agent, idx) => {
      bodyHTML += `<tr>`;
      if (idx === 0) {
        bodyHTML += `<td rowspan="${teamAgents.length}" class="sticky-col first-col dept-cell">${deptName} Team</td>`;
      }
      bodyHTML += `<td class="sticky-col second-col name-cell"><strong>${agent.name}</strong> <span class="lang-mini">${agent.lang}</span></td>`;
      for (let d = 1; d <= 31; d++) {
        const shift = agent.schedule[d] || "OFF+";
        let cellClass = "cell-off";
        if (shift === "Shift 1") cellClass = "cell-shift1";
        if (shift === "Shift 2") cellClass = "cell-shift2";
        if (shift === "Shift 3") cellClass = "cell-shift3";
        bodyHTML += `<td class="${cellClass}">${shift}</td>`;
      }
      bodyHTML += `</tr>`;
    });
  });
  bodyHTML += `</tbody>`;
  table.innerHTML = headerHTML + bodyHTML;
}

// ============================================================
// 👑 ADMIN PANEL - TOWERS & SCHEDULE MANAGEMENT
// ============================================================

function switchAdminTab(tab) {
  document.querySelectorAll(".admin-tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.add("hidden-tab"));
  if (tab === 'towers') {
    document.querySelector(".admin-tab-btn:nth-child(1)")?.classList.add("active");
    document.getElementById("admin-tab-towers")?.classList.remove("hidden-tab");
    renderAdminTable();
  } else if (tab === 'agents') {
    document.querySelector(".admin-tab-btn:nth-child(2)")?.classList.add("active");
    document.getElementById("admin-tab-agents")?.classList.remove("hidden-tab");
    renderAdminAgentsTable();
  }
}

function renderAdminTable(filter = "") {
  const table = document.getElementById("adminTowersTable");
  if (!table) return;
  
  const searchTerm = filter.toLowerCase().trim();
  const keys = Object.keys(towersData).filter(name => name.toLowerCase().includes(searchTerm));
  
  if (keys.length === 0) {
    table.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-building-circle-exclamation"></i>No towers found matching "${filter}"</div>`;
    return;
  }
  
  let html = `<thead><tr>
    <th style="min-width:30px;position:sticky;left:0;background:#fffbe6;z-index:6;">#</th>
    <th style="min-width:140px;position:sticky;left:30px;background:#fffbe6;z-index:6;">Tower Name</th>
    <th style="min-width:100px;">Client</th>
    <th style="min-width:80px;">Location</th>
    <th style="min-width:70px;">Bank</th>
    <th style="min-width:120px;">Deposit Refund</th>
    <th style="min-width:130px;">Deposit Amount</th>
    <th style="min-width:60px;">Online</th>
    <th style="min-width:70px;">Billing</th>
    <th style="min-width:70px;">Late</th>
    <th style="min-width:70px;">Activation</th>
    <th style="min-width:70px;">Disconnection</th>
    <th style="min-width:60px;">NOC</th>
    <th style="min-width:60px;">Final</th>
    <th style="min-width:120px;">Actions</th>
  </tr></thead><tbody>`;
  
  keys.forEach((name, index) => {
    const data = towersData[name];
    const isEditing = (editingTower === name);
    
    if (isEditing) {
      let currentDepositAmt = (data.deposit_amount !== undefined && data.deposit_amount.trim() !== "") 
        ? data.deposit_amount 
        : getDefaultDepositAmountText(name);

      html += `<tr>
        <td style="position:sticky;left:0;background:#ffffff;z-index:3;">${index + 1}</td>
        <td style="position:sticky;left:30px;background:#ffffff;z-index:3;"><strong>${name}</strong></td>
        <td><input type="text" id="edit_client" value="${data.client || ''}" style="min-width:80px;"></td>
        <td><select id="edit_location" style="min-width:70px;">
          <option value="Dubai" ${data.location === 'Dubai' ? 'selected' : ''}>Dubai</option>
          <option value="Abudhabi" ${data.location === 'Abudhabi' ? 'selected' : ''}>Abu Dhabi</option>
          <option value="Ajman" ${data.location === 'Ajman' ? 'selected' : ''}>Ajman</option>
        </select></td>
        <td><select id="edit_bank" style="min-width:60px;">
          <option value="SPC" ${data.bank === 'SPC' ? 'selected' : ''}>SPC</option>
          <option value="Client" ${data.bank === 'Client' ? 'selected' : ''}>Client</option>
        </select></td>
        <td>
          <input type="text" id="edit_deposit" value="${data.deposit || ''}" style="min-width:100px;" placeholder="SPC / Client / Custom">
        </td>
        <td><textarea id="edit_deposit_amount" rows="2" style="min-width:130px; background:#fffbe6; border:2px solid #e8d567; font-size:11px; resize:vertical;">${currentDepositAmt}</textarea></td>
        <td><select id="edit_online" style="min-width:55px;">
          <option value="Yes" ${data.online === 'Yes' ? 'selected' : ''}>Yes</option>
          <option value="No" ${data.online === 'No' ? 'selected' : ''}>No</option>
        </select></td>
        <td><input type="text" id="edit_billing" value="${data.billing || ''}" style="min-width:60px;"></td>
        <td><input type="text" id="edit_late" value="${data.late || ''}" style="min-width:60px;"></td>
        <td><input type="text" id="edit_activation" value="${data.activation || ''}" style="min-width:60px;"></td>
        <td><input type="text" id="edit_disconnection" value="${data.disconnection || ''}" style="min-width:60px;"></td>
        <td><input type="text" id="edit_noc" value="${data.noc || ''}" style="min-width:55px;"></td>
        <td><input type="text" id="edit_final" value="${data.final || ''}" style="min-width:55px;"></td>
        <td style="min-width:120px;">
          <button class="btn-save-row" onclick="saveTower('${name}')">💾 Save</button>
          <button class="btn-delete-row" onclick="cancelEditTower()">✖</button>
        </td>
      </tr>`;
    } else {
      let displayDepositAmt = (data.deposit_amount !== undefined && data.deposit_amount.trim() !== "") 
        ? data.deposit_amount 
        : getDefaultDepositAmountText(name);
      
      let depositAmtFormatted = displayDepositAmt.replace(/\n/g, '<br>');

      html += `<tr>
        <td style="position:sticky;left:0;background:#ffffff;z-index:3;">${index + 1}</td>
        <td style="position:sticky;left:30px;background:#ffffff;z-index:3;"><strong>${name}</strong></td>
        <td>${data.client || '-'}</td>
        <td>${data.location || '-'}</td>
        <td>${data.bank || '-'}</td>
        <td><span class="deposit-badge">${data.deposit || '-'}</span></td>
        <td><span class="deposit-badge">${depositAmtFormatted}</span></td>
        <td>${data.online || '-'}</td>
        <td>${data.billing || '-'}</td>
        <td>${data.late || '-'}</td>
        <td>${data.activation || '-'}</td>
        <td>${data.disconnection || '-'}</td>
        <td>${data.noc || '-'}</td>
        <td>${data.final || '-'}</td>
        <td style="min-width:120px;">
          <button class="btn-save-row" onclick="editTower('${name}')">✏️ Edit</button>
          <button class="btn-delete-row" onclick="deleteTower('${name}')">🗑️</button>
        </td>
      </tr>`;
    }
  });
  
  html += `</tbody>`;
  table.innerHTML = html;
}

function editTower(name) {
  editingTower = name;
  renderAdminTable(document.getElementById("adminSearchInput")?.value || "");
}

function cancelEditTower() {
  editingTower = null;
  renderAdminTable(document.getElementById("adminSearchInput")?.value || "");
}

function saveTower(name) {
  const data = towersData[name];
  if (!data) return;
  data.client = document.getElementById("edit_client").value;
  data.location = document.getElementById("edit_location").value;
  data.bank = document.getElementById("edit_bank").value;
  data.deposit = document.getElementById("edit_deposit").value;
  data.deposit_amount = document.getElementById("edit_deposit_amount").value;
  data.online = document.getElementById("edit_online").value;
  data.billing = document.getElementById("edit_billing").value;
  data.late = document.getElementById("edit_late").value;
  data.activation = document.getElementById("edit_activation").value;
  data.disconnection = document.getElementById("edit_disconnection").value;
  data.noc = document.getElementById("edit_noc").value;
  data.final = document.getElementById("edit_final").value;
  editingTower = null;
  saveTowersToStorage();
  renderAdminTable(document.getElementById("adminSearchInput")?.value || "");
  populateDatalist();
  alert(`✅ Tower "${name}" updated successfully!`);
}

function deleteTower(name) {
  if (confirm(`⚠️ Are you sure you want to delete "${name}"?`)) {
    delete towersData[name];
    saveTowersToStorage();
    renderAdminTable(document.getElementById("adminSearchInput")?.value || "");
    populateDatalist();
    alert(`🗑️ Tower "${name}" deleted.`);
  }
}

function showAddTowerForm() {
  const newName = prompt("🏗️ Enter new tower name:");
  if (!newName || newName.trim() === "") return;
  const trimmed = newName.trim();
  if (towersData[trimmed]) {
    alert("⚠️ This tower already exists!");
    return;
  }
  towersData[trimmed] = { client: "", location: "Dubai", bank: "SPC", deposit: "SPC", deposit_amount: "", online: "Yes", billing: "0.00 AED", late: "0.00 AED", activation: "0.00 AED", disconnection: "0.00 AED", noc: "0.00 AED", final: "0.00 AED" };
  saveTowersToStorage();
  populateDatalist();
  const input = document.getElementById("towerInput");
  if (input) {
    input.value = trimmed;
    handleSelection();
  }
  renderAdminTable(document.getElementById("adminSearchInput")?.value || "");
  alert(`✅ Tower "${trimmed}" added! You can now edit its details.`);
}

// ============================================================
// 👑 ADMIN PANEL - AGENTS MANAGEMENT
// ============================================================

function renderAdminAgentsTable(filter = "") {
  const table = document.getElementById("adminAgentsTable");
  if (!table) return;
  const searchTerm = filter.toLowerCase().trim();
  let filteredAgents = rosterData.filter(a => a.name.toLowerCase().includes(searchTerm) || a.dept.toLowerCase().includes(searchTerm));
  if (filteredAgents.length === 0) {
    table.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-users-slash"></i>No agents found matching "${filter}"</div>`;
    return;
  }
  let html = `<thead><tr><th>#</th><th>Name</th><th>Department</th><th>Language</th><th>Schedule (1-31)</th><th>Actions</th></tr></thead><tbody>`;
  filteredAgents.forEach((agent, index) => {
    const isEditing = (editingAgent === agent.name);
    if (isEditing) {
      let schedInputs = "";
      for (let d = 1; d <= 31; d++) {
        const currentShift = agent.schedule[d] || "OFF+";
        schedInputs += `<select id="edit_sched_${d}" style="width:55px;font-size:9px;padding:1px;"><option value="Shift 1" ${currentShift === 'Shift 1' ? 'selected' : ''}>S1</option><option value="Shift 2" ${currentShift === 'Shift 2' ? 'selected' : ''}>S2</option><option value="Shift 3" ${currentShift === 'Shift 3' ? 'selected' : ''}>S3</option><option value="OFF+" ${currentShift === 'OFF+' ? 'selected' : ''}>OFF</option></select>`;
      }
      html += `<tr><td>${index + 1}</td><td><strong>${agent.name}</strong></td><td><select id="edit_dept"><option value="Calls" ${agent.dept === 'Calls' ? 'selected' : ''}>Calls</option><option value="Call Outs" ${agent.dept === 'Call Outs' ? 'selected' : ''}>Call Outs</option><option value="Emails" ${agent.dept === 'Emails' ? 'selected' : ''}>Emails</option></select></td><td><select id="edit_lang"><option value="Ara" ${agent.lang === 'Ara' ? 'selected' : ''}>Ara</option><option value="Eng" ${agent.lang === 'Eng' ? 'selected' : ''}>Eng</option></select></td><td style="min-width:200px;max-width:300px;overflow-x:auto;"><div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center;">${schedInputs}</div></td><td><button class="btn-save-row" onclick="saveAgent('${agent.name}')">💾 Save</button><button class="btn-delete-row" onclick="cancelEditAgent()">✖</button></td></tr>`;
    } else {
      let schedSummary = "";
      for (let d = 1; d <= 31; d++) {
        const shift = agent.schedule[d] || "OFF+";
        let short = shift === "OFF+" ? "⚪" : shift === "Shift 1" ? "🟦" : shift === "Shift 2" ? "🟧" : "🟪";
        schedSummary += `<span title="${d}-Aug: ${shift}" style="display:inline-block;width:16px;font-size:10px;">${short}</span>`;
      }
      html += `<tr><td>${index + 1}</td><td><strong>${agent.name}</strong></td><td>${agent.dept}</td><td><span class="lang-pill ${agent.lang.toLowerCase()}">${agent.lang}</span></td><td style="min-width:200px;max-width:300px;overflow-x:auto;font-size:10px;white-space:nowrap;">${schedSummary}</td><td><button class="btn-save-row" onclick="editAgent('${agent.name}')">✏️ Edit</button><button class="btn-delete-row" onclick="deleteAgent('${agent.name}')">🗑️</button></td></tr>`;
    }
  });
  html += `</tbody>`;
  table.innerHTML = html;
}

function editAgent(name) {
  editingAgent = name;
  renderAdminAgentsTable(document.getElementById("adminAgentSearchInput")?.value || "");
}

function cancelEditAgent() {
  editingAgent = null;
  renderAdminAgentsTable(document.getElementById("adminAgentSearchInput")?.value || "");
}

function saveAgent(name) {
  const agent = rosterData.find(a => a.name === name);
  if (!agent) return;
  agent.dept = document.getElementById("edit_dept").value;
  agent.lang = document.getElementById("edit_lang").value;
  for (let d = 1; d <= 31; d++) {
    const select = document.getElementById(`edit_sched_${d}`);
    if (select) {
      agent.schedule[d] = select.value;
    }
  }
  editingAgent = null;
  saveRosterToStorage();
  renderAdminAgentsTable(document.getElementById("adminAgentSearchInput")?.value || "");
  renderRosterView();
  renderFullMonthlyTable();
  updateDashboardLiveWidget();
  alert(`✅ Agent "${name}" updated successfully!`);
}

function deleteAgent(name) {
  if (confirm(`⚠️ Are you sure you want to delete agent "${name}"?`)) {
    const index = rosterData.findIndex(a => a.name === name);
    if (index !== -1) {
      rosterData.splice(index, 1);
      saveRosterToStorage();
      renderAdminAgentsTable(document.getElementById("adminAgentSearchInput")?.value || "");
      if (document.getElementById("agentManagementModal")?.style.display === "flex") {
        renderModalAgentsTable(document.getElementById("modalAgentSearch")?.value || "");
      }
      renderRosterView();
      renderFullMonthlyTable();
      populateAgentDropdown();
      updateDashboardLiveWidget();
      alert(`🗑️ Agent "${name}" deleted.`);
    }
  }
}

function showAddAgentForm() {
  const newName = prompt("👤 Enter new agent name:");
  if (!newName || newName.trim() === "") return;
  const trimmed = newName.trim();
  if (rosterData.find(a => a.name === trimmed)) {
    alert("⚠️ This agent already exists!");
    return;
  }
  let defaultSchedule = {};
  for (let d = 1; d <= 31; d++) {
    defaultSchedule[d] = "OFF+";
  }
  rosterData.push({ dept: "Calls", lang: "Ara", name: trimmed, schedule: defaultSchedule });
  saveRosterToStorage();
  renderAdminAgentsTable(document.getElementById("adminAgentSearchInput")?.value || "");
  if (document.getElementById("agentManagementModal")?.style.display === "flex") {
    renderModalAgentsTable(document.getElementById("modalAgentSearch")?.value || "");
  }
  renderRosterView();
  renderFullMonthlyTable();
  populateAgentDropdown();
  updateDashboardLiveWidget();
  alert(`✅ Agent "${trimmed}" added! You can now edit their schedule.`);
}
