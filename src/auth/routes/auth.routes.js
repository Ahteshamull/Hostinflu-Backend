import express from "express";
import {
  login,
  logout,
  OtpVerify,
  refreshAccessToken,
  ResendOtp,
  signup,
  testEmailConfig,
} from "../controller/auth.controller.js";

const router = express.Router();
//localhost:3000/api/v1/auth/registration
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshAccessToken);
router.post("/otp-verify", OtpVerify);
router.post("/resend-otp", ResendOtp);
router.get("/test-email", testEmailConfig);

export default router;
