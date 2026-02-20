import EmailValidateCheck from "../../helper/helpers/emailValidate.js";
import userModel from "../schema/auth.modal.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import otpService from "../../helper/helpers/otpService.js";
import PasswordReset from "../schema/passwordReset.modal.js";
import sendOtp from "../../helper/helpers/sendOtp.js";
import { notifyAdminOnUserCreated } from "../../notification/service/notification.service.js";
import fs from "fs";
import path from "path";
import Listing from "../../listing/schema/listing.modal.js";
import Collaborations from "../../collaboration/schema/collaboration.modal.js";
import Deal from "../../deals/schema/deal.modal.js";
import Payment from "../../payment/schema/payment.modal.js";
import Notification from "../../notification/schema/notification.modal.js";
import Message from "../../message/schema/message.modal.js";

export const createUser = async (req, res) => {
  // Handle form data where fields might be in different locations
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password;
  let confirmPassword = req.body.confirmPassword;
  let role = req.body.role;
  let userName = req.body.userName;

  // Extract additional fields from request body
  let location = req.body.location;
  let fullAddress = req.body.fullAddress;
  let country = req.body.country;
  let state = req.body.state;
  let city = req.body.city;
  let zipCode = req.body.zipCode;
  let phone = req.body.phone;
  let dateOfBirth = req.body.dateOfBirth;
  let gender = req.body.gender;
  let aboutMe = req.body.aboutMe;
  let bio = req.body.bio;

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
    // Check total users to determine if this is a founder member
    const totalUsers = await userModel.countDocuments();
    const isFounderMember = totalUsers < 50; // First 50 users are founder members 👑
    const isNoMember = totalUsers >= 50; // Users 50+ are no members

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
          userName,
          password: hash,
          confirmPassword: hash,
          role,
          location,
          fullAddress,
          country,
          state,
          city,
          zipCode,
          phone,
          dateOfBirth,
          gender,
          aboutMe,
          bio,
          isFounderMember, // 👑 Founder Member for first 50 users
          isNoMember,
          totalUsersAtRegistration: totalUsers, // Save total users count at registration
        });

        await user.save();

        // Send notification to admin about new user registration
        await notifyAdminOnUserCreated(user._id, user.name, user.email);

        // Populate user data with all information
        const populatedUser = await userModel
          .findById(user._id)
          .select("") // Select all fields
          .populate("collaborations")
          .populate("redeemStars.collaborationId");

        return res.status(201).send({
          success: true,
          message: "User Created Successfully",
          data: populatedUser,
        });
      }
    });
  } catch (error) {
    return res.status(404).send({ error });
  }
};

