import Collaborations from "../schema/collaboration.modal.js";
import { createCollaborationNotification } from "../../notification/controller/notification.controller.js";
import userModel from "../../auth/schema/auth.modal.js";

export const createCollaboration = async (req, res) => {
  try {
    const {
      selectInfluencerOrHost,
      selectDeal,
      payment,
      freeStay,
      numberOfNights,
      startDate,
      endDate,
    } = req.body;

    // Get userId and role from token
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        message: "User ID or role not found in token",
        error: "Authentication required",
      });
    }

    // Validate required fields
    if (!selectInfluencerOrHost || !selectDeal) {
      return res.status(400).json({
        message: "Influencer/Host and Deal are required",
        error: "Invalid request",
      });
    }

    if (!payment) {
      return res.status(400).json({
        message: "Payment amount is required",
        error: "Invalid request",
      });
    }

 
    if (userRole === "host") {
   
    } else if (userRole === "influencer") {
      // Influencer selects a host
    }

    const newCollaboration = new Collaborations({
      selectInfluencerOrHost,
      selectDeal,
      payment,
      freeStay,
      numberOfNights,
      startDate,
      endDate,
      userId,
    });

    const savedCollaboration = await newCollaboration.save();

    // Add collaboration ID to user's collaborations array and increment total
    await userModel.findByIdAndUpdate(userId, {
      $push: { collaborations: savedCollaboration._id },
      $inc: { collaborationsTotal: 1 },
    });

    // Send notification to the receiver
    try {
      await createCollaborationNotification(savedCollaboration, userRole);
    } catch (notificationError) {
      console.error("Failed to send notification:", notificationError);
      // Continue with response even if notification fails
    }

    res.status(201).json({
      success: true,
      error: false,
      message: "Collaboration send successfully",
      data: {
        collaboration: savedCollaboration,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error creating collaboration",
      error: error.message,
    });
  }
};

export const getAllCollaboration = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const collaborations = await Collaborations.find(filter)
      .populate("selectInfluencerOrHost", "name email")
      .populate("selectDeal", "dealTitle")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Collaborations.countDocuments(filter);

    res.status(200).json({
      success: true,
      error: false,
      message: "Collaborations retrieved successfully",
      data: {
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
        collaborations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving collaborations",
      error: error.message,
    });
  }
};

export const getSingleCollaboration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Collaboration ID is required",
      });
    }

    const collaboration = await Collaborations.findById(id)
      .populate("selectInfluencerOrHost", "name email")
      .populate("selectDeal", "dealTitle");

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Collaboration not found",
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Collaboration retrieved successfully",
      data: {
        collaboration,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving collaboration",
      error: error.message,
    });
  }
};

export const deleteCollaboration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Collaboration ID is required",
      });
    }

    const collaboration = await Collaborations.findByIdAndDelete(id);

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Collaboration not found",
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Collaboration deleted successfully",
      data: {
        collaboration,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error deleting collaboration",
      error: error.message,
    });
  }
};

export const getMyAllCollaborations = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const userRole = req.user?.role;
    const { page = 1, limit = 10 } = req.query;

    if (!userId || !userRole) {
      return res.status(401).json({
        message: "User ID or role not found in token",
      });
    }

    const skip = (page - 1) * limit;

    // Find collaborations where the user is either the creator or the selected influencer/host
    const collaborations = await Collaborations.find({
      $or: [
        { userId: userId }, // User created the collaboration
        { selectInfluencerOrHost: userId }, // User is selected as influencer/host
      ],
    })
      .populate("userId", "name email")
      .populate("selectInfluencerOrHost", "name email")
      .populate("selectDeal", "dealTitle description")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Collaborations.countDocuments({
      $or: [{ userId: userId }, { selectInfluencerOrHost: userId }],
    });

    res.status(200).json({
      success: true,
      error: false,
      message: "My collaborations retrieved successfully",
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      data: {
        collaborations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving my collaborations",
      error: error.message,
    });
  }
};

export const updateCollaboration = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      selectDeal,
      payment,
      freeStay,
      numberOfNights,
      startDate,
      endDate,
      status,
      socialMediaLinks,
    } = req.body;

    // Get userId and role from token
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        message: "User ID or role not found in token",
        error: "Authentication required",
      });
    }

    // Find existing collaboration
    const collaboration = await Collaborations.findById(id);
    if (!collaboration) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Collaboration not found",
      });
    }

    // Check if user has permission to update this collaboration
    if (
      !collaboration.userId ||
      collaboration.userId.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "You can only update your own collaborations",
      });
    }

    // Prepare update object
    const updateData = {};

    // Update basic collaboration fields if provided
    if (selectDeal !== undefined) updateData.selectDeal = selectDeal;
    if (payment !== undefined) updateData.payment = payment;
    if (freeStay !== undefined) updateData.freeStay = freeStay;
    if (numberOfNights !== undefined)
      updateData.numberOfNights = numberOfNights;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (status !== undefined) updateData.status = status;

    // Only influencers can update social media links
    if (userRole === "influencer" && socialMediaLinks) {
      updateData.socialMediaLinks = {
        instagram:
          socialMediaLinks.instagram ||
          collaboration.socialMediaLinks?.instagram ||
          "",
        facebook:
          socialMediaLinks.facebook ||
          collaboration.socialMediaLinks?.facebook ||
          "",
        twitter:
          socialMediaLinks.twitter ||
          collaboration.socialMediaLinks?.twitter ||
          "",
        youtube:
          socialMediaLinks.youtube ||
          collaboration.socialMediaLinks?.youtube ||
          "",
        tiktok:
          socialMediaLinks.tiktok ||
          collaboration.socialMediaLinks?.tiktok ||
          "",
      };
    } else if (userRole !== "influencer" && socialMediaLinks) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Only influencers can update social media links",
      });
    }

    // Validate required fields if updating deal or payment
    if (updateData.selectDeal && !updateData.payment) {
      return res.status(400).json({
        message: "Payment amount is required when updating deal",
        error: "Invalid request",
      });
    }

    // Validate free stay requirements
    if (updateData.freeStay === true) {
      if (!updateData.numberOfNights) {
        return res.status(400).json({
          message: "Number of nights is required when free stay is enabled",
          error: "Invalid request",
        });
      }
      if (!updateData.startDate || !updateData.endDate) {
        return res.status(400).json({
          message: "Start and end dates are required when free stay is enabled",
          error: "Invalid request",
        });
      }
    }

    // Update collaboration
    const updatedCollaboration = await Collaborations.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("selectInfluencerOrHost", "name email")
      .populate("selectDeal", "dealTitle");

    res.status(200).json({
      success: true,
      error: false,
      message: "Collaboration updated successfully",
      data: {
        collaboration: updatedCollaboration,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error updating collaboration",
      error: error.message,
    });
  }
};

