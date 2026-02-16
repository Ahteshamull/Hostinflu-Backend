import mongoose from "mongoose";
const { Schema } = mongoose;

const deliverableSchema = new Schema(
  {
    platform: {
      type: String,
      enum: ["Instagram", "TikTok", "YouTube", "Facebook", "X"],
      required: true,
    },

    contentType: {
      type: String,
      enum: ["Post", "Reel", "Story", "Video"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    platformFollowers: {
      Instagram: {
        type: String,
      },
      TikTok: {
        type: String,
      },
      YouTube: {
        type: String,
      },
      Facebook: {
        type: String,
      },
      X: {
        type: String,
      },
    },
  },
  { _id: false },
);

const dealSchema = new Schema(
  {
    title: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
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
      required: true,
    },

    inTimeAndDate: {
      type: String,
      required: true,
    },

    outTimeAndDate: {
      type: String,
      required: true,
    },

    // ✅ Compensation
    compensation: {
      nightCredits: {
        type: Boolean,
        default: false,
      },

      numberOfNights: {
        type: Number,
        min: 1,
        required: function () {
          return this.compensation?.nightCredits === true;
        },
      },

      directPayment: {
        type: Boolean,
        default: false,
      },

      paymentAmount: {
        type: String,
        required: function () {
          return this.compensation?.directPayment === true;
        },
      },
    },

    guestCount: {
      type: Number,
      min: 1,
      required: function () {
        return this.compensation?.nightCredits === true;
      },
    },
    // ✅ Deliverables (multiple allowed)
    deliverables: {
      type: [deliverableSchema],
      validate: [(v) => v.length > 0, "At least one deliverable is required"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    status: {
      type: String,
      enum: ["active", "pending", "completed", "available"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Deal", dealSchema);
