import express from "express";
import {
  dashboard,
  userDashboard,
} from "../controller/dashboard.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// Main dashboard endpoint - returns all data
// localhost:3000/api/v1/dashboard/
router.get("/", dashboard);

// User-specific dashboard endpoint
// localhost:3000/api/v1/dashboard/user-dashboard
router.get("/user-dashboard", authenticateToken, userDashboard);

export default router;
