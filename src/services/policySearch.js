import { AppError } from "../errors/AppError.js";
import User, { firstNameCollation } from "../models/User.js";

let firstNameIndexReady = false;

export async function searchPoliciesByFirstName(username) {
  const firstName = username.trim();

  if (!firstName) {
    throw new AppError("Username is required", 400);
  }

  if (!firstNameIndexReady) {
    await User.syncIndexes();
    firstNameIndexReady = true;
  }

  const [user] = await User.aggregate([
    { $match: { firstName } },
    { $limit: 1 },
    {
      $lookup: {
        from: "policies",
        let: { userId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$userId"] } } },
          {
            $lookup: {
              from: "lobs",
              localField: "policyCategoryId",
              foreignField: "_id",
              pipeline: [{ $project: { _id: 0, categoryName: 1 } }],
              as: "category",
            },
          },
          {
            $lookup: {
              from: "carriers",
              localField: "companyId",
              foreignField: "_id",
              pipeline: [{ $project: { _id: 0, companyName: 1 } }],
              as: "carrier",
            },
          },
          {
            $project: {
              _id: 0,
              policyNumber: 1,
              policyStartDate: 1,
              policyEndDate: 1,
              categoryName: { $arrayElemAt: ["$category.categoryName", 0] },
              companyName: { $arrayElemAt: ["$carrier.companyName", 0] },
            },
          },
        ],
        as: "policies",
      },
    },
    {
      $project: {
        _id: 0,
        firstName: 1,
        email: 1,
        policies: 1,
      },
    },
  ]).collation(firstNameCollation);

  if (!user) {
    throw new AppError("No user found with that first name", 404);
  }

  return user;
}
