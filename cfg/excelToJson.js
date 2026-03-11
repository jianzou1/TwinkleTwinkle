/**
 * npm i xlsx
 *
 * Excel 约定：
 * 第1行：备注（忽略）
 * 第2行：类型（int/string/float/bool/int[]）
 * 第3行：字段名（keys）
 * 第4行起：数据
 *
 * 用法：
 * node excelToJson.js                  // 自动转换 excel/ 文件夹内所有 xlsx，输出到 cfg/
 * node excelToJson.js ./data.xlsx Sheet1 ./out.json  // 手动指定
 * （Sheet1 可省略，默认第一个 sheet；out.json 可省略，默认打印到控制台）
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ---------- 类型转换 ----------
function parseBool(v) {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes", "y", "是"].includes(s)) return true;
  if (["false", "0", "no", "n", "否"].includes(s)) return false;
  return null;
}

function parseIntStrict(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null;
  const s = String(v).trim();
  if (!/^-?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseFloatStrict(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseIntArray(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return [Math.trunc(v)];

  let s = String(v).trim();
  if (!s) return null;

  // 支持 "[1,2,3]" 或 "1,2,3" 或 "1 2 3"
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1).trim();
  const parts = s.split(/[,，;\s]+/).filter(Boolean);

  const arr = parts.map(parseIntStrict);
  if (arr.some(x => x == null)) return null;
  return arr;
}

function castValue(raw, type) {
  if (raw == null || raw === "") return null;
  const t = String(type || "").trim().toLowerCase();

  switch (t) {
    case "int":
      return parseIntStrict(raw);
    case "float":
      return parseFloatStrict(raw);
    case "string":
      return String(raw);
    case "bool":
      return parseBool(raw);
    case "int[]":
      return parseIntArray(raw);
    default:
      // 未识别类型：原样返回
      return raw;
  }
}

// ---------- 表转 JSON 数组 ----------
function sheetToTypedJsonArray(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
  if (rows.length < 4) return [];

  const types = (rows[1] || []).map(v => String(v).trim());
  const keys = (rows[2] || []).map(v => String(v).trim());

  return rows
    .slice(3)
    .filter(r => Array.isArray(r) && r.some(cell => cell !== ""))
    .map(r => {
      const obj = {};
      for (let c = 0; c < keys.length; c++) {
        const key = keys[c];
        if (!key) continue;
        obj[key] = castValue(r[c], types[c]);
      }
      return obj;
    });
}

// ---------- CLI ----------
function convertSingleFile(excelPath, sheetNameArg, outPath) {
  if (!excelPath) {
    console.error("Usage: node excel2json.js <excelPath> [sheetName] [outPath]");
    process.exit(1);
  }

  const wb = XLSX.readFile(excelPath);
  const sheetName = sheetNameArg || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  if (!ws) {
    console.error(`Sheet not found: ${sheetName}`);
    console.error(`Available sheets: ${wb.SheetNames.join(", ")}`);
    process.exit(1);
  }

  const arr = sheetToTypedJsonArray(ws);
  const jsonText = JSON.stringify(arr, null, 2);

  if (outPath) {
    fs.writeFileSync(outPath, jsonText, "utf8");
    console.log(`Wrote: ${outPath}`);
  } else {
    console.log(jsonText);
  }
}

// 自动批量转换：excel/ 文件夹 → cfg/
function convertExcelFolder() {
  const excelDir = path.join(__dirname, "excel");
  const cfgDir = __dirname;

  if (!fs.existsSync(excelDir)) {
    console.error(`Excel folder not found: ${excelDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(excelDir).filter(f => f.endsWith(".xlsx") && !f.startsWith("~$"));
  
  if (files.length === 0) {
    console.log("No .xlsx files found in excel/ folder");
    return;
  }

  files.forEach(file => {
    try {
      const excelPath = path.join(excelDir, file);
      const jsonName = path.basename(file, ".xlsx") + ".json";
      const outPath = path.join(cfgDir, jsonName);

      const wb = XLSX.readFile(excelPath);
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      const arr = sheetToTypedJsonArray(ws);
      const jsonText = JSON.stringify(arr, null, 2);
      
      fs.writeFileSync(outPath, jsonText, "utf8");
      console.log(`✓ ${file} → ${jsonName}`);
    } catch (err) {
      console.error(`✗ Error processing ${file}: ${err.message}`);
    }
  });
}

function main() {
  const [, , excelPath, sheetNameArg, outPath] = process.argv;

  // 无参数：自动批量转换
  if (!excelPath) {
    convertExcelFolder();
    return;
  }

  // 有参数：手动指定单个文件
  convertSingleFile(excelPath, sheetNameArg, outPath);
}

main();