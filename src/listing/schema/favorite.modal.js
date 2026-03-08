import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    myId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    favoriteListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("FavoriteListing", favoriteSchema);
