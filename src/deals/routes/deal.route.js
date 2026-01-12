import express from "express";
import {
  createDeal,
  getAllDeals,
  getSingleDeal,
  updateDeal,

  userPersonalTotalDeals,
  userPersonalDealsGrowth,
  getMyAllDeals,
  deleteDeal,
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


// localhost:3000/api/v1/deal/user-personal-total-deals
router.get("/user-personal-total-deals", authenticateToken, userPersonalTotalDeals);

// localhost:3000/api/v1/deal/user-personal-deals-growth
router.get("/user-personal-deals-growth", authenticateToken, userPersonalDealsGrowth);

// localhost:3000/api/v1/deal/my-all-deals
router.get("/my-all-deals", authenticateToken, getMyAllDeals);

// localhost:3000/api/v1/deal/delete-deal/:id
router.delete("/delete-deal/:id", authenticateToken, requireHostRole, deleteDeal);



export default router;
