import express from "express";
import {
  forgotPassword,
  login,
  logout,
  refreshAccessToken,
  ResendOtp,
  resetPassword,
  createUser,
  verifyOtp,
  changePassword,
  currentUserLogin,
} from "../controller/auth.controller.js";

const router = express.Router();
//localhost:3000/api/v1/auth/create-user
router.post("/create-user", createUser);
//localhost:3000/api/v1/auth/login
router.post("/login", login);
//localhost:3000/api/v1/auth/logout
router.post("/logout", logout);
//localhost:3000/api/v1/auth/forgot-password
router.post("/forgot-password", forgotPassword);
//localhost:3000/api/v1/auth/change-password
router.post("/change-password", changePassword);
//localhost:3000/api/v1/auth/resend-otp
router.post("/resend-otp", ResendOtp);
//localhost:3000/api/v1/auth/verify-reset-otp
router.post("/verify-reset-otp", verifyOtp);
//localhost:3000/api/v1/auth/reset-password
router.post("/reset-password", resetPassword);
//localhost:3000/api/v1/auth/refresh-token
router.post("/refresh-token", refreshAccessToken);
//localhost:3000/api/v1/auth/current-user-login
router.post("/current-user-login", currentUserLogin);
export default router;
