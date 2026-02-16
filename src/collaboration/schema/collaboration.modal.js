import mongoose from "mongoose";

const collaborationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    selectInfluencerOrHost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    selectDeal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
    },

    compensation: {
      nightCredits: { type: Boolean, default: false },
      numberOfNights: { type: Number, default: 1 },
      directPayment: { type: Boolean, default: false },
      paymentAmount: { type: String, default: "0" },
    },

    description: {
      type: String,
      trim: true,
    },

    addAirbnbLink: {
      type: String,
      default: "",
      trim: true,
    },

    inTimeAndDate: {
      type: Date,
    },

    outTimeAndDate: {
      type: Date,
    },

    guestCount: {
      type: Number,
      default: 1,
    },

    deliverables: [
      {
        platform: { type: String },
        contentType: { type: String },
        quantity: { type: Number, default: 1 },
      },
    ],

    originalCollaborationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collaboration",
      required: false,
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

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
      instagram: [
        {
          url: { type: String, default: "" },
          contentType: { type: String, default: "" },
          postDate: { type: Date },
        },
      ],
      facebook: [
        {
          url: { type: String, default: "" },
          contentType: { type: String, default: "" },
          postDate: { type: Date },
        },
      ],
      twitter: [
        {
          url: { type: String, default: "" },
          contentType: { type: String, default: "" },
          postDate: { type: Date },
        },
      ],
      youtube: [
        {
          url: { type: String, default: "" },
          contentType: { type: String, default: "" },
          postDate: { type: Date },
        },
      ],
      tiktok: [
        {
          url: { type: String, default: "" },
          contentType: { type: String, default: "" },
          postDate: { type: Date },
        },
      ],
    },

    deliverableStatus: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Collaboration", collaborationSchema);
