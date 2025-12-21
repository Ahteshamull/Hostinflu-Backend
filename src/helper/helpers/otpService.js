import bcrypt from "bcrypt";
import crypto from "crypto";

const otpService = {
  generateOTPData: (email) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
    const hashedOTP = bcrypt.hashSync(otp, 10);

    const otpCreatedAt = new Date();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    return { email, otp, hashedOTP, otpCreatedAt, otpExpiresAt };
  },

  verifyOTP: async (otp, email, hashedOTP) => {
    return await bcrypt.compare(otp, hashedOTP);
  },

  validateAttemptRate: (attempts, lastAttempt, maxAttempts, lockoutMinutes) => {
    if (attempts < maxAttempts) {
      return { allowed: true };
    }

    if (!lastAttempt) return { allowed: true };

    const minutesPassed = (new Date() - lastAttempt) / 1000 / 60;
    if (minutesPassed >= lockoutMinutes) {
      return { allowed: true };
    }

    return {
      allowed: false,
      message: `Too many attempts. Try again after ${Math.ceil(
        lockoutMinutes - minutesPassed
      )} minutes.`,
    };
  },
};

export default otpService;
