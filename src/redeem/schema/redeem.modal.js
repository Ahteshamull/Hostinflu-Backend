import mongoose from "mongoose";
const { Schema } = mongoose;

const redeemSchema = new Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: [true],
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true],
  },
  stars: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "collaboration",
    required: [true],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Redeem", redeemSchema);
