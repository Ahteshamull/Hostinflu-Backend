import mongoose from "mongoose";
import Report from "../schema/report.modal.js";
import userModel from "../../auth/schema/auth.modal.js";

/* ======================================================
   Create Report
====================================================== */
export const createReport = async (req, res) => {
  try {
    // Reporter ID from JWT token
    const reporterId = req.user?.id || req.user?._id;

    // Reported user ID from params
    const { userId: reportedUserId } = req.params;

    const { reportType, reason, description } = req.body;

    /* ===== Auth Check ===== */
    if (!reporterId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    /* ===== Required Fields Check ===== */
    if (!reportedUserId || !reportType || !reason || !description) {
      return res.status(400).json({
        success: false,
        message:
          "reportedUserId (params), reportType, reason and description are required",
      });
    }

    /* ===== Prevent Self Report ===== */
    if (reporterId.toString() === reportedUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot report yourself",
      });
    }

    /* ===== Check Users Exist ===== */
    const [reporter, reportedUser] = await Promise.all([
      userModel.findById(reporterId),
      userModel.findById(reportedUserId),
    ]);

    if (!reporter || !reportedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* ===== Create Report ===== */
    const report = await Report.create({
      userId: reporterId,
      reportedUserId,
      reportType,
      reason,
      description,
    });

    /* ===== Populate Reporter & Reported User ===== */
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
