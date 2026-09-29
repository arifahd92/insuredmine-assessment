import mongoose from "mongoose";

const lobSchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
  },
  { timestamps: true, collection: "lobs" }
);

export default mongoose.model("Lob", lobSchema);
