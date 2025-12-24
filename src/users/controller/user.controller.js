import userModel from "../../auth/schema/auth.modal.js";
import fs from "fs";
import path from "path";

export const allUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count of users
    const totalUsers = await userModel.countDocuments({});

    // Get users with pagination
    const users = await userModel
      .find({})
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    // Calculate pagination info
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

    // Validate user ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find user by ID
    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    // Validate user ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Check if user exists
    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If email is being updated, check if it's already used by another user
    if (email && email !== existingUser.email) {
      // Check for case-insensitive email uniqueness
      const emailExists = await userModel.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use by another user",
        });
      }
    }

    // Prepare update object - only include fields that are actually different
    const updateData = {};
    let hasChanges = false;

    if (name !== undefined && name !== existingUser.name) {
      updateData.name = name;
      hasChanges = true;
    }

    if (
      email !== undefined &&
      email.toLowerCase() !== existingUser.email.toLowerCase()
    ) {
      updateData.email = email.toLowerCase();
      hasChanges = true;
    }

    // Handle image update
    if (req.file) {
      // Delete old image if it exists
      if (existingUser.image) {
        const oldImagePath = path.join(process.cwd(), existingUser.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = `/uploads/${req.file.filename}`;
      hasChanges = true;
    }

    // Check if there are any actual changes
    if (!hasChanges) {
      return res.status(200).json({
        success: true,
        message: "No changes detected - user data is already up to date",
        data: existingUser,
      });
    }

    // Update user
    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
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

    // Check if user exists
    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user's image if it exists
    if (existingUser.image) {
      const imagePath = path.join(process.cwd(), existingUser.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete user from database
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
