import "dotenv/config";
import { Server as SocketIO } from "socket.io";

import handleChatEvents from "../handeler/message.handle.chat.js";
import userModal from "../../auth/schema/auth.modal.js";
import conversations from "../../conversition/schema/conversition.modal.js";

let io;
const onlineUsers = new Map();

const connectSocket = (server) => {
  if (!io) {
    // Allow common local frontend origins during development and the configured FRONTEND_URL.
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:5173",
    ].filter(Boolean);
    io = new SocketIO(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingInterval: 30000,
      pingTimeout: 5000,
    });
  }

  io.on("connection", async (socket) => {


    const userId = socket.handshake.query.id;

    if (!userId) {
      socket.emit("error", "User ID is required");
      socket.disconnect();
      return;
    }

    const currentUser = await userRoleModal.findById(userId).select("_id");

    if (!currentUser) {
      socket.emit("error", "User not found");
      socket.disconnect();
      return;
    }

    const currentUserId = currentUser._id.toString();
    socket.join(currentUserId);
    // mark user as online
    onlineUsers.set(currentUserId, socket.id);

    const userConversations = await conversations
      .find({
        participants: currentUserId,
      })
      .select("_id");

  

    userConversations.forEach((conv) => socket.join(conv._id.toString()));

    // Call event handlers for chat messages
    handleChatEvents(io, socket, currentUserId);

    socket.on("disconnect", () => {
      // Remove user from online map if it matches this socket id
      const entries = Array.from(onlineUsers.entries());
      for (const [uid, sid] of entries) {
        if (sid === socket.id) {
          onlineUsers.delete(uid);
        }
      }
    });
  });

  return io;
};

const getSocketIO = () => {
  if (!io) {
    throw new Error("socket.io is not initialized");
  }
  return io;
};

export { connectSocket, getSocketIO, onlineUsers };
