import express from "express";

import redeem from "./redeem.routes.js";

const router = express.Router();

// localhost:3000/api/v1/redeem/
router.use("/redeem", redeem);

export default router;
