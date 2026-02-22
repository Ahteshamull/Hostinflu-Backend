import mongoose from "mongoose";
import Gift from "../schema/gift.modal.js";
import userModel from "../../auth/schema/auth.modal.js";
import Collaborations from "../../collaboration/schema/collaboration.modal.js";

export const createRedeem = async (req, res) => {
  try {
    const hostId = req.user?._id || req.user?.id || req.user?.userId;
    const hostRole = req.user?.role;
    const { id: collaborationId } = req.params;
    const { stars } = req.body;

    if (!hostId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!collaborationId || !mongoose.Types.ObjectId.isValid(collaborationId)) {
      return res.status(400).json({ message: "Invalid collaboration ID" });
    }

    if (hostRole !== "host") {
      return res.status(403).json({ message: "Only host can create redeem" });
    }

    const collaboration = await Collaborations.findById(collaborationId)
      .populate("userId", "_id name role")
      .populate("selectInfluencerOrHost", "_id name role")
      .populate("selectDeal", "compensation");

    if (!collaboration) {
      return res.status(404).json({ message: "Collaboration not found" });
    }

    // Only allow gifts for completed collaborations
    if (collaboration.status !== "completed") {
      return res.status(400).json({
        message: "Only completed collaborations can receive gifts",
        currentStatus: collaboration.status,
        requiredStatus: "completed",
      });
    }

    // Fix: Check if user is either the collaboration creator or the partner (host/influencer)
    const collaborationHostId =
      collaboration.userId?._id?.toString() ||
      collaboration.userId?.toString() ||
      collaboration.userId;

    const collaborationPartnerId =
      collaboration.selectInfluencerOrHost?._id?.toString() ||
      collaboration.selectInfluencerOrHost?.toString() ||
      collaboration.selectInfluencerOrHost;

    // Allow either the collaboration creator or the partner to create redeem (for host to give gift to influencer)
    const isCollaborationHost =
      collaborationHostId.toString() === hostId.toString();
    const isCollaborationPartner =
      collaborationPartnerId.toString() === hostId.toString();

    if (!isCollaborationHost && !isCollaborationPartner) {
      return res.status(403).json({
        message: "Only collaboration participants can create redeem",
        debug: {
          tokenHostId: hostId.toString(),
          collaborationHostId: collaborationHostId.toString(),
          collaborationPartnerId: collaborationPartnerId.toString(),
          isCreator: isCollaborationHost,
          isPartner: isCollaborationPartner,
        },
      });
    }

    // Determine who should receive the gift (influencer gets gift from host)
    let influencerId;
    let giftRecipientName;

    // If current user is the host, gift goes to the influencer
    if (
      collaboration.selectInfluencerOrHost?.role === "host" &&
      collaborationPartnerId.toString() === hostId.toString()
    ) {
      // Current user is host, gift goes to collaboration creator (influencer)
      influencerId = collaborationHostId.toString();
      giftRecipientName = collaboration.userId?.name;
    } else if (
      collaboration.userId?.role === "host" &&
      collaborationHostId.toString() === hostId.toString()
    ) {
      // Current user is host (creator), gift goes to partner (influencer)
      influencerId = collaborationPartnerId.toString();
      giftRecipientName = collaboration.selectInfluencerOrHost?.name;
    } else {
      // Default: gift goes to the influencer (not host)
      if (collaboration.userId?.role === "influencer") {
        influencerId = collaborationHostId.toString();
        giftRecipientName = collaboration.userId?.name;
      } else if (collaboration.selectInfluencerOrHost?.role === "influencer") {
        influencerId = collaborationPartnerId.toString();
        giftRecipientName = collaboration.selectInfluencerOrHost?.name;
      } else {
        // Fallback to partner
        influencerId = collaborationPartnerId.toString();
        giftRecipientName = collaboration.selectInfluencerOrHost?.name;
      }
    }

    if (!influencerId) {
      return res.status(400).json({
        message: "Influencer not found",
        debug: {
          collaborationUserId: collaboration.userId,
          collaborationPartnerId: collaboration.selectInfluencerOrHost,
          hostId: hostId,
        },
      });
    }

    // Validate influencer exists
    const influencerExists = await userModel.findById(influencerId);
    if (!influencerExists) {
      return res.status(400).json({
        message: "Influencer user not found in database",
        influencerId: influencerId,
      });
    }

    const alreadyGifted = await Gift.exists({
      collaborationId: collaboration._id,
      fromUser: hostId,
      toUser: influencerId,
    });

    if (alreadyGifted) {
      return res.status(400).json({ message: "Redeem already created" });
    }

    const defaultStars =
      collaboration.selectDeal?.compensation?.numberOfNights || 0;
    const finalStars = Number.isFinite(Number(stars))
      ? Number(stars)
      : defaultStars;

    if (!finalStars || finalStars <= 0) {
      return res.status(400).json({
        message: "Invalid stars amount",
      });
    }

    const gift = await Gift.create({
      collaborationId: collaboration._id,
      fromUser: hostId,
      toUser: influencerId,
      stars: finalStars,
    });

    // Update influencer's redeem stars and night credits
    try {
      await userModel.findByIdAndUpdate(influencerId, {
        $push: {
          redeemStars: {
            collaborationId: collaboration._id,
            stars: finalStars,
          },
        },
        $inc: { nightCredits: finalStars },
      });
    } catch (updateError) {
      console.error("Error updating user redeem stars:", updateError);
      // If nightCredits field doesn't exist, try without it
      await userModel.findByIdAndUpdate(influencerId, {
        $push: {
          redeemStars: {
            collaborationId: collaboration._id,
            stars: finalStars,
          },
        },
      });
    }

    const updatedInfluencer = await userModel
      .findById(influencerId)
      .select("name email role nightCredits redeemStars");

    return res.status(201).json({
      success: true,
      message: "Redeem created successfully",
      data: {
        gift,
        collaborationId: collaboration._id,
        influencer: updatedInfluencer,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
