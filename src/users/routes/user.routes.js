import express from "express";
import {
  allUser,
  singleUser,
  updateProfile,
  deleteUser,
  userGrowth,
  discoverHost,
  topInfluencer,
} from "../controller/user.controller.js";
import {
  upload,
  errorCheck,
} from "../../helper/middlewares/imageControlMiddleware.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";
const router = express.Router();

//localhost:3000/api/v1/user/all-users
router.get("/all-users", allUser);

//localhost:3000/api/v1/user/single-user/:id
router.get("/single-user/:id", singleUser);

//localhost:3000/api/v1/user/update-profile - Update own profile (gets ID from token)
router.patch(
  "/update-profile",
  authenticateToken,
  upload.single("image"),
  errorCheck,
  updateProfile,
);

//localhost:3000/api/v1/user/delete-user/:id
router.delete("/delete-user/:id", deleteUser);

//localhost:3000/api/v1/user/user-growth
router.get("/user-growth", userGrowth);   


// localhost:3000/api/v1/user/discover-host
router.get("/discover-host", discoverHost);


//localhost:3000/api/v1/user/top-influencer
router.get("/top-influencer", topInfluencer);

export default router;
