import express from "express";
import { allTransactions, singleTransaction, userPersonalTransaction } from "../controller/transaction.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";
import { requireHostOrInfluencerRole } from "../../helper/middlewares/role.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/transactions/all-transaction
router.get("/all-transaction", allTransactions);

// localhost:3000/api/v1/transactions/single-transaction/:id
router.get("/single-transaction/:id", singleTransaction);

// localhost:3000/api/v1/transactions/user-transaction
router.get("/user-transaction", authenticateToken, requireHostOrInfluencerRole, userPersonalTransaction);

export default router;
