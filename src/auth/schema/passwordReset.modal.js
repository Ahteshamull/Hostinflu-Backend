import mongoose from "mongoose";
const { Schema } = mongoose;

const passwordResetSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
    },
    hashedOTP: {
      type: String,
      required: true,
    },
    otpCreatedAt: {
      type: Date,
      default: Date.now,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttempt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Static method to clean expired OTPs
passwordResetSchema.statics.cleanExpiredOTPs = async function () {
  await this.deleteMany({
    otpExpiresAt: { $lt: new Date() },
  });
};

export default mongoose.model("PasswordReset", passwordResetSchema);
