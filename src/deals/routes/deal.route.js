import express from "express";
import {
  createDeal,
  getAllDeals,
  getSingleDeal,
  updateDeal,
  totalDeal,
  userPersonalTotalDeals,
} from "../controller/deal.controller.js";
import {
  authenticateToken,
  requireHostRole,
} from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/deal/create-deal - Create new deal
router.post("/create-deal", authenticateToken, requireHostRole, createDeal);

// localhost:3000/api/v1/deal/get-all-deals - Get all deals with pagination
router.get("/get-all-deals", getAllDeals);

// localhost:3000/api/v1/deal/get-single-deal/:id - Get single deal
router.get("/get-single-deal/:id", getSingleDeal);

// localhost:3000/api/v1/deal/update-deal/:id - Update deal
router.put("/update-deal/:id", authenticateToken, requireHostRole, updateDeal);

// localhost:3000/api/v1/deal/total-deals
router.get("/total-deals", totalDeal);

// localhost:3000/api/v1/deal/user-personal-total-deals
router.get("/user-personal-total-deals", authenticateToken, userPersonalTotalDeals);

export default router;
