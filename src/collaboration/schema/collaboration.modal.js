import mongoose from "mongoose";

const collaborationSchema = new mongoose.Schema(
  {
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

    // 💰 Payment (ALWAYS REQUIRED)
    payment: {
      type: String,
      required: [true, "Payment amount is required"],
      trim: true,
    },

    // 🏨 Free Stay
    freeStay: {
      type: Boolean,
      default: false,
    },

    // 🌙 Nights
    numberOfNights: {
      type: Number,
      min: 1,
      required: function () {
        return this.freeStay === true;
      },
    },

    // 📅 Dates
    startDate: {
      type: Date,
      required: function () {
        return this.freeStay === true;
      },
    },

    endDate: {
      type: Date,
      required: function () {
        return this.freeStay === true;
      },
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed"],
      default: "pending",
    },

    // 📱 Social Media Links (only for influencers)
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
  }
);

export default mongoose.model("Collaboration", collaborationSchema);
