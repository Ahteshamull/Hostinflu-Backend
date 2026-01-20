import Collaborations from "../schema/collaboration.modal.js";
import { createCollaborationNotification } from "../../notification/controller/notification.controller.js";
import userModel from "../../auth/schema/auth.modal.js";
import Notification from "../../notification/schema/notification.modal.js";

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

   
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        message: "User ID or role not found in token",
        error: "Authentication required",
      });
    }


    if (!selectInfluencerOrHost || !selectDeal) {
      return res.status(400).json({
        message: "Influencer/Host and Deal are required",
        error: "Invalid request",
      });
    }

  
    const selectedUser = await userModel.findById(selectInfluencerOrHost);

    if (!selectedUser) {
      return res.status(404).json({
        message: "Selected user not found",
        error: "Invalid user selection",
      });
    }

   
    if (userId.toString() === selectInfluencerOrHost.toString()) {
      return res.status(400).json({
        message: "You cannot create collaboration with yourself",
        error: "Invalid collaboration target",
      });
    }

 
    if (userRole === "host") {
      if (!["host", "influencer"].includes(selectedUser.role)) {
        return res.status(400).json({
          message:
            "Host can only create collaborations for hosts or influencers",
          error: "Invalid collaboration target",
        });
      }
    } else if (userRole === "influencer") {
      // Influencer can create collaborations for anyone
      if (!["host", "influencer"].includes(selectedUser.role)) {
        return res.status(400).json({
          message:
            "Influencer can only create collaborations for hosts or influencers",
          error: "Invalid collaboration target",
        });
      }
    } else {
      return res.status(403).json({
        message: "Only hosts and influencers can create collaborations",
        error: "Invalid role",
      });
    }

    const newCollaboration = new Collaborations({
      selectInfluencerOrHost, // This will be the target user (influencer for host, host for influencer)
      selectDeal,
      payment,
      freeStay,
      numberOfNights,
      startDate,
      endDate,
      userId, // This is the creator's ID
      status: "pending", // Set initial status to pending
    });

    const savedCollaboration = await newCollaboration.save();

    // Add collaboration ID to user's collaborations array and increment total
    await userModel.findByIdAndUpdate(userId, {
      $push: { collaborations: savedCollaboration._id },
      $inc: { collaborationsTotal: 1 },
      // Add redeem stars as object with collaborationId and stars
      $push: {
        redeemStars: {
          collaborationId: savedCollaboration._id,
          stars: numberOfNights,
        },
      },
    });

    // Also add redeem stars to the target user (selectInfluencerOrHost)
    await userModel.findByIdAndUpdate(selectInfluencerOrHost, {
      // Add redeem stars as object with collaborationId and stars
      $push: {
        redeemStars: {
          collaborationId: savedCollaboration._id,
          stars: numberOfNights,
        },
      },
    });

    // Send notification to the receiver
    try {
      await createCollaborationNotification(savedCollaboration, userRole);
    } catch (notificationError) {
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
      .populate("selectInfluencerOrHost", "name email role")
      .populate("userId", "name email role")
      .populate("selectDeal")
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
      .populate("selectDeal", "dealTitle")
      .populate("userId", "name email");

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
    const { page = 1, limit = 10, status } = req.query;

    if (!userId || !userRole) {
      return res.status(401).json({
        message: "User ID or role not found in token",
      });
    }

    const skip = (page - 1) * limit;

    // Find collaborations based on user role
    let collaborations;
    let total;
    let filter = {};

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    if (userRole === "host") {
      // Host: Show collaborations they created
      filter.userId = userId;
      collaborations = await Collaborations.find(filter)
        .populate("userId", "name email role")
        .populate("selectInfluencerOrHost", "name email role")
        .populate(
          "selectDeal",
          "dealTitle description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount status",
        )
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip(skip);

      total = await Collaborations.countDocuments(filter);
    } else if (userRole === "influencer") {
      // Influencer: Show collaborations where they are selected
      filter.selectInfluencerOrHost = userId;
      collaborations = await Collaborations.find(filter)
        .populate("userId", "name email role")
        .populate("selectInfluencerOrHost", "name email role")
        .populate(
          "selectDeal",
          "dealTitle description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount status",
        )
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip(skip);

      total = await Collaborations.countDocuments(filter);
    } else {
      // Other roles: Show both types
      filter.$or = [{ userId: userId }, { selectInfluencerOrHost: userId }];
      collaborations = await Collaborations.find(filter)
        .populate("userId", "name email role")
        .populate("selectInfluencerOrHost", "name email role")
        .populate(
          "selectDeal",
          "dealTitle description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount status",
        )
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip(skip);

      total = await Collaborations.countDocuments(filter);
    }

    // Add action permissions to each collaboration
    const collaborationsWithActions = collaborations.map((collab) => {
      const isCreator = collab.userId._id.toString() === userId;
      const isSelectedUser =
        collab.selectInfluencerOrHost._id.toString() === userId;

      return {
        ...collab.toObject(),
        canAccept: isSelectedUser && collab.status === "pending",
        canReject: isSelectedUser && collab.status === "pending",
        canNegotiate: isSelectedUser && collab.status === "pending",
        canWithdraw:
          isCreator &&
          (collab.status === "pending" || collab.status === "negotiating"),
        role: isCreator ? "creator" : "selected",
      };
    });

    res.status(200).json({
      success: true,
      error: false,
      message: "My collaborations retrieved successfully",
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      data: {
        collaborations: collaborationsWithActions,
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
      { new: true, runValidators: true },
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
      0,
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

export const createNegotiationCollaboration = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const {
      payment,
      content,
      additionalRequirements,
      startDate,
      endDate,
      status,
      negotiationMessage,
    } = req.body;

    // Find collaboration without population first for authorization check
    const collaboration = await Collaborations.findById(collaborationId);

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Collaboration not found",
      });
    }

    // Check if current user is either collaboration creator (host) or selected influencer
    // Both host and influencer can negotiate
    const currentUserId = req.user?._id || req.user?.id;
    const isHost = collaboration.userId.toString() === currentUserId;
    const isInfluencer =
      collaboration.selectInfluencerOrHost?.toString() === currentUserId;

    if (!isHost && !isInfluencer) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "You are not authorized to perform this action",
      });
    }

    // Now populate for the rest of the function
    await collaboration.populate("userId");
    await collaboration.populate("selectInfluencerOrHost");
    await collaboration.populate("selectDeal");

    // Create negotiation history if it doesn't exist
    if (!collaboration.negotiationHistory) {
      collaboration.negotiationHistory = [];
    }

    // Add current state to negotiation history before updating
    collaboration.negotiationHistory.push({
      updatedBy: currentUserId,
      updatedAt: new Date(),
      proposedChanges: {
        payment: payment !== undefined ? payment : collaboration.payment,
        content: content !== undefined ? content : collaboration.content,
        additionalRequirements:
          additionalRequirements !== undefined
            ? additionalRequirements
            : collaboration.additionalRequirements,
        startDate:
          startDate !== undefined ? startDate : collaboration.startDate,
        endDate: endDate !== undefined ? endDate : collaboration.endDate,
        status: status !== undefined ? status : collaboration.status,
      },
      message: negotiationMessage || "Negotiation update",
      action: "proposed",
    });

    // Mark as negotiating if status is not already set
    if (!collaboration.status || collaboration.status === "pending") {
      collaboration.status = "negotiating";
    }

    // Also update negotiationStatus to reflect active negotiation
    collaboration.negotiationStatus = "pending";

    // Also set to pending if it's being negotiated
    if (
      collaboration.status === "active" ||
      collaboration.status === "accepted"
    ) {
      collaboration.status = "pending";
    }

    // DO NOT update the main collaboration fields - only track proposals
    // Remove the direct field updates that were changing the original data

    await collaboration.save();

    // Send notification to other party
    try {
      const notificationRecipientId = isHost
        ? collaboration.selectInfluencerOrHost
        : collaboration.userId;
      const negotiatorName = isHost
        ? collaboration.userId?.name || "Host"
        : collaboration.selectInfluencerOrHost?.name || "Influencer";

      await createNegotiationNotification(
        notificationRecipientId,
        collaborationId,
        negotiatorName,
        negotiationMessage || "New negotiation proposal",
      );
    } catch (notificationError) {
      // Continue with response even if notification fails
    }

    // Return updated collaboration with all populated data
    const updatedCollaboration = await Collaborations.findById(collaborationId)
      .populate("userId", "name email")
      .populate("selectInfluencerOrHost", "name email")
      .populate("selectDeal", "description");

    res.status(200).json({
      success: true,
      error: false,
      message: "Negotiation created successfully",
      data: updatedCollaboration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error creating negotiation",
      error: error.message,
    });
  }
};

