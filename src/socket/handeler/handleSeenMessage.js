import conversations from "../../conversition/schema/conversition.modal.js";
import messages from "../../message/schema/message.modal.js";

const handleSeenMessage = async (io, socket, currentUserId, conversationId) => {
  try {
    const conversation = await conversations
      .findById(conversationId)
      .select("_id participants");

    if (!conversation) {
      return socket.emit("socket-error", {
        errorMessage: "Conversation not found",
      });
    }

    const otherUserId = conversation.participants.find(
      (id) => id.toString() !== currentUserId,
    );

    const unseenMessages = await messages
      .find({
        conversationId: conversation._id,
        msgByUserId: otherUserId,
        seen: false,
      })
      .select("_id");

    if (!unseenMessages.length) return;

    await messages.updateMany(
      { _id: { $in: unseenMessages.map((m) => m._id) } },
      { $set: { seen: true } },
    );

    io.to(conversationId.toString()).emit("messages-seen", {
      conversationId,
      seenBy: currentUserId,
      messageIds: unseenMessages.map((m) => m._id),
    });
  } catch (error) {
    console.error("Error in handleSeenMessage:", error);
    socket.emit("socket-error", {
      errorMessage: error.message || "Failed to mark messages as seen",
    });
  }
};

export default handleSeenMessage;
