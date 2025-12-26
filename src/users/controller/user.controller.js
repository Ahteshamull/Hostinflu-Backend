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
      data: user,
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
    } = req.body;

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

    // If userName is being updated, check if it's already used by another user
    if (userName && userName.toLowerCase().trim() !== existingUser.userName) {
      // Convert to lowercase for validation and storage
      const normalizedUserName = userName.toLowerCase().trim();

      // Validate userName format - only lowercase letters, numbers, and underscore
      if (!/^[a-z0-9_]+$/.test(normalizedUserName)) {
        return res.status(400).json({
          success: false,
          message:
            "Username can only contain lowercase letters, numbers, and underscore (_)",
        });
      }

      // Validate minimum length
      if (normalizedUserName.length < 5) {
        return res.status(400).json({
          success: false,
          message: "Username must be at least 5 characters",
        });
      }

      // Validate maximum length
      if (normalizedUserName.length > 20) {
        return res.status(400).json({
          success: false,
          message: "Username must not exceed 20 characters",
        });
      }

      // Check for uniqueness
      const userNameExists = await userModel.findOne({
        userName: normalizedUserName,
        _id: { $ne: id },
      });
      if (userNameExists) {
        return res.status(400).json({
          success: false,
          message: "Username is already in use by another user",
        });
      }
    }

    // Prepare update object - only include fields that are actually different
    const updateData = {};
    let hasChanges = false;

    // Basic Information
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

    // Location Information
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

    // Handle image update (from request body or file upload)
    if (image !== undefined && image !== existingUser.image) {
      updateData.image = image;
      hasChanges = true;
    }

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
