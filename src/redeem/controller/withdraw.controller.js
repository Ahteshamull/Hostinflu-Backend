import userModel from "../../auth/schema/auth.modal.js";
import Notification from "../../notification/schema/notification.modal.js";
import Collaborations from "../../collaboration/schema/collaboration.modal.js";

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
        item.collaborationId.toString() === collaborationId,
    );

    if (!redeemStarEntry) {
      return res.status(404).json({
        success: false,
        message: "No redeem stars found for this collaboration",
      });
    }

    // Get the full collaboration data with populated user info
    const collaboration = await Collaborations.findById(collaborationId)
      .populate("userId", "name email role")
      .populate("selectInfluencerOrHost", "name email role")
      .populate("selectDeal", "description compensation");

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found",
      });
    }

    // Create notifications for both parties
    try {
      // Notification for the user who is withdrawing (influencer)
      await Notification.create({
        type: "withdraw",
        title: "Stars Withdrawn",
        message: `You withdrew ${
          redeemStarEntry.stars
        } stars from collaboration with ${
          collaboration.userId?.name || "Host"
        }`,
        collaborationId: collaboration._id,
        receiverId: userId,
        isRead: false,
        createdAt: new Date(),
      });

      // Notification for the host (collaboration creator)
      const hostId = collaboration.userId?._id || collaboration.userId;

      if (hostId && hostId.toString() !== userId) {
        await Notification.create({
          type: "withdraw",
          title: "Stars Withdrawn by Influencer",
          message: `An influencer withdrew ${redeemStarEntry.stars} stars from your collaboration`,
          collaborationId: collaboration._id,
          receiverId: hostId,
          isRead: false,
          createdAt: new Date(),
        });
      }
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    // Remove the specific redeem star entry
    user.redeemStars = user.redeemStars.filter(
      (item) =>
        !(
          item.collaborationId &&
          item.collaborationId.toString() === collaborationId
        ),
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
        collaboration: {
          _id: collaboration._id,
          status: collaboration.status,
          payment: collaboration.payment,
          createdAt: collaboration.createdAt,
          creator: collaboration.userId
            ? {
                _id: collaboration.userId._id,
                name: collaboration.userId.name,
                email: collaboration.userId.email,
                role: collaboration.userId.role,
              }
            : null,
          target: collaboration.selectInfluencerOrHost
            ? {
                _id: collaboration.selectInfluencerOrHost._id,
                name: collaboration.selectInfluencerOrHost.name,
                email: collaboration.selectInfluencerOrHost.email,
                role: collaboration.selectInfluencerOrHost.role,
              }
            : null,
          deal: collaboration.selectDeal
            ? {
                _id: collaboration.selectDeal._id,
                description: collaboration.selectDeal.description,
                compensation: collaboration.selectDeal.compensation,
              }
            : null,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error withdrawing stars",
    });
  }
};
