import express from "express";
import { createCalenderController, getDateInfluencer } from "../controller/calender.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/calender/create-calender
router.post("/create-calender", authenticateToken, createCalenderController);

// localhost:3000/api/v1/calender/get-date-influencer
router.get("/get-date-influencer", authenticateToken, getDateInfluencer);

export default router;
