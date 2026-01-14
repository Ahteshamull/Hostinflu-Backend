import userModel from "../../auth/schema/auth.modal.js";
import Notification from "../../notification/schema/notification.modal.js";

export const withdrawRedeemStars = async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    // Get collaboration ID from URL parameters
    const { collaborationId } = req.params;

    if (!collaborationId) {
      return res.status(400).json({
        success: false,
        message: "Collaboration ID is required",
      });
    }

    // Find user
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find the specific redeem star entry for this collaboration
    const redeemStarEntry = user.redeemStars.find(
      (item) =>
        item.collaborationId &&
        item.collaborationId.toString() === collaborationId
    );

    if (!redeemStarEntry) {
      return res.status(404).json({
        success: false,
        message: "No redeem stars found for this collaboration",
      });
    }

    // Create notification for the collaboration withdrawal
    try {
      await Notification.create({
        type: "withdraw",
        title: "Stars Withdrawn",
        message: `You withdrew ${
          redeemStarEntry.stars
        } stars from collaboration with ${
          redeemStarEntry.collaborationId.userId?.name || "Host"
        }`,
        collaborationId: redeemStarEntry.collaborationId._id,
        receiverId: userId,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    // Remove the specific redeem star entry
    user.redeemStars = user.redeemStars.filter(
      (item) =>
        !(
          item.collaborationId &&
          item.collaborationId.toString() === collaborationId
        )
    );

    // Save user without triggering validation
    await userModel.findByIdAndUpdate(userId, {
      redeemStars: user.redeemStars,
    });

    res.status(200).json({
      success: true,
      message: "Stars withdrawn successfully",
      data: {
        withdrawnStars: redeemStarEntry.stars,
        collaborationId: redeemStarEntry.collaborationId._id,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error withdrawing stars",
    });
  }
};
