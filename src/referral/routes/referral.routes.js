import express from "express";
import {
  createReferral,
  getMyReferrals,
  generateUserReferralCode,
} from "../controller/referral.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/referral/use
router.post("/use", authenticateToken, createReferral);

// localhost:3000/api/v1/referral/my-referrals
router.get("/my-referrals", authenticateToken, getMyReferrals);

// localhost:3000/api/v1/referral/generate-code
router.post("/generate-code", authenticateToken, generateUserReferralCode);

export default router;
