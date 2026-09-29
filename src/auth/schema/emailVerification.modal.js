import mongoose from "mongoose";

const emailVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    hashedOTP: {
      type: String,
      required: true,
    },
    otpCreatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    lastResendAt: {
      type: Date,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

emailVerificationSchema.statics.cleanExpiredOTPs = async function () {
  await this.deleteMany({ otpExpiresAt: { $lt: new Date() } });
};

export default mongoose.model("EmailVerification", emailVerificationSchema);
