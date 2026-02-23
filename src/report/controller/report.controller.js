import mongoose from "mongoose";
import Report from "../schema/report.modal.js";
import userModel from "../../auth/schema/auth.modal.js";

/* ======================================================
   Create Report
====================================================== */
export const createReport = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from URL params

    if (!userId)
      return res.status(401).json({
        success: false,
        message: "User ID is required",
      });

    const {
      reportedUserId,
      reportType,
      reason,
      description,
      evidence,
      urgency,
    } = req.body;

    if (!reportedUserId || !reportType || !reason || !description)
      return res.status(400).json({
        success: false,
        message:
          "reportedUserId, reportType, reason and description are required",
      });

    if (userId.toString() === reportedUserId.toString())
      return res.status(400).json({
        success: false,
        message: "You cannot report yourself",
      });

    const [reporter, reportedUser] = await Promise.all([
      userModel.findById(userId),
      userModel.findById(reportedUserId),
    ]);

    if (!reporter || !reportedUser)
      return res.status(404).json({
        success: false,
        message: "User not found",
      });

    /* ===== Duplicate check ===== */
    const existingReport = await Report.findOne({
      userId,
      reportedUserId,
      reportType,
      status: { $in: ["pending", "under_review"] },
    });

    if (existingReport)
      return res.status(400).json({
        success: false,
        message: "You already have an active report for this issue",
      });

    /* ===== Create report ===== */
    const report = await Report.create({
      userId,
      reportedUserId,
      reportType,
      reason,
      description,
      evidence: evidence || [],
      urgency: urgency || "medium",
    });

    const populatedReport = await Report.findById(report._id)
      .populate("userId", "name email role")
      .populate("reportedUserId", "name email role");

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      data: populatedReport,
    });
  } catch (error) {
    console.error("Create report error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ======================================================
   Get All Reports (Admin)
====================================================== */
export const getAllReports = async (req, res) => {
  try {
    const { status, reportType, urgency, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = {};
    if (status) filter.status = status;
    if (reportType) filter.reportType = reportType;
    if (urgency) filter.urgency = urgency;

    const reports = await Report.find(filter)
      .populate("userId", "name email role image")
      .populate("reportedUserId", "name email role image")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Report.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalReports: total,
        },
      },
    });
  } catch (error) {
    console.error("Get reports error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ======================================================
   Get My Reports
====================================================== */
export const getMyReports = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from URL params

    if (!userId)
      return res.status(401).json({
        success: false,
        message: "User ID is required",
      });

    const reports = await Report.find({ userId })
      .populate("reportedUserId", "name email role image")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ======================================================
   Get Reports Against Me
====================================================== */
export const getReportsAgainstMe = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from URL params

    if (!userId)
      return res.status(401).json({
        success: false,
        message: "User ID is required",
      });

    const reports = await Report.find({
      reportedUserId: userId,
    })
      .populate("userId", "name email role image")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ======================================================
   Get Report By ID
====================================================== */
export const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await Report.findById(reportId)
      .populate("userId", "name email role image")
      .populate("reportedUserId", "name email role image");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Check if user has permission to view this report
    const user = await userModel.findById(userId);
    const hasPermission =
      user?.role === "admin" ||
      report.userId._id.toString() === userId ||
      report.reportedUserId._id.toString() === userId;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this report",
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Get report by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ======================================================
   Update Report Status (Admin)
====================================================== */
export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes, resolution } = req.body;
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify admin user
    const admin = await userModel.findById(adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin users can update report status",
      });
    }

    if (!["pending", "under_review", "resolved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be: pending, under_review, resolved, or rejected",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await Report.findById(reportId)
      .populate("userId", "name email")
      .populate("reportedUserId", "name email");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Update the report
    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      {
        status,
        adminNotes,
        resolution: status === "resolved" ? resolution : report.resolution,
        updatedAt: Date.now(),
      },
      { new: true },
    )
      .populate("userId", "name email role")
      .populate("reportedUserId", "name email role");

    return res.status(200).json({
      success: true,
      message: `Report status updated to ${status}`,
      data: updatedReport,
    });
  } catch (error) {
    console.error("Update report status error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ======================================================
   Delete Report (Admin)
====================================================== */
export const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify admin user
    const admin = await userModel.findById(adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin users can delete reports",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    await Report.findByIdAndDelete(reportId);

    return res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Delete report error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
