import Collaborations from "../schema/collaboration.modal.js";
import { createCollaborationNotification } from "../../notification/controller/notification.controller.js";

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

    // Role-based validation
    if (userRole === "host") {
      // Host selects an influencer
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
