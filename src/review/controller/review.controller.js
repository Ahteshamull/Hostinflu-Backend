import Review from "../schema/review.modal.js";
import Collaborations from "../../collaboration/schema/collaboration.modal.js";
import Payment from "../../payment/schema/payment.modal.js";
import userModel from "../../auth/schema/auth.modal.js";

export const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
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
    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: rating, comment",
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
        debug: {
          currentStatus: collaboration.status,
          requiredStatus: "completed",
        },
      });
    }

    // Determine reviewer and reviewee based on user's role in collaboration
    let reviewerId, revieweeId;

    // Check if the authenticated user is the host or influencer
    const isHost = collaboration.userId._id.toString() === userId.toString();
    const isInfluencer =
      collaboration.selectInfluencerOrHost._id.toString() === userId.toString();

    if (isHost) {
      // Host is reviewing influencer
      reviewerId = collaboration.userId._id.toString();
      revieweeId = collaboration.selectInfluencerOrHost._id.toString();
    } else if (isInfluencer) {
      // Influencer is reviewing host
      reviewerId = collaboration.selectInfluencerOrHost._id.toString();
      revieweeId = collaboration.userId._id.toString();
    } else {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to create a review for this collaboration",
      });
    }

    // Check if review already exists for this collaboration and review type
    const existingReview = await Review.findOne({
      collaborationId,
      reviewerId,
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
    });

    // ✅ Update reviewee's rating and total reviews
    const allReviewsForUser = await Review.find({
      revieweeId,
      isDeleted: false,
    });

    const totalReviewsCount = allReviewsForUser.length;
    const averageRatingValue =
      allReviewsForUser.reduce((sum, rev) => sum + rev.rating, 0) /
      totalReviewsCount;

    await userModel.findByIdAndUpdate(revieweeId, {
      totalReviews: totalReviewsCount,
      averageRating: Math.round(averageRatingValue * 10) / 10, // Round to 1 decimal place
    });

    // Populate review data for response
    const populatedReview = await Review.findById(review._id)
      .populate("collaborationId", "title status")
      .populate("reviewerId", "name email image")
      .populate("revieweeId", "name email image");

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
      .populate("reviewerId", "name email image")
      .populate("revieweeId", "name email image")
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

    // Get user details with rating info
    const userWithRatings = await userModel
      .findById(userId)
      .select("name email image averageRating totalReviews");

    return res.status(200).json({
      success: true,
      message: "User reviews retrieved successfully",
      data: {
        user: userWithRatings,
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

export const userReview = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, reviewType } = req.query;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
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
        { reviewerId: userId }, // Reviews user wrote
        { revieweeId: userId }, // Reviews about user
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
      .populate("reviewerId", "name email image")
      .populate("revieweeId", "name email image")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    // Get statistics
    const reviewsWritten = await Review.countDocuments({
      reviewerId: userId,
      isDeleted: false,
    });

    const reviewsReceived = await Review.countDocuments({
      revieweeId: userId,
      isDeleted: false,
    });

    const averageRating = await Review.aggregate([
      {
        $match: {
          revieweeId: userId,
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

    // Get user details with rating info
    const userWithRatings = await userModel
      .findById(userId)
      .select("name email image averageRating totalReviews");

    return res.status(200).json({
      success: true,
      message: "User reviews retrieved successfully",
      data: {
        user: userWithRatings,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
        meta: {
          userId,
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

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Get user ID from authenticated user (from JWT token)
    const userId = req.user?.id || req.user?._id;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Validate review ID
    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "Review ID is required",
      });
    }

    // Find the review
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if review is already deleted
    if (review.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Review is already deleted",
      });
    }

    // Check if user is authorized to delete this review
    // Only the reviewer (who wrote the review) can delete it
    if (review.reviewerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the reviewer can delete this review",
      });
    }

    // Soft delete the review
    await Review.findByIdAndUpdate(reviewId, { isDeleted: true });

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting review",
      error: error.message,
    });
  }
};

export const allReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, reviewType, rating } = req.query;

    // Convert pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = { isDeleted: false };

    // Filter by review type if specified
    if (reviewType) {
      filter.reviewType = reviewType;
    }

    // Filter by rating if specified
    if (rating) {
      filter.rating = parseInt(rating);
    }

    // Get total count
    const total = await Review.countDocuments(filter);

    // Get reviews with pagination and populate related data
    const reviews = await Review.find(filter)
      .populate("collaborationId", "title status")
      .populate("reviewerId", "name email image")
      .populate("revieweeId", "name email image")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    // Get statistics
    const totalReviews = await Review.countDocuments({ isDeleted: false });

    const reviewsByType = await Review.aggregate([
      {
        $match: { isDeleted: false },
      },
      {
        $group: {
          _id: "$reviewType",
          count: { $sum: 1 },
        },
      },
    ]);

    const reviewsByRating = await Review.aggregate([
      {
        $match: { isDeleted: false },
      },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const averageRating = await Review.aggregate([
      {
        $match: { isDeleted: false },
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
      message: "All reviews retrieved successfully",
      data: {
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
        meta: {
          totalReviews,
          averageRating: averageRating[0]?.avgRating || 0,
          reviewsByType,
          reviewsByRating,
          filterApplied: {
            reviewType: reviewType || null,
            rating: rating || null,
          },
        },
        reviews,
      },
    });
  } catch (error) {
    console.error("Error fetching all reviews:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching all reviews",
      error: error.message,
    });
  }
};
