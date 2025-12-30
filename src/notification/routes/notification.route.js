import express from "express";
import {
  listNotifications,
  markNotification,
  markAllNotifications,
  getCollaborationNotifications,
} from "../controller/notification.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/notification/list
router.get("/list", listNotifications);

// localhost:3000/api/v1/notification/mark/:id
router.patch("/mark/:id", markNotification);

// localhost:3000/api/v1/notification/mark-all
router.patch("/mark-all", markAllNotifications);

// localhost:3000/api/v1/notification/collaboration
router.get("/collaboration", authenticateToken, getCollaborationNotifications);

export default router;
