import EmailValidateCheck from "../../helper/emailValidate.js";
import userModel from "../../models/auth/userModal.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import SendOtp from "../../helper/sendOtp.js";
import otp from "otp-generator-simple";
import otpGenerator from "otp-generator-simple";
import PasswordReset from "../../models/auth/passwordResetModal/passwordResetModal.js";
import otpService from "../../helper/otpService.js";
import userModal from "../../models/auth/userModal.js";

export const signup = async (req, res) => {
  let { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(404).send({ error: true, message: "Field Is Required" });
  }

  if (!EmailValidateCheck(email)) {
    return res.status(404).send({ error: true, message: "Invalid Email" });
  }
  const existingUser = await userModel.findOne({ email });

  if (existingUser) {
    return res
      .status(404)
      .send({ error: true, message: "Email Already In Use" });
  }

  try {
    bcrypt.hash(password, 10, async function (err, hash) {
      const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
      if (err) {
        console.log(err);
      } else {
        const user = new userModel({
          name,
          email,
          password: hash,
          role,
        });
        await user.save();
        let sendOtp = await userModel.findOneAndUpdate(
          { email },
          { $set: { otp: verifyCode } },
          { new: true }
        );
        setTimeout(async () => {
          let sendOtp = await userModel.findOneAndUpdate(
            { email },
            { $set: { otp: null } },
            { new: true }
          );
        }, 120000);

        return res
          .status(201)
          .send({ success: true, message: "Signup Successfully", data: user });
      }
    });
  } catch (error) {
    return res.status(404).send({ error });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: true, message: "Email and password are required" });
  }

  const existingUser = await userModel.findOne({ email });
  if (!existingUser) {
    return res.status(404).json({
      error: true,
      message: "You don't have an account",
    });
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    existingUser.password
  );

  if (!isPasswordValid) {
    return res
      .status(401)
      .json({ error: true, message: "Invalid email or password" });
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    existingUser
  );

  const loginUserInfo = {
    id: existingUser._id,
    name: existingUser.name,
    email: existingUser.email,
    role: existingUser.role,
  };

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json({
      success: true,
      message: `${existingUser.role === "admin" ? "Admin" : "User"} login successfully`,
      data: loginUserInfo,
      accessToken,
      refreshToken,
    });
};

export const logout = async (req, res) => {
  // Clear all cookies
  res.clearCookie("token");
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  // Optional: Clear refresh token from database
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET || process.env.PRV_TOKEN
      );
      await userModel.findByIdAndUpdate(decoded._id, {
        $unset: { refreshToken: 1 },
      });
    } catch (error) {
      // Token might be invalid, but still logout
      console.log("Error clearing refresh token:", error.message);
    }
  }

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: true, message: "Email is required" });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  // Clean expired OTPs
  await PasswordReset.cleanExpiredOTPs();

  // Generate OTP
  const otpData = otpService.generateOTPData(email);

  // Delete existing OTP
  await PasswordReset.deleteMany({ email });

  const resetRecord = new PasswordReset({
    email,
    hashedOTP: otpData.hashedOTP,
    otpCreatedAt: otpData.otpCreatedAt,
    otpExpiresAt: otpData.otpExpiresAt,
  });
  await resetRecord.save();

  try {
    await SendOtp.sendOTPEmail(email, otpData.otp, user.name || "");
    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    await PasswordReset.deleteMany({ email });
    console.error("OTP send failed:", err);
    return res.status(500).json({ error: true, message: "Failed to send OTP" });
  }
};

// ----------------- Verify Reset OTP -----------------
export const verifyResetOTP = async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ error: true, message: "OTP is required" });
  }

  // Find all active OTP records
  const activeResets = await PasswordReset.find({
    otpExpiresAt: { $gt: new Date() },
    isUsed: false,
  });

  if (activeResets.length === 0) {
    return res
      .status(400)
      .json({ error: true, message: "No active OTP found" });
  }

  // Check each active reset to find matching OTP
  let validRecord = null;
  for (const record of activeResets) {
    const isValid = await otpService.verifyOTP(
      otp,
      record.email,
      record.hashedOTP
    );
    if (isValid) {
      validRecord = record;
      break;
    }
  }

  if (!validRecord) {
    return res.status(400).json({ error: true, message: "Invalid OTP" });
  }

  // Check rate limiting
  const rateLimit = otpService.validateAttemptRate(
    validRecord.attempts,
    validRecord.lastAttempt,
    5,
    15
  );
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: true, message: rateLimit.message });
  }

  // Find user
  const user = await userModel.findOne({ email: validRecord.email });
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  // Mark OTP as used
  validRecord.isUsed = true;
  validRecord.lastAttempt = new Date();
  await validRecord.save();

  // Generate reset token
  const resetToken = jwt.sign(
    { userId: user._id, email: user.email, purpose: "password-reset" },
    process.env.RESET_TOKEN_SECRET || "secret123",
    { expiresIn: "15m" }
  );

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    data: { resetToken, expiresIn: "15m" },
  });
};

