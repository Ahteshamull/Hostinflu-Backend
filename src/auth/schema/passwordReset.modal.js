import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },

    hashedOTP: { type: String, required: true },

    otpCreatedAt: { type: Date, required: true },
    otpExpiresAt: { type: Date, required: true },

    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },

    resendCount: { type: Number, default: 0 },
    lastResendAt: { type: Date },

    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

passwordResetSchema.statics.cleanExpiredOTPs = async function () {
  await this.deleteMany({ otpExpiresAt: { $lt: new Date() } });
};

export default mongoose.model("PasswordReset", passwordResetSchema);
