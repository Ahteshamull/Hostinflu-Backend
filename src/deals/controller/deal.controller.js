import mongoose from "mongoose";
import Deal from "../schema/deal.modal.js";
import { Listing } from "../../listing/schema/listing.modal.js";
import userModel from "../../auth/schema/auth.modal.js";

export const createDeal = async (req, res) => {
  try {
    const {
      title,
      description,
      addAirbnbLink,
      inTimeAndDate,
      outTimeAndDate,
      compensation,
      deliverables,
      guestCount,
      platformFollowers,
    } = req.body;

    // ✅ Get userId safely from token
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ✅ Validate title (Listing ID)
    if (!title || !mongoose.Types.ObjectId.isValid(title)) {
      return res.status(400).json({
        success: false,
        message: "Valid listing ID is required",
      });
    }

    // ✅ Check listing exists
    const listing = await Listing.findById(title);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // ✅ Check if listing is verified
    if (listing.status !== "verified") {
      return res.status(400).json({
        success: false,
        message: "Deal can only be created for verified listings",
      });
    }

    // ✅ Validate compensation
    if (
      !compensation ||
      (!compensation.nightCredits && !compensation.directPayment)
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one compensation type is required",
      });
    }

    // ✅ Night credits validation
    if (compensation.nightCredits === true) {
      if (!compensation.numberOfNights || compensation.numberOfNights < 1) {
        return res.status(400).json({
          success: false,
          message: "Number of nights is required for night credits",
        });
      }

      if (!guestCount || guestCount < 1) {
        return res.status(400).json({
          success: false,
          message: "Guest count is required for night credits",
        });
      }
    }

    // ✅ Direct payment validation
    if (compensation.directPayment === true) {
      if (!compensation.paymentAmount) {
        return res.status(400).json({
          success: false,
          message: "Payment amount is required for direct payment",
        });
      }
    }

    // ✅ Validate deliverables
    if (!Array.isArray(deliverables) || deliverables.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one deliverable is required",
      });
    }

    // ✅ Validate each deliverable and its platformFollowers
    for (const deliverable of deliverables) {
      // Validate required fields
      if (
        !deliverable.platform ||
        !deliverable.contentType ||
        !deliverable.quantity
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each deliverable must have platform, contentType, and quantity",
        });
      }

      // Validate platformFollowers if provided
      if (deliverable.platformFollowers) {
        if (typeof deliverable.platformFollowers !== "object") {
          return res.status(400).json({
            success: false,
            message: "platformFollowers must be an object",
          });
        }

        // Check if at least one platform is provided
        const hasValidPlatform = [
          "Instagram",
          "TikTok",
          "YouTube",
          "Facebook",
          "X",
        ].some(
          (platform) =>
            deliverable.platformFollowers[platform] &&
            typeof deliverable.platformFollowers[platform] === "string" &&
            deliverable.platformFollowers[platform].trim() !== "",
        );

        if (!hasValidPlatform) {
          return res.status(400).json({
            success: false,
            message:
              "Each deliverable must have at least one valid platform with follower count (Instagram, TikTok, YouTube, Facebook, X)",
          });
        }
      }
    }

    // ✅ Create deal
    const newDeal = await Deal.create({
      title,
      description,
      addAirbnbLink,
      inTimeAndDate,
      outTimeAndDate,
      guestCount,
      compensation,
      deliverables,
      userId,
    });

    // ✅ Update user deal stats
    await userModel.findByIdAndUpdate(userId, {
      $push: { deals: newDeal._id },
      $inc: { dealsTotal: 1 },
    });

    // ✅ Get the created deal with populated listing data
    const populatedDeal = await Deal.findById(newDeal._id).populate({
      path: "title",
      select: "title location images price",
    });

    return res.status(201).json({
      success: true,
      message: "Deal created successfully",
      data: {
        deal: populatedDeal,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating deal",
      error: error.message,
    });
  }
};

export const completeDeal = async (req, res) => {
  try {
    const { dealId } = req.body;

    // Get userId from token
    const userId = req.user?.id || req.user?.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "User ID not found in token",
        error: "Authentication required",
      });
    }

    if (!dealId) {
      return res.status(400).json({
        message: "Deal ID is required",
        error: "Invalid request",
      });
    }

    // Check if deal exists and belongs to user
    const deal = await Deal.findOne({ _id: dealId, userId });
    if (!deal) {
      return res.status(404).json({
        message: "Deal not found or you don't have permission",
        error: "Deal not found",
      });
    }

    // Update deal status to completed
    await Deal.findByIdAndUpdate(dealId, {
      status: "completed",
      completedAt: new Date(),
    });

    // Add deal ID to user's completeDeals array and increment total
    await userModel.findByIdAndUpdate(userId, {
      $push: { completeDeals: dealId },
      $inc: { completeDealsTotal: 1 },
      $inc: { completedCollaborationsCount: 1 }, // Add completed collaborations count
    });

    res.status(200).json({
      success: true,
      error: false,
      message: "Deal marked as completed successfully",
      data: {
        dealId,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error completing deal",
      error: error.message,
    });
  }
};

