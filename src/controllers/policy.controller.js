import { AppError } from "../errors/AppError.js";
import {
  aggregatePoliciesByUser,
  searchPoliciesByFirstName,
} from "../services/policySearch.js";

export async function searchPolicies(req, res) {
  const username = req.query.username;

  if (typeof username !== "string") {
    throw new AppError("Username is required", 400);
  }

  const user = await searchPoliciesByFirstName(username);

  res.json({
    success: true,
    user: {
      firstName: user.firstName,
      email: user.email,
    },
    policies: user.policies,
  });
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export async function listPoliciesByUser(req, res) {
  const page = positiveInteger(req.query.page, DEFAULT_PAGE);
  const requestedLimit = positiveInteger(req.query.limit, DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, DEFAULT_LIMIT);
  const result = await aggregatePoliciesByUser(page, limit);

  res.json({
    success: true,
    page: result.page,
    limit: result.limit,
    total: result.total,
    users: result.users,
  });
}

function positiveInteger(value, fallback) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    return fallback;
  }

  return number;
}
