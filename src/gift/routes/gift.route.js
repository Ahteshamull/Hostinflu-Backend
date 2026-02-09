import express from "express";
import { createRedeem } from "../controller/gift.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

//localhost:3000/api/v1/gift/create-redeem/:collaborationId
router.post("/create-redeem/:id", authenticateToken, createRedeem);

export default router;
