import mongoose from "mongoose";

const calenderSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: true },
  fullAddress: { type: String },
});

export default mongoose.model("Calender", calenderSchema);
