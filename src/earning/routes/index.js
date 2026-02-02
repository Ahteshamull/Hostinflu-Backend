import express from "express";

import earning from "./earning.route.js";

const router = express.Router();

// localhost:3000/api/v1/earnings/
router.use("/earnings", earning);

export default router;