const createNegotiationNotification = async (
  recipientId,
  collaborationId,
  senderName,
  message,
) => {
  try {
    // Create notification for negotiation action
    const notification = new Notification({
      type: "negotiation",
      title: "Collaboration Negotiation Update",
      message: `${senderName}: ${message}`,
      collaborationId: collaborationId,
      receiverId: recipientId,
      isRead: false,
      createdAt: new Date(),
    });

    const savedNotification = await notification.save();

    return savedNotification;
  } catch (error) {
    throw error;
  }
};

export const allNegotiationCollaborations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user?._id || req.user?.id;

    // Build filter for negotiations where current user is involved
    const filter = {
      $or: [
        { userId: userId }, // User created collaboration
        { selectInfluencerOrHost: userId }, // User is selected for collaboration
      ],
      status: { $in: ["negotiating", "pending", "active", "rejected"] },
    };

    if (status) {
      filter.status = status;
    }

    // Get negotiations with populated data
    const negotiations = await Collaborations.find(filter)
      .populate("userId", "name email")
      .populate("selectInfluencerOrHost", "name email")
      .populate("selectDeal", "description")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Collaborations.countDocuments(filter);

    res.status(200).json({
      success: true,
      error: false,
      message: "Negotiation collaborations retrieved successfully",
      data: {
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
          limit: parseInt(limit),
        },
        negotiations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving negotiation collaborations",
      error: error.message,
    });
  }
};