export const getMyProfile = async (req, res) => {
  // User ID should be available in req.user from auth middleware
  const userId = req.user?.id || req.user?._id;

  if (!userId) {
    return res.status(401).json({
      error: true,
      message: "User not authenticated",
    });
  }

  try {
    const user = await userModel
      .findById(userId)
      .select("-password -confirmPassword -refreshToken");
    if (!user) {
      return res.status(404).json({
        error: true,
        message: "User not found",
      });
    }

    // Import models to filter out deleted/rejected items
    const Deal = (await import("../../deals/schema/deal.modal.js")).default;
    const Listing = (await import("../../listing/schema/listing.modal.js"))
      .Listing;
    const Collaboration = (
      await import("../../collaboration/schema/collaboration.modal.js")
    ).default;

    // Filter out deleted/rejected deals
    let activeDeals = [];
    if (user.deals && user.deals.length > 0) {
      const existingDeals = await Deal.find({
        _id: { $in: user.deals },
        status: { $ne: "rejected" },
      }).select("_id");
      activeDeals = existingDeals.map((deal) => deal._id.toString());
    }

    // Filter out deleted/rejected listings
    let activeListings = [];
    if (user.listings && user.listings.length > 0) {
      const existingListings = await Listing.find({
        _id: { $in: user.listings },
        status: { $ne: "rejected" },
      }).select("_id");
      activeListings = existingListings.map((listing) =>
        listing._id.toString(),
      );
    }

    // Filter out deleted/rejected collaborations
    let activeCollaborations = [];
    if (user.collaborations && user.collaborations.length > 0) {
      const existingCollaborations = await Collaboration.find({
        _id: { $in: user.collaborations },
        status: { $ne: "rejected" },
      }).select("_id");
      activeCollaborations = existingCollaborations.map((collab) =>
        collab._id.toString(),
      );
    }

    // Update user object with filtered arrays and totals
    const filteredUser = {
      ...user.toObject(),
      deals: activeDeals,
      dealsTotal: activeDeals.length,
      listings: activeListings,
      listingsTotal: activeListings.length,
      collaborations: activeCollaborations,
      collaborationsTotal: activeCollaborations.length,
    };

    return res.status(200).json({
      success: true,
      data: filteredUser,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    });
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
      Boolean,
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
  const { accessToken, refreshToken } =
    await generateAccessAndRefreshToken(existingUser);

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
        process.env.REFRESH_TOKEN_SECRET || process.env.PRV_TOKEN,
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
    { expiresIn: "10m" },
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
      process.env.RESET_TOKEN_SECRET || "secret123",
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
      user.name || "User",
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
    { expiresIn: "1d" },
  );

  const refreshToken = jwt.sign(
    {
      _id: user._id,
      role: user.role,
    },
    process.env.REFRESH_TOKEN_SECRET || process.env.PRV_TOKEN,
    { expiresIn: "7d" },
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
      process.env.REFRESH_TOKEN_SECRET || process.env.PRV_TOKEN,
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
      process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN,
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
    user.password,
  );
  if (!isCurrentPasswordValid) {
    return res
      .status(400)
      .json({ error: true, message: "Current password is incorrect" });
  }

  // Clean up invalid redeemStars entries before saving
  if (user.redeemStars && Array.isArray(user.redeemStars)) {
    user.redeemStars = user.redeemStars.filter(
      (item) => item && item.collaborationId && typeof item.stars === "number",
    );
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
      process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN,
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

export const setUpProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    const { fullName, location, linkAirbnbAccount, bio, nicheTags } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: "User not found",
      });
    }

    // Update common profile fields
    user.name = fullName;
    user.fullAddress = location;

    // Generate username if not present
    if (!user.userName) {
      user.userName =
        fullName
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "") +
        "_" +
        Date.now().toString().slice(-6);
    }

    // Handle profile photo upload if present
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    if (imagePath) {
      // Delete old image if it exists
      if (user.image) {
        const oldImagePath = path.join(process.cwd(), user.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      // Update with new image path
      user.image = imagePath;
    }

    // Handle role-specific fields
    if (user.role === "host") {
      // Host-specific validations and fields
      if (!fullName || !location) {
        return res.status(400).json({
          error: true,
          message: "Full name and location are required for host profile",
        });
      }

      // Handle Airbnb account linking for hosts
      if (linkAirbnbAccount) {
        // This would typically involve OAuth flow with Airbnb
        // For now, we'll just mark that the user wants to link
        user.airbnbAccountLinked = false; // Would be updated after successful linking
      }
    } else if (user.role === "influencer") {
      // Influencer-specific validations and fields
      if (!fullName) {
        return res.status(400).json({
          error: true,
          message: "Full name is required for influencer profile",
        });
      }

      // Update influencer-specific fields
      if (bio) {
        user.bio = bio;
      }

      // Handle nicheTags - convert string to array if needed
      if (nicheTags) {
        if (typeof nicheTags === "string") {
          user.nicheTags = [nicheTags];
        } else if (Array.isArray(nicheTags)) {
          user.nicheTags = nicheTags;
        }
      }
    }

    await user.save();

    // Prepare response data based on role
    const responseData = {
      id: user._id,
      name: user.name,
      email: user.email,
      fullName: user.name,
      role: user.role,
      image: user.image,
      fullAddress: user.fullAddress,
    };

    // Add role-specific fields to response
    if (user.role === "host") {
      responseData.airbnbAccountLinked = user.airbnbAccountLinked || false;
    } else if (user.role === "influencer") {
      responseData.bio = user.bio;
      responseData.nicheTags = user.nicheTags;
    }

    return res.status(200).json({
      success: true,
      message: `${
        user.role.charAt(0).toUpperCase() + user.role.slice(1)
      } profile setup completed successfully`,
      data: responseData,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      details: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    // Find the user
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has active collaborations
    const Collaboration = (
      await import("../../collaboration/schema/collaboration.modal.js")
    ).default;
    const activeCollaborations = await Collaboration.find({
      $or: [{ userId: userId }, { selectInfluencerOrHost: userId }],
      status: { $in: ["pending", "negotiating", "accepted", "ongoing"] },
    });

    if (activeCollaborations.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete account with active collaborations. Please complete or cancel all active collaborations first.",
        activeCollaborations: activeCollaborations.length,
      });
    }

    // Delete user's profile image if exists
    if (user.image && user.image !== "") {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const imagePath = path.join(process.cwd(), "uploads", user.image);

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (imageError) {
        console.log("Error deleting profile image:", imageError);
        // Continue with user deletion even if image deletion fails
      }
    }

    // Delete all user's collaborations
    await Collaboration.deleteMany({
      $or: [{ userId: userId }, { selectInfluencerOrHost: userId }],
    });

    // Delete user's deals
    const Deal = (await import("../../deals/schema/deal.modal.js")).default;
    await Deal.deleteMany({ userId: userId });

    // Delete user's listings
    const Listing = (await import("../../listing/schema/listing.modal.js"))
      .Listing;
    await Listing.deleteMany({ userId: userId });

    const Notification = (
      await import("../../notification/schema/notification.modal.js")
    ).default;
    await Notification.deleteMany({
      $or: [{ receiverId: userId }, { senderId: userId }],
    });

    try {
      const Message = (await import("../../message/schema/message.modal.js"))
        .default;
      await Message.deleteMany({
        $or: [{ senderId: userId }, { receiverId: userId }],
      });
    } catch (messageError) {
      console.log("Error deleting messages:", messageError);
    }

    try {
      const Review = (await import("../../review/schema/review.modal.js"))
        .default;
      if (Review) {
        await Review.deleteMany({ userId: userId });
      }
    } catch (reviewError) {
      console.log(
        "Review module not found or error deleting reviews:",
        reviewError.message,
      );
      // Continue even if review deletion fails
    }

    // Remove user from other users' connections/followers if applicable
    await userModel.updateMany(
      {
        $or: [
          { connections: userId },
          { followers: userId },
          { following: userId },
        ],
      },
      {
        $pull: {
          connections: userId,
          followers: userId,
          following: userId,
        },
      },
    );

    // Delete the user
    await userModel.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Account and all associated data deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting account",
    });
  }
};

