import Deal from "../schema/deal.modal.js";

const createDeal = async (req, res) => {
  try {
    const {
      dealTitle,
      description,
      selectListing,
      addAirbnbLink,
      inTimeAndDate,
      outTimeAndDate,
      compensation,
      deliverables,
    } = req.body || req.fields;

    // Get userId from token
    const userId = req.user?.id || req.user?.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "User ID not found in token",
        error: "Authentication required",
      });
    }

    // Validate compensation
    if (
      !compensation ||
      (!compensation.nightCredits && !compensation.directPayment)
    ) {
      return res.status(400).json({
        message: "At least one compensation type is required",
        error: "Invalid compensation",
      });
    }

    // Validate deliverables
    if (!deliverables || deliverables.length === 0) {
      return res.status(400).json({
        message: "At least one deliverable is required",
        error: "Invalid deliverables",
      });
    }

    const newDeal = new Deal({
      dealTitle,
      description,
      selectListing,
      addAirbnbLink,
      inTimeAndDate,
      outTimeAndDate,
      compensation,
      deliverables,
      userId,
    });

    const savedDeal = await newDeal.save();

    res.status(201).json({
      success: true,
      error: false,
      message: "Deal created successfully",
      data: {
        deal: savedDeal,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error creating deal",
      error: error.message,
    });
  }
};

const getAllDeals = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const deals = await Deal.find(filter)
      .populate("dealTitle", "title")
      .populate("selectListing", "title location")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Deal.countDocuments(filter);

    res.status(200).json({
      success: true,
      error: false,
      message: "Deals retrieved successfully",
      data: {
        deals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving deals",
      error: error.message,
    });
  }
};

const getSingleDeal = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await Deal.findById(id)
      .populate("dealTitle", "title")
      .populate("selectListing", "title location images")
      .populate("userId", "name email");

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Deal retrieved successfully",
      data: {
        deal,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving deal",
      error: error.message,
    });
  }
};

const updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedDeal = await Deal.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("dealTitle", "title")
      .populate("selectListing", "title location")
      .populate("userId", "name email");

    if (!updatedDeal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Deal updated successfully",
      data: {
        deal: updatedDeal,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error updating deal",
      error: error.message,
    });
  }
};

export { createDeal, getAllDeals, getSingleDeal, updateDeal };
