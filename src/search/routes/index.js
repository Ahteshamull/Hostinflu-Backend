import express from "express";

import search from "./search.route.js";

const router = express.Router();

// localhost:3000/api/v1/search/
router.use("/search", search);

export default router;
