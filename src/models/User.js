import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    dob: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    zip: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    gender: {
      type: String,
      trim: true,
      default: "",
    },
    userType: {
      type: String,
      required: [true, "User type is required"],
      trim: true,
    },
  },
  { timestamps: true, collection: "users" }
);

export const firstNameCollation = { locale: "en", strength: 2 };

userSchema.index(
  { firstName: 1 },
  {
    name: "firstName_case_insensitive",
    unique: true,
    collation: firstNameCollation,
  }
);

export default mongoose.model("User", userSchema);
