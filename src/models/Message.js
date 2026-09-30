import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: String,
      required: true,
      unique: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    day: {
      type: String,
      required: [true, "Day is required"],
      trim: true,
    },
    time: {
      type: String,
      required: [true, "Time is required"],
      trim: true,
    },
  },
  { timestamps: true, collection: "messages" }
);

export default mongoose.model("Message", messageSchema);
