import paymentModal from "../../payment/schema/payment.modal.js";

// Get all transactions (for admin)
export const allTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      startDate,
      endDate,
    } = req.query;

    // Convert pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Get transactions with pagination
    const transactions = await paymentModal
      .find(filter)
      .populate("userId", "name email")
      .populate("title", "title status")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    // Get total count
    const total = await paymentModal.countDocuments(filter);

    // Get meta data
    const totalRevenue = await paymentModal.aggregate([
      {
        $match: {
          status: "completed",
          ...(filter.status && { status: filter.status }),
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const transactionStats = await paymentModal.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return res.status(200).json({
      success: true,
      message: "All transactions retrieved successfully",
      data: {
        transactions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
        meta: {
          totalRevenue: totalRevenue[0]?.total || 0,
          transactionStats,
          filterApplied: {
            status: status || null,
            userId: userId || null,
            startDate: startDate || null,
            endDate: endDate || null,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error getting all transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting all transactions",
      error: error.message,
    });
  }
};

export const singleTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate transaction ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    // Get single transaction with populated fields
    const transaction = await paymentModal
      .findById(id)
      .populate("userId", "name email")
      .populate("title", "title status");

    // Check if transaction exists
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Error getting single transaction:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting single transaction",
      error: error.message,
    });
  }
};

export const userPersonalTransaction = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    // Get user ID from authenticated user (from JWT token)
    const userId = req.user?.id || req.user?._id;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Convert pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter for current user's transactions
    const filter = { userId };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Get user's transactions with pagination
    const transactions = await paymentModal
      .find(filter)
      .populate("userId", "name image role")
      .populate("selectInfluencerOrHost", "name image role")
      .populate({
        path: "title",
        populate: {
          path: "title", // Populate the nested title field
          select: "title", // Only get the title field
        },
      })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    // Get total count for user's transactions
    const total = await paymentModal.countDocuments(filter);

    // Get user's total revenue (completed transactions only)
    const totalRevenue = await paymentModal.aggregate([
      {
        $match: {
          userId: userId,
          status: "completed",
          ...(status && { status: status }),
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Get user's transaction statistics
    const transactionStats = await paymentModal.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return res.status(200).json({
      success: true,
      message: "User transactions retrieved successfully",
      data: {
        transactions: transactions.map((transaction) => ({
          ...transaction.toObject(),
          userId: {
            _id: transaction.userId?._id,
            name: transaction.userId?.name,
            image: transaction.userId?.image,
            role: transaction.userId?.role,
          },
          selectInfluencerOrHost: {
            _id: transaction.selectInfluencerOrHost?._id,
            name: transaction.selectInfluencerOrHost?.name,
            image: transaction.selectInfluencerOrHost?.image,
            role: transaction.selectInfluencerOrHost?.role,
          },
          title: transaction.title?.title || "No title",
          paymentBy: transaction.userId?.name, // Payment by user name
          paymentTo: transaction.selectInfluencerOrHost?.name, // Payment to user name
          paymentAmount: transaction.amount, // Payment amount
          paymentCurrency: transaction.currency || "USD", // Payment currency
          paymentStatus: transaction.status, // Payment status
          paymentDate: transaction.createdAt, // Payment date
        })),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
        meta: {
          totalRevenue: totalRevenue[0]?.total || 0,
          transactionStats,
          filterApplied: {
            status: status || null,
            startDate: startDate || null,
            endDate: endDate || null,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error getting user transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting user transactions",
      error: error.message,
    });
  }
};

export const userPersonalSingleTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user ID from authenticated user (from JWT token)
    const userId = req.user?.id || req.user?._id;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Validate transaction ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    // Get single transaction and verify it belongs to the authenticated user
    const transaction = await paymentModal
      .findOne({ _id: id, userId: userId })
      .populate("title", "title status");

    // Check if transaction exists and belongs to the user
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Error getting user single transaction:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting user single transaction",
      error: error.message,
    });
  }
};