const getAllDeals = async (req, res) => {
  try {
    const { currentPage = 1, limit = 10, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      // By default, exclude deleted/rejected deals
      filter.status = { $ne: "rejected" };
    }

    const deals = await Deal.find(filter)
      .populate("title")
      .populate("userId", "name email userName role image")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((currentPage - 1) * limit);

    const total = await Deal.countDocuments(filter);

    res.status(200).json({
      success: true,
      error: false,
      message: "Deals retrieved successfully",
      data: {
        pagination: {
          currentPage: parseInt(currentPage),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
        deals,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving deals",
      error: error.message,
    });
  }
};

const getSingleDeal = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findById(id)
      .populate("title", "title location images")
      .populate("userId");

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Deal retrieved successfully",
      data: {
        deal: [deal],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving deal",
      error: error.message,
    });
  }
};

const getMyAllDeals = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPage = 1, limit = 10, status } = req.query;

    const skip = (currentPage - 1) * limit;
    const filter = { userId };

    if (status) {
      filter.status = status;
    }

    const deals = await Deal.find(filter)
      .populate("title", "title location  images")
      .populate("userId", "name email userName role image")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Deal.countDocuments(filter);

    res.status(200).json({
      success: true,
      error: false,
      message: "Deals retrieved successfully",
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(currentPage),
      limit: parseInt(limit),
      total,
      data: {
        deals,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving deals",
      error: error.message,
    });
  }
};

const deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedDeal = await Deal.findByIdAndDelete(id);

    if (!deletedDeal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Deal deleted successfully",
      data: {
        deal: deletedDeal,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error deleting deal",
      error: error.message,
    });
  }
};

const updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedDeal = await Deal.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("title", "title location")
      .populate("userId", "name email");

    if (!updatedDeal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Deal updated successfully",
      data: {
        deal: updatedDeal,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error updating deal",
      error: error.message,
    });
  }
};

const userPersonalTotalDeals = async (req, res) => {
  try {
    const userId = req.user._id;
    const total = await Deal.countDocuments({ userId });
    res.status(200).json({
      success: true,
      error: false,
      message: "Total user deals retrieved successfully",
      data: {
        total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving total user deals",
      error: error.message,
    });
  }
};

const userPersonalDealsGrowth = async (req, res) => {
  try {
    const userId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Create date range for the specified year
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31); // December 31st

    // Aggregate deals by month and status for the specified user and year
    const monthlyDeals = await Deal.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.month": 1 },
      },
    ]);

    // Initialize all 12 months with 0 counts for both statuses
    const monthlyData = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 1; i <= 12; i++) {
      const monthData = monthlyDeals.filter((item) => item._id.month === i);
      const closedDeals =
        monthData.find((item) => item._id.status === "closed")?.count || 0;
      const inProgressDeals =
        monthData.find((item) => item._id.status === "in-progress")?.count || 0;

      monthlyData.push({
        month: months[i - 1],
        monthNumber: i,
        dealsClosed: closedDeals,
        dealsInProgress: inProgressDeals,
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "User personal deals growth retrieved successfully",
      data: {
        year,
        monthlyData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user personal deals growth",
      error: error.message,
    });
  }
};

const userCreatedDeals = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Extract the actual ObjectId string from SchemaObjectId
    let userIdString;
    if (typeof userId === "string") {
      userIdString = userId;
    } else if (userId && userId.path) {
      userIdString = userId.path;
    } else if (userId && typeof userId.toString === "function") {
      userIdString = userId.toString();
    } else {
      throw new Error("Invalid userId format");
    }

    // Try using the string directly first (Mongoose can handle string ObjectIds)
    let deals = await Deal.find({ userId: userIdString }).populate("title");

    // If no deals found with string, try ObjectId conversion
    if (deals.length === 0) {
      const { ObjectId } = await import("mongoose");
      const objectId = new ObjectId(userIdString);
      deals = await Deal.find({ userId: objectId }).populate("title");
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "User created deals retrieved successfully",
      count: deals.length,
      data: deals,
    });
  } catch (error) {
    console.error("Error in userCreatedDeals:", error);
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user created deals",
      error: error.message,
    });
  }
};


export {
  getAllDeals,
  getSingleDeal,
  getMyAllDeals,
  updateDeal,
  deleteDeal,
  userPersonalTotalDeals,
  userPersonalDealsGrowth,
  userCreatedDeals,
};
