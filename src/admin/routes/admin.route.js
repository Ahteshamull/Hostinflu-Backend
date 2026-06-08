import express from "express";
import {
  createAdmin,
  adminLogin,
  updateAdminPersonalInfo,
  adminChangePassword,
  deleteAdmin,
  allAdmin,
  singleAdmin,
  forgotPassAdmin,
  OTPVerifyAdmin,
  resetPasswordAdmin,
} from "../controller/admin.controller.js";
import { upload } from "../../helper/middlewares/imageControlMiddleware.js";
import superAdminMiddleware from "../../helper/middlewares/superAdminMiddleware.js";
import adminMiddleware from "../../helper/middlewares/authmiddleware.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// Create Admin route with file upload

//localhost:3000/api/v1/admin/create-admin
router.post(
  "/create-admin",
  authenticateToken,
  upload.single("image"),
  createAdmin
);

//localhost:3000/api/v1/admin/admin-login
router.post("/admin-login", adminLogin);

//localhost:3000/api/v1/admin/update-admin-personal-info
router.put(
  "/update-admin-personal-info",
  upload.single("image"),
  authenticateToken,
  updateAdminPersonalInfo
);

//localhost:3000/api/v1/admin/change-password
router.put("/change-password", authenticateToken, adminChangePassword);

//localhost:3000/api/v1/admin/delete-admin/:id
router.delete("/delete-admin/:id", authenticateToken,superAdminMiddleware, deleteAdmin);

//localhost:3000/api/v1/admin/all-admins
router.get("/all-admins", authenticateToken, allAdmin);

//localhost:3000/api/v1/admin/single-admin/:id
router.get("/single-admin/:id", authenticateToken, singleAdmin);

//localhost:3000/api/v1/admin/forgot-password
router.post("/forgot-password", forgotPassAdmin);

//localhost:3000/api/v1/admin/otp-verify
router.post("/otp-verify", OTPVerifyAdmin);

//localhost:3000/api/v1/admin/reset-password
router.post("/reset-password", resetPasswordAdmin);

export default router;
