import mongoose from "mongoose";

const referralSchema = new mongoose.Schema({
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  referredUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["pending", "successful"],
    default: "successful",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Referral", referralSchema);
