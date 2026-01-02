import express from "express";

import {
  createCollaboration,
  getAllCollaboration,
  getSingleCollaboration,
  updateCollaboration,
  totalCollaboration,
  activeCollaborations,
  completedCollaborations,
} from "../controller/collaboration.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";
import { requireHostOrInfluencerRole } from "../../helper/middlewares/role.middleware.js";

const router = express.Router();

//localhost:3000/api/v1/collaboration/create-collaboration (user only)
router.post(
  "/create-collaboration",
  authenticateToken,
  requireHostOrInfluencerRole,
  createCollaboration
);

//localhost:3000/api/v1/collaboration/get-all-collaboration (user only)
router.get("/get-all-collaboration", getAllCollaboration);

//localhost:3000/api/v1/collaboration/get-single-collaboration (user only)
router.get("/get-single-collaboration/:id", getSingleCollaboration);

//localhost:3000/api/v1/collaboration/update-collaboration (user only)
router.put(
  "/update-collaboration/:id",
  authenticateToken,
  requireHostOrInfluencerRole,
  updateCollaboration
);

//localhost:3000/api/v1/collaboration/total-collaborations 
router.get("/total-collaborations", totalCollaboration);

//localhost:3000/api/v1/collaboration/active-collaborations 
router.get("/active-collaborations", activeCollaborations);

//localhost:3000/api/v1/collaboration/completed-collaborations 
router.get("/completed-collaborations", completedCollaborations);


export default router;
