import userModel from "../../auth/schema/auth.modal.js";
import fs from "fs";
import path from "path";
import Collaborations from "../../collaboration/schema/collaboration.modal.js";
import { Listing } from "../../listing/schema/listing.modal.js";

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
            path: "selectInfluencerOrHost",
            select: "name email role",
          },
          {
            path: "selectDeal",
            select:
              "description compensation addAirbnbLink inTimeAndDate outTimeAndDate guestCount deliverables status",
            populate: {
              path: "selectListing",
              model: "Listing",
              select:
                "title description images location propertyType amenities customAmenities",
              strictPopulate: false,
            },
          },
          {
            path: "userId",
            select: "name email role",
          },
        ],
      });

    // Get collaboration statistics
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

    // Get detailed completed collaboration information
    const completedCollaborationsDetails = await Collaborations.find({
      $or: [
        { userId: userData._id, status: "completed" },
        { selectInfluencerOrHost: userData._id, status: "completed" },
      ],
    })
      .populate("selectInfluencerOrHost", "name email role")
      .populate({
        path: "selectDeal",
        populate: {
          path: "selectListing",
          model: "Listing",
          select:
            "title description images location propertyType amenities customAmenities",
          strictPopulate: false,
        },
      })
      .populate("userId", "name email role")
      .select(
        "status payment numberOfNights createdAt updatedAt selectInfluencerOrHost selectDeal userId",
      );

    // Debug: Log the first completed collaboration to see what's populated
  

    // Manual population: Fetch listing data for each completed collaboration
    const completedCollaborationsWithListing = await Promise.all(
      completedCollaborationsDetails.map(async (collab) => {
        if (collab.selectDeal && collab.selectDeal.selectListing) {
          try {
            const listingData = await Listing.findById(
              collab.selectDeal.selectListing,
            ).select(
              "title description images location propertyType amenities customAmenities",
            );

            return {
              ...collab.toObject(),
              selectDeal: {
                ...collab.selectDeal.toObject(),
                selectListing: listingData,
              },
            };
          } catch (error) {
            console.log("Error fetching listing:", error);
            return collab;
          }
        }
        return collab;
      }),
    );

    // Format collaboration stats
    const stats = {};
    collaborationStats.forEach((stat) => {
      stats[stat._id] = {
        count: stat.count,
        totalCompensation: stat.totalCompensation || 0,
        totalNights: stat.totalNights || 0,
        avgCompensation: stat.avgCompensation || 0,
        avgNights: stat.avgNights || 0,
      };
    });

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: {
        ...userData.toObject(),
        collaborationStats: {
          total:
            (stats.pending?.count || 0) +
            (stats.negotiating?.count || 0) +
            (stats.accepted?.count || 0) +
            (stats.ongoing?.count || 0) +
            (stats.completed?.count || 0) +
            (stats.rejected?.count || 0),
          pending: {
            count: stats.pending?.count || 0,
            totalCompensation: stats.pending?.totalCompensation || 0,
            totalNights: stats.pending?.totalNights || 0,
            avgCompensation: stats.pending?.avgCompensation || 0,
            avgNights: stats.pending?.avgNights || 0,
          },
          negotiating: {
            count: stats.negotiating?.count || 0,
            totalCompensation: stats.negotiating?.totalCompensation || 0,
            totalNights: stats.negotiating?.totalNights || 0,
            avgCompensation: stats.negotiating?.avgCompensation || 0,
            avgNights: stats.negotiating?.avgNights || 0,
          },
          accepted: {
            count: stats.accepted?.count || 0,
            totalCompensation: stats.accepted?.totalCompensation || 0,
            totalNights: stats.accepted?.totalNights || 0,
            avgCompensation: stats.accepted?.avgCompensation || 0,
            avgNights: stats.accepted?.avgNights || 0,
          },
          ongoing: {
            count: stats.ongoing?.count || 0,
            totalCompensation: stats.ongoing?.totalCompensation || 0,
            totalNights: stats.ongoing?.totalNights || 0,
            avgCompensation: stats.ongoing?.avgCompensation || 0,
            avgNights: stats.ongoing?.avgNights || 0,
          },
          completed: {
            count: stats.completed?.count || 0,
            totalCompensation: stats.completed?.totalCompensation || 0,
            totalNights: stats.completed?.totalNights || 0,
            avgCompensation: stats.completed?.avgCompensation || 0,
            avgNights: stats.completed?.avgNights || 0,
            details: completedCollaborationsWithListing,
          },
          rejected: {
            count: stats.rejected?.count || 0,
            totalCompensation: stats.rejected?.totalCompensation || 0,
            totalNights: stats.rejected?.totalNights || 0,
            avgCompensation: stats.rejected?.avgCompensation || 0,
            avgNights: stats.rejected?.avgNights || 0,
          },
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
      fullAddress,
      aboutMe,
      image,
      addAsocialMediaLink,
      addYourSocialFollowers,
    } = req.body;

    const existingUser = await userModel.findById(userId);

    if (!existingUser) {
      const totalUsers = await userModel.countDocuments();

      return res.status(404).json({
        success: false,
        message: "User not found",
        debug: {
          userId: userId,
          totalUsersInDb: totalUsers,
          suggestion:
            totalUsers === 0
              ? "Database appears to be empty. Users may need to be created."
              : "User may have been deleted or token may be from a different database.",
        },
      });
    }

    if (email && email !== existingUser.email) {
      const emailExists = await userModel.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use by another user",
        });
      }
    }

    if (userName && userName.toLowerCase().trim() !== existingUser.userName) {
      const normalizedUserName = userName.toLowerCase().trim();

      if (!/^[a-z0-9_]+$/.test(normalizedUserName)) {
        return res.status(400).json({
          success: false,
          message:
            "Username can only contain lowercase letters, numbers, and underscore (_)",
        });
      }

      if (normalizedUserName.length < 5) {
        return res.status(400).json({
          success: false,
          message: "Username must be at least 5 characters",
        });
      }

      if (normalizedUserName.length > 20) {
        return res.status(400).json({
          success: false,
          message: "Username must not exceed 20 characters",
        });
      }

      const userNameExists = await userModel.findOne({
        userName: normalizedUserName,
        _id: { $ne: userId },
      });
      if (userNameExists) {
        return res.status(400).json({
          success: false,
          message: "Username is already in use by another user",
        });
      }
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

    if (image !== undefined && image !== existingUser.image) {
      updateData.image = image;
      hasChanges = true;
    }

    // Only allow social media updates for influencers
    if (existingUser.role === "influencer") {
      if (
        addAsocialMediaLink !== undefined &&
        addAsocialMediaLink !== existingUser.addAsocialMediaLink
      ) {
        updateData.addAsocialMediaLink = addAsocialMediaLink;
        hasChanges = true;
      }

      if (
        addYourSocialFollowers !== undefined &&
        addYourSocialFollowers !== existingUser.addYourSocialFollowers
      ) {
        updateData.addYourSocialFollowers = addYourSocialFollowers;
        hasChanges = true;
      }
    }

    if (req.file) {
      if (existingUser.image) {
        const oldImagePath = path.join(process.cwd(), existingUser.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = `/uploads/${req.file.filename}`;
      hasChanges = true;
    }

    if (!hasChanges) {
      return res.status(200).json({
        success: true,
        message: "No changes detected - profile data is already up to date",
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
