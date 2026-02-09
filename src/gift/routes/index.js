import express from "express";

import giftRoute from "./gift.route.js";

const router = express.Router();

// localhost:3000/api/v1/gift/
router.use("/gift", giftRoute);

export default router;
