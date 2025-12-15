import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true },
  hashedOTP: { type: String, required: true },
  otpCreatedAt: { type: Date, required: true },
  otpExpiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastAttempt: { type: Date },
  isUsed: { type: Boolean, default: false },
});

// static helper functions
passwordResetSchema.statics.cleanExpiredOTPs = function () {
  return this.deleteMany({ otpExpiresAt: { $lt: new Date() } });
};

passwordResetSchema.statics.findActiveOTP = function (email) {
  return this.findOne({
    email,
    otpExpiresAt: { $gt: new Date() },
    isUsed: false,
  });
};

export default mongoose.model("PasswordReset", passwordResetSchema);
