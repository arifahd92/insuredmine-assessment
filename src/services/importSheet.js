import Agent from "../models/Agent.js";
import Carrier from "../models/Carrier.js";
import Lob from "../models/Lob.js";
import Policy from "../models/Policy.js";
import User, { firstNameCollation } from "../models/User.js";
import UserAccount from "../models/UserAccount.js";

const BATCH_SIZE = 500;
let indexesReady = false;

export async function importRows(rows) {
  await ensureIndexes();
  const summary = { new: 0, duplicates: 0, failed: 0 };

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const batchSummary = await importBatch(batch);
    summary.new += batchSummary.new;
    summary.duplicates += batchSummary.duplicates;
    summary.failed += batchSummary.failed;
  }

  return summary;
}

async function ensureIndexes() {
  if (indexesReady) {
    return;
  }

  await Promise.all([
    Agent.init(),
    User.syncIndexes(),
    UserAccount.init(),
    Lob.init(),
    Carrier.init(),
    Policy.init(),
  ]);
  indexesReady = true;
}

async function importBatch(rows) {
  const summary = { new: 0, duplicates: 0, failed: 0 };
  const validRows = [];

  for (const row of rows) {
    const validated = validateRow(row);

    if (!validated.ok) {
      summary.failed += 1;
      continue;
    }

    validRows.push(validated.value);
  }

  if (validRows.length === 0) {
    return summary;
  }

  const userIds = await saveMasters(
    User,
    "firstName",
    uniqueDocs(validRows, "firstName", (row) => ({
      firstName: row.firstName,
      dob: row.dob,
      address: row.address,
      phone: row.phone,
      state: row.state,
      zip: row.zip,
      email: row.email,
      gender: row.gender,
      userType: row.userType,
    }))
  );
  const carrierIds = await saveMasters(
    Carrier,
    "companyName",
    uniqueDocs(validRows, "companyName", (row) => ({
      companyName: row.companyName,
    }))
  );
  const categoryIds = await saveMasters(
    Lob,
    "categoryName",
    uniqueDocs(validRows, "categoryName", (row) => ({
      categoryName: row.categoryName,
    }))
  );
  await saveMasters(
    UserAccount,
    "accountName",
    uniqueDocs(validRows, "accountName", (row) => ({
      accountName: row.accountName,
    }))
  );
  await saveMasters(
    Agent,
    "agentName",
    uniqueDocs(validRows, "agentName", (row) => ({
      agentName: row.agentName,
    }))
  );

  const policies = [];

  for (const row of validRows) {
    const userId = userIds.get(identityKey("firstName", row.firstName));
    const companyId = carrierIds.get(row.companyName);
    const policyCategoryId = categoryIds.get(row.categoryName);

    if (!userId || !companyId || !policyCategoryId) {
      summary.failed += 1;
      continue;
    }

    policies.push({
      policyNumber: row.policyNumber,
      policyStartDate: row.policyStartDate,
      policyEndDate: row.policyEndDate,
      userId,
      companyId,
      policyCategoryId,
    });
  }

  const saved = await insertPolicies(policies);
  summary.new += saved.new;
  summary.duplicates += saved.duplicates;
  summary.failed += saved.failed;
  return summary;
}

function validateRow(row) {
  const required = [
    ["agentName", "Agent name is required"],
    ["firstName", "First name is required"],
    ["phone", "Phone number is required"],
    ["email", "Email is required"],
    ["userType", "User type is required"],
    ["accountName", "Account name is required"],
    ["categoryName", "Category name is required"],
    ["companyName", "Company name is required"],
    ["policyNumber", "Policy number is required"],
  ];

  for (const [field, message] of required) {
    if (!row[field]) {
      return { ok: false, reason: message };
    }
  }

  const dob = parseDate(row.dob);
  const policyStartDate = parseDate(row.policyStartDate);
  const policyEndDate = parseDate(row.policyEndDate);

  if (!dob || !policyStartDate || !policyEndDate) {
    return { ok: false, reason: "A date is missing or invalid" };
  }

  return {
    ok: true,
    value: {
      ...row,
      dob,
      policyStartDate,
      policyEndDate,
    },
  };
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function identityKey(field, value) {
  if (field === "firstName") {
    return String(value).toLowerCase();
  }

  return value;
}

function uniqueDocs(rows, field, build) {
  const docs = new Map();

  for (const row of rows) {
    const key = identityKey(field, row[field]);

    if (!docs.has(key)) {
      docs.set(key, build(row));
    }
  }

  return [...docs.values()];
}

async function saveMasters(Model, field, docs) {
  const names = docs.map((doc) => doc[field]);
  const existing = await loadIdMap(Model, field, names);
  const missing = docs.filter((doc) => !existing.has(identityKey(field, doc[field])));
  await upsertMissing(Model, field, missing);
  return loadIdMap(Model, field, names);
}

async function loadIdMap(Model, field, names) {
  if (names.length === 0) {
    return new Map();
  }

  let query = Model.find({ [field]: { $in: names } })
    .select(`_id ${field}`)
    .lean();

  if (field === "firstName") {
    query = query.collation(firstNameCollation);
  }

  const docs = await query;

  return new Map(docs.map((doc) => [identityKey(field, doc[field]), doc._id]));
}

async function upsertMissing(Model, field, docs) {
  if (docs.length === 0) {
    return;
  }

  const operations = docs.map((doc) => ({
    updateOne: {
      filter: { [field]: doc[field] },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }));

  const options = { ordered: false };

  if (field === "firstName") {
    options.collation = firstNameCollation;
  }

  try {
    await Model.bulkWrite(operations, options);
  } catch (error) {
    if (!isBulkWriteError(error)) {
      throw error;
    }
  }
}

async function insertPolicies(documents) {
  if (documents.length === 0) {
    return { new: 0, duplicates: 0, failed: 0 };
  }

  const operations = documents.map((document) => ({
    insertOne: { document },
  }));

  try {
    const result = await Policy.bulkWrite(operations, { ordered: false });
    return { new: insertedCount(result), duplicates: 0, failed: 0 };
  } catch (error) {
    if (!isBulkWriteError(error)) {
      throw error;
    }

    let duplicates = 0;
    let failed = 0;

    for (const writeError of error.writeErrors ?? []) {
      if (writeError.code === 11000) {
        duplicates += 1;
      } else {
        failed += 1;
      }
    }

    return {
      new: insertedCount(error.result ?? error),
      duplicates,
      failed,
    };
  }
}

function insertedCount(result) {
  return result?.insertedCount ?? result?.nInserted ?? 0;
}

function isBulkWriteError(error) {
  return error?.name === "MongoBulkWriteError" || Array.isArray(error?.writeErrors);
}
