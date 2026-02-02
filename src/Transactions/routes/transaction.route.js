import express from "express";
import { allTransactions } from "../controller/transaction.controller.js";

const router = express.Router();

// localhost:3000/api/v1/transactions/all-transaction
router.get("/all-transaction", allTransactions);

export default router;