export const deleteMyAccount = async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user exists
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user's related data
    await Promise.all([
      // Delete user's listings
      Listing.deleteMany({ userId }),

      // Delete user's collaborations
      Collaborations.deleteMany({
        $or: [{ userId }, { selectInfluencerOrHost: userId }],
      }),

      // Delete user's deals
      Deal.deleteMany({ userId }),

      // Delete user's payments
      Payment.deleteMany({
        $or: [{ userId }, { selectInfluencerOrHost: userId }],
      }),

      // Delete user's notifications
      Notification.deleteMany({
        $or: [{ receiverId: userId }, { senderId: userId }],
      }),

      // Delete user's messages
      Message.deleteMany({
        $or: [{ senderId: userId }, { receiverId: userId }],
      }),
    ]);

    // Delete the user account
    await userModel.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Account and all related data deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting account",
      error: error.message,
    });
  }
};

export const shareMyProfile = async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user exists
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has a username
    if (!user.userName) {
      return res.status(400).json({
        success: false,
        message: "Username not found. Please set up your profile first.",
      });
    }

    // Generate shareable links for web and mobile
    const webUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL;
    const mobileAppUrl = process.env.MOBILE_APP_URL || "hostinflu://profile";

    const shareableLinks = {
      web: `${webUrl}/profile/${user.userName}`,
      mobile: `${mobileAppUrl}/${user.userName}`,
      universal: `https://hostinflu.com/profile/${user.userName}`, // Universal link for both
    };

    res.status(200).json({
      success: true,
      message: "Shareable links generated successfully",
      data: {
        shareableLinks,
        username: user.userName,
        platforms: {
          web: webUrl,
          mobile: mobileAppUrl,
          universal: "https://hostinflu.com",
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error generating shareable links",
      error: error.message,
    });
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // Find user by userName with only basic information
    const user = await userModel
      .findOne({ userName: username })
      .select(
        "name userName email role image bio socialMediaLinks followers following createdAt",
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    // Remove sensitive information
    const publicProfile = {
      name: user.name,
      userName: user.userName,
      role: user.role,
      image: user.image,
      bio: user.bio,
      socialMediaLinks: user.socialMediaLinks,
      followers: user.followers || 0,
      following: user.following || 0,
      createdAt: user.createdAt,
      email: user.email ? user.email.split("@")[0] + "***" : "", // Partially hide email
    };

    res.status(200).json({
      success: true,
      message: "Public profile retrieved successfully",
      data: {
        profile: publicProfile,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving public profile",
      error: error.message,
    });
  }
};
