import express from "express";
import {
  createReport,
  getAllReports,
  getMyReports,
  getReportsAgainstMe,
  getReportById,
  updateReportStatus,
} from "../controller/report.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// Create a new report (authenticated users)
// localhost:3000/api/v1/report/create-report/userId
router.post("/create-report/:userId", authenticateToken, createReport);

// Get all reports (admin only)
// localhost:3000/api/v1/report/admin/all-reports
router.get("/admin/all-reports", authenticateToken, getAllReports);

// Get reports filed by current user

// localhost:3000/api/v1/report/my-reports/userId
router.get("/my-reports/:userId", authenticateToken, getMyReports);

// Get reports against current user
// localhost:3000/api/v1/report/reports-against-me/userId
router.get("/reports-against-me/:userId", authenticateToken, getReportsAgainstMe);

// Get single report by ID (admin or involved users)
// localhost:3000/api/v1/report/:reportId
router.get("/:reportId", authenticateToken, getReportById);

// Update report status (admin only)
// localhost:3000/api/v1/report/:reportId/status
router.patch("/:reportId/status", authenticateToken, updateReportStatus);

export default router;
