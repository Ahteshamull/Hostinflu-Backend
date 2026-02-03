import Review from "../schema/review.modal.js";
import Collaborations from "../../collaboration/schema/collaboration.modal.js";
import Payment from "../../payment/schema/payment.modal.js";

export const createReview = async (req, res) => {
  try {
    const { rating, comment, reviewType } = req.body;
    const { collaborationId } = req.params;

    // Get user ID from authenticated user (from JWT token)
    const userId = req.user?.id || req.user?._id;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Validate required fields
    if (!rating || !comment || !reviewType) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: rating, comment, reviewType",
      });
    }

    // Validate collaboration ID
    if (!collaborationId) {
      return res.status(400).json({
        success: false,
        message: "Collaboration ID is required",
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Validate review type
    if (!["host_to_influencer", "influencer_to_host"].includes(reviewType)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid review type. Must be 'host_to_influencer' or 'influencer_to_host'",
      });
    }

    // Find collaboration
    const collaboration = await Collaborations.findById(collaborationId)
      .populate("userId")
      .populate("selectInfluencerOrHost");

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found",
      });
    }

    // Check if collaboration is completed
    if (collaboration.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Review can only be created for completed collaborations",
      });
    }

    // Determine reviewer and reviewee based on review type
    let reviewerId, revieweeId;

    if (reviewType === "host_to_influencer") {
      // Host is reviewing influencer
      reviewerId = collaboration.userId._id.toString();
      revieweeId = collaboration.selectInfluencerOrHost._id.toString();

      // Check if reviewer is actually the host
      if (reviewerId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only the host can create this type of review",
        });
      }

      // Check if payment has been released (host must release payment before reviewing influencer)
      const payment = await Payment.findOne({
        title: collaborationId,
        userId: reviewerId,
        status: "SUCCESS",
      });

      if (!payment) {
        return res.status(400).json({
          success: false,
          message: "Payment must be released before reviewing the influencer",
        });
      }
    } else {
      // Influencer is reviewing host
      reviewerId = collaboration.selectInfluencerOrHost._id.toString();
      revieweeId = collaboration.userId._id.toString();

      // Check if reviewer is actually the influencer
      if (reviewerId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only the influencer can create this type of review",
        });
      }

      // Check if influencer has completed content upload (this would depend on your content delivery system)
      // For now, we'll assume if collaboration is completed, influencer has done their part
    }

    // Check if review already exists for this collaboration and review type
    const existingReview = await Review.findOne({
      collaborationId,
      reviewerId,
      reviewType,
      isDeleted: false,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Review already exists for this collaboration",
      });
    }

    // Create review
    const review = await Review.create({
      rating,
      comment,
      collaborationId,
      reviewerId,
      revieweeId,
      reviewType,
    });

    // Populate review data for response
    const populatedReview = await Review.findById(review._id)
      .populate("collaborationId", "title status")
      .populate("reviewerId", "name email")
      .populate("revieweeId", "name email");

    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: populatedReview,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating review",
      error: error.message,
    });
  }
};

export const userPersonalReview = async (req, res) => {
  try {
    const { page = 1, limit = 10, reviewType } = req.query;

    // Get user ID from authenticated user (from JWT token)
    const userId = req.user?.id || req.user?._id;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Convert pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter - get reviews where user is either reviewer or reviewee
    const filter = {
      isDeleted: false,
      $or: [
        { reviewerId: userId.toString() }, // Reviews I wrote
        { revieweeId: userId.toString() }, // Reviews about me
      ],
    };

    // Filter by review type if specified
    if (reviewType) {
      filter.reviewType = reviewType;
    }

    // Get total count
    const total = await Review.countDocuments(filter);

    // Get reviews with pagination and populate related data
    const reviews = await Review.find(filter)
      .populate("collaborationId", "title status")
      .populate("reviewerId", "name email")
      .populate("revieweeId", "name email")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    // Get statistics
    const reviewsWritten = await Review.countDocuments({
      reviewerId: userId.toString(),
      isDeleted: false,
    });

    const reviewsReceived = await Review.countDocuments({
      revieweeId: userId.toString(),
      isDeleted: false,
    });

    const averageRating = await Review.aggregate([
      {
        $match: {
          revieweeId: userId.toString(),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "User reviews retrieved successfully",
      data: {
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
        meta: {
          reviewsWritten,
          reviewsReceived,
          averageRating: averageRating[0]?.avgRating || 0,
          filterApplied: {
            reviewType: reviewType || null,
          },
        },
        reviews,
      },
    });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user reviews",
      error: error.message,
    });
  }
};

export const getReview = (req, res) => {
  res.send("Get review");
};

export const updateReview = (req, res) => {
  res.send("Update review");
};

export const deleteReview = (req, res) => {
  res.send("Delete review");
};
