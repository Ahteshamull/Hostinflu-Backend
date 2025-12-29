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
