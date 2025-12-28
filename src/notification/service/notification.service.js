import Notification from "../schema/notification.modal.js";

const createNotification = async (
  type,
  title,
  message,
  listingId = null,
  createdBy = null,
  receiverRole = "admin"
) => {
  try {
    const notification = new Notification({
      type,
      title,
      message,
      listingId,
      createdBy,
      receiverRole,
      isRead: false,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

const notifyAdminOnListingCreated = async (listingId, userId, listingTitle) => {
  return await createNotification(
    "listing_created",
    "New Listing Created",
    `A new listing "${listingTitle}" has been created and is pending approval.`,
    listingId,
    userId,
    "admin"
  );
};

const notifyAdminOnUserCreated = async (userId, userName, userEmail) => {
  return await createNotification(
    "user_created",
    "New User Registered",
    `A new user "${userName}" (${userEmail}) has registered successfully.`,
    null,
    userId,
    "admin"
  );
};

export {
  createNotification,
  notifyAdminOnListingCreated,
  notifyAdminOnUserCreated,
};
