import Collaborations from "../schema/collaboration.modal.js";
import { createCollaborationNotification } from "../../notification/controller/notification.controller.js";
import userModel from "../../auth/schema/auth.modal.js";
import Notification from "../../notification/schema/notification.modal.js";
import Payment from "../../payment/schema/payment.modal.js";
import Deal from "../../deals/schema/deal.modal.js";
import Listing from "../../listing/schema/listing.modal.js"; // Import Listing model

import mongoose from "mongoose";

export const createCollaboration = async (req, res) => {
  const dealId = req.params.id;
  try {
    const {
      selectInfluencerOrHost,
      title,
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

    if (!selectInfluencerOrHost) {
      return res.status(400).json({
        message: "Influencer/Host are required",
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
      selectInfluencerOrHost,
      title,
      selectDeal: mongoose.Types.ObjectId.isValid(title) ? title : undefined,
      payment,
      freeStay,
      numberOfNights,
      startDate,
      endDate,
      userId,

      status: "pending",
      deliverableStatus: "pending",
    });

    const savedCollaboration = await newCollaboration.save();

    await userModel.findByIdAndUpdate(userId, {
      $push: { collaborations: savedCollaboration._id },
      $inc: { collaborationsTotal: 1 },

      $push: {
        redeemStars: {
          collaborationId: savedCollaboration._id,
        },
      },
    });

    await userModel.findByIdAndUpdate(selectInfluencerOrHost, {
      $push: {
        redeemStars: {
          collaborationId: savedCollaboration._id,
        },
      },
    });

    try {
      await createCollaborationNotification(savedCollaboration, userRole);
    } catch (notificationError) {}

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

export const createCollaborationWeb = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const creatorId = req.user?.id || req.user?._id || req.user?.sub;
    const creatorRole = req.user?.role;

    const {
      selectDeal,
      title,
      description,
      addAirbnbLink,
      inTimeAndDate,
      outTimeAndDate,
      compensation,
      guestCount,
      deliverables,
      startDate,
      endDate,
    } = req.body;

    // ---------- BASIC VALIDATION ----------
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target user ID",
      });
    }

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (!["host", "influencer"].includes(creatorRole)) {
      return res.status(403).json({
        success: false,
        message: "Only hosts and influencers can create collaborations",
      });
    }

    if (
      !title ||
      !description ||
      !inTimeAndDate ||
      !outTimeAndDate ||
      !compensation
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    if (creatorId.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot create collaboration with yourself",
      });
    }

    // ---------- TARGET USER ----------
    const targetUser = await userModel.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    // ---------- ROLE VALIDATION ----------
    if (creatorRole === targetUser.role) {
      return res.status(403).json({
        success: false,
        message: `${creatorRole} cannot create collaboration with another ${creatorRole}`,
      });
    }

    // ---------- DELIVERABLES ----------
    let finalDeliverables = [];

    if (deliverables) {
      if (typeof deliverables === "string") {
        try {
          finalDeliverables = JSON.parse(deliverables);
        } catch {
          return res.status(400).json({
            success: false,
            message: "Deliverables must be valid JSON",
          });
        }
      } else {
        finalDeliverables = deliverables;
      }

      finalDeliverables = finalDeliverables.map((d) => ({
        platform: d.platform,
        contentType: d.contentType,
        quantity: d.quantity || 1,
        urls: d.urls || [],
        platformFollowers: d.platformFollowers || {},
      }));
    }

    // ---------- DEAL RESOLUTION (OPTIONAL) ----------
    let resolvedDealId = null;

    if (selectDeal && mongoose.Types.ObjectId.isValid(selectDeal)) {
      const listing = await Listing.findById(selectDeal).select("_id");
      if (listing) {
        resolvedDealId = listing._id;
      }
    }

    // ---------- CREATE COLLABORATION ----------
    const newCollaboration = new Collaborations({
      userId: creatorId,
      selectInfluencerOrHost: targetUserId,
      selectDeal: resolvedDealId,

      title,
      description,
      addAirbnbLink,
      inTimeAndDate,
      outTimeAndDate,
      compensation,
      guestCount,
      deliverables: finalDeliverables,

      startDate: startDate || inTimeAndDate,
      endDate: endDate || outTimeAndDate,

      status: "pending",
      negotiationStatus: "pending",
      paymentStatus: "pending",
      deliverableStatus: "pending",

      // Auto-generate URLs from deliverables
      // socialMediaLinks: (function () {
      //   const links = [];
      //   console.log("Deliverables received:", finalDeliverables);

      //   if (finalDeliverables && Array.isArray(finalDeliverables)) {
      //     finalDeliverables.forEach((deliverable) => {
      //       console.log("Processing deliverable:", deliverable);
      //       for (let i = 0; i < deliverable.quantity; i++) {
      //         const link = {
      //           url: `https://${deliverable.platform.toLowerCase()}.example.com/${deliverable.contentType.toLowerCase()}-${i + 1}`,
      //         };
      //         links.push(link);
      //         console.log("Added URL:", link);
      //       }
      //     });
      //   }

      //   console.log("Generated URLs:", links);
      //   return links;
      // })(),
    });

    const savedCollaboration = await newCollaboration.save();

    // ---------- UPDATE USERS ----------
    await userModel.findByIdAndUpdate(creatorId, {
      $push: {
        collaborations: savedCollaboration._id,
        redeemStars: { collaborationId: savedCollaboration._id },
      },
      $inc: { collaborationsTotal: 1 },
    });

    await userModel.findByIdAndUpdate(targetUserId, {
      $push: {
        collaborations: savedCollaboration._id,
        redeemStars: { collaborationId: savedCollaboration._id },
      },
      $inc: { collaborationsTotal: 1 },
    });

    // ---------- POPULATE RESPONSE ----------
    const populatedCollaboration = await Collaborations.findById(
      savedCollaboration._id,
    )
      .populate(
        "userId",
        "name image role email fullAddress userName socialMediaLinks",
      )
      .populate({
        path: "selectInfluencerOrHost",
        select: "name image role email fullAddress userName socialMediaLinks",
        model: "User",
      })
      .populate(
        "selectDeal",
        "title description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount status",
      );

    return res.status(201).json({
      success: true,
      message: "Collaboration created successfully",
      data: populatedCollaboration,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
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
      .populate("userId", "name email role")
      .populate({
        path: "selectInfluencerOrHost",
        select: "name email role image userName fullAddress socialMediaLinks",
        model: "User",
      })
      // .populate({
      //   path: "selectDeal",
      //   select:
      //     "title description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount status",
      //   model: "Listing",
      // })
      .populate({
        path: "title",
        select:
          "title description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount status images",
        model: "Listing",
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Add payment information for collaborations with in_progress payment status
    const collaborationsWithPayment = await Promise.all(
      collaborations.map(async (collab) => {
        const collaborationObj = collab.toObject();

        if (collab.paymentStatus === "in_progress") {
          const payment = await Payment.findOne({
            title: collab._id,
            status: "IN_PROGRESS",
          }).select(
            "sessionId paymentIntentId amount status provider createdAt",
          );

          collaborationObj.payment = payment || null;
        } else {
          collaborationObj.payment = null;
        }

        return collaborationObj;
      }),
    );

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
        collaborations: collaborationsWithPayment,
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
      .populate("userId", "name email")
      .populate("title", "title images location amenities") // Populate title field
      .populate({
        path: "selectDeal",
        select:
          "title description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount status",
        model: "Listing", // Changed from Deal to Listing
        populate: {
          path: "title",
          select: "title images location amenities",
        },
      });

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
      data: [collaboration],
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

    // Remove corresponding redeemStars entries from both users
    await userModel.updateMany(
      {
        _id: {
          $in: [collaboration.userId, collaboration.selectInfluencerOrHost],
        },
      },
      {
        $pull: {
          redeemStars: {
            collaborationId: collaboration._id,
          },
        },
      },
    );

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

    let collaborations;
    let total;
    let filter = {};

    if (status) {
      filter.status = status;
    }

    if (userRole === "host") {
      filter.userId = userId;
      collaborations = await Collaborations.find(filter)
        .populate("userId", "name email role userName socialMediaLinks")
        .populate(
          "selectInfluencerOrHost",
          "name email role userName socialMediaLinks",
        )
        .populate("title", "title")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip(skip);

      total = await Collaborations.countDocuments(filter);
    } else if (userRole === "influencer") {
      filter.selectInfluencerOrHost = userId;
      collaborations = await Collaborations.find(filter)
        .populate("userId", "name email role userName socialMediaLinks")
        .populate(
          "selectInfluencerOrHost",
          "name email role userName socialMediaLinks",
        )
        .populate("title", "title")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip(skip);

      total = await Collaborations.countDocuments(filter);
    } else {
      // Other roles: Show both types
      filter.$or = [{ userId: userId }, { selectInfluencerOrHost: userId }];
      collaborations = await Collaborations.find(filter)
        .populate("userId", "name email role userName socialMediaLinks")
        .populate(
          "selectInfluencerOrHost",
          "name email role userName socialMediaLinks",
        )
        .populate(
          "selectDeal",
          "title description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount status",
        )
        .populate("title", "title")
        .populate(
          "title description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount status",
        )
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip(skip);

      total = await Collaborations.countDocuments(filter);
    }

    const collaborationsWithActions = await Promise.all(
      collaborations.map(async (collab) => {
        const collaborationObj = collab.toObject();
        const isCreator = collab.userId._id.toString() === userId;
        const isSelectedUser =
          collab.selectInfluencerOrHost._id.toString() === userId;

        if (collab.paymentStatus === "in_progress") {
          const payment = await Payment.findOne({
            title: collab._id,
            status: "IN_PROGRESS",
          }).select(
            "sessionId paymentIntentId amount status provider createdAt",
          );

          collaborationObj.payment = payment || null;
        } else {
          collaborationObj.payment = null;
        }

        return {
          ...collaborationObj,
          canAccept: isSelectedUser && collab.status === "pending",
          canReject: isSelectedUser && collab.status === "pending",
          canNegotiate: isSelectedUser && collab.status === "pending",
          canWithdraw:
            isCreator &&
            (collab.status === "pending" || collab.status === "negotiating"),
          role: isCreator ? "creator" : "selected",
        };
      }),
    );

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
    const { deliverables } = req.body;

    const userId = req.user?._id || req.user?.id || req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== "influencer") {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Only influencer can update collaboration",
      });
    }

    const collaboration = await Collaborations.findById(id);

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Collaboration not found",
      });
    }

    // Ensure influencer is selected
    if (
      !collaboration.selectInfluencerOrHost ||
      collaboration.selectInfluencerOrHost.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "You are not selected for this collaboration",
      });
    }

    if (!Array.isArray(deliverables) || deliverables.length === 0) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Provide at least one deliverable",
      });
    }

    // ================= VALIDATION =================
    // Check if requested deliverables exceed the allowed quantity
    for (const incomingDeliverable of deliverables) {
      const existingDeliverable = collaboration.deliverables.find(
        (d) =>
          d.platform === incomingDeliverable.platform &&
          d.contentType === incomingDeliverable.contentType,
      );

      if (existingDeliverable) {
        const existingUrls = existingDeliverable.urls || [];
        const newUrls = incomingDeliverable.urls || [];
        const totalUrls = [...existingUrls, ...newUrls].filter(
          (url) => url && url.trim() !== "",
        );

        if (totalUrls.length > existingDeliverable.quantity) {
          return res.status(400).json({
            success: false,
            error: true,
            message: `Cannot add more than ${existingDeliverable.quantity} deliverables for ${incomingDeliverable.platform} ${incomingDeliverable.contentType}`,
          });
        }
      }
    }

    // ================= UPDATE DELIVERABLES =================
    // Handle multiple deliverables based on quantity
    const updatedDeliverables = collaboration.deliverables.map(
      (existingDeliverable) => {
        const matchingDeliverable = deliverables.find(
          (incoming) =>
            incoming.platform === existingDeliverable.platform &&
            incoming.contentType === existingDeliverable.contentType,
        );

        if (
          matchingDeliverable &&
          matchingDeliverable.urls &&
          matchingDeliverable.urls.length > 0
        ) {
          return {
            platform: existingDeliverable.platform,
            contentType: existingDeliverable.contentType,
            quantity: existingDeliverable.quantity,
            urls: [
              ...(existingDeliverable.urls || []),
              ...matchingDeliverable.urls.filter(
                (url) => url && url.trim() !== "",
              ),
            ],
          };
        }

        return existingDeliverable;
      },
    );

    const updateData = {
      deliverables: updatedDeliverables,
      deliverableStatus: "in_progress",
    };

    // ================= CHECK COMPLETION =================
    let allCompleted = true;
    for (const deliverable of updatedDeliverables) {
      const requiredUrls = deliverable.quantity;
      const providedUrls = (deliverable.urls || []).filter(
        (url) => url && url.trim() !== "",
      );

      if (providedUrls.length < requiredUrls) {
        allCompleted = false;
        break;
      }
    }

    if (allCompleted) {
      updateData.deliverableStatus = "completed";
      updateData.status = "completed";
    }

    const updatedCollaboration = await Collaborations.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    ).populate([
      { path: "userId", select: "name email" },
      { path: "selectInfluencerOrHost", select: "name email" },
    ]);

    return res.status(200).json({
      success: true,
      error: false,
      message: "Collaboration updated successfully",
      data: updatedCollaboration,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Server error",
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

    // Get all user collaborations to show creation dates
    const allCollaborations = await Collaborations.find({
      $or: [{ userId: userId }, { selectInfluencerOrHost: userId }],
    }).select("createdAt status userId selectInfluencerOrHost");

    allCollaborations.forEach((collab, index) => {
      const month = new Date(collab.createdAt).toLocaleString("default", {
        month: "long",
      });
      const year = new Date(collab.createdAt).getFullYear();
      const isCreator = collab.userId.toString() === userId.toString();
    });

    // Get total collaborations for the year (as creator or partner)
    const totalCollaborations = await Collaborations.countDocuments({
      $or: [{ userId: userId }, { selectInfluencerOrHost: userId }],
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    const monthlyCollaborations = await Collaborations.aggregate([
      {
        $match: {
          $or: [
            { userId: new mongoose.Types.ObjectId(userId) },
            { selectInfluencerOrHost: new mongoose.Types.ObjectId(userId) },
          ],
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

    // Also try without date filter to see if date is the issue
    const monthlyCollaborationsNoDate = await Collaborations.aggregate([
      {
        $match: {
          $or: [
            { userId: new mongoose.Types.ObjectId(userId) },
            { selectInfluencerOrHost: new mongoose.Types.ObjectId(userId) },
          ],
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
    monthlyCollaborations.forEach((month) => {});

    // Initialize all 12 months with 0 collaborations
    const monthlyData = [];

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
      // Original collaboration fields that can be negotiated
      title,
      description,
      addAirbnbLink,
      inTimeAndDate,
      outTimeAndDate,
      compensation,
      guestCount,
      deliverables,
      payment,
      startDate,
      endDate,
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
    // Both host and influencer can create negotiations
    const currentUserId = req.user?._id || req.user?.id;
    const isHost = collaboration.userId.toString() === currentUserId;
    const isInfluencer =
      collaboration.selectInfluencerOrHost?.toString() === currentUserId;

    if (!isHost && !isInfluencer) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "You are not authorized to negotiate this collaboration",
      });
    }

    // Now populate for rest of the function
    await collaboration.populate("userId", "name email role");
    await collaboration.populate("selectInfluencerOrHost", "name email role");
    await collaboration.populate("selectDeal");
    await collaboration.populate("title", "title");

    // Update the existing collaboration with negotiated values
    const updateData = {
      // Use negotiated values or keep original
      title: title || collaboration.title,
      description: description || collaboration.description,
      addAirbnbLink: addAirbnbLink || collaboration.addAirbnbLink,
      inTimeAndDate: inTimeAndDate || collaboration.inTimeAndDate,
      outTimeAndDate: outTimeAndDate || collaboration.outTimeAndDate,
      compensation: compensation || collaboration.compensation,
      guestCount: guestCount || collaboration.guestCount,
      deliverables: deliverables || collaboration.deliverables,
      negotiationMessage:
        negotiationMessage || collaboration.negotiationMessage || "",

      // Negotiation-specific fields
      payment: payment || collaboration.payment || "",
      startDate: startDate || collaboration.startDate || inTimeAndDate,
      endDate: endDate || collaboration.endDate || outTimeAndDate,

      // Set status to indicate this is a negotiation
      status: "negotiating",
      negotiationStatus: "pending",
      paymentStatus: "pending",
      deliverableStatus: "pending",

      // Track who created this negotiation
      creatorNegotiation: {
        userId: currentUserId,
        name: isHost
          ? collaboration.userId?.name || "Host"
          : collaboration.selectInfluencerOrHost?.name || "Influencer",
        email: isHost
          ? collaboration.userId?.email
          : collaboration.selectInfluencerOrHost?.email,
        role: isHost ? "host" : "influencer",
        createdAt: new Date(),
      },
    };

    // Update the existing collaboration
    const updatedCollaboration = await Collaborations.findByIdAndUpdate(
      collaborationId,
      updateData,
      { new: true, runValidators: true },
    )
      .populate("userId", "name email")
      .populate("selectInfluencerOrHost", "name email")
      .populate("selectDeal", "description")
      .populate("title", "title");

    // ---------- NOTIFICATION ----------
    try {
      // Send notification to the other party
      const notificationRecipientId = isHost
        ? collaboration.selectInfluencerOrHost
        : collaboration.userId;
      const negotiatorName = isHost
        ? collaboration.userId?.name || "Host"
        : collaboration.selectInfluencerOrHost?.name || "Influencer";

      await createNegotiationNotification(
        notificationRecipientId,
        updatedCollaboration._id,
        negotiatorName,
        negotiationMessage || "New negotiation proposal",
        {
          title: title || collaboration.title,
          description: description || collaboration.description,
          addAirbnbLink: addAirbnbLink || collaboration.addAirbnbLink,
          inTimeAndDate: inTimeAndDate || collaboration.inTimeAndDate,
          outTimeAndDate: outTimeAndDate || collaboration.outTimeAndDate,
          compensation: compensation || collaboration.compensation,
          guestCount: guestCount || collaboration.guestCount,
          deliverables: deliverables || collaboration.deliverables,
          payment: payment || collaboration.payment,
          startDate: startDate || collaboration.startDate,
          endDate: endDate || collaboration.endDate,
        },
      );
    } catch (notificationError) {
      // Continue with response even if notification fails
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Negotiation updated successfully",
      data: updatedCollaboration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error updating negotiation",
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

    // Initialize response_data object
    let response_data = {};

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

    // Update negotiation status (convert "accept" to "accepted")
    const finalStatus = actualStatus === "accept" ? "accepted" : actualStatus;

    // Only update negotiationStatus and rejectReason, preserve all other data
    negotiation.set("negotiationStatus", finalStatus);
    negotiation.negotiationStatus = finalStatus;

    // If rejected, save the reason in the separate rejectReason field
    if (finalStatus === "rejected") {
      negotiation.rejectReason = actualReason || "No reason provided";
    }

    // For acceptance, create new collaboration with negotiated terms
    if (finalStatus === "accepted" || finalStatus === "accept") {
      // Create new collaboration based on accepted negotiation terms
      const newCollaboration = new Collaborations({
        userId: negotiation.userId,
        selectInfluencerOrHost: negotiation.selectInfluencerOrHost,

        // Copy all negotiated terms from the negotiation data
        title: negotiation.title,
        description: negotiation.description,
        addAirbnbLink: negotiation.addAirbnbLink,
        inTimeAndDate: negotiation.inTimeAndDate,
        outTimeAndDate: negotiation.outTimeAndDate,
        compensation: negotiation.compensation,
        guestCount: negotiation.guestCount,
        deliverables: negotiation.deliverables,

        // Use negotiated payment and other data from the negotiation
        payment: negotiation.payment || "",
        content: negotiation.content || "",
        additionalRequirements: negotiation.additionalRequirements || "",
        startDate: negotiation.startDate,
        endDate: negotiation.endDate,

        // Set as active collaboration
        status: "ongoing",
        negotiationStatus: "accepted",
        paymentStatus: "pending",
        deliverableStatus: "pending",

        // Reference the negotiation that was accepted
        originalCollaborationId: negotiation.originalCollaborationId,
      });

      const savedNewCollaboration = await newCollaboration.save();

      // Update users' collaboration arrays
      await userModel.findByIdAndUpdate(negotiation.userId, {
        $push: {
          collaborations: savedNewCollaboration._id,
          redeemStars: { collaborationId: savedNewCollaboration._id },
        },
        $inc: { collaborationsTotal: 1 },
      });

      await userModel.findByIdAndUpdate(negotiation.selectInfluencerOrHost, {
        $push: {
          collaborations: savedNewCollaboration._id,
          redeemStars: { collaborationId: savedNewCollaboration._id },
        },
        $inc: { collaborationsTotal: 1 },
      });

      // Send notification about new collaboration creation
      try {
        await createCollaborationNotification(savedNewCollaboration, "host");
      } catch (notificationError) {
        // Continue even if notification fails
      }

      // Update response data to include new collaboration
      response_data.newCollaboration = savedNewCollaboration.toObject();
    }

    await negotiation.save();

    // Explicitly ensure negotiationStatus is included in response (after save)
    response_data = negotiation.toObject();
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
    let updateData = {};
    if (action === "accept") {
      updateData.status = "accepted";
      updateData.negotiationStatus = "accepted";
    } else if (action === "reject") {
      updateData.status = "rejected";
      updateData.negotiationStatus = "rejected";
      updateData.rejectReason = reason || "No reason provided";
    }

    // Fix socialMediaLinks format if needed (migration from string to array)
    if (collaboration.socialMediaLinks) {
      const platforms = [
        "instagram",
        "facebook",
        "twitter",
        "youtube",
        "tiktok",
      ];
      const fixedSocialMediaLinks = {};

      platforms.forEach((platform) => {
        const currentValue = collaboration.socialMediaLinks[platform];
        if (typeof currentValue === "string") {
          // Convert string to array format
          fixedSocialMediaLinks[platform] =
            currentValue && currentValue.trim() !== ""
              ? [{ url: currentValue, contentType: "", postDate: new Date() }]
              : [];
        } else if (Array.isArray(currentValue)) {
          // Keep array format but filter invalid items
          fixedSocialMediaLinks[platform] = currentValue.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              item.url &&
              item.url.trim() !== "",
          );
        } else {
          // Default to empty array
          fixedSocialMediaLinks[platform] = [];
        }
      });

      updateData.socialMediaLinks = fixedSocialMediaLinks;
    }

    // Update without validation to avoid schema conflicts during migration
    const updatedCollaboration = await Collaborations.findByIdAndUpdate(
      collaborationId,
      updateData,
      { new: true, runValidators: false },
    ).populate([
      {
        path: "userId",
        select: "name email",
      },
      {
        path: "selectInfluencerOrHost",
        select: "name email",
      },
    ]);

    // Send notification to other party
    try {
      const notificationRecipientId =
        updatedCollaboration.userId.toString() === userId
          ? updatedCollaboration.selectInfluencerOrHost
          : updatedCollaboration.userId;
      const updaterName =
        updatedCollaboration.userId.toString() === userId
          ? updatedCollaboration.userId?.name || "Host"
          : updatedCollaboration.selectInfluencerOrHost?.name || "Influencer";

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
      data: updatedCollaboration,
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
      .populate(
        "selectInfluencerOrHost",
        "name email role userName socialMediaLinks image fullAddress",
      )
      .populate(
        "userId",
        "name email role userName socialMediaLinks image fullAddress",
      )
      .populate("title", "title images location amenities")
      .populate({
        path: "selectDeal",
        select:
          "title description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount status",
        model: "Listing",
        populate: {
          path: "title",
          select: "title images location amenities",
        },
      })
      .select(
        "selectDeal description addAirbnbLink inTimeAndDate outTimeAndDate compensation guestCount deliverables status negotiationStatus paymentStatus socialMediaLinks negotiationMessage",
      )
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
