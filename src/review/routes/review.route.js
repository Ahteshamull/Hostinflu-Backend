import express from "express";
import {
  createReview,
  userPersonalReview,
  getReview,
  updateReview,
  deleteReview,
} from "../controller/review.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/review/create-review/:collaborationId
router.post("/create-review/:collaborationId", authenticateToken, createReview);

// localhost:3000/api/v1/review/user-personal
router.get("/user-personal", authenticateToken, userPersonalReview);

// localhost:3000/api/v1/review/get
router.get("/get", authenticateToken, getReview);

// localhost:3000/api/v1/review/update
router.put("/update", authenticateToken, updateReview);

// localhost:3000/api/v1/review/delete
router.delete("/delete", authenticateToken, deleteReview);

export default router;
