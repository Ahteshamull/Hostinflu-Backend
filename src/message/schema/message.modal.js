import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    text: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: [String],
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
  }
);

const messages = model("messages", messageSchema);

export default messages;