export const totalCollaboration = async (req, res) => {
  try {
    const total = await Collaborations.countDocuments();
    res.status(200).json({
      success: true,
      error: false,
      message: "Total collaborations retrieved successfully",
      data: {
        totalCollaborations: total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving total collaborations",
      error: error.message,
    });
  }
};

export const activeCollaborations = async (req, res) => {
  try {
    const active = await Collaborations.countDocuments({ status: "active" });
    res.status(200).json({
      success: true,
      error: false,
      message: "Active collaborations retrieved successfully",
      data: {
        activeCollaborations: active,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving active collaborations",
      error: error.message,
    });
  }
};

export const completedCollaborations = async (req, res) => {
  try {
    const completed = await Collaborations.countDocuments({
      status: "completed",
    });
    res.status(200).json({
      success: true,
      error: false,
      message: "Completed collaborations retrieved successfully",
      data: {
        completedCollaborations: completed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving completed collaborations",
      error: error.message,
    });
  }
};

export const userPersonalActiveCollaborations = async (req, res) => {
  try {
    const userId = req.user._id;
    const active = await Collaborations.countDocuments({
      userId,
      status: "active",
    });
    res.status(200).json({
      success: true,
      error: false,
      message: "User personal active collaborations retrieved successfully",
      data: {
        activeCollaborations: active,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user personal active collaborations",
      error: error.message,
    });
  }
};

export const userPersonalCompletedCollaborations = async (req, res) => {
  try {
    const userId = req.user._id;
    const completed = await Collaborations.countDocuments({
      userId,
      status: "completed",
    });
    res.status(200).json({
      success: true,
      error: false,
      message: "User personal completed collaborations retrieved successfully",
      data: {
        completedCollaborations: completed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user personal completed collaborations",
      error: error.message,
    });
  }
};

export const userPersonalTotalCollaborations = async (req, res) => {
  try {
    const userId = req.user._id;
    const total = await Collaborations.countDocuments({
      userId,
    });
    res.status(200).json({
      success: true,
      error: false,
      message: "User personal total collaborations retrieved successfully",
      data: {
        totalCollaborations: total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user personal total collaborations",
      error: error.message,
    });
  }
};

export const userPersonalCompleteContents = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get completed collaborations for the user with their content
    const completedCollaborations = await Collaborations.find({
      userId: userId,
      status: "completed",
    }).select("content title description createdAt updatedAt");

    res.status(200).json({
      success: true,
      error: false,
      message: "User personal completed contents retrieved successfully",
      data: {
        completedContents: completedCollaborations,
        total: completedCollaborations.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user personal completed contents",
      error: error.message,
    });
  }
};

export const userPersonalEarnStar = async (req, res) => {
  try {
    const userId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Create date range for the specified year
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31); // December 31st

    // Aggregate night credits by month for the specified user and year
    const monthlyStars = await Collaborations.aggregate([
      {
        $match: {
          userId: userId,
          numberOfNights: { $exists: true, $gt: 0 },
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalNightCredits: { $sum: "$numberOfNights" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Initialize all 12 months with 0 night credits
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
      const monthData = monthlyStars.find((item) => item._id === i);
      monthlyData.push({
        month: months[i - 1],
        monthNumber: i,
        nightCredits: monthData ? monthData.totalNightCredits : 0,
      });
    }

    // Calculate total night credits for the year
    const totalNightCredits = monthlyData.reduce(
      (total, month) => total + month.nightCredits,
      0
    );

    res.status(200).json({
      success: true,
      error: false,
      message: "User personal earned stars retrieved successfully",
      data: {
        year,
        totalNightCredits,
        monthlyData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user personal earned stars",
      error: error.message,
    });
  }
};

export const userPersonalCollaborationsGrowth = async (req, res) => {
  try {
    const userId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Create date range for the specified year
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31); // December 31st

    // Get total collaborations for the year
    const totalCollaborations = await Collaborations.countDocuments({
      userId: userId,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    // Get collaborations by month
    const monthlyCollaborations = await Collaborations.aggregate([
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
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Initialize all 12 months with 0 collaborations
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
      const monthData = monthlyCollaborations.find((item) => item._id === i);
      monthlyData.push({
        month: months[i - 1],
        monthNumber: i,
        count: monthData ? monthData.count : 0,
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "User personal collaborations growth retrieved successfully",
      data: {
        year,
        totalCollaborations,
        monthlyData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user personal collaborations growth",
      error: error.message,
    });
  }
};
