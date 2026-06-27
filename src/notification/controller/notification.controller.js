import Notification from "../schema/notification.modal.js";
import userModel from "../../auth/schema/auth.modal.js";
import { sendEmail } from "../../config/email.config.js";

const listNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, isRead } = req.query;
    const filter = {};

    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
    }

    const notifications = await Notification.find(filter)
      .populate("listingId", "title")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      notifications,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};

const getCollaborationNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, isRead } = req.query;

    // Get userId and role from token
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "User ID or role not found in token",
        error: "Authentication required",
      });
    }

    // Filter notifications for the current user
    const filter = {
      type: "collaboration_request",
      receiverId: userId, // Only show notifications for this user
    };
    const filter2 = {
      type: "negotiation",
      receiverId: userId, // Only show notifications for this user
    };
    const filter3 = {
      type: "influencer_city_visit",
      receiverId: userId, // Only show notifications for this user
    };

    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
      filter2.isRead = isRead === "true";
      filter3.isRead = isRead === "true";
    }

    const notifications = await Notification.find({
      $or: [filter, filter2, filter3],
    })
      .populate("collaborationId", "selectDeal payment")
      .populate("createdBy", "name email image role")
      .populate("receiverId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments({
      $or: [filter, filter2, filter3],
    });

    res.status(200).json({
      success: true,
      error: false,
      message: "Collaboration notifications retrieved successfully",
      data: {
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
          limit: parseInt(limit),
        },
        notifications,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error fetching collaboration notifications",
      error: error.message,
    });
  }
};

const markNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.status(200).json({
      message: "Notification updated successfully",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating notification",
      error: error.message,
    });
  }
};

const markAllNotifications = async (req, res) => {
  try {
    const { isRead } = req.body;

    // Get user ID from authenticated user (from JWT token)
    const userId = req.user?.id || req.user?._id;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    await Notification.updateMany(
      { receiverId: userId }, // Only update notifications for the authenticated user
      { isRead },
    );

    res.status(200).json({
      message: `All notifications marked as ${isRead ? "read" : "unread"}`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating notifications",
      error: error.message,
    });
  }
};

// Internal helper function for creating collaboration notifications
const createCollaborationNotification = async (
  collaborationData,
  creatorRole,
) => {
  try {
    const { selectInfluencerOrHost, userId, _id } = collaborationData;

    // Fetch both users to get their email addresses and names
    const sender = await userModel.findById(userId);
    const receiver = await userModel.findById(selectInfluencerOrHost);

    if (!sender || !receiver) {
      throw new Error("Sender or receiver not found");
    }

    // Determine receiver based on creator role
    let receiverRole, receiverTitle, receiverMessage;
    let senderTitle, senderMessage;

    if (creatorRole === "host") {
      // Host creates collaboration -> notify influencer
      receiverRole = "influencer";
      receiverTitle = "New Collaboration Request";
      receiverMessage = `A host (${sender.name}) has sent you a collaboration request. Please review and respond.`;
      
      senderTitle = "Collaboration Request Sent";
      senderMessage = `You have successfully sent a collaboration request to ${receiver.name}.`;
    } else if (creatorRole === "influencer") {
      // Influencer creates collaboration -> notify host
      receiverRole = "host";
      receiverTitle = "New Collaboration Request";
      receiverMessage = `An influencer (${sender.name}) has sent you a collaboration request. Please review and respond.`;
      
      senderTitle = "Collaboration Request Sent";
      senderMessage = `You have successfully sent a collaboration request to ${receiver.name}.`;
    } else {
      throw new Error("Invalid creator role for notification");
    }

    // 1. Create notification for the receiver
    const receiverNotification = new Notification({
      type: "collaboration_request",
      title: receiverTitle,
      message: receiverMessage,
      collaborationId: _id,
      createdBy: userId,
      receiverId: selectInfluencerOrHost,
      receiverRole,
      isRead: false,
    });
    const savedReceiverNotification = await receiverNotification.save();

    // 2. Create notification for the sender
    const senderNotification = new Notification({
      type: "collaboration_request",
      title: senderTitle,
      message: senderMessage,
      collaborationId: _id,
      createdBy: userId,
      receiverId: userId,
      receiverRole: creatorRole,
      isRead: false,
    });
    const savedSenderNotification = await senderNotification.save();

    // 3. Send email to the receiver
    try {
      await sendEmail({
        email: receiver.email,
        subject: receiverTitle,
        message: receiverMessage,
      });
    } catch (error) {
      console.error("Failed to send email to receiver:", error);
    }

    // 4. Send email to the sender
    try {
      await sendEmail({
        email: sender.email,
        subject: senderTitle,
        message: senderMessage,
      });
    } catch (error) {
      console.error("Failed to send email to sender:", error);
    }

    return { savedReceiverNotification, savedSenderNotification };
  } catch (error) {
    throw error;
  }
};

export {
  listNotifications,
  getCollaborationNotifications,
  markNotification,
  markAllNotifications,
  createCollaborationNotification,
};
