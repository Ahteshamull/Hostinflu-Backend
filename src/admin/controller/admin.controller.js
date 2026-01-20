import Admin from "../schema/admin.modal.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { sendEmail } from "../../config/email.config.js";

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN,
    {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    },
  );
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign(
    { id },
    process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRE || "7d",
    },
  );
};

// Create Admin
const createAdmin = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, image } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password do not match",
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin with this email already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get image file path if uploaded
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      confirmPassword: hashedPassword,
      role: "admin",
      image: imagePath,
    });

    // Generate tokens
    const token = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    // Save refresh token to database
    admin.refreshToken = refreshToken;
    await admin.save();

    // Remove password from response
    admin.password = undefined;
    admin.confirmPassword = undefined;

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        admin,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error while creating admin",
    });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find admin by email and include password field
    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, admin.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: " Password or Email does not match",
      });
    }

    // Generate tokens
    const token = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    // Save refresh token to database
    admin.refreshToken = refreshToken;
    await admin.save();

    // Remove password from response
    admin.password = undefined;
    admin.confirmPassword = undefined;

    // Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        admin,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error during login",
    });
  }
};

const adminChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: true, message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN,
      );
    } catch (err) {
      return res.status(401).json({ error: true, message: "Invalid token" });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ error: true, message: "Passwords do not match" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: true,
        message: "Password must be at least 6 characters",
      });
    }

    // Get admin ID from authenticated token
    const adminId = req.user?._id || req.user?.id;

    // Find admin by ID
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: true, message: "Admin not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password,
    );
    if (!isCurrentPasswordValid) {
      return res
        .status(400)
        .json({ error: true, message: "Current password is incorrect" });
    }

    // Update password
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating admin",
    });
  }
};

const updateAdminPersonalInfo = async (req, res) => {
  try {
    const { name, phone } = req.body;
    // Get admin ID from authenticated token instead of URL parameter
    const adminId = req.user?._id || req.user?.id;

    // Find admin by ID
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Handle image update if new file is uploaded
    if (req.file) {
      const newImagePath = `/uploads/${req.file.filename}`;

      // Delete old image file if it exists
      if (admin.image && admin.image !== newImagePath) {
        const oldImagePath = path.join(process.cwd(), admin.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      admin.image = newImagePath;
    }

    // Update name and phone if provided
    if (name) admin.name = name;
    if (phone) admin.phone = phone;

    // Save updated admin
    await admin.save();

    // Remove sensitive fields from response
    admin.password = undefined;
    admin.confirmPassword = undefined;

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error while updating admin",
    });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;

    // Find admin by ID
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Delete admin's image file if it exists
    if (admin.image) {
      const imagePath = path.join(process.cwd(), admin.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete admin from database
    await Admin.findByIdAndDelete(adminId);

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error while deleting admin",
    });
  }
};

const allAdmin = async (req, res) => {
  try {
    // Get all admins from database, sorted by creation date (newest first)
    const admins = await Admin.find({}).sort({ createdAt: -1 });

    // Remove sensitive fields from response
    admins.forEach((admin) => {
      admin.password = undefined;
      admin.confirmPassword = undefined;
    });

    res.status(200).json({
      success: true,
      message: "Admins retrieved successfully",
      data: admins,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching admins",
    });
  }
};

const singleAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;

    // Find admin by ID
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Remove sensitive fields from response
    admin.password = undefined;
    admin.confirmPassword = undefined;

    res.status(200).json({
      success: true,
      message: "Admin retrieved successfully",
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching admin",
    });
  }
};

const forgotPassAdmin = async (req, res) => {
  try {
    const { email } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpiry = resetTokenExpiry;

    await admin.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      email: admin.email,
      subject: "Password Reset Request",
      message: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.`,
    });

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error while sending reset email",
    });
  }
};

export {
  createAdmin,
  adminLogin,
  updateAdminPersonalInfo,
  adminChangePassword,
  deleteAdmin,
  allAdmin,
  singleAdmin,
  forgotPassAdmin,
};
