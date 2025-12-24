import bcrypt from "bcrypt";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 10;
const MAX_RESEND = 3;
const RESEND_INTERVAL_MIN = 2;

const otpService = {
  generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  },

  hashOTP(otp) {
    return bcrypt.hashSync(otp, 10);
  },

  async verifyOTP(inputOtp, hashedOtp) {
    return await bcrypt.compare(inputOtp, hashedOtp);
  },

  canAttempt(resetDoc) {
    if (resetDoc.attempts < MAX_ATTEMPTS) return { allowed: true };

    const minutes = (Date.now() - resetDoc.lastAttemptAt) / 1000 / 60;

    if (minutes >= LOCK_MINUTES) return { allowed: true };

    return {
      allowed: false,
      message: `Too many attempts. Try again after ${Math.ceil(
        LOCK_MINUTES - minutes
      )} minutes`,
    };
  },

  canResend(resetDoc) {
    if (resetDoc.resendCount >= MAX_RESEND) {
      return { allowed: false, message: "OTP resend limit reached" };
    }

    if (!resetDoc.lastResendAt) return { allowed: true };

    const minutes = (Date.now() - resetDoc.lastResendAt) / 1000 / 60;

    if (minutes < RESEND_INTERVAL_MIN) {
      return {
        allowed: false,
        message: `Please wait ${Math.ceil(
          RESEND_INTERVAL_MIN - minutes
        )} minutes before resending`,
      };
    }

    return { allowed: true };
  },
};

export default otpService;
