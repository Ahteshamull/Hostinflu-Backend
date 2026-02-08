import mongoose from "mongoose";

const collaborationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    selectInfluencerOrHost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Select Influencer or Host is required"],
    },

    selectDeal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      required: [true, "Select Deal is required"],
    },

    selectListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      
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
      trim: true,
      default: "",
    },

    socialMediaLinks: {
      instagram: {
        type: String,
        trim: true,
        default: "",
      },
      facebook: {
        type: String,
        trim: true,
        default: "",
      },
      twitter: {
        type: String,
        trim: true,
        default: "",
      },
      youtube: {
        type: String,
        trim: true,
        default: "",
      },
      tiktok: {
        type: String,
        trim: true,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Collaboration", collaborationSchema);
