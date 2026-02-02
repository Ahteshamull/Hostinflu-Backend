import Payment from "../../payment/schema/payment.modal.js";

// Admin function - only admin and super admin can see all earnings
export const totalEarning = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    // Get user ID and role from authenticated user (from JWT token)
    const userId = req.user?.id || req.user?._id;
    const userRole = req.user?.role;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Only allow admin and super admin
    if (userRole !== "admin" && userRole !== "superAdmin") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only admin and super admin can access this resource.",
      });
    }

    // Convert pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter - admin can see all earnings
    const filter = {};

    // Only include completed or held payments
    filter.status = { $in: ["SUCCESS", "IN_PROGRESS || HOLD"] };

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

    // Get all payments (earnings) with pagination
    const payments = await Payment.find(filter)
      .populate("title", "title status")
      .populate("selectInfluencerOrHost", "name email")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    // Get total count for all payments
    const total = await Payment.countDocuments(filter);

    // Calculate total earnings by status
    const totalEarnings = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get overall total earnings (completed payments)
    const overallTotal = await Payment.aggregate([
      { $match: { status: { $in: ["SUCCESS", "IN_PROGRESS || HOLD"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Get monthly earnings trend
    const monthlyEarnings = await Payment.aggregate([
      {
        $match: {
          status: { $in: ["SUCCESS", "IN_PROGRESS || HOLD"] },
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    // Get today's earnings
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayEarnings = await Payment.aggregate([
      {
        $match: {
          status: { $in: ["SUCCESS", "IN_PROGRESS || HOLD"] },
          createdAt: {
            $gte: todayStart,
            $lte: todayEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "All earnings retrieved successfully",
      data: {
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
        meta: {
          totalEarnings: overallTotal[0]?.total || 0,
          todayEarnings: todayEarnings[0]?.total || 0,
          todayEarningsCount: todayEarnings[0]?.count || 0,
          earningsByStatus: totalEarnings,
          monthlyEarnings,
          filterApplied: {
            status: status || null,
            startDate: startDate || null,
            endDate: endDate || null,
          },
        },
        earnings: payments,
      },
    });
  } catch (error) {
    console.error("Error getting all earnings:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting all earnings",
      error: error.message,
    });
  }
};

// Get single earning by ID (admin only)
export const getSingleEarning = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user ID and role from authenticated user (from JWT token)
    const userId = req.user?.id || req.user?._id;
    const userRole = req.user?.role;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Only allow admin and super admin
    if (userRole !== "admin" && userRole !== "superAdmin") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only admin and super admin can access this resource.",
      });
    }

    // Validate earning ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Earning ID is required",
      });
    }

    // Get single earning with populated fields
    const earning = await Payment.findById(id)
      .populate("title", "title status")
      .populate("selectInfluencerOrHost", "name email")
      .populate("userId", "name email");

    // Check if earning exists
    if (!earning) {
      return res.status(404).json({
        success: false,
        message: "Earning not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Earning retrieved successfully",
      data: earning,
    });
  } catch (error) {
    console.error("Error getting single earning:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting single earning",
      error: error.message,
    });
  }
};
