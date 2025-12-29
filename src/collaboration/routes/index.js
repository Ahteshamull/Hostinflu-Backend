import express from "express";

import collaboration from "./collaboration.route.js";

const router = express.Router();

// localhost:3000/api/v1/collaboration/
router.use("/collaboration", collaboration);

export default router;
