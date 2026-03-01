import express from "express";
import {
  createCalenderController,
  getDateInfluencer,
  updateCalenderController,
} from "../controller/calender.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/calender/create-calender
router.post("/create-calender", authenticateToken, createCalenderController);

// localhost:3000/api/v1/calender/get-date-influencer
router.get("/get-date-influencer", authenticateToken, getDateInfluencer);

// localhost:3000/api/v1/calender/update-calender/:id
router.patch(
  "/update-calender/:id",
  authenticateToken,
  updateCalenderController,
);

export default router;
