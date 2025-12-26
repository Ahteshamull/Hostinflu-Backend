import express from "express";

import legalDoc from "./legalDoc.route.js";

const router = express.Router();

// localhost:3000/api/v1/legalDoc/
router.use("/legalDoc", legalDoc);

export default router;
