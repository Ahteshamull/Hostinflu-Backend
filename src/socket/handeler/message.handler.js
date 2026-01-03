import MessageService from "../../message/service/message.service.js";

export const handleSingleSendMessage = async (
  io,
  socket,
  currentUserId,
  data
) => {
  try {
    // Verify sender is host or influencer

 
    const userModal = (await import("../../auth/schema/auth.modal.js")).default;
    const sender = await userModal.findById(currentUserId);
    if (!sender || (sender.role !== "host" && sender.role !== "influencer")) {
      socket.emit("auth-error", {
        success: false,
        message: "Only hosts and influencers can send messages",
      });
      return;
    }

    // Verify receiver exists and is host or influencer
    const receiver = await userModal.findById(data.receiverId);
    if (
      !receiver ||
      (receiver.role !== "host" && receiver.role !== "influencer")
    ) {
      socket.emit("auth-error", {
        success: false,
        message: "Receiver must be a host or influencer",
      });
      return;
    }

    const result = await MessageService.single_new_message_IntoDb(
      { id: currentUserId, role: sender.role },
      data
    );

    const conversationId = result && result.data && result.data.conversationId;
    if (conversationId) {
      // Emit the new message to all sockets in the conversation room
      io.to(conversationId.toString()).emit("new-message", {
        success: true,
        message: "New message received",
        data: result.data,
      });

      // Also emit to specific user rooms for real-time notification
      io.to(`user-${data.receiverId}`).emit("new-message-notification", {
        success: true,
        message: "You have a new message",
        data: result.data,
      });
    }

    // Acknowledge the sender
    socket.emit("single-message-sent", {
      success: true,
      message: "Message sent successfully",
      data: result,
    });
  } catch (err) {
    const errorPayload = {
      success: false,
      message: err && err.message ? err.message : "Failed to send message",
    };
    socket.emit("socket-error", errorPayload);
  }
};
