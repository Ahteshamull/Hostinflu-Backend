import express from "express";

import {
  createCollaboration,
  getAllCollaboration,
  getSingleCollaboration,
  updateCollaboration,
  activeCollaborations,
  completedCollaborations,
  userPersonalTotalCollaborations,
  userPersonalCompleteContents,
  userPersonalEarnStar,
  userPersonalCollaborationsGrowth,
  deleteCollaboration,
  getMyAllCollaborations,
  negotiationCollaboration,
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

//localhost:3000/api/v1/collaboration/active-collaborations
router.get("/active-collaborations", activeCollaborations);

//localhost:3000/api/v1/collaboration/completed-collaborations
router.get("/completed-collaborations", completedCollaborations);

//localhost:3000/api/v1/collaboration/user-personal-total-collaborations
router.get(
  "/user-personal-total-collaborations",
  authenticateToken,
  userPersonalTotalCollaborations
);

//localhost:3000/api/v1/collaboration/user-personal-completed-contents
router.get(
  "/user-personal-completed-contents",
  authenticateToken,
  userPersonalCompleteContents
);

//localhost:3000/api/v1/collaboration/user-personal-earn-stars
router.get(
  "/user-personal-earn-stars",
  authenticateToken,
  userPersonalEarnStar
);

//localhost:3000/api/v1/collaboration/user-personal-collaborations-growth
router.get(
  "/user-personal-collaborations-growth",
  authenticateToken,
  userPersonalCollaborationsGrowth
);

//localhost:3000/api/v1/collaboration/delete-collaboration/:id
router.delete(
  "/delete-collaboration/:id",
  authenticateToken,
  requireHostOrInfluencerRole,
  deleteCollaboration
);

//localhost:3000/api/v1/collaboration/get-my-all-collaborations
router.get(
  "/get-my-all-collaborations",
  authenticateToken,
  getMyAllCollaborations
);

//localhost:3000/api/v1/collaboration/negotiate-collaboration/:collaborationId
router.put(
  "/negotiate-collaboration/:collaborationId",
  authenticateToken,
  requireHostOrInfluencerRole,
  negotiationCollaboration
);

export default router;
