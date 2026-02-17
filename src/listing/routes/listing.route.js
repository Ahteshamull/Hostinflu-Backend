import express from "express";
import {
  createListing,
  getAllListings,
  getSingleListing,
  updateListing,
  getMyAllListings,
  deleteListing,
  adminAcceptListing,
  personalTotalListings,
  personalListingsGrowth,
  userPersonalVerifyListings,
  userTotalListings,
} from "../controller/listing.controller.js";
import {
  authenticateToken,
  requireHostRole,
  requireSuperAdminOrAdminRole,
} from "../../helper/middlewares/auth.middleware.js";
import {
  upload,
  errorCheck,
} from "../../helper/middlewares/imageControlMiddleware.js";

const router = express.Router();

// Configure upload for multiple images (up to 10)
const uploadMultipleImages = upload.array("images", 10);

// localhost:3000/api/v1/listing/create-listing
router.post(
  "/create-listing",
  authenticateToken,
  requireHostRole,
  uploadMultipleImages,
  errorCheck,
  createListing,
);

// localhost:3000/api/v1/listing/all-listings
router.get("/all-listings", getAllListings);

// localhost:3000/api/v1/listing/single-listing/:id
router.get("/single-listing/:id", getSingleListing);

// localhost:3000/api/v1/listing/update-listing/:id
router.put(
  "/update-listing/:id",
  authenticateToken,
  requireHostRole,
  uploadMultipleImages,
  errorCheck,
  updateListing,
);

// localhost:3000/api/v1/listing/admin-accept/listing/:id
router.put(
  "/admin-accept/listing/:id",
  authenticateToken,
  requireSuperAdminOrAdminRole,
  adminAcceptListing,
);

// localhost:3000/api/v1/listing/personal-total-listings
router.get(
  "/personal-total-listings",
  authenticateToken,
  personalTotalListings,
);

// localhost:3000/api/v1/listing/personal-listings-growth
router.get(
  "/personal-listings-growth",
  authenticateToken,
  personalListingsGrowth,
);

// localhost:3000/api/v1/listing/delete-listing/:id
router.delete(
  "/delete-listing/:id",
  authenticateToken,
  requireHostRole,
  deleteListing,
);

// localhost:3000/api/v1/listing/my-listings
router.get("/my-listings", authenticateToken, getMyAllListings);

// localhost:3000/api/v1/listing/user-personal-verify
router.get(
  "/user-personal-verify",
  authenticateToken,
  userPersonalVerifyListings,
);

// localhost:3000/api/v1/listing/user-total-listings/:userId
router.get("/user-total-listings/:userId", userTotalListings);

export default router;
