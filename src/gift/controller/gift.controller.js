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

    if (collaboration.status !== "completed") {
      return res
        .status(400)
        .json({ message: "Collaboration must be completed" });
    }

    const collaborationHostId =
      collaboration.userId?._id?.toString() || collaboration.userId?.toString();
    if (collaborationHostId !== hostId.toString()) {
      return res
        .status(403)
        .json({ message: "Only collaboration host can create redeem" });
    }

    const influencerId =
      collaboration.selectInfluencerOrHost?._id?.toString() ||
      collaboration.selectInfluencerOrHost?.toString();

    if (!influencerId) {
      return res.status(400).json({ message: "Influencer not found" });
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

    await userModel.findByIdAndUpdate(influencerId, {
      $push: {
        redeemStars: {
          collaborationId: collaboration._id,
          stars: finalStars,
        },
      },
      $inc: { nightCredits: finalStars },
    });

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
