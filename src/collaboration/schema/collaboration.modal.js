import mongoose from "mongoose";

const collaborationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    selectInfluencerOrHost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ Collaboration-এর ভেতরেই সব Deal info
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    addAirbnbLink: {
      type: String,
      default: "",
      trim: true,
    },

    inTimeAndDate: {
      type: Date,
      required: true,
    },

    outTimeAndDate: {
      type: Date,
      required: true,
    },

    compensation: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    guestCount: {
      type: Number,
      default: 1,
    },

    deliverables: [
      {
        platform: { type: String, required: true },
        contentType: { type: String, required: true },
        quantity: { type: Number, default: 1 },
      },
    ],

    status: {
      type: String,
      enum: [
        "pending",
        "negotiating",
        "accepted",
        "rejected",
        "ongoing",
        "completed",
      ],
      default: "pending",
    },

    negotiationStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "in_progress"],
      default: "pending",
    },

    rejectReason: {
      type: String,
      default: "",
      trim: true,
    },

    socialMediaLinks: {
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" },
      tiktok: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

export default mongoose.model("Collaboration", collaborationSchema);