// ----------------- Reset Password -----------------
export const resetPassword = async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: true, message: "Reset token required" });
  }

  const resetToken = authHeader.split(" ")[1];
  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ error: true, message: "Passwords do not match" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: true, message: "Password must be at least 6 characters" });
  }

  let decoded;
  try {
    decoded = jwt.verify(
      resetToken,
      process.env.RESET_TOKEN_SECRET || "secret123"
    );
  } catch (err) {
    return res
      .status(401)
      .json({ error: true, message: "Invalid or expired token" });
  }

  if (decoded.purpose !== "password-reset") {
    return res
      .status(401)
      .json({ error: true, message: "Invalid token purpose" });
  }

  const user = await userModel.findById(decoded.userId);
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  // Send password reset confirmation email
  try {
    await SendOtp.sendPasswordResetConfirmation(
      user.email,
      user.name || user.fullname || "User"
    );
  } catch (emailError) {
    console.error("Failed to send confirmation email:", emailError);
    // Don't fail the request if email fails - password is already changed
  }

  return res.status(200).json({
    success: true,
    message: "Password reset successful. Please login with your new password.",
  });
};

export const OtpVerify = async (req, res) => {
  const { email, otp } = req.body;
  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    if (existingUser.otp == otp) {
      existingUser.isVerify = true;
      await existingUser.save();
      return res
        .status(200)
        .send({ success: true, error: false, message: "OTP Verify" });
    } else {
      return res.status(403).send({
        error: true,
        success: false,
        message: "Invalid Otp or Expired",
      });
    }
  } else {
    return res
      .status(403)
      .send({ error: true, success: false, message: "User Not found" });
  }
};

export const ResendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: true, message: "Email is required" });
  }

  const existingUser = await userModel.findOne({ email });
  if (!existingUser) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Update OTP in database
  await userModel.findOneAndUpdate(
    { email },
    { $set: { otp: verifyCode } },
    { new: true }
  );

  // Clear OTP after 2 minutes
  setTimeout(async () => {
    await userModel.findOneAndUpdate(
      { email },
      { $set: { otp: null } },
      { new: true }
    );
  }, 120000);

  // Send OTP email
  try {
    await SendOtp.sendOTPEmail(email, verifyCode, existingUser.name || "User");
    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("Failed to resend OTP:", error);
    return res.status(500).json({
      error: true,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

// Helper function to generate tokens
const generateAccessAndRefreshToken = async (user) => {
  const accessToken = jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    {
      _id: user._id,
      role: user.role,
    },
    process.env.REFRESH_TOKEN_SECRET || process.env.PRV_TOKEN,
    { expiresIn: "7d" }
  );

  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

export const refreshAccessToken = async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return res
      .status(401)
      .json({ error: true, message: "Unauthorized request" });
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET || process.env.PRV_TOKEN
    );

    const user = await userModel.findById(decodedToken?._id);

    if (!user) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid refresh token" });
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      return res
        .status(401)
        .json({ error: true, message: "Refresh token is expired or used" });
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json({
        success: true,
        message: "Access token refreshed",
        data: { accessToken, refreshToken: newRefreshToken },
      });
  } catch (error) {
    return res
      .status(401)
      .json({ error: true, message: error?.message || "Invalid refresh token" });
  }
};
 

export const testEmailConfig = async (req, res) => {
  try {
    // Check if env variables are loaded
    const envCheck = {
      OTP_EMAIL: process.env.OTP_EMAIL ? " Set" : " Not Set",
      OTP_PASSWORD: process.env.OTP_PASSWORD ? " Set" : " Not Set",
      EMAIL_SERVICE: process.env.EMAIL_SERVICE || "gmail (default)",
      NODE_ENV: process.env.NODE_ENV || "development (default)",
    };

    console.log("Environment Variables Check:", envCheck);

    const testResult = await SendOtp.testConnection();
    return res.status(200).json({
      success: testResult.success,
      message: testResult.success
        ? "Email configuration is working correctly"
        : "Email configuration failed",
      envCheck,
      details: testResult,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Email configuration test failed",
      error: error.message,
      envCheck: {
        OTP_EMAIL: process.env.OTP_EMAIL ? " Set" : " Not Set",
        OTP_PASSWORD: process.env.OTP_PASSWORD ? " Set" : " Not Set",
      },
    });
  }
};
