import { Schema, model } from "mongoose";

const fileSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["image", "video", "audio", "file"],
      default: "image",
    },
    filename: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    text: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: [fileSchema],
      default: [],
    },
    audioUrl: {
      type: String,
      required: false,
      default: "",
    },
    seen: {
      type: Boolean,
      default: false,
    },
    msgByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // Sender is a User with host or influencer role
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "conversations",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const messages = model("messages", messageSchema);

export default messages;
