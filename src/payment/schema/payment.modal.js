import mongoose from "mongoose";

const { Schema } = mongoose;

const PaymentSchema = new Schema(
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
    },
    country: {
      type: String,
    },
    sessionId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values
    },
    paymentIntentId: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "SUCCESS",
        "IN_PROGRESS || HOLD",
        "FAILED",
        "CANCELLED",
      ], // adjust to your PaymentStatus enum
      required: true,
    },
    provider: {
      type: String,
      enum: ["STRIPE"], // adjust to your PaymentProvider enum
      required: true,
    },
    influencer_amount: {
      type: Number,
    },
    admin_amount: {
      type: Number,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Relations (ObjectId references)
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: Schema.Types.ObjectId,
      ref: "Collaboration",
    },
    selectInfluencerOrHost: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "payments",
  },
);

export default mongoose.model("Payment", PaymentSchema);