export const updateNegotiateStatus = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const { status, reason, rejectReason } = req.body;
    const userId = req.user?._id || req.user?.id;

    // Handle case where status might have leading space in key
    const actualStatus = status || req.body[" status"] || req.body.status;
    const actualReason =
      rejectReason || reason || req.body[" reason"] || req.body.reason;

    // Validate that status is provided
    if (!actualStatus) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Status is required in request body",
        debug: {
          body: req.body,
          headers: req.headers,
          availableKeys: Object.keys(req.body),
        },
      });
    }

    // Find negotiation (without population first for authorization check)
    const negotiation = await Collaborations.findById(collaborationId);

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Negotiation not found",
      });
    }

    // Check if user is involved in this negotiation (check raw IDs)
    if (
      negotiation.userId.toString() !== userId &&
      negotiation.selectInfluencerOrHost.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "You are not authorized to update this negotiation",
      });
    }

    // Now populate for the rest of the function
    await negotiation.populate("userId", "name email");
    await negotiation.populate("selectInfluencerOrHost", "name email");
    await negotiation.populate("selectDeal", "description");

    // Create negotiation history if it doesn't exist
    if (!negotiation.negotiationHistory) {
      negotiation.negotiationHistory = [];
    }

    // Add to negotiation history
    negotiation.negotiationHistory.push({
      updatedBy: userId,
      updatedAt: new Date(),
      action:
        actualStatus === "rejected"
          ? "rejected"
          : actualStatus === "accepted" || actualStatus === "accept"
            ? "accepted"
            : "updated",
      message:
        actualStatus === "rejected"
          ? "Negotiation rejected"
          : actualStatus === "accepted" || actualStatus === "accept"
            ? "Negotiation accepted"
            : "Status updated",
      reason:
        actualReason ||
        (actualStatus === "rejected" ? "No reason provided" : undefined),
      // Save previous state when rejecting
      previousState:
        actualStatus === "rejected"
          ? {
              payment: negotiation.payment,
              content: negotiation.content,
              additionalRequirements: negotiation.additionalRequirements,
              startDate: negotiation.startDate,
              endDate: negotiation.endDate,
              status: negotiation.status,
              negotiationStatus: negotiation.negotiationStatus,
            }
          : undefined,
    });

    // Update negotiation status (convert "accept" to "accepted")
    const finalStatus = actualStatus === "accept" ? "accepted" : actualStatus;

    // Only update negotiationStatus and rejectReason, preserve all other data
    negotiation.set("negotiationStatus", finalStatus);
    negotiation.negotiationStatus = finalStatus;

    // If rejected, save the reason in the separate rejectReason field
    if (finalStatus === "rejected") {
      negotiation.rejectReason = actualReason || "No reason provided";
    }

    // For rejection, DO NOT update any other collaboration fields
    // For acceptance, you can update the fields if needed

    await negotiation.save();

    // Explicitly ensure negotiationStatus is included in response (after save)
    const response_data = negotiation.toObject();
    response_data.negotiationStatus = negotiation.negotiationStatus;

    // Populate the updated negotiation
    await negotiation.populate("userId", "name email");
    await negotiation.populate("selectInfluencerOrHost", "name email");
    await negotiation.populate("selectDeal", "description");

    // Send notification to other party
    try {
      const notificationRecipientId =
        negotiation.userId.toString() === userId
          ? negotiation.selectInfluencerOrHost
          : negotiation.userId;
      const updaterName =
        negotiation.userId.toString() === userId
          ? negotiation.userId?.name || "Host"
          : negotiation.selectInfluencerOrHost?.name || "Influencer";

      await createNegotiationNotification(
        notificationRecipientId,
        collaborationId,
        updaterName,
        actualStatus === "rejected"
          ? `Rejected: ${actualReason || "No reason provided"}`
          : actualStatus === "accepted" || actualStatus === "accept"
            ? "Accepted collaboration"
            : "Updated negotiation status",
      );
    } catch (notificationError) {
      // Continue with response even if notification fails
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Negotiation status updated successfully",
      data: response_data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error updating negotiation status",
      error: error.message,
    });
  }
};

