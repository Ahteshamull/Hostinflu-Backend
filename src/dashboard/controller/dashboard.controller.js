import userModel from "../../auth/schema/auth.modal.js";
import Collaborations from "../../collaboration/schema/collaboration.modal.js";
import { Listing } from "../../listing/schema/listing.modal.js";
import Deal from "../../deals/schema/deal.modal.js";

export const dashboard = async (req, res) => {
  try {
    // Get all total counts in parallel
    const [
      totalUsers,
      totalCollaborations,
      totalListings,
      totalDeals,
      recentUsers,
    ] = await Promise.all([
      userModel.countDocuments({}),
      Collaborations.countDocuments({}),
      Listing.countDocuments({}),
      Deal.countDocuments({}),
      userModel
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select("name email role createdAt"),
    ]);

    res.status(200).json({
      success: true,
      error: false,
      message: "Dashboard data retrieved successfully",
      data: {
        totals: {
          users: totalUsers,
          collaborations: totalCollaborations,
          listings: totalListings,
          deals: totalDeals,
        },
        recentUsers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving dashboard data",
      error: error.message,
    });
  }
};
