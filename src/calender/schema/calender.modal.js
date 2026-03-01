import mongoose from "mongoose";

const calenderSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: true },
  fullAddress: { type: String },
});

export default mongoose.model("Calender", calenderSchema);
