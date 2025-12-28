import express from "express";
import {
  listNotifications,
  markNotification,
  markAllNotifications,
} from "../controller/notification.controller.js";

const router = express.Router();

// localhost:3000/api/v1/notification/list
router.get("/list", listNotifications);

// localhost:3000/api/v1/notification/mark/:id
router.patch("/mark/:id", markNotification);

// localhost:3000/api/v1/notification/mark-all
router.patch("/mark-all", markAllNotifications);

export default router;
