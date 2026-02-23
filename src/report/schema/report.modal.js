import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    comment: "User who is creating the report",
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    comment: "User who is being reported",
  },
  reportType: {
    type: String,
    enum: [
      "payment_issue",
      "content_issue",
      "behavior_issue",
      "fraud",
      "spam",
      "other",
    ],
    required: true,
    comment: "Type of report",
  },
  reason: {
    type: String,
    required: true,
    comment: "Brief reason for report",
  },
  description: {
    type: String,
    required: true,
    comment: "Detailed description of the issue",
  },
  evidence: [
    {
      type: String,
      comment: "Screenshots or evidence URLs",
    },
  ],
  urgency: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
    comment: "Urgency level of the report",
  },
  status: {
    type: String,
    enum: ["pending", "under_review", "resolved", "rejected"],
    default: "pending",
    comment: "Current status of the report",
  },
  adminNotes: {
    type: String,
    comment: "Notes added by admin during review",
  },
  resolution: {
    type: String,
    comment: "Resolution details when status is resolved",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
reportSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Report", reportSchema);
