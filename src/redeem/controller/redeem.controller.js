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
        {
          path: "selectDeal",
          select:
            "title description location images amenities propertyType price compensation",
        },
        {
          path: "title",
          select:
            "title description location images amenities propertyType price",
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Clean up orphaned redeemStars entries (collaboration deleted)
    if (user.redeemStars && user.redeemStars.length > 0) {
      const validRedeemStars = [];
      for (const redeemStar of user.redeemStars) {
        const collaborationExists = await Collaborations.exists({
          _id: redeemStar.collaborationId,
        });
        if (collaborationExists) {
          validRedeemStars.push(redeemStar);
        }
      }

      // Update user with only valid redeemStars
      if (validRedeemStars.length !== user.redeemStars.length) {
        await userModel.findByIdAndUpdate(userId, {
          redeemStars: validRedeemStars,
        });
        user.redeemStars = validRedeemStars;
      }
    }

    // Filter only valid redeem stars (with collaborationId and completed status)
    const filteredRedeemStars = user.redeemStars.filter(
      (item) =>
        item.collaborationId && item.collaborationId.status === "completed",
    );

    // Format the response with detailed collaboration information
    const collaborationDetails = filteredRedeemStars.map((item) => {
      const collaboration = item.collaborationId;
      const nightCredits =
        collaboration?.selectDeal?.compensation?.numberOfNights ||
        collaboration?.compensation?.numberOfNights ||
        0;

      // Get the title from populated deal or title field (both reference Listing)
      const collaborationTitle =
        collaboration?.selectDeal?.title ||
        collaboration?.title?.title ||
        collaboration?.title ||
        "Untitled Collaboration";

      return {
        collaborationId: collaboration._id,
        nightCreditsEarned: nightCredits,
        collaborationDetails: {
          title: collaborationTitle,
          description: collaboration.description || "No description",
          status: collaboration.status,
          negotiationStatus: collaboration.negotiationStatus,
          paymentStatus: collaboration.paymentStatus,
          startDate: collaboration.startDate,
          endDate: collaboration.endDate,
          createdAt: collaboration.createdAt,
          completedAt: collaboration.updatedAt, // When it was marked as completed
        },
        dealDetails: collaboration.selectDeal
          ? {
              title: collaboration.selectDeal.title || "No Deal Title",
              description: collaboration.selectDeal.description,
              compensation: collaboration.selectDeal.compensation,
              totalNights: nightCredits,
              location: collaboration.selectDeal.location || "No Location",
              images: collaboration.selectDeal.images || [],
              amenities: collaboration.selectDeal.amenities || {},
              propertyType:
                collaboration.selectDeal.propertyType || "Not specified",
              price: collaboration.selectDeal.price || 0,
            }
          : collaboration.title
            ? {
                title: collaboration.title.title || "No Deal Title",
                description: collaboration.title.description,
                compensation: collaboration.compensation,
                totalNights: nightCredits,
                location: collaboration.title.location || "No Location",
                images: collaboration.title.images || [],
                amenities: collaboration.title.amenities || {},
                propertyType:
                  collaboration.title.propertyType || "Not specified",
                price: collaboration.title.price || 0,
              }
            : null,
        participants: {
          creator: collaboration.userId
            ? {
                _id: collaboration.userId._id,
                name: collaboration.userId.name,
                email: collaboration.userId.email,
                role: collaboration.userId.role,
              }
            : null,
          partner: collaboration.selectInfluencerOrHost
            ? {
                _id: collaboration.selectInfluencerOrHost._id,
                name: collaboration.selectInfluencerOrHost.name,
                email: collaboration.selectInfluencerOrHost.email,
                role: collaboration.selectInfluencerOrHost.role,
              }
            : null,
        },
        earnedAt: item.createdAt,
      };
    });

    // Calculate totals
    const totalCollaborations = collaborationDetails.length;
    const totalNightCredits = collaborationDetails.reduce(
      (sum, item) => sum + item.nightCreditsEarned,
      0,
    );

    // Group by status for additional insights
    const collaborationsByStatus = collaborationDetails.reduce((acc, item) => {
      const status = item.collaborationDetails.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

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
        collaborationDetails: collaborationDetails,
        summary: {
          totalCollaborations,
          totalNightCredits,
          averageNightCreditsPerCollaboration:
            totalCollaborations > 0
              ? Math.round((totalNightCredits / totalCollaborations) * 100) /
                100
              : 0,
          collaborationsByStatus,
        },
        breakdown: {
          nightCreditsSource: collaborationDetails.map((item) => ({
            collaborationId: item.collaborationId,
            collaborationTitle: item.collaborationDetails.title,
            nightCreditsEarned: item.nightCreditsEarned,
            completedDate: item.collaborationDetails.completedAt,
            partnerName:
              item.participants.partner?.name ||
              item.participants.creator?.name,
          })),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving user redeem stars",
    });
  }
};
