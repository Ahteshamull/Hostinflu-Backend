import express from "express";

import referral from "./referral.routes.js";

const router = express.Router();

// localhost:3000/api/v1/referral/
router.use("/referral", referral);

export default router;
