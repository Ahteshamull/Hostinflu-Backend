import Notification from "../schema/notification.modal.js";

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

    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
      filter2.isRead = isRead === "true";
    }

    const notifications = await Notification.find({
      $or: [filter, filter2],
    })
      .populate("collaborationId", "selectDeal payment")
      .populate("createdBy", "name email")
      .populate("receiverId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments({
      $or: [filter, filter2],
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
      { new: true }
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

    await Notification.updateMany({}, { isRead });

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
  creatorRole
) => {
  try {
    const { selectInfluencerOrHost, userId, _id } = collaborationData;

    // Determine receiver based on creator role
    let receiverId, receiverRole, title, message;

    if (creatorRole === "host") {
      // Host creates collaboration -> notify influencer
      receiverId = selectInfluencerOrHost;
      receiverRole = "influencer";
      title = "New Collaboration Request";
      message =
        "A host has sent you a collaboration request. Please review and respond.";
    } else if (creatorRole === "influencer") {
      // Influencer creates collaboration -> notify host
      receiverId = selectInfluencerOrHost;
      receiverRole = "host";
      title = "New Collaboration Request";
      message =
        "An influencer has sent you a collaboration request. Please review and respond.";
    } else {
      throw new Error("Invalid creator role for notification");
    }

    // Create notification
    const notification = new Notification({
      type: "collaboration_request",
      title,
      message,
      collaborationId: _id,
      createdBy: userId,
      receiverId,
      receiverRole,
      isRead: false,
    });

    const savedNotification = await notification.save();

    return savedNotification;
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
