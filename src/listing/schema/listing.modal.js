import mongoose from "mongoose";

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  addAirbnbLink: {
    type: String,
    required: true,
  },
  propertyType: {
    type: String,
    required: true,
    enum: ["Apartment", "Villa", "Hotel", "Resort", "Cabin", "Lodge"],
  },
  images: { type: [String], required: true },
  amenities: {
    wifi: { type: Boolean, default: false },
    kitchen: { type: Boolean, default: false },
    tv: { type: Boolean, default: false },
    pool: { type: Boolean, default: false },
    airConditioning: { type: Boolean, default: false },
    gym: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: false },
    hotTub: { type: Boolean, default: false },
  },

  customAmenities: [String],
  status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

export const Listing = mongoose.model("Listing", listingSchema);

export default Listing; // Add default export
