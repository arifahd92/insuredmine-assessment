import mongoose from "mongoose";

const carrierSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      unique: true,
      trim: true,
    },
  },
  { timestamps: true, collection: "carriers" }
);

export default mongoose.model("Carrier", carrierSchema);
