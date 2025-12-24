import express from "express";
import {
  createAdmin,
  adminLogin,
  updateAdminPersonalInfo,
  deleteAdmin,
  allAdmin,
  singleAdmin,
} from "../controller/admin.controller.js";
import { upload } from "../../helper/middlewares/imageControlMiddleware.js";
import superAdminMiddleware from "../../helper/middlewares/superAdminMiddleware.js";
import adminMiddleware from "../../helper/middlewares/authmiddleware.js";

const router = express.Router();

// Create Admin route with file upload

//localhost:3000/api/v1/admin/create-admin
router.post(
  "/create-admin",
  superAdminMiddleware,
  upload.single("image"),
  createAdmin
);

//localhost:3000/api/v1/admin/admin-login
router.post("/admin-login", adminLogin);

//localhost:3000/api/v1/admin/update-admin-personal-info/:id
router.put(
  "/update-admin-personal-info/:id",
  upload.single("image"),
  updateAdminPersonalInfo
);

//localhost:3000/api/v1/admin/delete-admin/:id
router.delete("/delete-admin/:id", superAdminMiddleware, deleteAdmin);

//localhost:3000/api/v1/admin/all-admins
router.get("/all-admins", adminMiddleware, allAdmin);

//localhost:3000/api/v1/admin/single-admin/:id
router.get("/single-admin/:id", adminMiddleware, singleAdmin);

export default router;
