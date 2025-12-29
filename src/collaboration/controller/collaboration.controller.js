import Collaborations from "../schema/collaboration.modal.js";

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
