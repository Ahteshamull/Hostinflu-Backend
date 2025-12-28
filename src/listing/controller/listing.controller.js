import { Listing } from "../schema/listing.modal.js";
import {
  notifyAdminOnListingCreated,
  createNotification,
} from "../../notification/service/notification.service.js";
import fs from "fs";
import path from "path";

const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      propertyType,
      amenities,
      customAmenities,
    } = req.body;
    let parsedAmenities = {};
    if (amenities) {
      if (typeof amenities === "string") {
        try {
          parsedAmenities = JSON.parse(amenities);
        } catch (e) {
          parsedAmenities = {};
        }
      } else if (typeof amenities === "object") {
        parsedAmenities = amenities;
      }
    }

    // Handle uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`);
    }

    // Get userId from token - try different possible field names
    const userId = req.user?.id || req.user?.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "User ID not found in token",
        error: "Authentication required",
      });
    }

    const newListing = new Listing({
      title,
      description,
      location,
      propertyType,
      images,
      amenities: parsedAmenities,
      customAmenities,
      userId,
    });

    const savedListing = await newListing.save();

    // Send notification to admin
    await notifyAdminOnListingCreated(savedListing._id, userId, title);

    res.status(201).json({
      message: "Listing created successfully",
      listing: savedListing,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating listing",
      error: error.message,
    });
  }
};

const getAllListings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, propertyType } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (propertyType) {
      filter.propertyType = propertyType;
    }

    const listings = await Listing.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Listing.countDocuments(filter);

    res.status(200).json({
      success: true,
      error: false,
      message: "Listings retrieved successfully",
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      data: {
        listings,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving listings",
      error: error.message,
    });
  }
};

const getSingleListing = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id).populate("userId", "name email");

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found",
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Listing retrieved successfully",
      data: {
        listing,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving listing",
      error: error.message,
    });
  }
};

const updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      location,
      propertyType,
      amenities,
      customAmenities,
    } = req.body;

    // Find the existing listing
    const existingListing = await Listing.findById(id);
    if (!existingListing) {
      return res.status(404).json({
        message: "Listing not found",
      });
    }

    // Handle amenities parsing
    let parsedAmenities = {};
    if (amenities) {
      if (typeof amenities === "string") {
        try {
          parsedAmenities = JSON.parse(amenities);
        } catch (e) {
          parsedAmenities = {};
        }
      } else if (typeof amenities === "object") {
        parsedAmenities = amenities;
      }
    }

    // Handle images
    let finalImages;

    // If new images are uploaded, replace all existing images
    if (req.files && req.files.length > 0) {
      // Delete old images from upload folder
      if (existingListing.images && existingListing.images.length > 0) {
        existingListing.images.forEach((imagePath) => {
          const fullPath = path.join(process.cwd(), imagePath);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (error) {
              // Silently ignore deletion errors
            }
          }
        });
      }

      // Set new images
      finalImages = req.files.map((file) => `/uploads/${file.filename}`);
    } else {
      // If no new images, keep existing images
      finalImages = existingListing.images || [];
    }

    // Prepare update object
    const updates = {
      title,
      description,
      location,
      propertyType,
      amenities: parsedAmenities,
      customAmenities,
      images: finalImages,
      updatedAt: new Date(),
    };

    // Remove undefined fields
    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    const updatedListing = await Listing.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate("userId", "name email");

    res.status(200).json({
      success: true,
      error: false,
      message: "Listing updated successfully",
      data: {
        listing: updatedListing,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating listing",
      error: error.message,
    });
  }
};

const adminAcceptListing = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      { status: "verified" },
      { new: true }
    ).populate("userId", "name email");

    // Send notification to the listing owner that their listing has been verified
    if (updatedListing && updatedListing.userId) {
      await createNotification(
        "listing_verified",
        "Listing Verified",
        `Your listing "${updatedListing.title}" has been verified and is now active.`,
        updatedListing._id,
        req.user.id, // Admin who verified
        updatedListing.userId._id // Listing owner
      );
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Listing verified successfully",
      data: {
        listing: updatedListing,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error verifying listing",
      error: error.message,
    });
  }
};

export {
  createListing,
  getAllListings,
  getSingleListing,
  updateListing,
  adminAcceptListing,
};
