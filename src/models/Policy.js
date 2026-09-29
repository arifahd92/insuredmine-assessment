import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    policyNumber: {
      type: String,
      required: [true, "Policy number is required"],
      unique: true,
      trim: true,
    },
    policyStartDate: {
      type: Date,
      required: [true, "Policy start date is required"],
    },
    policyEndDate: {
      type: Date,
      required: [true, "Policy end date is required"],
    },
    policyCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lob",
      required: [true, "Policy category is required"],
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Carrier",
      required: [true, "Carrier is required"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
  },
  { timestamps: true, collection: "policies" }
);

export default mongoose.model("Policy", policySchema);
