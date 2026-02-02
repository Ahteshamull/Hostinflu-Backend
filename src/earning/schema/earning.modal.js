import mongoose from "mongoose";

const { Schema } = mongoose;

const EarningSchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: ["PENDING", "AVAILABLE", "WITHDRAWN", "FAILED"],
      default: "PENDING",
    },
    type: {
      type: String,
      enum: ["COLLABORATION", "BONUS", "REFERRAL"],
      default: "COLLABORATION",
    },

    // Relations (ObjectId references)
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collaborationId: {
      type: Schema.Types.ObjectId,
      ref: "Collaboration",
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  {
    timestamps: true,
    collection: "earnings",
  },
);

export default mongoose.model("Earning", EarningSchema);
