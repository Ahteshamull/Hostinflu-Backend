export const totalUser = async (req, res) => {
  try {
    // Get total count of users
    const totalUsers = await userModel.countDocuments({});

    return res.status(200).json({
      success: true,
      message: "Total users retrieved successfully",
      data: {
        totalUsers,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve total users",
      error: error.message,
    });
  }
};

export const userGrowth = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Create date range for the specified year
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31); // December 31st

    // Aggregate users by month for the specified year
    const monthlyGrowth = await userModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Initialize all 12 months with 0 count
    const monthlyData = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 1; i <= 12; i++) {
      const monthData = monthlyGrowth.find((item) => item._id === i);
      monthlyData.push({
        month: months[i - 1],
        monthNumber: i,
        count: monthData ? monthData.count : 0,
      });
    }

    return res.status(200).json({
      success: true,
      message: "User growth data retrieved successfully",
      data: {
        year,
        monthlyData,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user growth data",
      error: error.message,
    });
  }
};
