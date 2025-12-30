import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // e.g. 'case_created', 'collaboration_request'
    title: String,
    message: String,
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    collaborationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collaboration",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverRole: { type: String, default: "admin" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", NotificationSchema);