export const acceptOrRejectCollaboration = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const { action, reason } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!collaborationId) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Collaboration ID is needed",
      });
    }

    if (!action || !["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Action must be 'accept' or 'reject'",
      });
    }

    const collaboration = await Collaborations.findById(collaborationId);
    if (!collaboration) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Collaboration not available",
      });
    }

    // Verify user is selected influencer/host
    if (
      collaboration.selectInfluencerOrHost?.toString() !== userId.toString() &&
      collaboration.userId?.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "You are not authorized to accept/reject this collaboration",
      });
    }

    // Update collaboration status
    if (action === "accept") {
      collaboration.status = "accepted";
      collaboration.negotiationStatus = "accepted";
    } else if (action === "reject") {
      collaboration.status = "rejected";
      collaboration.negotiationStatus = "rejected";
      collaboration.rejectReason = reason || "No reason provided";
    }

    await collaboration.save();

    // Send notification to other party
    try {
      const notificationRecipientId =
        collaboration.userId.toString() === userId
          ? collaboration.selectInfluencerOrHost
          : collaboration.userId;
      const updaterName =
        collaboration.userId.toString() === userId
          ? collaboration.userId?.name || "Host"
          : collaboration.selectInfluencerOrHost?.name || "Influencer";

      await createNegotiationNotification(
        notificationRecipientId,
        collaborationId,
        updaterName,
        action === "reject"
          ? `Rejected: ${reason || "No reason provided"}`
          : "Accepted collaboration",
      );
    } catch (notificationError) {
      // Continue with response even if notification fails
    }

    res.status(200).json({
      success: true,
      error: false,
      message: `Collaboration ${action}ed successfully`,
      data: collaboration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error updating collaboration status",
      error: error.message,
    });
  }
};

export const getCollaborationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Build filter based on status
    const filter = {
      $or: [{ userId: userId }, { selectInfluencerOrHost: userId }],
    };

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    const collaborations = await Collaborations.find(filter)
      .populate("selectInfluencerOrHost", "name email role")
      .populate("userId", "name email role")
      .populate({
        path: "selectDeal",
        populate: {
          path: "selectListing",
          model: "Listing",
          select:
            "title description images location propertyType amenities customAmenities",
          strictPopulate: false,
        },
      })
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      message: `Collaborations${status ? ` with status '${status}'` : ""} retrieved successfully`,
      count: collaborations.length,
      data: collaborations,
      status: status || "all",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve collaborations",
      error: error.message,
    });
  }
};


