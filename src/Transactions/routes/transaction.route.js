import express from "express";
import { allTransactions, singleTransaction } from "../controller/transaction.controller.js";

const router = express.Router();

// localhost:3000/api/v1/transactions/all-transaction
router.get("/all-transaction", allTransactions);

// localhost:3000/api/v1/transactions/single-transaction/:id
router.get("/single-transaction/:id", singleTransaction);

export default router;
