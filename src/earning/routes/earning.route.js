import express from "express";
import {
  totalEarning,
  getSingleEarning,
} from "../controller/earning.controller.js";
import {
  authenticateToken,
  requireSuperAdminOrAdminRole,
} from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/earnings/all-earnings (for admin and super admin)
router.get(
  "/all-earnings",
  authenticateToken,
  requireSuperAdminOrAdminRole,
  totalEarning,
);

// localhost:3000/api/v1/earnings/single-earning/:id (for admin and super admin)
router.get(
  "/single-earning/:id",
  authenticateToken,
  requireSuperAdminOrAdminRole,
  getSingleEarning,
);

export default router;
