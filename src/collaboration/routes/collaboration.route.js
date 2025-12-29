import express from "express";

import { createCollaboration } from "../controller/collaboration.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";
import { requireHostOrInfluencerRole } from "../../helper/middlewares/role.middleware.js";

const router = express.Router();

//localhost:3000/api/v1/collaboration/create-collaboration (user only)
router.post("/create-collaboration",authenticateToken, requireHostOrInfluencerRole, createCollaboration);

export default router;
