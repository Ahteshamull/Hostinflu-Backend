import { Schema, model } from "mongoose";

const conversationSchema = new Schema(
  {
    participants: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      // participants are users with host or influencer roles
      required: true,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "messages",
      default: null,
    },

    isDelete: {
      type: Boolean,
      required: [false, "isDelete is not required"],
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const conversations = model("conversations", conversationSchema);

export default conversations;
