import Redeem from "../schema/redeem.modal.js";
import userModel from "../../auth/schema/auth.modal.js";
import Collaborations from "../../collaboration/schema/collaboration.modal.js";

export const allRedeemStar = async (req, res) => {
  try {
    // Get all redeem stars from database with populated data
    const redeemStars = await Redeem.find({})
      .populate("property", "title description images")
      .populate("host", "name email")
      .populate("stars", "title description image price")
      .sort({ createdAt: -1 });

    // Remove sensitive fields from response and include user info
    const sanitizedStars = redeemStars.map((star) => ({
      _id: star._id,
      title: star.title,
      description: star.description,
      price: star.price,
      image: star.image,
      createdAt: star.createdAt,
      updatedAt: star.updatedAt,
      // Include related data
      property: star.property
        ? {
            _id: star.property._id,
            title: star.property.title,
            description: star.property.description,
            images: star.property.images,
          }
        : null,
      host: star.host
        ? {
            _id: star.host._id,
            name: star.host.name,
            email: star.host.email,
          }
        : null,
      stars: star.stars || [],
    }));

    res.status(200).json({
      success: true,
      message: "Redeem stars retrieved successfully",
      data: sanitizedStars,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving redeem stars",
    });
  }
};

export const getUserRedeemStars = async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    // Find user with populated redeem stars
    const user = await userModel.findById(userId).populate({
      path: "redeemStars.collaborationId",
      populate: [
        { path: "userId", select: "name email role" },
        { path: "selectInfluencerOrHost", select: "name email role" },
        { path: "selectDeal", select: "description" },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Filter only valid redeem stars (with collaborationId and stars)
    const validRedeemStars = user.redeemStars.filter(
      (item) => item.collaborationId && item.stars
    );

    // Format the response
    const formattedRedeemStars = validRedeemStars.map((item) => ({
      _id: item._id,
      stars: item.stars,
      createdAt: item.createdAt,
      collaboration: item.collaborationId
        ? {
            _id: item.collaborationId._id,
            payment: item.collaborationId.payment,
            numberOfNights: item.collaborationId.numberOfNights,
            status: item.collaborationId.status,
            negotiationStatus: item.collaborationId.negotiationStatus,
            startDate: item.collaborationId.startDate,
            endDate: item.collaborationId.endDate,
            createdAt: item.collaborationId.createdAt,
            // User info
            creator: item.collaborationId.userId
              ? {
                  _id: item.collaborationId.userId._id,
                  name: item.collaborationId.userId.name,
                  email: item.collaborationId.userId.email,
                  role: item.collaborationId.userId.role,
                }
              : null,
            // Target user info
            target: item.collaborationId.selectInfluencerOrHost
              ? {
                  _id: item.collaborationId.selectInfluencerOrHost._id,
                  name: item.collaborationId.selectInfluencerOrHost.name,
                  email: item.collaborationId.selectInfluencerOrHost.email,
                  role: item.collaborationId.selectInfluencerOrHost.role,
                }
              : null,
            // Deal info
            deal: item.collaborationId.selectDeal
              ? {
                  _id: item.collaborationId.selectDeal._id,
                  description: item.collaborationId.selectDeal.description,
                }
              : null,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      message: "User redeem stars retrieved successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          totalReviews: user.totalReviews,
          status: user.status,
        },
        redeemStars: formattedRedeemStars,
        totalStars: formattedRedeemStars.reduce(
          (sum, item) => sum + item.stars,
          0
        ),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving user redeem stars",
    });
  }
};
