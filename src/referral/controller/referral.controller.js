import userModel from "../../auth/schema/auth.modal.js";
import Referral from "../schema/referral.modal.js";
import { generateReferralCode } from "../../helper/helpers/generateReferralCode.js";

export const createReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: "Referral code is required",
      });
    }

    // Find the referrer by referral code
    const referrer = await userModel.findOne({ referralCode });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral code",
      });
    }

    // Check if user already has a referral
    const existingReferral = await Referral.findOne({
      referredUser: userId,
    });

    if (existingReferral) {
      return res.status(400).json({
        success: false,
        message: "You have already used a referral code",
      });
    }

    // Check if user is trying to refer themselves
    if (referrer._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot refer yourself",
      });
    }

    // Create referral record
    const referral = await Referral.create({
      referrer: referrer._id,
      referredUser: userId,
      status: "successful",
    });

    // Update referred user
    await userModel.findByIdAndUpdate(userId, {
      referredBy: referrer._id,
    });

    // Update referrer's referral count
    await userModel.findByIdAndUpdate(referrer._id, {
      $inc: { referralCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Referral created successfully",
      data: {
        referralId: referral._id,
        referrerName: referrer.name,
        referrerEmail: referrer.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error creating referral",
    });
  }
};

export const getMyReferrals = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    // Find all referrals made by this user
    const referrals = await Referral.find({ referrer: userId })
      .populate("referredUser", "name email role createdAt")
      .sort({ createdAt: -1 });

    // Get user's referral code
    const user = await userModel.findById(userId, "referralCode referralCount");

    // Also find users who were referred by this user (from user schema)
    const referredUsers = await userModel
      .find({ referredBy: userId })
      .select("name email role createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Referrals retrieved successfully",
      data: {
        referralCode: user.referralCode,
        referralCount: user.referralCount,
        referrals: referrals.map((referral) => ({
          _id: referral._id,
          status: referral.status,
          createdAt: referral.createdAt,
          referredUser: referral.referredUser,
        })),
        referredUsers: referredUsers, // Users who signed up using this referral code
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving referrals",
    });
  }
};

export const generateUserReferralCode = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    // Generate unique referral code
    let referralCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      referralCode = generateReferralCode();
      const existing = await userModel.findOne({ referralCode });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate unique referral code",
      });
    }

    // Update user with referral code
    await userModel.findByIdAndUpdate(userId, {
      referralCode,
    });

    res.status(200).json({
      success: true,
      message: "Referral code generated successfully",
      data: {
        referralCode,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error generating referral code",
    });
  }
};
