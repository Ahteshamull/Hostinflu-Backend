import mongoose from "mongoose";

/* ================= DELIVERABLE SCHEMA ================= */

const deliverableSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["instagram", "tiktok", "youtube", "facebook", "twitter"],
      required: true,
      lowercase: true,
    },

    contentType: {
      type: String,
      enum: ["post", "reel", "story", "video"],
      required: true,
      lowercase: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    urls: [
      {
        type: String,
        trim: true,
      },
    ],

    // platformFollowers: {
    //   type: String,
    //   default: "",
    // },
  },
  { _id: false },
);

/* ================= SOCIAL MEDIA LINK SCHEMA ================= */

// const socialMediaLinkSchema = new mongoose.Schema(
//   {
//     url: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     postType: {
//       type: String,
//       enum: ["post", "story", "reel", "video"],
//       required: true,
//       lowercase: true,
//     },

//     platform: {
//       type: String,
//       enum: ["instagram", "facebook", "twitter", "youtube", "tiktok"],
//       required: true,
//       lowercase: true,
//     },

//     postDate: {
//       type: Date,
//       default: Date.now,
//     },

//     status: {
//       type: String,
//       enum: ["pending", "in_progress", "completed"],
//       default: "pending",
//     },
//   },
//   { _id: false },
// );

/* ================= MAIN COLLABORATION SCHEMA ================= */

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
      ref: "Listing",
    },

    title: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
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
      trim: true,
      default: "",
    },

    inTimeAndDate: Date,
    outTimeAndDate: Date,

    guestCount: {
      type: Number,
      default: 1,
    },

    deliverables: {
      type: [deliverableSchema],
      validate: [(v) => v.length > 0, "At least one deliverable is required"],
    },

    startDate: Date,
    endDate: Date,

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
      trim: true,
      default: "",
    },

    negotiationMessage: {
      type: String,
      default: "",
    },

    // socialMediaLinks: [socialMediaLinkSchema],
  },
  { timestamps: true },
);

export default mongoose.model("Collaboration", collaborationSchema);
