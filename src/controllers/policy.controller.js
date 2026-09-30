import { AppError } from "../errors/AppError.js";
import { searchPoliciesByFirstName } from "../services/policySearch.js";

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
