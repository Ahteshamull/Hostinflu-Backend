import userModel from "../../auth/schema/auth.modal.js";
import fs from "fs";
import path from "path";
import Collaborations from "../../collaboration/schema/collaboration.modal.js";

export const allUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { role } = req.query;

    let filter = {};
    if (role) {
      filter.role = role;
    }

    const totalUsers = await userModel.countDocuments(filter);

    const users = await userModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalUsers / limit);

    return res.status(200).json({
      success: true,
      message: "All users retrieved successfully",
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
      },
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
      error: error.message,
    });
  }
};

export const singleUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const userData = await userModel
      .findById(id)
      .select("-password -confirmPassword -refreshToken")
      .populate({
        path: "collaborations",
        populate: [
          {
            path: "userId",
            select: "name email role",
          },
          {
            path: "selectInfluencerOrHost",
            select: "name email role",
          },
        ],
      });

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (userData.redeemStars && userData.redeemStars.length > 0) {
      const validRedeemStars = [];
      for (const redeemStar of userData.redeemStars) {
        const collaborationExists = await Collaborations.exists({
          _id: redeemStar.collaborationId,
        });
        if (collaborationExists) {
          validRedeemStars.push(redeemStar);
        }
      }

      // Update user with only valid redeemStars
      if (validRedeemStars.length !== userData.redeemStars.length) {
        await userModel.findByIdAndUpdate(id, {
          redeemStars: validRedeemStars,
        });
        userData.redeemStars = validRedeemStars;
      }

      // Populate collaboration details for redeemStars
      userData.redeemStars = await Promise.all(
        userData.redeemStars.map(async (redeemStar) => {
          const collaboration = await Collaborations.findById(
            redeemStar.collaborationId,
          )
            .populate("userId", "name email role")
            .populate("selectInfluencerOrHost", "name email role");

          return {
            ...redeemStar.toObject(),
            collaboration: collaboration
              ? {
                  _id: collaboration._id,
                  status: collaboration.status,
                  numberOfNights:
                    collaboration.compensation?.numberOfNights || 0,
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
                }
              : null,
          };
        }),
      );
    }

    // Filter out deleted deals and listings
    const Deal = (await import("../../deals/schema/deal.modal.js")).default;
    const Listing = (await import("../../listing/schema/listing.modal.js"))
      .Listing;

    // Filter out deleted deals
    let activeDeals = [];
    if (userData.deals && userData.deals.length > 0) {
      const existingDeals = await Deal.find({
        _id: { $in: userData.deals },
        status: { $ne: "rejected" },
      }).select("_id");
      activeDeals = existingDeals.map((deal) => deal._id.toString());
    }

    // Filter out deleted listings
    let activeListings = [];
    if (userData.listings && userData.listings.length > 0) {
      const existingListings = await Listing.find({
        _id: { $in: userData.listings },
        status: { $ne: "rejected" },
      }).select("_id");
      activeListings = existingListings.map((listing) =>
        listing._id.toString(),
      );
    }

    // Get total listings count (including rejected)
    let totalListings = [];
    if (userData.listings && userData.listings.length > 0) {
      const allListings = await Listing.find({
        _id: { $in: userData.listings },
      }).select("_id");
      totalListings = allListings.map((listing) => listing._id.toString());
    }

    // Calculate redeem stars from completed collaborations
    let totalRedeemStars = 0;
    const userCompletedCollaborations = await Collaborations.find({
      status: "completed",
      $or: [{ userId: userData._id }, { selectInfluencerOrHost: userData._id }],
    });

    totalRedeemStars = userCompletedCollaborations.reduce(
      (total, collab) => total + (collab.compensation?.numberOfNights || 0),
      0,
    );

    /* =========================
       2. Collaboration Stats
    ========================= */
    const collaborationStats = await Collaborations.aggregate([
      {
        $match: {
          $or: [
            { userId: userData._id },
            { selectInfluencerOrHost: userData._id },
          ],
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalCompensation: { $sum: "$payment" },
          totalNights: { $sum: "$numberOfNights" },
          avgCompensation: { $avg: "$payment" },
          avgNights: { $avg: "$numberOfNights" },
        },
      },
    ]);

    /* =========================
       3. Completed Details
    ========================= */
    const completedCollaborations = await Collaborations.find({
      status: "completed",
      $or: [{ userId: userData._id }, { selectInfluencerOrHost: userData._id }],
    })
      .populate("selectInfluencerOrHost", "name email role")
      .populate("userId", "name email role")
      .select("status payment selectInfluencerOrHost userId");

    /* =========================
       4. Format Stats
    ========================= */
    const stats = {};
    collaborationStats.forEach((stat) => {
      stats[stat._id] = {
        count: stat.count || 0,
        totalCompensation: stat.totalCompensation || 0,
        totalNights: stat.totalNights || 0,
        avgCompensation: stat.avgCompensation || 0,
        avgNights: stat.avgNights || 0,
      };
    });

    const buildStatus = (key) => ({
      count: stats[key]?.count || 0,
      totalCompensation: stats[key]?.totalCompensation || 0,
      totalNights: stats[key]?.totalNights || 0,
      avgCompensation: stats[key]?.avgCompensation || 0,
      avgNights: stats[key]?.avgNights || 0,
    });

    /* =========================
       5. Response
    ========================= */
    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: {
        ...userData.toObject(),
        deals: activeDeals,
        dealsTotal: activeDeals.length,
        listings: activeListings,
        listingsTotal: activeListings.length,
        totalListings: totalListings.length,
        collaborationsTotal: userData.collaborations
          ? userData.collaborations.length
          : 0,
        completeDealsTotal: userData.completeDeals
          ? userData.completeDeals.length
          : 0,
        totalRedeemStars: totalRedeemStars,
        collaborationStats: {
          total: Object.values(stats).reduce(
            (sum, s) => sum + (s.count || 0),
            0,
          ),
          pending: buildStatus("pending"),
          negotiating: buildStatus("negotiating"),
          accepted: buildStatus("accepted"),
          ongoing: buildStatus("ongoing"),
          completed: buildStatus("completed"),
          rejected: buildStatus("rejected"),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user",
      error: error.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId =
      req.user?.id || req.user?.userId || req.user?._id || req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
        debug: {
          user: req.user,
          availableFields: Object.keys(req.user || {}),
        },
      });
    }

    const {
      name,
      userName,
      email,
      phone,
      dateOfBirth,
      gender,
      country,
      state,
      city,
      zipCode,
      airbnbAccount,
      fullAddress,
      aboutMe,
      image,
    } = req.body;

    // 🔧 FIX: use mutable variable
    let { socialMediaLinks } = req.body;

    const existingUser = await userModel.findById(userId);

    if (!existingUser) {
      const totalUsers = await userModel.countDocuments();

      return res.status(404).json({
        success: false,
        message: "User not found",
        debug: {
          userId,
          totalUsersInDb: totalUsers,
        },
      });
    }

    const updateData = {};
    let hasChanges = false;

    if (name !== undefined && name !== existingUser.name) {
      updateData.name = name;
      hasChanges = true;
    }

    if (
      userName !== undefined &&
      userName.toLowerCase().trim() !== existingUser.userName
    ) {
      updateData.userName = userName.toLowerCase().trim();
      hasChanges = true;
    }

    if (
      email !== undefined &&
      email.toLowerCase() !== existingUser.email.toLowerCase()
    ) {
      updateData.email = email.toLowerCase();
      hasChanges = true;
    }

    if (phone !== undefined && phone !== existingUser.phone) {
      updateData.phone = phone;
      hasChanges = true;
    }

    if (dateOfBirth !== undefined && dateOfBirth !== existingUser.dateOfBirth) {
      updateData.dateOfBirth = dateOfBirth;
      hasChanges = true;
    }

    if (gender !== undefined && gender !== existingUser.gender) {
      updateData.gender = gender;
      hasChanges = true;
    }

    if (country !== undefined && country !== existingUser.country) {
      updateData.country = country;
      hasChanges = true;
    }

    if (state !== undefined && state !== existingUser.state) {
      updateData.state = state;
      hasChanges = true;
    }

    if (city !== undefined && city !== existingUser.city) {
      updateData.city = city;
      hasChanges = true;
    }

    if (zipCode !== undefined && zipCode !== existingUser.zipCode) {
      updateData.zipCode = zipCode;
      hasChanges = true;
    }

    if (fullAddress !== undefined && fullAddress !== existingUser.fullAddress) {
      updateData.fullAddress = fullAddress;
      hasChanges = true;
    }

    if (aboutMe !== undefined && aboutMe !== existingUser.aboutMe) {
      updateData.aboutMe = aboutMe;
      hasChanges = true;
    }

    if (
      airbnbAccount !== undefined &&
      airbnbAccount !== existingUser.airbnbAccount
    ) {
      updateData.airbnbAccount = airbnbAccount;
      hasChanges = true;
    }

    // ✅ influencer only
    if (existingUser.role === "influencer" && socialMediaLinks !== undefined) {
      if (typeof socialMediaLinks === "string") {
        try {
          socialMediaLinks = JSON.parse(socialMediaLinks);
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: "Social media links must be a valid JSON array.",
          });
        }
      }

      if (!Array.isArray(socialMediaLinks)) {
        return res.status(400).json({
          success: false,
          message: "Social media links must be an array.",
        });
      }

      const validPlatforms = [
        "facebook",
        "instagram",
        "x",
        "youtube",
        "tiktok",
      ];

      const filteredLinks = socialMediaLinks
        .filter((link) => link.platform && link.url)
        .map((link) => ({
          platform: link.platform,
          url: link.url,
          followers: link.followers || "", // Keep as string for values like "12 k"
        }));

      const isValid = filteredLinks.every(
        (link) =>
          validPlatforms.includes(link.platform) &&
          typeof link.url === "string",
      );

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid social media links format.",
        });
      }

      updateData.socialMediaLinks = filteredLinks;
      hasChanges = true;
    }

    // ✅ image upload
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
      hasChanges = true;
    } else if (image && image !== existingUser.image) {
      updateData.image = image;
      hasChanges = true;
    }

    if (!hasChanges) {
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: existingUser,
      });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

