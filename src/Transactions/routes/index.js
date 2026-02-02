import express from "express";

import transaction from "./transaction.route.js";

const router = express.Router();

// localhost:3000/api/v1/transactions/
router.use("/transactions", transaction);

export default router;
