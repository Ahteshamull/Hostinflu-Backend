import express from "express";

import listing from "./listing.route.js";

const router = express.Router();

// localhost:3000/api/v1/listing/
router.use("/listing", listing);

export default router;
