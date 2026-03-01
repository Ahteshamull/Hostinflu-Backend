import express from "express";

import calender from "./calender.routes.js";

const router = express.Router();

// localhost:3000/api/v1/calender/
router.use("/calender", calender);

export default router;
