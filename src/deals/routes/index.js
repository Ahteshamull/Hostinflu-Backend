import express from "express";
import deal from "./deal.route.js";

const router = express.Router();

// localhost:3000/api/v1/deal/
router.use("/deal", deal);

export default router;
