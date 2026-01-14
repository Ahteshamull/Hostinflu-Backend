import express from "express";
import {

  getUserRedeemStars,
} from "../controller/redeem.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();



// localhost:3000/api/v1/redeem/my-stars
router.get("/my-stars", authenticateToken, getUserRedeemStars);

export default router;
