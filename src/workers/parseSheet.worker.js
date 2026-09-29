import fs from "node:fs";
import path from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";

const rows = await readRows(workerData.filePath);

const agents = new Set();
const users = new Set();
const accounts = new Set();
const categories = new Set();
const carriers = new Set();
const policies = new Set();

for (const row of rows) {
  addValue(agents, row.agent);
  addValue(users, row.firstname);
  addValue(accounts, row.account_name);
  addValue(categories, row.category_name);
  addValue(carriers, row.company_name);
  addValue(policies, row.policy_number);
}

parentPort.postMessage({
  rowCount: rows.length,
  counts: {
    agents: agents.size,
    users: users.size,
    accounts: accounts.size,
    categories: categories.size,
    carriers: carriers.size,
    policies: policies.size,
  },
});

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

function addValue(bucket, value) {
  const text = String(value ?? "").trim();

  if (text) {
    bucket.add(text);
  }
}
