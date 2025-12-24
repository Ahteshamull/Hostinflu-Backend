import EmailValidateCheck from "../../helper/helpers/emailValidate.js";
import userModel from "../schema/auth.modal.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import otpService from "../../helper/helpers/otpService.js";
import PasswordReset from "../schema/passwordReset.modal.js";
import sendOtp from "../../helper/helpers/sendOtp.js";

export const createUser = async (req, res) => {
  // Handle form data where fields might be in different locations
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password;
  let confirmPassword = req.body.confirmPassword;
  let role = req.body.role;
  let userName = req.body.userName;

  // Basic required fields
  if (!name || !email || !password) {
    return res.status(404).send({
      error: true,
      message: "Field Is Required",
    });
  }

  // Username required
  if (!userName) {
    return res.status(404).send({
      error: true,
      message: "Unique UserName Is Required",
    });
  }

  // ---------------- USERNAME CONDITIONS ----------------
  // normalize username
  userName = userName.trim().toLowerCase();

  // 5–20 chars, lowercase letters, numbers, underscore only
  const usernameRegex = /^[a-z0-9_]{5,20}$/;

  if (!usernameRegex.test(userName)) {
    return res.status(400).send({
      error: true,
      message:
        "UserName must be 5–20 characters long and contain only lowercase letters, numbers, and underscore (_)",
    });
  }

  // Check if username already exists
  const existingUserName = await userModel.findOne({ userName });
  if (existingUserName) {
    return res.status(409).send({
      error: true,
      message: "Unique UserName Already Exists",
    });
  }
  // -----------------------------------------------------

  // Email validation
  if (!EmailValidateCheck(email)) {
    return res.status(404).send({
      error: true,
      message: "Invalid Email",
    });
  }

  // Password match check
  if (password !== confirmPassword) {
    return res.status(404).send({
      error: true,
      message: "Passwords Do Not Match",
    });
  }

  // Normalize email
  email = email.toLowerCase();

  // Check if email already exists
  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    return res.status(404).send({
      error: true,
      message: "Email Already In Use",
    });
  }

  try {
    bcrypt.hash(password, 10, async function (err, hash) {
      if (err) {
        return res.status(500).send({
          error: true,
          message: "Password hashing failed",
        });
      } else {
        const user = new userModel({
          name,
          email,
          userName, // ✅ validated username
          password: hash,
          confirmPassword: hash, // (আপনার আগের structure অনুযায়ী রেখেছি)
          role,
        });

        await user.save();

        return res.status(201).send({
          success: true,
          message: "User Created Successfully",
          data: user,
        });
      }
    });
  } catch (error) {
    return res.status(404).send({ error });
  }
};

export const login = async (req, res) => {
  let { email, userName, password } = req.body || {};

  // Basic validation
  if ((!email && !userName) || !password) {
    return res.status(400).json({
      error: true,
      message: "Email or Username and password are required",
    });
  }

  // Normalize inputs
  if (email) email = email.trim().toLowerCase();
  if (userName) userName = userName.trim().toLowerCase();

  // 🔑 Find user by email OR username (SAFE QUERY)
  const existingUser = await userModel.findOne({
    $or: [email ? { email } : null, userName ? { userName } : null].filter(
      Boolean
    ),
  });

  if (!existingUser) {
    return res.status(404).json({
      error: true,
      message: "You don't have any account",
    });
  }

  // Password check
  const isPasswordValid = await bcrypt.compare(password, existingUser.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      error: true,
      message: "Invalid credentials",
    });
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    existingUser
  );

  const loginUserInfo = {
    id: existingUser._id,
    name: existingUser.name,
    email: existingUser.email,
    userName: existingUser.userName,
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
      message: `${
        existingUser.role === "host" ? "Host" : "Influencer"
      } login successfully`,
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
    }
  }

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const user = await userModel.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  await PasswordReset.cleanExpiredOTPs();

  let reset = await PasswordReset.findOne({ email });

  if (reset) {
    const resendCheck = otpService.canResend(reset);
    if (!resendCheck.allowed)
      return res.status(429).json({ message: resendCheck.message });

    reset.resendCount++;
    reset.lastResendAt = new Date();
  } else {
    reset = new PasswordReset({ email });
  }

  const otp = otpService.generateOTP();

  reset.hashedOTP = otpService.hashOTP(otp);
  reset.otpCreatedAt = new Date();
  reset.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  reset.attempts = 0;
  reset.verified = false;

  await reset.save();

  await sendOtp.sendOTPEmail(email, otp, user.name);

  res.json({ success: true, message: "OTP sent to email" });
};

