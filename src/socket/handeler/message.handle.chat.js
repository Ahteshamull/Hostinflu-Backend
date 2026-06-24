import mongoose from "mongoose";
import conversations from "../../conversition/schema/conversition.modal.js";
import ConversationService from "../../conversition/service/conversition.service.js";
import MessageService from "../../message/service/message.service.js";
import { handleSingleSendMessage } from "./message.handler.js";
import handleSeenMessage from "./handleSeenMessage.js";

const handleChatEvents = async (io, socket, currentUserId) => {
  // Join conversation
  socket.on("join-conversation", async (data) => {
    try {
      const { conversationId } = data || {};
      if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
        socket.emit("socket-error", { errorMessage: "Invalid conversation ID" });
        return;
      }

      const isExistConversation = await conversations.exists({
        _id: new mongoose.Types.ObjectId(conversationId),
        participants: currentUserId,
      });

      if (!isExistConversation) {
        socket.emit("socket-error", { errorMessage: "Conversation not found" });
        return;
      }

      socket.join(conversationId);
    } catch (err) {
      socket.emit("socket-error", { errorMessage: err.message });
    }
  });

  // Get conversation list
  socket.on("get-conversations", async (query) => {
    try {
      // use ConversationService to fetch conversations
      const conversationsList = await ConversationService.getConversation(
        currentUserId,
        query,
      );
      socket.emit("conversation-list", conversationsList);
    } catch (err) {
      socket.emit("socket-error", { errorMessage: err.message });
    }
  });

  // Get message page (paginated messages for a conversation)
  socket.on("message-page", async (data) => {
    try {
      const { conversationId, page, limit, sort } = data || {};
      if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
        socket.emit("socket-error", { errorMessage: "Invalid conversation ID" });
        return;
      }
      const query = { page, limit, sort };
      const result = await MessageService.findBySpecificConversationInDb(
        conversationId,
        query,
      );
      socket.emit("message-page-result", { conversationId, ...result });
    } catch (err) {
      socket.emit("socket-error", { errorMessage: err.message });
    }
  });

  // Typing indicators
  socket.on("typing", (data) => {
    try {
      const { conversationId, userId } = data || {};
      if (!conversationId) return;
      socket.to(conversationId).emit("user-typing", { conversationId, userId });
    } catch (err) {
      console.error("Error in typing event:", err);
    }
  });

  socket.on("stop-typing", (data) => {
    try {
      const { conversationId, userId } = data || {};
      if (!conversationId) return;
      socket
        .to(conversationId)
        .emit("user-stop-typing", { conversationId, userId });
    } catch (err) {
      console.error("Error in stop-typing event:", err);
    }
  });

  socket.on("single-chat-send-message", async (data) => {
    try {
      if (!data) {
        socket.emit("socket-error", { errorMessage: "Message data is required" });
        return;
      }
      await handleSingleSendMessage(io, socket, currentUserId, data);
    } catch (err) {
      socket.emit("socket-error", { errorMessage: err.message });
    }
  });

  socket.on("seen-message", async (data) => {
    try {
      const { conversationId } = data || {};
      if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
        socket.emit("socket-error", { errorMessage: "Invalid conversation ID" });
        return;
      }
      await handleSeenMessage(io, socket, currentUserId, conversationId);
    } catch (err) {
      socket.emit("socket-error", { errorMessage: err.message });
    }
  });
};

export default handleChatEvents;
