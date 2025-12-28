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

export { listNotifications, markNotification, markAllNotifications };