export const verifyOtp = async (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ message: "OTP is required" });

  const resets = await PasswordReset.find({
    otpExpiresAt: { $gt: new Date() },
    verified: false,
  });

  let matchedReset = null;

  for (const reset of resets) {
    const attemptCheck = otpService.canAttempt(reset);
    if (!attemptCheck.allowed) continue;

    const valid = await otpService.verifyOTP(otp, reset.hashedOTP);
    if (valid) {
      matchedReset = reset;
      break;
    }
  }

  if (!matchedReset) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  matchedReset.verified = true;
  matchedReset.lastAttemptAt = new Date();
  await matchedReset.save();

  // ✅ Generate reset token
  const resetToken = jwt.sign(
    {
      userId: matchedReset.email,
      purpose: "password-reset",
    },
    process.env.RESET_TOKEN_SECRET || "secret123",
    { expiresIn: "10m" }
  );

  return res.json({
    success: true,
    message: "OTP verified",
    resetToken,
  });
};

export const resetPassword = async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const authHeader = req.headers.authorization;

  // 1️⃣ Token check
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: true, message: "Reset token required" });
  }

  const resetToken = authHeader.split(" ")[1];

  // 2️⃣ Password validation
  if (!newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({ error: true, message: "Password fields are required" });
  }

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

  // 3️⃣ Verify reset token
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

  // 4️⃣ ✅ IMPORTANT FIX: find user by EMAIL (not _id)
  const user = await userModel.findOne({ email: decoded.userId });
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  // 5️⃣ Update password
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  // 6️⃣ Confirmation email (non-blocking)
  try {
    await sendOtp.sendPasswordResetConfirmation(
      user.email,
      user.name || "User"
    );
  } catch (emailError) {
    console.error("Password reset email failed:", emailError);
  }

  return res.status(200).json({
    success: true,
    message: "Password reset successful. Please login with your new password.",
  });
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

  // Check existing OTP record
  let reset = await PasswordReset.findOne({ email });

  if (reset) {
    const resendCheck = otpService.canResend(reset);
    if (!resendCheck.allowed) {
      return res.status(429).json({ message: resendCheck.message });
    }
  }

  const verifyCode = otpService.generateOTP();

  // Update or create OTP record
  if (reset) {
    reset.hashedOTP = otpService.hashOTP(verifyCode);
    reset.otpCreatedAt = new Date();
    reset.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    reset.resendCount++;
    reset.lastResendAt = new Date();
    reset.attempts = 0;
    await reset.save();
  } else {
    reset = new PasswordReset({
      email,
      hashedOTP: otpService.hashOTP(verifyCode),
      otpCreatedAt: new Date(),
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await reset.save();
  }

  // Send OTP email
  try {
    await sendOtp.sendOTPEmail(email, verifyCode, existingUser.name || "User");
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
    return res.status(401).json({
      error: true,
      message: error?.message || "Invalid refresh token",
    });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: true, message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN
    );
  } catch (err) {
    return res.status(401).json({ error: true, message: "Invalid token" });
  }

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

  const user = await userModel.findById(decoded._id);
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    user.password
  );
  if (!isCurrentPasswordValid) {
    return res
      .status(400)
      .json({ error: true, message: "Current password is incorrect" });
  }

  // Update password
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
};

export const currentUserLogin = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: true, message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN
    );

    const user = await userModel.findById(decoded._id);
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerify: user.isVerify,
      },
    });
  } catch (error) {
    return res.status(401).json({ error: true, message: "Invalid token" });
  }
};
