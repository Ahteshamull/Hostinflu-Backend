import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true],
      trim: true,
    },
    email: {
      type: String,
      required: [true],
      unique: [true],
      trim: true,
    },
    password: {
      type: String,
      required: [true],
      trim: true,
    },
    confirmPassword: {
      type: String,
      required: [true],
      trim: true,
    },
    otp: {
      type: Number,
    },
    phone: {
      type: String,
    },
    userName: {
      type: String,
      unique: true,
      required: [true, "Username is required"],
      trim: true,
      lowercase: true,
      minlength: [5, "Username must be at least 5 characters"],
      maxlength: [20, "Username must not exceed 20 characters"],
      match: [
        /^[a-z0-9_]+$/,
        "Username can only contain lowercase letters, numbers, and underscore (_)",
      ],
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    city: {
      type: String,
    },
    zipCode: {
      type: String,
    },
    fullAddress: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    aboutMe: {
      type: String,
    },
    image: {
      type: String,
    },
    role: {
      type: String,
      enum: ["host", "influencer"],
      default: "influencer",
    },
    refreshToken: {
      type: String,
    },
    // airbnbAccountLinked: {
    //   type: Boolean,
    //   default: false,
    // },

    airbnbAccount: {
      type: String,
    },
    bio: {
      type: String,
    },
    socialMediaLinks: [
      {
        platform: {
          type: String,
          enum: ["facebook", "instagram", "x", "youtube", "tiktok"],
        },
        url: {
          type: String,
        },
        followers: {
          type: String,
        },
      },
    ],

    isFounderMember: {
      type: Boolean,
      default: true,
    },

    isNoMember: {
      type: Number,
      default: 0,
    },

    totalUsersAtRegistration: {
      type: Number,
      default: 0,
    },

    nicheTags: {
      type: [String],
      enum: [
        "Tech",
        "Fashion",
        "Fitness",
        "Beauty",
        "Travel",
        "Lifestyle",
        "Food",
      ],
      default: [],
    },
    deals: {
      type: [String],
      default: [],
    },
    dealsTotal: {
      type: Number,
      default: 0,
    },
    completeDeals: {
      type: [String],
      default: [],
    },
    completeDealsTotal: {
      type: Number,
      default: 0,
    },

    listings: {
      type: [String],
      default: [],
    },
    listingsTotal: {
      type: Number,
      default: 0,
    },
    collaborations: {
      type: [String],
      default: [],
    },
    collaborationsTotal: {
      type: Number,
      default: 0,
    },
    responseRate: {
      type: Number,
      default: 0,
    },
    avgResponseTime: {
      type: Number,
      default: 0,
    },
    dateOfBirth: {
      type: String,
    },
    issn: {
      type: Boolean,
      default: false,
    },
    redeemStars: {
      type: [
        {
          collaborationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Collaboration",
            required: true,
          },
          stars: {
            type: Number,
            required: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    nightCredits: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "active",
    },
    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referralCount: { type: Number, default: 0 },
    stripeAccountId: { type: String },
    isStripeConnected: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("User", userSchema);
