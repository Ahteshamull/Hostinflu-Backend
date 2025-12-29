import express from "express";
import {
  createDeal,
  getAllDeals,
  getSingleDeal,
  updateDeal,
} from "../controller/deal.controller.js";
import { authenticateToken } from "../../middleware/auth.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/deal/create - Create new deal
router.post("/create", authenticateToken, createDeal);

// localhost:3000/api/v1/deal - Get all deals with pagination
router.get("/", getAllDeals);

// localhost:3000/api/v1/deal/:id - Get single deal
router.get("/:id", getSingleDeal);

// localhost:3000/api/v1/deal/:id - Update deal
router.put("/:id", authenticateToken, updateDeal);

export default router;
