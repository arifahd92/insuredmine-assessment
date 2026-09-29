import mongoose from "mongoose";

const userAccountSchema = new mongoose.Schema(
  {
    accountName: {
      type: String,
      required: [true, "Account name is required"],
      unique: true,
      trim: true,
    },
  },
  { timestamps: true, collection: "useraccounts" }
);

export default mongoose.model("UserAccount", userAccountSchema);
