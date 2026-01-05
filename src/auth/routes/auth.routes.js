import express from "express";
import {
  forgotPassword,
  login,
  logout,
  getMyProfile,
  refreshAccessToken,
  ResendOtp,
  resetPassword,
  createUser,
  verifyOtp,
  changePassword,
  currentUserLogin,
  setUpProfile,
} from "../controller/auth.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";
import {
  upload,
  errorCheck,
} from "../../helper/middlewares/imageControlMiddleware.js";

const router = express.Router();
//localhost:3000/api/v1/auth/create-user
router.post("/create-user", createUser);
//localhost:3000/api/v1/auth/login
router.post("/login", login);
//localhost:3000/api/v1/auth/logout
router.post("/logout", logout);
//localhost:3000/api/v1/auth/my-profile
router.get("/my-profile", authenticateToken, getMyProfile);
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
//localhost:3000/api/v1/auth/setup-profile
router.patch(
  "/setup-profile",
  authenticateToken,
  upload.single("image"),
  errorCheck,
  setUpProfile
);

export default router;