export const userGrowth = async (req, res) => {
  try {
    const { period = "monthly", year } = req.query;

    // Determine date range based on period
    const currentDate = new Date();
    let startDate, groupFormat, pipeline;

    if (period === "daily") {
      startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      groupFormat = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    } else if (period === "weekly") {
      startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 12 * 7); // Last 12 weeks
      groupFormat = {
        year: { $year: "$createdAt" },
        week: { $week: "$createdAt" },
      };
    } else if (period === "yearly") {
      startDate = new Date(currentDate);
      startDate.setFullYear(startDate.getFullYear() - 5); // Last 5 years
      groupFormat = {
        year: { $year: "$createdAt" },
      };
    } else {
      // Default to monthly
      startDate = new Date(currentDate);
      startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
      groupFormat = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
    }

    // Filter by specific year if provided
    if (year) {
      const yearNum = parseInt(year);
      startDate = new Date(yearNum, 0, 1);
      const endDate = new Date(yearNum, 11, 31);

      pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
      ];
    } else {
      pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
      ];
    }

    // Add grouping stage
    pipeline.push({
      $group: {
        _id: groupFormat,
        count: { $sum: 1 },
        hosts: {
          $sum: {
            $cond: [{ $eq: ["$role", "host"] }, 1, 0],
          },
        },
        influencers: {
          $sum: {
            $cond: [{ $eq: ["$role", "influencer"] }, 1, 0],
          },
        },
      },
    });

    // Add sorting stage
    if (period === "daily") {
      pipeline.push({ $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } });
    } else if (period === "weekly") {
      pipeline.push({ $sort: { "_id.year": 1, "_id.week": 1 } });
    } else if (period === "yearly") {
      pipeline.push({ $sort: { "_id.year": 1 } });
    } else {
      pipeline.push({ $sort: { "_id.year": 1, "_id.month": 1 } });
    }

    const growthData = await userModel.aggregate(pipeline);

    // Calculate cumulative growth
    let cumulativeCount = 0;
    const formattedData = growthData.map((item) => {
      cumulativeCount += item.count;

      let periodLabel;
      if (period === "daily") {
        periodLabel = `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`;
      } else if (period === "weekly") {
        periodLabel = `Week ${item._id.week} ${item._id.year}`;
      } else if (period === "yearly") {
        periodLabel = item._id.year.toString();
      } else {
        const monthNames = [
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
        periodLabel = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      }

      return {
        period: periodLabel,
        newUsers: item.count,
        cumulativeUsers: cumulativeCount,
        hosts: item.hosts,
        influencers: item.influencers,
        rawData: item._id,
      };
    });

    // Get overall stats
    const totalUsers = await userModel.countDocuments();
    const totalHosts = await userModel.countDocuments({ role: "host" });
    const totalInfluencers = await userModel.countDocuments({
      role: "influencer",
    });

    return res.status(200).json({
      success: true,
      message: "User growth data retrieved successfully",
      data: {
        period,
        growthData: formattedData,
        summary: {
          totalUsers,
          totalHosts,
          totalInfluencers,
          growthRate:
            formattedData.length > 1
              ? (
                  ((formattedData[formattedData.length - 1].newUsers -
                    formattedData[0].newUsers) /
                    formattedData[0].newUsers) *
                  100
                ).toFixed(2)
              : 0,
        },
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

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (existingUser.image) {
      const imagePath = path.join(process.cwd(), existingUser.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await userModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

export const discoverHost = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Find only 4 hosts with their deals and count deals
    const hosts = await userModel
      .find({ role: "host" })
      .populate("deals") // Simple population without selectListing
      .select("") // Select all fields to ensure we get all available data
      .sort({ createdAt: -1 })
      .limit(4) // Only 4 hosts
      .skip((page - 1) * 4); // Skip based on 4 per page

    // Add deal count to each host
    const hostsWithDealCount = await Promise.all(
      hosts.map(async (host) => {
        const dealCount = await userModel
          .findById(host._id)
          .select("deals")
          .then((user) => (user ? user.deals.length : 0));

        return {
          ...host.toObject(),
          dealCount,
        };
      }),
    );

    const total = await userModel.countDocuments({ role: "host" });

    res.status(200).json({
      success: true,
      message: "Hosts discovered successfully",
      data: {
        hosts: hostsWithDealCount,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / 4), // Fixed for 4 per page
          total,
          limit: 4, // Fixed to 4
        },
        metadata: {
          totalHosts: total,
          totalDeals: hostsWithDealCount.reduce(
            (sum, host) => sum + host.dealCount,
            0,
          ),
          averageDealsPerHost: (
            hostsWithDealCount.reduce((sum, host) => sum + host.dealCount, 0) /
            hostsWithDealCount.length
          ).toFixed(1),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error discovering hosts",
      error: error.message,
    });
  }
};

export const topInfluencer = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Find top influencers with their collaborations
    const influencers = await userModel
      .find({ role: "influencer" })
      .populate("collaborations") // Simple population without selectListing
      .select("") // Select all fields
      .sort({ collaborationsTotal: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await userModel.countDocuments({ role: "influencer" });

    res.status(200).json({
      success: true,
      message: "Top influencers discovered successfully",
      data: {
        influencers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
        metadata: {
          totalInfluencers: total,
          totalCollaborations: influencers.reduce(
            (sum, inf) => sum + inf.collaborationsTotal,
            0,
          ),
          averageCollaborationsPerInfluencer: (
            influencers.reduce((sum, inf) => sum + inf.collaborationsTotal, 0) /
            influencers.length
          ).toFixed(1),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error discovering top influencers",
      error: error.message,
    });
  }
};
