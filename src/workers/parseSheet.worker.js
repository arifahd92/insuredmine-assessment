import fs from "node:fs";
import path from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";

const sheetRows = await readRows(workerData.filePath);

const rows = sheetRows.map((row) => ({
  agentName: text(row.agent),
  firstName: text(row.firstname),
  dob: text(row.dob),
  address: text(row.address),
  phone: text(row.phone),
  state: text(row.state),
  zip: text(row.zip),
  email: text(row.email).toLowerCase(),
  gender: text(row.gender),
  userType: text(row.userType),
  accountName: text(row.account_name),
  categoryName: text(row.category_name),
  companyName: text(row.company_name),
  policyNumber: text(row.policy_number),
  policyStartDate: text(row.policy_start_date),
  policyEndDate: text(row.policy_end_date),
}));

parentPort.postMessage({ rows });

async function readRows(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".csv") {
    return readCsv(filePath);
  }

  return readXlsx(filePath);
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");

  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  });
}

async function readXlsx(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return [];
  }

  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.value ?? "").trim();
  });

  const records = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const record = {};

    for (let col = 1; col < headers.length; col += 1) {
      const key = headers[col];

      if (!key) {
        continue;
      }

      record[key] = cellToText(row.getCell(col).value);
    }

    records.push(record);
  });

  return records;
}

function cellToText(value) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "object" && value.text) {
    return String(value.text);
  }

  if (typeof value === "object" && value.result != null) {
    return String(value.result);
  }

  return String(value);
}

function text(value) {
  return String(value ?? "").trim();
}
