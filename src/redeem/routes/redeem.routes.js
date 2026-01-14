import express from "express";
import {
  allRedeemStar,
  getUserRedeemStars,
} from "../controller/redeem.controller.js";
import { withdrawRedeemStars } from "../controller/withdraw.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/redeem/all-stars
router.get("/all-stars", allRedeemStar);

// localhost:3000/api/v1/redeem/my-stars
router.get("/my-stars", authenticateToken, getUserRedeemStars);

// localhost:3000/api/v1/redeem/withdraw
router.post(
  "/withdraw/:collaborationId",
  authenticateToken,
  (req, res, next) => {
    // Explicitly set empty body to avoid validation issues
    req.body = {};
    withdrawRedeemStars(req, res);
  }
);

export default router;
